import axios, { AxiosInstance } from 'axios';
import * as AxiosLogger from 'axios-logger';
import cliProgress from 'cli-progress';
import { Transaction } from 'bitcoinjs-lib';
import { Transaction as WDTransaction } from './wd-api';
import { Logger } from "tslog";

const log: Logger = new Logger({ overwriteConsole: true });

// Disable explicit any warning for API calling code
/* eslint-disable  @typescript-eslint/no-explicit-any */

type Block = {
    height: number;
};

export type PralineConfig = {
    url: string;
    explorer_url: string;
    explorer_id: string;
    praline_chain_id: string;
};

export class PralineApi {
    private url: string;
    private explorer_url: string;
    private explorer_id: string;
    private chain_id: string;
    private client: AxiosInstance;

    constructor({ url, explorer_url, explorer_id, praline_chain_id }: PralineConfig) {
        this.url = url;
        this.explorer_url = explorer_url;
        this.explorer_id = explorer_id;
        this.chain_id = praline_chain_id;
        this.client = axios.create();
        this.client.interceptors.request.use(AxiosLogger.requestLogger, AxiosLogger.errorLogger);
        this.client.interceptors.response.use(AxiosLogger.responseLogger, AxiosLogger.errorLogger);
    }

    async get(base_url: string, path: string): Promise<any> {
        // Not using the custom client to avoid log spams
        const res = await axios.get(`${base_url}${path}`);
        return res.data;
    }

    private async post(base_url: string, path: string, body?: any): Promise<any> {
        const res = await this.client.post(`${base_url}${path}`, body);
        return res.data;
    }

    async get_current_block(): Promise<Block> {
        try {
            return await this.get(this.explorer_url, `/blockchain/v3/${this.explorer_id}/blocks/current`);
        } catch (e) {
            if (e.response && e.response.status == 404) {
                return { height: 0 };
            }
        }
    }

    async mine_blocks(n: number): Promise<Block> {
        const root_block = await this.get_current_block();
        await this.post(this.url, `/chain/mine/${this.chain_id}/${n}`);
        let current_block: Block = { height: 0 };
        const progress = new cliProgress.SingleBar({
            format: 'Mining {total} blocks [{bar}] {percentage}% | ETA: {eta}s | {value}/{total}'
        }, cliProgress.Presets.shades_classic);
        progress.start(n, 0);
        do {
            current_block = await this.get_current_block()
            progress.update(current_block.height - root_block.height);
        } while (current_block.height - root_block.height < n)
        progress.stop();
        return current_block;
    }

    async faucet_coins(amount: number, address: string): Promise<any> {
        log.info(`Faucet ${amount} BTC to ${address}`);
        return await this.post(this.url, `/chain/faucet/${address}/${amount}`);
    }

    async signWDTransaction(praline_id: string, raw_tx: WDTransaction, private_keys: string[]): Promise<{
        signatures: string[],
        pubkeys: string[]
    }> {
        // Sign the transaction with bitcoind RPC
        const signed_raw_tx = (await this.post(this.url, "/rpc", {
            "jsonrpc": "1.0",
            "id": praline_id,
            "method": "signrawtransactionwithkey",
            "params": [raw_tx.raw_transaction, private_keys]
        })).result.hex
        // Find signatures to use the same endpoint than gate on the wallet daemon
        const signed_tx = Transaction.fromHex(signed_raw_tx);
        let index = 0;
        const signatures = [];
        const pubkeys = [];
        for (const input of signed_tx.ins) {
            const sig_size = input.script.readUInt8(0);
            const der_sig = input.script.subarray(1, sig_size).toString('hex');
            signatures.push(der_sig);
            for (const path in raw_tx.inputs[index].derivation_paths) {
                pubkeys.push(raw_tx.inputs[index].derivation_paths[path]);
            }
            index += 1;
        }

        return {
            signatures: signatures,
            pubkeys: pubkeys
        };
    }
}
/* eslint-enable  @typescript-eslint/no-explicit-any */
