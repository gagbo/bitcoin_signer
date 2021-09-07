import type { Arguments, CommandBuilder } from 'yargs';
import { seedFromMnemonic } from '../lib/seeds';
import * as fs from 'fs';
import * as bitcoin from 'bitcoinjs-lib';
import * as praline from '../lib/praline-api';
import * as config from "../lib/config";

const DEFAULT_NETWORK = config.network().network;

type Options = {
    path: string;
    derivation: string;
    amount: number;
};

export const command: string = 'faucet <path> <derivation> <amount>';
export const desc: string = 'Use mnemonic at <path> to query for <amount> BTC, on <derivation>';

export const builder: CommandBuilder<Options, Options> = (yargs) =>
    yargs
        .positional('path', { type: 'string', demandOption: true })
        .positional('derivation', { type: 'string', demandOption: true })
        .positional('amount', { type: 'number', demandOption: true });

export const handler = async (argv: Arguments<Options>): Promise<void> => {
    const { path, derivation, amount } = argv;

    // Sanity check on path
    if (!derivation.startsWith(config.network().root_wallet_path)) {
        throw `Refusing to continue as ${derivation} doesn't start with ${config.network().root_wallet_path}: the funds will be unreachable from "send" later.`
    }

    const seedStr = fs.readFileSync(path, 'utf8');
    const seed = seedFromMnemonic(seedStr, DEFAULT_NETWORK);

    const keypair = bitcoin.ECPair.fromPrivateKey(
        seed.derivePath(derivation).privateKey,
        { network: DEFAULT_NETWORK });
    const address = bitcoin.payments.p2pkh(
        { pubkey: keypair.publicKey, network: DEFAULT_NETWORK }
    ).address;
    console.log("Mining a few blocks on Praline to have some leeway");
    console.log(await praline.mine_blocks(125));
    await praline.faucet_coins(amount, address);
    console.log("Mining 125 blocks on Praline to be sure the coins are spendable");
    console.log(await praline.mine_blocks(125));

    process.exit(0);
};
