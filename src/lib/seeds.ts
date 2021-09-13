import * as bip32 from 'bip32';
import { BIP32Interface } from 'bip32';
import * as bip39 from 'bip39';
import { Network } from 'bitcoinjs-lib';
import * as bitcoin from 'bitcoinjs-lib';
import { Logger } from "tslog";

const log: Logger = new Logger();

const DEFAULT_NETWORK: Network = bitcoin.networks.testnet;

export function seedFromMnemonic(mnemonic: string, network?: Network): BIP32Interface {
    bip39.validateMnemonic(mnemonic);

    const seed = bip39.mnemonicToSeedSync(mnemonic);
    return bip32.fromSeed(seed, network || DEFAULT_NETWORK);
}

export function seedFromHexStr(hexStr: string, network?: Network): BIP32Interface {
    const pattern = new RegExp('\s');

    const splitInput = hexStr.split(pattern);

    if (splitInput.length != 2) {
        log.fatal(new Error("hexStr doesn't have the correct format"));
    }

    return bip32.fromPrivateKey(
        Buffer.from(splitInput[0], "hex"),
        Buffer.from(splitInput[1], "hex"),
        network || DEFAULT_NETWORK);
}
