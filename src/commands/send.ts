import type { Arguments, CommandBuilder } from 'yargs';
import { seedFromMnemonic } from '../lib/seeds';
import { signWDTxWithSeed } from '../lib/sign';
import * as fs from 'fs';
import * as bitcoin from 'bitcoinjs-lib';
import * as wd from '../lib/wd-api';
import * as praline from '../lib/praline-api';

const DEFAULT_NETWORK = bitcoin.networks.testnet;
const ROOT_WALLET_PATH = "m/49'/1'/0'";
const DEFAULT_WALLET_NAME = "help";

type Options = {
    path: string;
    recipient: string;
    amount: number;
};

export const command: string = 'send <path> <recipient> <amount>';
export const desc: string = 'Use mnemonic at <path> to send <amount> satoshis, to <recipient>';

export const builder: CommandBuilder<Options, Options> = (yargs) =>
    yargs
        .positional('path', { type: 'string', demandOption: true })
        .positional('recipient', { type: 'string', demandOption: true })
        .positional('amount', { type: 'number', demandOption: true });

export const handler = async (argv: Arguments<Options>): Promise<void> => {
    const { path, recipient, amount } = argv;
    const seedStr = fs.readFileSync(path, 'utf8');
    const seed = seedFromMnemonic(seedStr, DEFAULT_NETWORK);

    const wallet_root_key = seed.derivePath(ROOT_WALLET_PATH);

    await wd.init_account(DEFAULT_WALLET_NAME, wallet_root_key);
    await wd.synchronize_account(DEFAULT_WALLET_NAME);
    console.log(await wd.get_operations(DEFAULT_WALLET_NAME));
    const balance = (await wd.get_account_info(DEFAULT_WALLET_NAME)).balance

    if (balance < (amount).toString()) {
        throw `Invalid balance ${balance}`
    }

    const tx = await wd.build_transaction(DEFAULT_WALLET_NAME, amount, recipient);
    const signedTx = await signWDTxWithSeed(DEFAULT_WALLET_NAME, tx, wallet_root_key);
    const txHash = await wd.broadcast_transaction(
        DEFAULT_WALLET_NAME,
        signedTx.raw_transaction,
        signedTx.signatures,
        signedTx.pubkeys);
    console.log("Displaying operations to confirm the optimistic update worked");
    console.log(await wd.get_operations(DEFAULT_WALLET_NAME));
    if (!(await wd.is_transaction_on_wallet_daemon(DEFAULT_WALLET_NAME, txHash))) {
        throw `Transaction ${txHash} does not appear on Wallet daemon just after broadcast`
    }
    console.log("Mining a few blocks on Praline to have some confirmations");
    console.log(await praline.mine_blocks(20));
    console.log("Displaying operations after synchronization to confirm the tx has been updated");
    await wd.synchronize_account(DEFAULT_WALLET_NAME);
    console.log(await wd.get_operations(DEFAULT_WALLET_NAME));
    if (!(await wd.is_transaction_on_wallet_daemon(DEFAULT_WALLET_NAME, txHash))) {
        throw `Transaction ${txHash} does not appear on Wallet daemon after synchronization`
    }

    process.exit(0);
};
