import type { Arguments, CommandBuilder } from 'yargs';
import { getSeed } from '../lib/import-mnemonic';
import { Transaction } from 'bitcoinjs-lib';
import * as fs from 'fs';
import * as bitcoin from 'bitcoinjs-lib';

type Options = {
  path: string;
  tx: string;
};

export const command: string = 'sign <path> <tx>';
export const desc: string = 'Use mnemonic at <path> to sign a transaction <tx>';

export const builder: CommandBuilder<Options, Options> = (yargs) =>
  yargs
    .positional('path', { type: 'string', demandOption: true })
    .positional('tx', { type: 'string', demandOption: true });

export const handler = (argv: Arguments<Options>): void => {
  const { path, tx } = argv;
  process.stdout.write(`Args are\n\tPath: ${path}\n\tTx: ${tx}\n`);
  const seedStr = fs.readFileSync(path, 'utf8');
  const seed = getSeed(seedStr);
  const txStr = fs.readFileSync(tx, 'utf8');
  const parsed = Transaction.fromHex(txStr);
  process.stdout.write(`${parsed.toHex()}\n`);

  const keyPair = bitcoin.ECPair.fromPrivateKey(seed.derivePath("m/49'/1'/0'/0/0").privateKey, {'network': bitcoin.networks.testnet});
  const txb = bitcoin.TransactionBuilder.fromTransaction(parsed, bitcoin.networks.testnet);

  // This assumes all inputs are spending utxos sent to the same Dogecoin P2PKH address (starts with D)
  for (let i = 0; i < parsed.ins.length; i++) {
    txb.sign(i, keyPair);
  }

  const signedTxHex = txb.build().toHex();
  // Broadcast this signed raw transaction
  console.log(signedTxHex)

  process.exit(0);
};
