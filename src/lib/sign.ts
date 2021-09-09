import { BIP32Interface } from 'bip32';
import { Transaction, ECPairInterface, Network } from 'bitcoinjs-lib';
import * as bitcoin from 'bitcoinjs-lib';
import { Transaction as WDTransaction, EthTransaction as WDEthTransaction } from './wd-api';
import { PralineApi, PralineConfig } from './praline-api';
import { Transaction as EthTransaction } from '@ethereumjs/tx';
import * as ethUtil from 'ethereumjs-util';
import { Address } from 'ethereumjs-util';
import Common, { Chain, Hardfork } from '@ethereumjs/common';

const DEFAULT_NETWORK: Network = bitcoin.networks.testnet;

export function signTxWithKeyPairs(tx: Transaction, keyPairs: ECPairInterface[], network?: Network): Transaction {
    const txb = bitcoin.TransactionBuilder.fromTransaction(tx, network || DEFAULT_NETWORK);


    // This assumes all inputs are spending utxos sent to the same Dogecoin P2PKH address (starts with D)
    for (let i = 0; i < tx.ins.length; i++) {
        const keyChainSize = keyPairs.length;
        for (let j = 0; j < keyChainSize; j++) {
            try {
                txb.sign(i, keyPairs[j]);
                break;
            } catch (_e) {
                if (j == keyChainSize - 1) {
                    if (keyChainSize == 1) {
                        throw `The single key in the keychain cannot sign this tx's input ${i}`;
                    }
                    throw `All ${keyChainSize} key(s) in the keychain have been tested and none can sign this tx's input ${i}`;
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

export async function signWDTxWithSeed(wallet_name: string, tx: WDTransaction, root_key: BIP32Interface, praline_config: PralineConfig, network?: Network): Promise<{
    raw_transaction: string,
    signatures: string[],
    pubkeys: string[]
}> {
    const private_keys = [];
    let index = 0;
    for (const input of tx.inputs) {
        for (const path in input.derivation_paths) {
            const components = path.split('/');
            // Only taking the last 2 components of the path, as it is assumed that the wallet was built with m/X/Y/Z given as the "root"
            const node = root_key.derive(parseInt(components[components.length - 2])).derive(parseInt(components[components.length - 1]));
            const keypair = bitcoin.ECPair.fromPrivateKey(node.privateKey, { network: network || DEFAULT_NETWORK });
            private_keys.push(keypair.toWIF());
            const address = bitcoin.payments.p2pkh({ pubkey: keypair.publicKey, network: network || DEFAULT_NETWORK }).address;
            console.log(`Input #${index} WIF ${keypair.toWIF()} (address: ${address}, path: ${components[components.length - 2]}/${components[components.length - 1]})`);
            index += 1;
        }
    }

    // Assuming that the Praline ID is the wallet name
    const praline = new PralineApi(praline_config);
    const { signatures, pubkeys } = await praline.signWDTransaction(wallet_name, tx, private_keys);

    return {
        signatures: signatures,
        pubkeys: pubkeys,
        raw_transaction: tx.raw_transaction
    };
}


/*
 * Libcore adds "03" as the v value instead of leaving it empty. It makes the
 * transaction verification in 'fromSerializedTx' fail, so instead we cheat:
 * make the v value 41 = 0x29 = 2 * 3 + 35, so that the transaction validation passes.
 *
 * I tried to nuke the value and have it empty, but it would need to RLP decode and RLP
 * re-encode the raw tx and we're too lazy
*/
function fixWDEthTx(tx: WDEthTransaction): WDEthTransaction {
    return {
        ...tx,
        raw_transaction: tx.raw_transaction.substring(0, tx.raw_transaction.length - 8)
            .concat("80298080"),
    }
}

function setEthTxNonce(tx: EthTransaction, nonce: number) {
    const chain = Chain.Ropsten;
    const hardfork = Hardfork.London;

    return EthTransaction.fromTxData(
        {
            ...tx.toJSON(),
            nonce
        },
        {
            common: new Common({
                chain,
                hardfork
            })
        });
}

export function signWDEthTxWithSeed(tx: WDEthTransaction, account_key: BIP32Interface, nonce?: number): {
    raw_transaction: string,
    signatures: string[],
} {
    const chain = Chain.Ropsten;
    const hardfork = Hardfork.London;

    const fixedRawTx = fixWDEthTx(tx);
    // Will throw if the transaction built is not for Ropsten and London
    let parsedTx = EthTransaction.fromSerializedTx(Buffer.from(fixedRawTx.raw_transaction, 'hex'), {
        common: new Common({
            chain,
            hardfork
        })
    });
    if (nonce) {
        parsedTx = setEthTxNonce(parsedTx, nonce);
    }
    const privateKey = account_key.privateKey;
    const msgHash = parsedTx.getMessageToSign(true)
    // v is computed by WD later
    const ecSignature = ethUtil.ecsign(msgHash, privateKey, chain)

    // Sanity checks and logging
    const signedTx = parsedTx.sign(privateKey);
    console.log(`Signed the transaction from ${signedTx.getSenderAddress().toString()} ` +
        `to ${parsedTx.to.toString()}`);
    if (signedTx.getSenderAddress().toString() != Address.fromPrivateKey(privateKey).toString()) {
        throw `The signed sender ${signedTx.getSenderAddress().toString()} doesn't match ` +
        `the expected one ${Address.fromPrivateKey(privateKey).toString()}`
    }

    // DER serialization of signature
    const rlen = ecSignature.r.length;
    const slen = ecSignature.s.length;
    const concatDERSig = Buffer.concat([
        Buffer.from([0x30, 4 + rlen + slen, 0x02, rlen]),
        ecSignature.r,
        Buffer.from([0x02, slen]),
        ecSignature.s
    ]);

    // console.log(`unsigned Transaction is ${JSON.stringify(parsedTx.toJSON())}`);
    console.log(`Signed Transaction is ${JSON.stringify(signedTx.toJSON(), null, 2)}`);
    // console.log(`v is ${ecSignature.v}`)
    // console.log("JS-side signed rawTx (to compare with WD explorer call if doubt) " +
    //     `is ${signedTx.serialize().toString('hex')}`);

    return {
        raw_transaction: parsedTx.serialize().toString('hex'),
        signatures: [concatDERSig.toString('hex')]
    }
}
