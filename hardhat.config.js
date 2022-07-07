require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-solhint");
require("@nomiclabs/hardhat-etherscan");
const url = require("./secret").url;
const key = require("./secret").key;
const key = require("./secret").api;

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

module.exports = {
  solidity: "0.8.15",
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      initialBaseFeePerGas: 0,
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${url}`,
      accounts: [`0x${key}`],
    },
    ethereum: {
      chainId: 1,
      url: `https://mainnet.infura.io/v3/${url}`,
      accounts: [`0x${key}`],
    },
  },
  etherscan: {
    apiKey: api,
  },
};
