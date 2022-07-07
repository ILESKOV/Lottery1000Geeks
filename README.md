# Lottery
> Lottery contract with VRF2 and Data Feed Aggregator
> Contract is using VRFv2 for generating random numbers. Therefore, for the correct operation of the contract, it is necessary to create subscription on > https://vrf.chain.link/rinkeby , replenish the balance of LINK and add contract address as a consumer

## Table of Contents
* [General Info](#general-information)
* [Technologies Used](#technologies-used)
* [Features](#features)
* [Requirements For Initial Setup](#requirements)
* [Setup](#setup)
* [Contact](#contact)



## General Information
- Owner(admin) of the contract can start/end lottery
- Every user can participate and participation fee(price of ticket) is based on Chainlink Data price aggregator of ETH/USD price
- After owner end lottery, the winner will be picked using randomness from Chainlink VRFv2 Coordinator

 
## Technologies Used
- Chainlink Data Feed Aggregator
- Chainlink VRFv2

## Features
- Trully random contract(Ideally for lottery)
- Ticket price is based on ETH/USD prices
- The contract has been properly reviewed.

## Requirements For Initial Setup
- Install [NodeJS](https://nodejs.org/en/), should work with any node version below 16.16.0
- Install [Hardhat](https://hardhat.org/)

## Setup
### 1. Clone/Download the Repository
### 2. Install Dependencies:
```
$ cd lottery_file
$ npm install
```
### 3. Run Tests
`$ npx hardhat test`

### 3. Migrate to Rinkeby
`$ npx hardhat run scripts/deploy.js --network rinkeby
`



## Contact
Created by [@LESKOV](https://www.linkedin.com/in/ivan-lieskov-4b5664189/) - feel free to contact me!
