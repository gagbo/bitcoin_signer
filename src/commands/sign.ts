import type { Arguments, CommandBuilder } from 'yargs';
import { seedFromMnemonic } from '../lib/seeds';
import { signTxWithKeyPairs, generateKeychain } from '../lib/sign';
import { Transaction } from 'bitcoinjs-lib';
import * as fs from 'fs';
import * as config from '../lib/config';

type Options = {
  path: string;
  tx: string;
};

export const command = 'sign <path> <tx>';
export const desc = 'Use mnemonic at <path> to sign a transaction <tx>';

export const builder: CommandBuilder<Options, Options> = (yargs) =>
  yargs
    .positional('path', { type: 'string', demandOption: true })
    .positional('tx', { type: 'string', demandOption: true });

export const handler = (argv: Arguments<Options>): void => {
  const { path, tx } = argv;
  process.stdout.write(`Args are\n\tPath: ${path}\n\tTx: ${tx}\n`);
  const network = config.network().network;
  const seedStr = fs.readFileSync(path, 'utf8');
  const seed = seedFromMnemonic(seedStr, network);
  const txStr = fs.readFileSync(tx, 'utf8');
  const parsed = Transaction.fromHex(txStr);
  process.stdout.write(`${parsed.toHex()}\n`);

  const keyChain = generateKeychain(
    seed,
    ["m/49'/1'/0'/0/0",
     "m/49'/1'/1'/0/0",
     "m/49'/1'/1'/1/0",
     "m/49'/1'/1'/0/1",
     "m/49'/1'/1'/1/1",
     "m/49'/1'/1'/0/2",
     "m/49'/1'/1'/1/2",
     "m/49'/1'/2'/0/0"],
    network);
  const signedTx = signTxWithKeyPairs(parsed, keyChain, network);
  console.log(signedTx.toHex());

  process.exit(0);
};
