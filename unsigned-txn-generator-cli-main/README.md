# Unsigned txn generator CLI

## Prerequisites

- Install `Nodejs`.
- Create an account on Blockcypher: [https://www.blockcypher.com/](https://www.blockcypher.com/).
- Create an account on Infura: [https://infura.io/](https://infura.io/).
- Duplicate the `.env.example` file on the root directory and rename it as `.env`.
- Set the `BLOCKCYPHER_API_KEY` on the `.env` file to the API key on your blockcypher dashboard.
- Set the `INFURA_TOKEN` on the `.env` file to the API key on your infura dashboard.

## Setup

Run once in your root directory :

```
npm install
npm run build
```

## Usage

- Start the program
  ```
  npm run start
  ```

### BTC Testnet

- Select `BTC Testnet: Upload addresses online`
- Enter the `XPUB`, and the program will add the first 20 addresses to blockcypher. (Make sure you have some balance in atleast of the address)
- Run the program again
- Select `BTC Testnet: Generate meta data and unsigned transaction`.
- Enter the `XPUB`, and the unsigned txn will be generated.

#### Customization

- Open the file `cli.ts` and change the target addresses on line `36`.

**NOTE**: After this change you'll need to build the project again

### ETH Ropsten

- Select `ETH Ropsten: Generate unsigned transaction`
- Enter the `XPUB`, and the program will generate an unsigned txn. (Make sure you have some balance in atleast of the address)

#### Customization

- Open the file `cli.ts` and change the target addresses (or target value, gasPrice, gasLimit) on line `51`.

**NOTE**: After this change you'll need to build the project again
