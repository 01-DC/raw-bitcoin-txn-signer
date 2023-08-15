// ToDo add this.token in secrets for public repository
// ToDo Get the funds_check function approved by Vipul sir.
// ToDO fetch the feerate from an API.
// ToDo solve discripency between generate_metadata, and generate_unsigned_transaction, fundscheck. (Input parameters)
// ToDo feerate https://api.blockcypher.com/v1/btc/main
import * as bitcoin from 'bitcoinjs-lib';
import * as bip32 from 'bip32';
import { default as axios } from 'axios';
// const coinselect = require('coinselect');
// @ts-ignore
import coinselect from 'coinselect';
import { coins as COINS, config } from '../config';
import { intToUintByte, hexToAscii } from '../bytes';
import { default as crypto } from 'crypto';
// const Transaction = require('ethereumjs-tx').Transaction;
// import {Transaction} from 'ethereum-tx';
import { default as Datastore } from 'nedb';
// @ts-ignore
import * as logs from 'simple-node-logger';
//check this
// const web3 = new Web3(
//   new Web3.providers.HttpProvider(
//     'https://ropsten.infura.io/v3/a4f75c8bc5324e10b1b54f79f4e84986'
//   )
// );

const log = logs.createSimpleFileLogger('project.log');

// Adding coins to the bitcoin library networks
// @ts-ignore
bitcoin.networks.litecoin = {
  messagePrefix: '\x19Litecoin Signed Message:\n',
  bip32: {
    public: 0x0488b21e,
    private: 0x0488ade4,
  },
  pubKeyHash: 0x30,
  scriptHash: 0x32,
  wif: 0xb0,
};

// @ts-ignore
bitcoin.networks.dash = {
  messagePrefix: '\x19Dashcoin Signed Message:\n',
  bip32: {
    public: 0x0488b21e,
    private: 0x0488ade4,
  },
  pubKeyHash: 0x4c,
  scriptHash: 0x10,
  wif: 0xcc,
};

// @ts-ignore
bitcoin.networks.dogecoin = {
  messagePrefix: '\x19Dogecoin Signed Message:\n',
  bip32: {
    public: 0x0488b21e,
    private: 0x0488ade4,
  },
  pubKeyHash: 0x1e,
  scriptHash: 0x16,
  wif: 0x9e,
};

// Class Wallet:
// Can be built from an xPub and coin_type
// BTC
// BTC_TESTNET
// DOGE
// DASH
// LTC

/**
 * @class Wallet - Creates a Wallet object with its xpub and the coin type.
 *
 * @member coinType - The name of the cryptocurrency
 * @member xpub - Extended Public key of the wallet
 * @member external - The name of the list of recieve addresses of the wallet. Named as "re" plus the first 10 bytes of sha256 hash of the xpub.
 * @member internal - The name of the list of change addresses of the wallet. Named as "ch" plus the first 10 bytes of sha256 hash of the xpub.
 * @member network - Type of network (Bitcoin, Litecoin).
 * @coin_url - URL snippet of the coin for api calls.
 * @api_url - Base URL of the API plus the @coin_url
 */
export class Wallet {
  // xpub in base58
  coinType: string;
  xpub: string;
  external: string;
  internal: string;
  network: any;
  coin_url: string;
  api_url: string;

  /**
   * @constructor Takes in the xpub and coin type and creates the wallet object
   * @param xpub - Extended Public key to be used
   * @param coinType - The type of coin to be used
   *
   * @returns The wallet object
   */
  constructor(xpub: any, coinType: any) {
    this.coinType = coinType;
    this.xpub = xpub;
    const hash = crypto
      .createHash('sha256')
      .update(xpub)
      .digest('hex')
      .slice(0, 20); // because we only need the first 16 bytes

    this.external = `re${hash}`;
    this.internal = `ch${hash}`;

    switch (coinType) {
      case COINS.BTC:
        this.network = bitcoin.networks.bitcoin;
        this.coin_url = 'btc/main/';
        break;

      case COINS.BTC_TESTNET:
        this.network = bitcoin.networks.testnet;
        this.coin_url = 'btc/test3/';
        break;

      case COINS.LTC:
        // @ts-ignore
        this.network = bitcoin.networks.litecoin;
        this.coin_url = 'ltc/main/';
        break;

      case COINS.DASH:
        // @ts-ignore
        this.network = bitcoin.networks.dash;
        this.coin_url = 'dash/main/';
        break;

      case COINS.DOGE:
        // @ts-ignore
        this.network = bitcoin.networks.dogecoin;
        this.coin_url = 'doge/main/';
        break;

      default:
        throw new Error('Please Provide a Valid Coin Type');
    }

    this.api_url = 'http://api.blockcypher.com/v1/' + this.coin_url;
  }

