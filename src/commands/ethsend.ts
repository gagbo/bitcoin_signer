import type { Arguments, CommandBuilder } from 'yargs';
import { seedFromMnemonic } from '../lib/seeds';
import { signWDEthTxWithSeed } from '../lib/sign';
import * as fs from 'fs';
import { WdApi } from '../lib/wd-api';
import * as config from '../lib/config';
import { Address } from 'ethereumjs-util';
import { Network } from 'bitcoinjs-lib';

const DEFAULT_NETWORK: Network = {
  messagePrefix: '\x18Ethereum signed message:\n',
  bech32: '',
  bip32: {
    public: 0x043587CF,
    private: 0x00000000,
  },
  pubKeyHash: 0x00,
  scriptHash: 0x05,
  wif: 0x80,
};

const DEFAULT_WALLET_NAME = config.wallet_daemon().wallet_name;

type Options = {
    path: string;
    recipient: string;
    amount: number;
};

export const command = 'ethsend <path> <recipient> <amount>';
export const desc = 'Use mnemonic at <path> to send <amount> eth, to <recipient>';

export const builder: CommandBuilder<Options, Options> = (yargs) =>
    yargs
        .positional('path', { type: 'string', demandOption: true })
        .positional('recipient', { type: 'string', demandOption: true })
        .positional('amount', { type: 'number', demandOption: true })
        .fail(false);

export const handler = async (argv: Arguments<Options>): Promise<void> => {
    const { path, recipient, amount } = argv;
    const seedStr = fs.readFileSync(path, 'utf8');
    const seed = seedFromMnemonic(seedStr, DEFAULT_NETWORK);

    const wallet_root_key = seed.derivePath("m/49'/1'/0'");
    const account_key = wallet_root_key.derivePath("0/0");
    console.log(`Receive address: ${Address.fromPrivateKey(account_key.privateKey).toString()}`)
    const wd = new WdApi(config.wallet_daemon());

    await wd.init_eth_account(DEFAULT_WALLET_NAME, wallet_root_key);
    await wd.synchronize_account(DEFAULT_WALLET_NAME);
    await wd.wait_for_synchronization(DEFAULT_WALLET_NAME);
    console.log(await wd.get_operations(DEFAULT_WALLET_NAME));
    const info = (await wd.get_account_info(DEFAULT_WALLET_NAME));
    console.log(JSON.stringify(info, null, 2));
    const balance = info.balance

    console.log(`Balance: ${balance}`);
    if (balance < (amount).toString()) {
        throw `Invalid balance ${balance}`
    }

    // Build and send
    const tx = await wd.build_eth_transaction(DEFAULT_WALLET_NAME, amount, recipient);
    console.log(`Unsigned tx is ${JSON.stringify(tx, null, 2)}`)
    const signedTx = signWDEthTxWithSeed(tx, account_key);
    const txHash = await wd.broadcast_eth_transaction(
        DEFAULT_WALLET_NAME,
        signedTx.raw_transaction,
        signedTx.signatures);

    // Check optimistic update
    console.log("Wait for 3 seconds for the update to hit database (contention on database ?)")
    await new Promise((resolve) => {
        setTimeout(resolve, 3000);
    });
    console.log("Displaying operations to confirm the optimistic update worked");
    console.log(await wd.get_operations(DEFAULT_WALLET_NAME));
    if (!(await wd.is_transaction_on_wallet_daemon(DEFAULT_WALLET_NAME, txHash))) {
        throw `Transaction ${txHash} does not appear on Wallet daemon just after broadcast`
    }

    console.log("Wait for 5 minutes for the update to hit blockchain (be careful with gas though)")
    await new Promise((resolve) => {
        setTimeout(resolve, 300000);
    });
    await wd.synchronize_account(DEFAULT_WALLET_NAME);
    await wd.wait_for_synchronization(DEFAULT_WALLET_NAME);
    // This seems to fail, so we are manually waiting as well
    console.log("Wait for 3 seconds for the update to hit database (contention on database ?)")
    await new Promise((resolve) => {
        setTimeout(resolve, 3000);
    });
    console.log(await wd.get_operations(DEFAULT_WALLET_NAME));
    if (!(await wd.is_transaction_on_wallet_daemon(DEFAULT_WALLET_NAME, txHash))) {
        throw `Transaction ${txHash} does not appear on Wallet daemon after synchronization`
    }

    process.exit(0);
};
