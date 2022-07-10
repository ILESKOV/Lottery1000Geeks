//SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.15;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Lottery contract
/// @author I.Lieskov
/// @notice Contract use Chainlink Oracle for generating random words and get data about ETH/USD price
/// @dev Needs to fund subscription and add contract address as a consumer on https://vrf.chain.link/rinkeby
/// @dev in order to work with VRFv2
/// @custom:experimental This is an experimental contract.
contract Lottery is VRFConsumerBaseV2, Ownable {
  AggregatorV3Interface internal immutable ethUsdPriceFeed;
  VRFCoordinatorV2Interface private coordinatorInterface;

  enum LOTTERY_STATE {
    OPEN,
    CLOSED,
    CALCULATING_WINNER
  }
  LOTTERY_STATE public lotteryState;

  uint16 private constant REQUEST_CONFIRMATIONS = 3;
  uint32 private constant CALLBACK_GAS_LIMIT = 200000;
  uint32 private constant NUM_WORDS = 1;
  uint64 private subscriptionId;
  uint256 private numberOfTicket = 0;
  uint256 private usdParticipationFee = 50;
  uint256 public lotteryId = 0;
  uint256 public requestId;
  address private immutable vrfCoordinator;
  bytes32 private immutable keyHash;
  uint256[] public randomWord;

  mapping(uint256 => address payable) public userTickets;
  mapping(uint256 => address payable) public lotteryWinners;

  event RequestedRandomness(uint256 requestId, address invoker);
  event ReceivedRandomness(uint256 requestId, uint256 n1);
  event LotteryStateChanged(LOTTERY_STATE state);
  event SubscriptionChanged(uint64 subscriptionId);
  event ParticipationFeeUpdated(uint256 usdParticipationFee);
  event NewParticipant(address player, uint256 lotteryId);

  /// @dev subscriptionID can be obtained from here https://vrf.chain.link/rinkeby
  /// @dev AggregatorV3Interface for rinkeby address: 0x8A753747A1Fa494EC906cE90E9f37563A8AF630e
  /// @dev VRFCoordinator for rinkeby address: 0x6168499c0cFfCaCD319c818142124B7A15E857ab
  /// @dev keyHash for Rinkeby: 0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc
  constructor(
    uint64 _subscriptionId,
    AggregatorV3Interface _ethUsdPriceFeed,
    address _vrfCoordinator,
    bytes32 _keyHash
  ) VRFConsumerBaseV2(_vrfCoordinator) {
    coordinatorInterface = VRFCoordinatorV2Interface(_vrfCoordinator);
    subscriptionId = _subscriptionId;
    ethUsdPriceFeed = _ethUsdPriceFeed;
    vrfCoordinator = _vrfCoordinator;
    keyHash = _keyHash;

    lotteryState = LOTTERY_STATE.CLOSED;
  }

  /// @notice Start new lottery and allow players to buy tickets
  /// @dev The state of previous lottery is reset
  function startLottery() public onlyOwner {
    require(lotteryState == LOTTERY_STATE.CLOSED, "Can't start a new lottery");
    numberOfTicket = 0;
    lotteryState = LOTTERY_STATE.OPEN;
    emit LotteryStateChanged(lotteryState);
    lotteryId++;
    randomWord = new uint256[](0);
  }

  /// @notice ticket price is based on actual ETH/USD price
  /// @dev Function use data feed aggregator from Chainlink
  function participate() public payable {
    require(
      msg.value >= getParticipationFee(),
      "Not Enough ETH to participate!"
    );
    require(lotteryState == LOTTERY_STATE.OPEN, "Wait until the next lottery");
    numberOfTicket++;
    userTickets[numberOfTicket] = payable(msg.sender);
    emit NewParticipant(msg.sender, lotteryId);
  }

  /// @notice The price is calculated in ETH
  /// @dev Function use data feed aggregator from Chainlink
  /// @return Cost in ETH equivalent to 50$
  function getParticipationFee() public view returns (uint256) {
    uint256 precision = 1 * 10**18;
    uint256 price = uint256(getLatestPrice());
    uint256 costToParticipate = (precision / price) *
      (usdParticipationFee * 100000000);
    return costToParticipate;
  }

  /// @notice Get actual ETH/USD price from Chainlink data feed aggregator
  function getLatestPrice() public view returns (int256) {
    (
      ,
      /*uint80 roundID*/
      int256 price, /*uint startedAt*/ /*uint timeStamp*/ /*uint80 answeredInRound*/
      ,
      ,

    ) = ethUsdPriceFeed.latestRoundData();

    return price;
  }

  /// @notice End lottery function, which calculates the winner and pay the prize
  /// @dev Function call pickWinner(), which in turn calls the
  /// @dev requestRandomWords function from VRFv2
  function endLottery() public onlyOwner {
    require(lotteryState == LOTTERY_STATE.OPEN, "Can't end lottery yet");
    require(numberOfTicket > 0, "Can't divide by zero");
    lotteryState = LOTTERY_STATE.CALCULATING_WINNER;
    emit LotteryStateChanged(lotteryState);
    pickWinner();
  }

  /// @notice Function to calculate the winner
  /// @dev Will revert if subscription is not set and funded
  function pickWinner() private onlyOwner {
    require(
      lotteryState == LOTTERY_STATE.CALCULATING_WINNER,
      "Lottery not ended yet"
    );
    requestId = coordinatorInterface.requestRandomWords(
      keyHash,
      subscriptionId,
      REQUEST_CONFIRMATIONS,
      CALLBACK_GAS_LIMIT,
      NUM_WORDS
    );
    emit RequestedRandomness(requestId, msg.sender);
  }

  /// @notice Get random number, pick winner and sent prize to winner
  /// @dev Function can be fulfilled only from vrfcoordinator
  /// @param reqId requestId for generating random number
  /// @param random received number from VRFv2
  function fulfillRandomWords(
    uint256 reqId, /* requestId */
    uint256[] memory random
  ) internal override {
    emit ReceivedRandomness(reqId, random[0]);
    randomWord = random;
    require(randomWord[0] > 0, "Random number not found");
    uint256 winnerTicket = (randomWord[0] % numberOfTicket) + 1;
    lotteryState = LOTTERY_STATE.CLOSED;
    emit LotteryStateChanged(lotteryState);
    lotteryWinners[lotteryId] = userTickets[winnerTicket];
    lotteryWinners[lotteryId].transfer(((address(this).balance) * 90) / 100);
    payable(owner()).transfer(address(this).balance);
  }

  /// @notice get balance of actual lottery
  /// @dev Reseted after winner is picked
  function getLotteryBalance() public view returns (uint256) {
    return address(this).balance;
  }

  /// @notice Get subscriptionId
  /// @return SubscriptionId
  function getSubscriptionId() public view onlyOwner returns (uint64) {
    return subscriptionId;
  }

  /// @notice Update subscriptionId
  /// @param newSubscriptionId new subscriptionId
  function updateSubscriptionId(uint64 newSubscriptionId) public onlyOwner {
    subscriptionId = newSubscriptionId;
    emit SubscriptionChanged(subscriptionId);
  }

  /// @notice Update Participation Fee
  /// @param newParticipationFee new usdParticipationFee
  function updateParticipationFee(uint64 newParticipationFee) public onlyOwner {
    usdParticipationFee = newParticipationFee;
    emit ParticipationFeeUpdated(usdParticipationFee);
  }
}

