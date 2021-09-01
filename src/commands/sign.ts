import type { Arguments, CommandBuilder } from 'yargs';
import { getSeed } from '../lib/import-mnemonic';
import * as fs from 'fs';

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
  process.stdout.write(`Args are\n\tPath: ${path}\n\tTx: ${tx}`);
  getSeed(fs.readFileSync(path, 'utf8'));
  process.exit(0);
};
