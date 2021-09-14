import type { Arguments, CommandBuilder } from 'yargs';
import { seedFromMnemonic } from '../lib/seeds';
import { signWDTxWithSeed } from '../lib/sign';
import * as fs from 'fs';
import { WdApi } from '../lib/wd-api';
import { PralineApi } from '../lib/praline-api';
import * as config from '../lib/config';
import { Logger } from "tslog";

const log: Logger = new Logger();

const DEFAULT_NETWORK = config.network().network;
const ROOT_WALLET_PATH = config.network().root_wallet_path;
const DEFAULT_WALLET_NAME = config.wallet_daemon().wallet_name;

type Options = {
    path: string;
    recipient: string;
    amount: number;
};

export const command = 'send <path> <recipient> <amount>';
export const desc = 'Use mnemonic at <path> to send <amount> satoshis, to <recipient>';

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
    const wd = new WdApi(config.wallet_daemon());
    const praline = new PralineApi(config.praline())

    await wd.init_account(DEFAULT_WALLET_NAME, wallet_root_key);
    await wd.synchronize_account(DEFAULT_WALLET_NAME);
    await wd.wait_for_synchronization(DEFAULT_WALLET_NAME);
    log.info("Initial operation list", await wd.get_operations(DEFAULT_WALLET_NAME));
    const balance = (await wd.get_account_info(DEFAULT_WALLET_NAME)).balance

    if (balance < (amount).toString()) {
        throw `Invalid balance ${balance}`
    }

    // Build and send
    const tx = await wd.build_transaction(DEFAULT_WALLET_NAME, amount, recipient);
    const signedTx = await signWDTxWithSeed(DEFAULT_WALLET_NAME, tx, wallet_root_key, config.praline());
    const txHash = await wd.broadcast_transaction(
        DEFAULT_WALLET_NAME,
        signedTx.raw_transaction,
        signedTx.signatures,
        signedTx.pubkeys);

    // Check optimistic update
    log.info("Wait for 1 seconds for the operation query to find the last op (the request is too strict)")
    await new Promise((resolve) => {
        setTimeout(resolve, 1000);
    });
    log.info("Operations after optimistic updates", await wd.get_operations(DEFAULT_WALLET_NAME));
    if (!(await wd.is_transaction_on_wallet_daemon(DEFAULT_WALLET_NAME, txHash))) {
        throw `Transaction ${txHash} does not appear on Wallet daemon just after broadcast`
    }

    // Check transactions after it's confirmed
    log.info("Mining a few blocks on Praline to have some confirmations");
    log.info(await praline.mine_blocks(20));
    log.info("Displaying operations after synchronization to confirm the tx has been updated");
    await wd.synchronize_account(DEFAULT_WALLET_NAME);
    await wd.wait_for_synchronization(DEFAULT_WALLET_NAME); // This seems to fail, so we are manually waiting as well
    log.info("Wait for 1 seconds for the operation query to find the last op (the request is too strict)")
    await new Promise((resolve) => {
        setTimeout(resolve, 1000);
    });
    log.info("Operations after synchronization", await wd.get_operations(DEFAULT_WALLET_NAME));
    if (!(await wd.is_transaction_on_wallet_daemon(DEFAULT_WALLET_NAME, txHash))) {
        throw `Transaction ${txHash} does not appear on Wallet daemon after synchronization`
    }

    process.exit(0);
};