  // chain, 0 for external, 1 for internal
  /**
   * Generated a list of addresses from the start address index till the end address index. Takes the chain index as a parameter.
   *
   * @param chain - The chain index. 0 for external (recieve), 1 for internal (change).
   * @param start - Start of the address index.
   * @param end - Last address index to be generated.
   *
   * @returns List of addresses
   */
  address_list(chain: number, start: number, end: number) {
    const addresses = [];

    for (let i = start; i < end; i++) {
      const address = bitcoin.payments.p2pkh({
        pubkey: bip32
          .fromBase58(this.xpub, this.network)
          .derive(chain)
          .derive(i).publicKey,
        network: this.network,
      }).address;
      addresses.push(address);
    }

    return addresses;
  }

  getEthAddress = () => {
    return '0xA4028f8dC64D18F0a66668d97473C47444A561Ea';
  };

  /**
   * Uploades the list of addresses to the server.
   *
   * @param name - Name of the list of addresses
   * @param addresses - List of addresses
   *
   * @returns 1 if successful, 0 if failed
   */
  upload_wallet(name: string, addresses: any) {
    log.info({
      name,
      addresses,
    });
    axios
      .post(this.api_url + `wallets?token=${config.BLOCKCYPHER_API_KEY}`, {
        name,
        addresses,
      })
      .then((response: any) => {
        console.log('Adding a new wallet suceessful');
        return 1;
      })
      .catch((error: any) => {
        console.log('An error occured:' + error);
        return 0;
      });
  }

  /**
   * Uploads more addresses to already existing online wallet.
   *
   * @param name - name of the wallet in which to add list of addresses.
   * @param addresses - list of addresses to add to online wallet
   *
   * @returns 1 if successful, 0 if failed
   */
  add_addresses_to_online_wallet(name: string, addresses: any) {
    axios
      .post(
        this.api_url +
          'wallets/' +
          name +
          `/addresses?token=${config.BLOCKCYPHER_API_KEY}`,
        {
          name,
          addresses,
        }
      )
      .then((response: any) => {
        console.log('Adding new addresses suceessful');
        return 1;
      })
      .catch((error: any) => {
        console.log('An error occured:' + error);
        return 0;
      });
  }

  /**
   * Fetches the list of addresses from the online wallet.
   *
   * @param name name of the list to fetch
   *
   * @returns The list of addresses
   */
  async fetch_wallet(name: string) {
    const res = await axios.get(
      this.api_url + '/addrs/' + name + `?token=${config.BLOCKCYPHER_API_KEY}`
    );
    return res.data;
  }

  /**
   * Checks both the list of addresses online, the recieve and change addresses, and concatinates the utxos in one list.
   *
   * @returns list of unspent output transactions
   */
  async fetch_utxo() {
    const utxos = [];

    let res: any = await axios.get(
      this.api_url +
        'addrs/' +
        this.external +
        `?token=${config.BLOCKCYPHER_API_KEY}&unspentOnly=true`
    );

    console.log(res);

    res = res.data.txrefs;
    console.log(res);

    //changed for ts-lint
    for (const i in res) {
      // addresses.push(res["data"]["txrefs"][i]["address"]);
      const utxo = {
        address: res[i].address,
        txId: res[i].tx_hash,
        vout: res[i].tx_output_n,
        value: res[i].value,
        block_height: res[i].block_height,
        vin: res[i].tx_input_n,
        ref_balance: res[i].ref_balance,
        confirmations: res[i].confirmations,
      };

      utxos.push(utxo);
    }

    res = await axios.get(
      this.api_url +
        'addrs/' +
        this.internal +
        `?token=${config.BLOCKCYPHER_API_KEY}&unspentOnly=true`
    );

    res = res.data.txrefs;

    for (const i in res) {
      // addresses.push(res["data"]["txrefs"][i]["address"]);

      const utxo = {
        address: res[i].address,
        txId: res[i].tx_hash,
        vout: res[i].tx_output_n,
        value: res[i].value,
        block_height: res[i].block_height,
        vin: res[i].tx_input_n,
        ref_balance: res[i].ref_balance,
        confirmations: res[i].confirmations,
      };

      utxos.push(utxo);
    }
    // console.log(utxos);
    return utxos;
  }

