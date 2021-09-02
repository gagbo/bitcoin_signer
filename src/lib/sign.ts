import { BIP32Interface } from 'bip32';
import { Transaction, ECPairInterface, Network } from 'bitcoinjs-lib';
import * as bitcoin from 'bitcoinjs-lib';

export function signTxWithKeyPairs(tx: Transaction, keyPairs: ECPairInterface[]): Transaction {
    const txb = bitcoin.TransactionBuilder.fromTransaction(tx, bitcoin.networks.testnet);

    // This assumes all inputs are spending utxos sent to the same Dogecoin P2PKH address (starts with D)
    for (let i = 0; i < tx.ins.length; i++) {
        txb.sign(i, keyPairs[0]);
    }

    const signedTx = txb.build();
    return signedTx;
}

export function generateKeychain(seed: BIP32Interface, paths: string[], network?: Network): ECPairInterface[] {
    return paths.map(function(path, _index, _) {
        return bitcoin.ECPair.fromPrivateKey(
            seed.derivePath(path).privateKey,
            { 'network': network || bitcoin.networks.testnet });
    });
}
