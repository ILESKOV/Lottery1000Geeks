const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

describe("Lottery", function () {
  let owner;
  let Lottery, VrfCoordinatorV2Mock, PriceFeedMock, keyhash;

  beforeEach(async () => {
    [owner, player1, player2, player3] = await ethers.getSigners();
    let lottery = await ethers.getContractFactory("Lottery");
    let vrfCoordinatorV2Mock = await ethers.getContractFactory(
      "VRFCoordinatorV2Mock"
    );
    let priceFeedMock = await ethers.getContractFactory("MockV3Aggregator");
    let price = "100000000000"; // 1000 usd

    VrfCoordinatorV2Mock = await vrfCoordinatorV2Mock.deploy(0, 0);
    PriceFeedMock = await priceFeedMock.deploy(8, price);

    await VrfCoordinatorV2Mock.createSubscription();
    await VrfCoordinatorV2Mock.fundSubscription(
      1,
      ethers.utils.parseEther("7")
    );

    keyhash =
      "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc";
    Lottery = await lottery.deploy(
      1,
      PriceFeedMock.address,
      VrfCoordinatorV2Mock.address,
      keyhash
    );
  });
  describe("logic tests", function () {
    it("should change subscriptionId", async () => {
      await Lottery.updateSubscriptionId(777);
      await expect(Lottery.updateSubscriptionId(777))
        .to.emit(Lottery, "SubscriptionChanged")
        .withArgs(777);
      expect(await Lottery.getSubscriptionId()).to.equal(777);
    });

    describe("Before lottery started", function () {
      it("should not allow end lottery that was not started yet", async function () {
        await expect(Lottery.endLottery()).to.be.revertedWith(
          "Can't end lottery yet"
        );
      });

      it("should not allow participate while lottery is closed", async function () {
        await expect(
          Lottery.connect(player1).participate({
            value: ethers.utils.parseEther("0.05"),
          })
        ).to.be.revertedWith("Wait until the next lottery");
      });

      it("starts in closed state", async () => {
        expect(await Lottery.lotteryState()).to.equal(1);
      });

      it("gets the right lottery balance in the closed state", async () => {
        expect(await Lottery.connect(player1).getLotteryBalance()).to.equal(0);
      });

      it("corrects get the participation fee", async () => {
        let participationFee = await Lottery.getParticipationFee();
        expect(await participationFee.toString()).to.equal(
          ethers.utils.parseEther("0.05")
        );
      });
    });

    describe("After lottery started", function () {
      beforeEach(async () => {
        await Lottery.startLottery();
      });

      it("should not allow end lottery that does not have participants", async function () {
        await expect(Lottery.endLottery()).to.be.revertedWith(
          "Can't divide by zero"
        );
      });

      it("should not allow start new lottery while lottery is already started", async function () {
        await expect(Lottery.startLottery()).to.be.revertedWith(
          "Can't start a new lottery"
        );
      });

      it("should update the praticipation fee", async () => {
        await Lottery.updateParticipationFee(100);
        await expect(
          Lottery.connect(player1).participate({
            value: ethers.utils.parseEther("0.05"),
          })
        ).to.be.revertedWith("Not Enough ETH to participate!");
        await expect(
          Lottery.connect(player1).participate({
            value: ethers.utils.parseEther("0.099"),
          })
        ).to.be.revertedWith("Not Enough ETH to participate!");
        await expect(
          Lottery.connect(player1).participate({
            value: ethers.utils.parseEther("0.1"),
          })
        )
          .to.emit(Lottery, "NewParticipant")
          .withArgs(player1.address, 1);
      });

      it("start at open state after startLottery", async () => {
        expect(await Lottery.lotteryState()).to.equal(0);
      });

      it("disallow participation without enough money", async () => {
        await expect(
          Lottery.connect(player1).participate({
            value: ethers.utils.parseEther("0.049"),
          })
        ).to.be.revertedWith("Not Enough ETH to participate!");
      });

      it("checks lottery balance after lottery started", async () => {
        let participationFee = await Lottery.getParticipationFee();
        await Lottery.connect(player1).participate({
          value: ethers.utils.parseEther("0.05"),
        });
        await Lottery.connect(player2).participate({
          value: ethers.utils.parseEther("0.05"),
        });
        await Lottery.connect(player3).participate({
          value: ethers.utils.parseEther("0.05"),
        });
        expect((await Lottery.getLotteryBalance()).toString()).to.equal(
          (participationFee * 3).toString()
        );
      });
    });

    describe("After lottery ended", function () {
      beforeEach(async () => {
        await Lottery.startLottery();
        await Lottery.connect(player1).participate({
          value: ethers.utils.parseEther("0.05"),
        });
        await Lottery.connect(player2).participate({
          value: ethers.utils.parseEther("0.05"),
        });
        await Lottery.connect(player3).participate({
          value: ethers.utils.parseEther("0.05"),
        });
        await Lottery.endLottery();
      });

      it('checks the state is "calculating winner:', async () => {
        expect(await Lottery.lotteryState()).to.equal(2);
      });
    });

    describe("After selecting the winner", function () {
      beforeEach(async () => {
        await Lottery.startLottery();
        await Lottery.connect(player1).participate({
          value: ethers.utils.parseEther("0.05"),
        });
        await Lottery.connect(player2).participate({
          value: ethers.utils.parseEther("0.05"),
        });
        await Lottery.connect(player3).participate({
          value: ethers.utils.parseEther("0.05"),
        });
        await Lottery.endLottery();
        await VrfCoordinatorV2Mock.fulfillRandomWords(1, Lottery.address);
      });

      it('checks the state is "closed"', async () => {
        expect(await Lottery.lotteryState()).to.equal(1);
      });

      it("checks the balance is 0 after withdraw prize to the winner", async () => {
        expect(await Lottery.getLotteryBalance()).to.equal(0);
      });
    });
  });

  describe("VRFv2 tests", function () {
    beforeEach(async () => {
      await Lottery.startLottery();
      await Lottery.connect(player1).participate({
        value: ethers.utils.parseEther("0.05"),
      });
    });

    it("Contract should request Random number successfully", async () => {
      await expect(Lottery.endLottery())
        .to.emit(Lottery, "RequestedRandomness")
        .withArgs(BigNumber.from(1), owner.address);
    });

    it("Coordinator should successfully receive the request", async function () {
      await expect(Lottery.endLottery()).to.emit(
        VrfCoordinatorV2Mock,
        "RandomWordsRequested"
      );
    });

    it("Coordinator should fulfill Random Number request", async () => {
      let tx = await Lottery.endLottery();
      let { events } = await tx.wait();

      let [reqId] = events.filter((x) => x.event === "RequestedRandomness")[0]
        .args;

      await expect(
        VrfCoordinatorV2Mock.fulfillRandomWords(reqId, Lottery.address)
      ).to.emit(VrfCoordinatorV2Mock, "RandomWordsFulfilled");
    });

    it("Contract should receive Random Numbers", async () => {
      let tx = await Lottery.endLottery();
      let { events } = await tx.wait();

      let [reqId] = events.filter((x) => x.event === "RequestedRandomness")[0]
        .args;

      await expect(
        VrfCoordinatorV2Mock.fulfillRandomWords(reqId, Lottery.address)
      ).to.emit(Lottery, "ReceivedRandomness");
    });
  });
});
