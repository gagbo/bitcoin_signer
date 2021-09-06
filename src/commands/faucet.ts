import type { Arguments, CommandBuilder } from 'yargs';
import { seedFromMnemonic } from '../lib/seeds';
import * as fs from 'fs';
import * as bitcoin from 'bitcoinjs-lib';
import * as praline from '../lib/praline-api';

const DEFAULT_NETWORK = bitcoin.networks.testnet;

type Options = {
  path: string;
  derivation: string;
  amount: number;
};

export const command: string = 'faucet <path> <derivation> <amount>';
export const desc: string = 'Use mnemonic at <path> to query for <amount> satoshis, on <derivation>';

export const builder: CommandBuilder<Options, Options> = (yargs) =>
  yargs
    .positional('path', { type: 'string', demandOption: true })
    .positional('derivation', { type: 'string', demandOption: true })
    .positional('amount', { type: 'number', demandOption: true });

export const handler = async (argv: Arguments<Options>): Promise<void> => {
  const { path, derivation, amount } = argv;
  const seedStr = fs.readFileSync(path, 'utf8');
  const seed = seedFromMnemonic(seedStr, DEFAULT_NETWORK);

  const keypair = bitcoin.ECPair.fromPrivateKey(
      seed.derivePath(derivation).privateKey,
      {network: DEFAULT_NETWORK});
  const address = bitcoin.payments.p2pkh(
      {pubkey: keypair.publicKey, network: DEFAULT_NETWORK}
  ).address;
  await praline.faucet_coins(amount, address);

  process.exit(0);
};