import * as bip32 from 'bip32';
import { BIP32Interface } from 'bip32';
import * as bip39 from 'bip39';
import { Network } from 'bitcoinjs-lib';
import * as bitcoin from 'bitcoinjs-lib';

export function getSeed(mnemonic: string, network?: Network): BIP32Interface {
bip39.validateMnemonic(mnemonic);

const seed = bip39.mnemonicToSeedSync(mnemonic);
return bip32.fromSeed(seed, network || bitcoin.networks.testnet);
}
