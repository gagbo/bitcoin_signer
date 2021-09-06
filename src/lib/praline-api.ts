import axios from 'axios';
import cliProgress from 'cli-progress';
import { Transaction } from 'bitcoinjs-lib';
import { Transaction as WDTransaction } from './wd-api';

type Block = {
    height: number;
};

const PRALINE_URL = "http://localhost:28443";
const EXPLORER_URL = "http://localhost:20000";

async function get(base_url: string, path: string): Promise<any> {
    let res = await axios.get(`${base_url}${path}`);
    return res.data;
}

async function post(base_url: string, path: string, body?: any): Promise<any> {
    let res = await axios.post(`${base_url}${path}`, body);
    return res.data;
}

async function get_current_block(): Promise<Block> {
    try {
        return await get(EXPLORER_URL, '/blockchain/v3/btc_testnet/blocks/current');
    } catch (e) {
        if (e.response && e.response.status == 404) {
            return { height: 0 };
        }
    }
}

export async function mine_blocks(n: number): Promise<Block> {
    const root_block = await get_current_block();
    await post(PRALINE_URL, `/chain/mine/2N6HfrLYH2yxWPXpuXkX5auQRTntWyHoJiC/${n}`);
    let current_block: Block = { height: 0 };
    const progress = new cliProgress.SingleBar({
        format: 'Mining {total} blocks [{bar}] {percentage}% | ETA: {eta}s | {value}/{total}'
    }, cliProgress.Presets.shades_classic);
    progress.start(n, 0);
    do {
        current_block = await get_current_block()
        progress.update(current_block.height - root_block.height);
    } while (current_block.height - root_block.height < n)
    progress.stop();
    return current_block;
}

export async function faucet_coins(amount: number, address: string): Promise<any> {
    console.log(`Faucet ${amount} BTC to ${address}`);
    return await post(PRALINE_URL, `/chain/faucet/${address}/${amount}`);
}

export async function signWDTransaction(praline_id: string, raw_tx: WDTransaction, private_keys: string[]): Promise<{
    signatures: string[],
    pubkeys: string[]
}> {
    // Sign the transaction with bitcoind RPC
    const signed_raw_tx = (await post(PRALINE_URL, "/rpc", {
        "jsonrpc": "1.0",
        "id": praline_id,
        "method": "signrawtransactionwithkey",
        "params": [raw_tx.raw_transaction, private_keys]
    })).result.hex
    // Find signatures to use the same endpoint than gate on the wallet daemon
    const signed_tx = Transaction.fromHex(signed_raw_tx);
    let index = 0;
    let signatures = [];
    let pubkeys = [];
    for (let input of signed_tx.ins) {
        const sig_size = input.script.readUInt8(0);
        const der_sig = input.script.subarray(1, sig_size).toString('hex');
        signatures.push(der_sig);
        for (let path in raw_tx.inputs[index].derivation_paths) {
            pubkeys.push(raw_tx.inputs[index].derivation_paths[path]);
        }
        index += 1;
    };

    return {
        signatures: signatures,
        pubkeys: pubkeys
    };
}
