import { Transaction, TxData } from 'ethereumjs-tx';
import BigNumber from 'bignumber.js';
import { utils } from 'ethers';
import * as RLP from 'rlp';
import Web3 from 'web3';

import config from '../config/config';

const minABI = [
  {
    constant: false,
    inputs: [
      {
        name: '_to',
        type: 'address',
      },
      {
        name: '_value',
        type: 'uint256',
      },
    ],
    name: 'transfer',
    outputs: [
      {
        name: 'success',
        type: 'bool',
      },
    ],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // balanceOf
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  // decimals
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
];

export const getTransactionCount = async (
  web3: Web3,
  address: string,
  network = 'main'
) => {
  const num = await web3.eth.getTransactionCount(address);
  return num;
};

export const getBalance = async (
  web3: Web3,
  address: string,
  network = 'main',
  contractAddress?: string
) => {
  if (contractAddress) {
    const value = await new web3.eth.Contract(minABI as any, contractAddress, {
      from: address,
    }).methods
      .balanceOf(address)
      .call();
    return value;
  }

  return Number(await web3.eth.getBalance(address));
};

export const getDecimal = async (
  web3: Web3,
  network = 'main',
  contractAddress: string
) => {
  const value = await new web3.eth.Contract(
    minABI as any,
    contractAddress
  ).methods
    .decimals()
    .call();

  return value;
};

export default class EthereumWallet {
  public xpub: string;
  public web3: Web3;
  public address: string;
  public node: number;
  public chain: number;
  public network: string;

  public constructor(xpub: string, network = 'main', node = 0) {
    this.node = node;
    this.xpub = xpub;
    this.network = network;
    this.chain = 1;

    let baseURL = `https://mainnet.infura.io/v3/${config.INFURA_TOKEN}`;
    if (network === 'ropsten') {
      baseURL = `https://ropsten.infura.io/v3/${config.INFURA_TOKEN}`;
      this.chain = 3;
    }
    this.web3 = new Web3(new Web3.providers.HttpProvider(baseURL));

    this.address = utils.HDNode.fromExtendedKey(xpub).derivePath(
      `0/${node}`
    ).address;
  }

  // gas price in gwei
  public async generateUnsignedTransaction(
    outputAddress: string,
    amount: BigNumber,
    gasPrice: number,
    gasLimit: number,
    isSendAll: boolean,
    contractAddress?: string
  ): Promise<{
    txn: string;
    amount: BigNumber;
    fee: BigNumber;
    inputs: Array<{
      value: string;
      address: string;
      isMine: boolean;
    }>;
    outputs: Array<{ value: string; address: string; isMine: boolean }>;
  }> {
    const chain = this.chain;
    // Convert from lowercase address to mixed case for easier comparison
    const mixedCaseOutputAddr = utils.getAddress(outputAddress);
    console.log({ inputAddr: this.address });
    console.log({ outputAddress: mixedCaseOutputAddr });

    let rawTx: TxData;

    let totalAmount = new BigNumber(0);
    if (amount) {
      totalAmount = amount;
    }

    const ethBalance = new BigNumber((await this.getTotalBalance()).balance);
    console.log({ ethBalance: ethBalance.toString() });

    // From Gwei to wei
    const totalFee = new BigNumber(gasPrice * gasLimit).multipliedBy(
      new BigNumber(Math.pow(10, 9))
    );

    if (contractAddress) {
      const contractBalance = new BigNumber(
        (await this.getTotalBalance(contractAddress)).balance
      );

      if (isSendAll) {
        totalAmount = contractBalance;
      }

      if (
        ethBalance.isLessThan(totalFee) ||
        contractBalance.isLessThan(totalAmount)
      ) {
        throw new Error('Insufficient funds');
      }

      const contract = new this.web3.eth.Contract(
        minABI as any,
        contractAddress,
        { from: this.address }
      );

      rawTx = {
        // call from server.
        nonce: await getTransactionCount(this.web3, this.address, this.network),
        gasPrice: this.web3.utils.toHex(gasPrice * 1000000000),
        gasLimit: this.web3.utils.toHex(gasLimit),
        to: contractAddress,
        value: '0x0',
        data: contract.methods
          .transfer(mixedCaseOutputAddr, totalAmount.toString(10))
          .encodeABI(),
      };
    } else {
      if (isSendAll) {
        totalAmount = ethBalance.minus(totalFee);
        if (totalAmount.isNegative()) {
          throw new Error('Insufficient funds');
        }
      }

      if (ethBalance.isLessThan(totalAmount.plus(totalFee))) {
        throw new Error('Insufficient funds');
      }

      rawTx = {
        // call from server
        nonce: await getTransactionCount(this.web3, this.address, this.network),
        gasPrice: this.web3.utils.toHex(gasPrice * 1000000000),
        gasLimit: this.web3.utils.toHex(gasLimit),
        to: mixedCaseOutputAddr,
        value: this.web3.utils.toHex(totalAmount.toString(10)),
      };
    }
    const transaction = new Transaction(rawTx, { chain });
    const txHex = transaction.serialize().toString('hex');
    const decoded: any = RLP.decode(Buffer.from(txHex, 'hex'));
    const v = chain;
    // added zero because Buffer.from('1', 'hex') returns an empty buffer
    decoded[6] = Buffer.from('0' + v.toString(16), 'hex');

    return {
      txn: RLP.encode(decoded).toString('hex'),
      fee: totalFee,
      amount: totalAmount,
      inputs: [
        { address: this.address, value: totalAmount.toString(), isMine: true },
      ],
      outputs: [
        {
          address: mixedCaseOutputAddr,
          value: totalAmount.toString(),
          isMine: this.address === mixedCaseOutputAddr,
        },
      ],
    };
  }

  async getTotalBalance(contractAddress?: string) {
    // to keep in sync with bitcoin's balance structure in the db
    return {
      balance: await getBalance(
        this.web3,
        this.address,
        this.network,
        contractAddress
      ),
    };
  }
}
