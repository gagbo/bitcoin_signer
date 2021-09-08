import axios, { AxiosInstance } from 'axios';
import * as AxiosLogger from 'axios-logger';
import { BIP32Interface } from 'bip32';

// Disable explicit any warning for API calling code
/* eslint-disable  @typescript-eslint/no-explicit-any */
export type Transaction = {
    block?: { height: number },
    fees: string,
    hash: string,
    time: string,
    inputs: { derivation_paths: string[] }[],
    lock_time: number,
    outputs: Record<string, unknown>[],
    raw_transaction: string
}

export type WDConfig = {
    url: string,
    pubkey: string,
    wallet_name: string
}

async function timer(ms: number): Promise<void> {
    return new Promise(res => setTimeout(res, ms));
}

export class WdApi {
    private url: string;
    private pubkey: string;
    private logging_client: AxiosInstance;
    private nologging_client: AxiosInstance;

    constructor(config: WDConfig) {
        this.url = config.url;
        this.pubkey = config.pubkey;
        this.logging_client = axios.create();
        this.nologging_client = axios.create();
        this.logging_client.interceptors.request.use(AxiosLogger.requestLogger, AxiosLogger.errorLogger);
        this.nologging_client.interceptors.response.use(AxiosLogger.responseLogger, AxiosLogger.errorLogger);
    }

    private axios_config(): any {
        return {
            headers: {
                pubkey: this.pubkey
            }
        };
    }

    async get(path: string, skip_log?: boolean): Promise<any> {
        if (skip_log) {
            const res = await this.nologging_client.get(`${this.url}${path}`, this.axios_config());
            return res.data;
        }
        const res = await this.logging_client.get(`${this.url}${path}`, this.axios_config());
        return res.data;
    }

    private async post(path: string, body?: any): Promise<any> {
        const res = await this.logging_client.post(`${this.url}${path}`, body || {}, this.axios_config())
        return res.data
    }

    async health(): Promise<any> {
        return this.get('/_health')
    }

    async synchronize_account(wallet_name: string): Promise<void> {
        return await this.post(`/pools/local_pool/wallets/${wallet_name}/accounts/0/operations/synchronize`)
    }

    async wait_for_synchronization(wallet_name: string, cooldown?: number): Promise<void> {
        let isBusy: boolean = await this.get(`/pools/local_pool/wallets/${wallet_name}/accounts/0/operations/busy`);
        while (isBusy) {
            await timer(cooldown || 1000);
            isBusy = await this.get(`/pools/local_pool/wallets/${wallet_name}/accounts/0/operations/busy`);
        }
    }

    async get_account_info(wallet_name: string): Promise<any> {
        return await this.get(`/pools/local_pool/wallets/${wallet_name}/accounts/0`)
    }

    async init_account(wallet_name: string, root_key: BIP32Interface): Promise<any> {
        // Create pool
        await this.post('/pools', {
            pool_name: 'local_pool'
        })
        // Create wallet
        await this.post('/pools/local_pool/wallets', {
            wallet_name: wallet_name,
            currency_name: 'bitcoin_testnet',
        })
        // Create account
        await this.post(`/pools/local_pool/wallets/${wallet_name}/accounts/extended`, {
            "account_index": "0",
            "derivations": [
                {
                    "path": "49'/1'/0'",
                    "owner": "1",
                    "extended_key": root_key.neutered().toBase58()
                }
            ]
        })
    }

    async get_operations(wallet_name: string, log?: boolean): Promise<any> {
        return (await this.get(`/pools/local_pool/wallets/${wallet_name}/accounts/0/operations?full_op=1`, !log)).operations
    }

    async is_transaction_on_wallet_daemon(wallet_name: string, tx_hash: string): Promise<boolean> {
        const operations = await this.get_operations(wallet_name)
        for (const operation of operations) {
            if (operation.transaction.hash == tx_hash) {
                return true
            }
        }
        return false
    }

    async build_transaction(wallet_name: string, amount: number, recipient: string): Promise<Transaction> {
        // Prepare a transaction from wallet daemon
        return await this.post(`/pools/local_pool/wallets/${wallet_name}/accounts/0/transactions`, {
            recipient: recipient,
            fees_per_byte: '1000',
            amount: amount.toString(),
            partial_tx: true
        });
    }

    async broadcast_transaction(wallet_name: string, raw_tx: string, signatures: string[], pubkeys: string[]): Promise<string> {
        // Broadcast with wallet daemon
        return await this.post(`/pools/local_pool/wallets/${wallet_name}/accounts/0/transactions/sign`, {
            raw_transaction: raw_tx,
            signatures: signatures,
            pubkeys: pubkeys
        })
    }
}

/* eslint-enable  @typescript-eslint/no-explicit-any */
