# Lottery
> Lottery contract with VRF2 and Data Feed Aggregator
> Contract is using VRFv2 for generating random numbers. Therefore, for the correct operation of the contract, it is necessary to create subscription on > https://vrf.chain.link/rinkeby , replenish the balance of LINK and add contract address as a consumer

## Table of Contents
* [General Info](#general-information)
* [Technologies Used](#technologies-used)
* [Features](#features)
* [Setup](#setup)
* [Room for Improvement](#room-for-improvement)
* [Contact](#contact)



## General Information
- Owner(admin) of the contract can start/end lottery
- Every user can participate and participation fee(price of ticket) is based on Chainlink Data price aggregator of ETH/USD price
- After owner end lottery, the winner will be picked using randomness from Chainlink VRFv2 Coordinator



## Technologies Used
- Chainlink Data Feed Aggregator
- Chainlink VRFv2
- Truffle


## Features
- Trully random contract(Ideally for lottery)
- Price required for participate is not based on cryptocurrencies prices(constant 50$)
- The contract has been properly reviewed.



## Setup

Just run "npm install" to install all dependencies and you will be able to run tests and test by yourself
```
npm install
```


## Room for Improvement
- User friendly UI
- Marketing


## Contact
Created by [@LESKOV](https://www.linkedin.com/in/ivan-lieskov-4b5664189/) - feel free to contact me!
