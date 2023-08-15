// ToDo ask suraj sir about the added_coins in recievetransaction flow
// import { sendData }
// const log = import('simple-node-logger').createSimpleFileLogger('project.log');
// @ts-ignore
import { query_input, query_number, query_list } from './flows/cli_input';
import BigNumber from 'bignumber.js';
import { Wallet } from './flows/wallet';
import EthWallet from './flows/ethWallet';

const cli_tool = async () => {
  const option = await query_list([
    'BTC Testnet: Upload addresses online',
    'BTC Testnet: Generate meta data and unsigned transaction',
    'ETH Ropsten: Generate unsigned transaction',
  ]);

  if (option === 'BTC Testnet: Upload addresses online') {
    const xpub = await query_input('Enter the xpub in base58 format: ');
    const coinType = 'btct';

    const w = new Wallet(xpub, coinType);

    const re_addr = w.address_list(0, 0, 20);
    const ch_addr = w.address_list(1, 0, 20);

    await w.upload_wallet(w.external, re_addr);
    await w.upload_wallet(w.internal, ch_addr);
  } else if (
    option === 'BTC Testnet: Generate meta data and unsigned transaction'
  ) {
    const xpub = await query_input('Enter the xpub in base58 format: ');
    const coinType = 'btct';

    const w = new Wallet(xpub, coinType);
    //change addresses here
    console.log(w)
    
    const targets = [
      {
        address: 'n3A6ysiw1u8wV6d1YZQ5GSETBkcjkrD3Dr',
        value: 6000,
      },
    ];

    console.log(await w.generateMetaData(targets));

    //2nd parameter is fees, 'l' for low, 'm' for medium , 'h' for high.
    await w.generateUnsignedTransaction(targets, 'l');
  } else if (option === 'ETH Ropsten: Generate unsigned transaction') {
    const option = await query_list([
      'ETH Ropsten: Generate unsigned transaction',
      'ETH Ropsten: Generate ERC20 Token unsigned transaction',
    ]);

    const xpub = await query_input('Enter the xpub in base58 format: ');
    let contractAddress: string | undefined = undefined;

    if (option === 'ETH Ropsten: Generate unsigned transaction') {
    } else if (
      option === 'ETH Ropsten: Generate ERC20 Token unsigned transaction'
    ) {
      contractAddress = await query_input(
        'Enter the contract address for erc20 token in hex: '
      );
    }

    console.log({ xpub });

    const w = new EthWallet(xpub, 'ropsten');
    const targetAddress = '0xA4028f8dC64D18F0a66668d97473C47444A561Ea';
    const targetValue = 100;
    const gasPrice = 10;
    const gasLimit = 50000;
    const txn = await w.generateUnsignedTransaction(
      targetAddress,
      new BigNumber(targetValue),
      gasPrice,
      gasLimit,
      false,
      contractAddress
    );
    console.log({
      output: txn.outputs,
      input: txn.inputs,
      fee: txn.fee.toString(),
    });
    console.log(`The unsigned txn is: ${txn.txn}`);
  }
};

// provision();
// deviceAuthandUpgrade();

export default cli_tool;
