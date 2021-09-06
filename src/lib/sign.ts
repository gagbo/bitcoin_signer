import { BIP32Interface } from 'bip32';
import { Transaction, ECPairInterface, Network } from 'bitcoinjs-lib';
import * as bitcoin from 'bitcoinjs-lib';
import { Transaction as WDTransaction} from './wd-api';
import * as praline from './praline-api';

const DEFAULT_NETWORK: Network = bitcoin.networks.testnet;

export function signTxWithKeyPairs(tx: Transaction, keyPairs: ECPairInterface[]): Transaction {
    const txb = bitcoin.TransactionBuilder.fromTransaction(tx, DEFAULT_NETWORK);


    // This assumes all inputs are spending utxos sent to the same Dogecoin P2PKH address (starts with D)
    for (let i = 0; i < tx.ins.length; i++) {
        const keyChainSize = keyPairs.length;
        for (let j = 0; j < keyChainSize; j++) {
            try {
                txb.sign(i, keyPairs[j]);
                break;
            } catch (_e) {
                if (j == keyChainSize - 1) {
                    throw `All ${keyChainSize} keys in the keychain have been tested and none can sign this tx's input ${i}`;
                }
            }
        }
    }

    const signedTx = txb.build();
    return signedTx;
}

export function generateKeychain(seed: BIP32Interface, paths: string[], network?: Network): ECPairInterface[] {
    return paths.map(function(path, _index, _) {
        return bitcoin.ECPair.fromPrivateKey(
            seed.derivePath(path).privateKey,
            { 'network': network || DEFAULT_NETWORK });
    });
}

export async function signWDTxWithSeed(wallet_name: string, tx: WDTransaction, root_key: BIP32Interface, network?: Network): Promise<{
    raw_transaction: string,
    signatures: string[],
    pubkeys: string[]
}> {
    let private_keys = [];
    let index = 0;
    for (let input of tx.inputs) {
        for (let path in input.derivation_paths) {
            const components = path.split('/');
            // Only taking the last 2 components of the path, as it is assumed that the wallet was built with m/X/Y/Z given as the "root"
            const node = root_key.derive(parseInt(components[components.length - 2])).derive(parseInt(components[components.length - 1]));
            const keypair = bitcoin.ECPair.fromPrivateKey(node.privateKey, {network: network || DEFAULT_NETWORK});
            private_keys.push(keypair.toWIF());
            const address = bitcoin.payments.p2pkh({pubkey: keypair.publicKey, network: network || DEFAULT_NETWORK}).address;
            console.log(`Input #${index} WIF ${keypair.toWIF()} (address: ${address}, path: ${components[components.length - 2]}/${components[components.length - 1]})`);
            index += 1;
        }
    }

    // Assuming that the Praline ID is the wallet name
    const { signatures, pubkeys } = await praline.signWDTransaction(wallet_name, tx, private_keys);

    return {
        signatures: signatures,
        pubkeys: pubkeys,
        raw_transaction: tx.raw_transaction
    };
}