  /**
   * @returns Total balance avaliable in this wallet.
   */
  async get_total_balance() {
    let res: any = await axios.get(
      this.api_url +
        'addrs/' +
        this.external +
        `?token=${config.BLOCKCYPHER_API_KEY}&unspentOnly=true`
    );
    res = res.data;
    // console.log(res);
    let balance = res.balance;
    let unconfirmed_balance = res.unconfirmed_balance;
    let final_balance = res.final_balance;
    // console.log({});

    res = await axios.get(
      this.api_url +
        'addrs/' +
        this.internal +
        `?token=${config.BLOCKCYPHER_API_KEY}&unspentOnly=true`
    );
    res = res.data;
    balance = balance + res.balance;
    unconfirmed_balance = unconfirmed_balance + res.unconfirmed_balance;
    final_balance = final_balance + res.final_balance;

    return { balance, unconfirmed_balance, final_balance };
  }

  /**
   * Scans the online list of change addresses for an unused addresses, if not found, then generates one.
   * @returns an unused change address.
   */
  async get_change_address() {
    let change_addresses: any = await axios.get(
      this.api_url +
        'addrs/' +
        this.internal +
        `?token=${config.BLOCKCYPHER_API_KEY}`
    );
    change_addresses = change_addresses.data;

    const original_length = change_addresses.wallet.addresses.length;

    let change_add;
    for (const i in change_addresses.txrefs) {
      if (
        change_addresses.wallet.addresses.includes(
          change_addresses.txrefs[i].address
        )
      ) {
        change_addresses.wallet.addresses.splice(i, 1);
        break;
      }
    }

    if (change_addresses.wallet.addresses.length === 0) {
      change_add = this.address_list(
        1,
        original_length,
        original_length + 1
      )[0];
    } else {
      change_add = change_addresses.wallet.addresses[0];
    }

    return change_add;
  }

  /**
   * Scans the online list of recieve addresses for an unused addresses, if not found, then generates one.
   * @returns an unused recieve address.
   */

  async get_recieve_address() {
    if (this.coinType === COINS.ETH) {
      return this.getEthAddress();
    }
    let recieveAddress: any = await axios.get(
      this.api_url +
        'addrs/' +
        this.external +
        `?token=${config.BLOCKCYPHER_API_KEY}`
    );
    recieveAddress = recieveAddress.data;

    const original_length = recieveAddress.wallet.addresses.length;

    let recieve_add;
    for (const i in recieveAddress.txrefs) {
      if (
        recieveAddress.wallet.addresses.includes(
          recieveAddress.txrefs[i].address
        )
      ) {
        recieveAddress.wallet.addresses.splice(i, 1);
        break;
      }
    }

    if (recieveAddress.wallet.addresses.length === 0) {
      recieve_add = this.address_list(
        1,
        original_length,
        original_length + 1
      )[0];
    } else {
      recieve_add = recieveAddress.wallet.addresses[0];
    }

    return recieve_add;
  }

  /**
   * Checks if the user has enough funds for a transaction using the coinselect library
   * @param targets - A list of objects containing the addresses and its amounts. The amounts should be in the lowest denomination, example satoshi for bitcoin.
   * Example
   * ```ts
   * targets = [
   * 	{
   * 		"address" : "iNZ5pzgE9Q7RUtLzeVeQtH1QBXjZZgDUT7",
   * 		"value" : 10000
   * 	},
   * {
   * 		"address" : "iChm39XZpJ8uSX5e2xSh8EUFHTbxG4hFVX",
   * 		"value" : 12000
   * 	}
   * ]
   * ```
   *
   * @returns 1 if user has enough funds, 0 if the user does not.
   *
   */
  async funds_check(targets: any) {
    // let targets: any = [];

    // for (let i in output_addresses) {
    // 	let t = {
    // 		"address": output_addresses[i],
    // 		"value": amounts[i]
    // 	};
    // 	targets[i] = t;
    // }
    // console.log(targets);
    const utxos = await this.fetch_utxo();
    const { inputs, outputs, fee } = coinselect(utxos, targets, 10);

    if (!inputs || !outputs) {
      return 0;
    }

    return 1;
  }

