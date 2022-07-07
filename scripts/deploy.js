const hre = require("hardhat");

async function main() {
  keyhash =
    "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc";
  aggregator = "0x8A753747A1Fa494EC906cE90E9f37563A8AF630e";
  vrfCoordinator = "0x6168499c0cFfCaCD319c818142124B7A15E857ab";

  const Lottery = await hre.ethers.getContractFactory("Lottery");
  const lottery = await Lottery.deploy(
    8029,
    aggregator,
    vrfCoordinator,
    keyhash
  );

  await lottery.deployed();

  console.log("Lottery deployed to:", lottery.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
