import * as bip32 from 'bip32';
import { BIP32Interface } from 'bip32';
import * as bip39 from 'bip39';

export function getSeed(mnemonic: string): BIP32Interface {
bip39.validateMnemonic(mnemonic);

const seed = bip39.mnemonicToSeedSync(mnemonic);
return bip32.fromSeed(seed);
}