  /**
   *
   * @param address - The address whose chain index is to be found.
   *
   * @returns the chain and address index of an address.
   */
  get_chain_address_index(address: string) {
    // 1000 is a soft limit. It suggests that the address provided may be wrong, but that is a rare case
    let chain_index;
    let address_index;
    for (let i = 0; i < 1000; i++) {
      if (
        address ===
        bitcoin.payments.p2pkh({
          pubkey: bip32.fromBase58(this.xpub, this.network).derive(0).derive(i)
            .publicKey,
          network: this.network,
        }).address
      ) {
        chain_index = 0;
        address_index = i;
        break;
      }

      if (
        address ===
        bitcoin.payments.p2pkh({
          pubkey: bip32.fromBase58(this.xpub, this.network).derive(1).derive(i)
            .publicKey,
          network: this.network,
        }).address
      ) {
        chain_index = 1;
        address_index = i;
        break;
      }
    }

    return { chain_index, address_index };
  }

  /**
   *
   * @param outputList - List of objects of addresses and amounts to send.
   * Example
   * ```ts
   * targets = [
   * 	{
   * 		"address" : "iNZ5pzgE9Q7RUtLzeVeQtH1QBXjZZgDUT7",
   * 		"value" : 10000
   * 	},
   * {
   * 		"address" : "iChm39XZpJ8uSX5e2xSh8EUFHTbxG4hFVX",
   * 		"value" : 12000
   * 	}
   * ]
   * ```
   *
   * @returns Metadata for the hardware to generate addresses and verify coins.
   *
   */
  generateMetaData = async (outputList: any) => {
    const purposeIndex = '8000002c';
    let coinIndex;

    if (this.coinType === COINS.BTC)
      // x
      coinIndex = '80000000';
    if (this.coinType === COINS.BTC_TESTNET) coinIndex = '80000001';
    if (this.coinType === COINS.LTC) coinIndex = '80000002';
    if (this.coinType === COINS.DASH) coinIndex = '80000005';
    if (this.coinType === COINS.DOGE) coinIndex = '80000003';
    // if (this.coinType === COINS.ETH) coinIndex = '8000003c'

    const accountIndex = '80000000';

    const utxos = await this.fetch_utxo();

    const feeRate = 1; // Yet to fetch this from an API

    const { inputs, outputs, fee } = coinselect(utxos, outputList, feeRate);

    if (!inputs || !outputs) {
      throw new Error('Insufficient funds');
    }

    const change_add = await this.get_change_address();

    const input_count = String(inputs.length);

    // all inputs: their chain index and address index
    let input_string = '';

    //changed for ts-lint
    for (const i of inputs) {
      const ch_addr_in = this.get_chain_address_index(i.address);
      input_string = input_string + intToUintByte(ch_addr_in.chain_index, 32);
      input_string = input_string + intToUintByte(ch_addr_in.address_index, 32);
    }

    const output_count = 0;
    const output_string = '0000000000000000';

    // for (let i in outputs) {
    // 	if ("address" in outputs[i]) {
    // 		let ch_addr_in = this.get_chain_address_index(outputs[i].address);
    // 		output_string = output_string + intToUintByte(ch_addr_in.chain_index, 32);
    // 		output_string = output_string + intToUintByte(ch_addr_in.address_index, 32);
    // 		output_count++;
    // 	}
    // }

    let change_count = 0;
    let change_string = '';
    // log.info('Ourputs : ' + JSON.stringify(outputs));
    for (const i in outputs) {
      if (!('address' in outputs[i])) {
        const ch_addr_in = this.get_chain_address_index(change_add);
        change_string =
          change_string + intToUintByte(ch_addr_in.chain_index, 32);
        change_string =
          change_string + intToUintByte(ch_addr_in.address_index, 32);
        change_count++;
      }
    }
    // console.log(purposeIndex + " " + coinIndex + " " + accountIndex + " " + intToUintByte(input_count, 8) + " " + input_string + " " + intToUintByte(output_count, 8) + " " + output_string + " " + intToUintByte(change_count, 8) + " " + change_string);
    return (
      purposeIndex +
      coinIndex +
      accountIndex +
      intToUintByte(input_count, 8) +
      input_string +
      intToUintByte(output_count, 8) +
      output_string +
      intToUintByte(change_count, 8) +
      change_string
    );
  };

