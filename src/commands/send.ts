import type { Arguments, CommandBuilder } from 'yargs';
import { seedFromMnemonic } from '../lib/seeds';
import { signWDTxWithSeed } from '../lib/sign';
import * as fs from 'fs';
import * as bitcoin from 'bitcoinjs-lib';
import * as wd from '../lib/wd-api';

const DEFAULT_NETWORK = bitcoin.networks.testnet;
const ROOT_WALLET_PATH= "m/49'/0'/0'";
const DEFAULT_WALLET_NAME= "help";

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
  const tx = await wd.build_transaction(DEFAULT_WALLET_NAME, amount, recipient);
  const signedTx = await signWDTxWithSeed(DEFAULT_WALLET_NAME, tx, wallet_root_key);
  await wd.broadcast_transaction(DEFAULT_WALLET_NAME, signedTx.raw_transaction, signedTx.signatures, signedTx.pubkeys);

  process.exit(0);
};