  /**
   *
   * @param targets - List of objects of addresses and amounts to send.
   * Example
   * ```ts
   * targets = [
   * 	{
   * 		"address" : "iNZ5pzgE9Q7RUtLzeVeQtH1QBXjZZgDUT7",
   * 		"value" : 10000
   * 	},
   * {
   * 		"address" : "iChm39XZpJ8uSX5e2xSh8EUFHTbxG4hFVX",
   * 		"value" : 12000
   * 	}
   * ]
   * ```
   * @param fees - 'l' for low, 'm' for medium, 'h' for high.
   *
   * @returns Unsigned transaction to send cryptocurrency to the targeted list of addresses with a corrosponding fees.
   *
   */
  async generateUnsignedTransaction(targets: any, fees: any) {
    const change_add = await this.get_change_address();

    let res: any = await axios.get(this.api_url);
    res = res.data;
    let fee_rate: any;

    // Blockcypher gives fee_rate in satoshi per kb
    switch (fees) {
      case 'l':
        fee_rate = res.low_fee_per_kb;
        break;
      case 'm':
        fee_rate = res.medium_fee_per_kb;
        break;
      case 'h':
        fee_rate = res.high_fee_per_kb;
        break;
      default:
        throw new Error('Wrong Fees Type');
    }

    // coinselect takes fees in satoshi per byte
    fee_rate = Math.round(fee_rate / 1024);
    const utxos = await this.fetch_utxo();
    const { inputs, outputs, fee } = coinselect(utxos, targets, fee_rate);

    if (!inputs || !outputs) {
      throw new Error('Insufficient funds');
    }

    for (const i in outputs) {
      if (!('address' in outputs[i])) {
        outputs[i].address = change_add;
      }
    }

    for (const i of inputs) {
      i.scriptPubKey = bitcoin.address.toOutputScript(i.address, this.network);
    }

    const txBuilder = new bitcoin.TransactionBuilder(this.network);

    for (const input of inputs) {
      const scriptPubKey = input.scriptPubKey;
      txBuilder.addInput(
        input.txId,
        input.vout,
        0xffffffff,
        Buffer.from(scriptPubKey, 'hex')
      );
    }
    //changes for ts-lint
    for (const output of outputs) {
      txBuilder.addOutput(output.address, output.value);
    }

    const tx: any = txBuilder.buildIncomplete();

    for (const i in inputs) {
      if (inputs.hasOwnProperty(i)) {
        const input = inputs[i];

        tx.ins[i].script = Buffer.from(input.scriptPubKey, 'hex');
      }
    }

    console.log('Unsigned Transaction :' + tx.toHex());

    //01000000 is the SigHash code for unsigned transaction
    return tx.toHex() + '01000000';
  }

  // async generateUnsignedTransactionEth(
  //   address: any,
  //   gasPrice: any,
  //   gasLimit: any,
  //   value: any
  // ) {
  //   const rawTx = {
  //     nonce: await web3.eth.getTransactionCount(
  //       '0xA4028f8dC64D18F0a66668d97473C47444A561Ea'
  //     ),
  //     gasPrice: Web3.utils.toHex(20000000000),
  //     gasLimit: Web3.utils.toHex(100000),
  //     to: address,
  //     value: Web3.utils.toHex(1000),
  //   };

  //   const transaction = new Transaction(rawTx);
  //   return transaction.serialize().toString('hex');
  // }

  /**
   * @returns a derivation path to a new and unused recieve address
   */
  create_derivation_path = async () => {
    const recieve_address = await this.get_recieve_address();

    const purposeIndex = '8000002c';
    let coinIndex;

    if (this.coinType === COINS.BTC)
      // x
      coinIndex = '80000000';
    if (this.coinType === COINS.BTC_TESTNET) coinIndex = '80000001';
    if (this.coinType === COINS.LTC) coinIndex = '80000002';
    if (this.coinType === COINS.DASH) coinIndex = '80000005';
    if (this.coinType === COINS.DOGE) coinIndex = '80000003';
    // if (this.coinType === COINS.ETH) coinIndex = '8000003c';

    const accountIndex = '80000000';

    const internal_external_index = '00000000';

    const address_index = intToUintByte(
      this.get_chain_address_index(recieve_address).address_index,
      32
    );

    return (
      purposeIndex +
      coinIndex +
      accountIndex +
      internal_external_index +
      address_index
    );
  };
}
