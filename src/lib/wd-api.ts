import axios from 'axios';
import { BIP32Interface } from 'bip32';

export type Transaction =
{
  block?: {height: number},
  fees: string,
  hash: string,
  time: string,
  inputs: {derivation_paths: string[]}[],
  lock_time: number,
  outputs: {}[],
  raw_transaction: string
}

const WALLET_DAEMON_URL = "http://localhost:9200"
const AXIOS_CONFIG = {
    headers: {
        pubkey: '03769E7CA689F30D684E07011163EE328451542D65CC3A4DC918AF64864757E002'
    }
}

async function get(base_url: string, path: string): Promise<any> {
    let res = await axios.get(`${base_url}${path}`, AXIOS_CONFIG)
    return res.data
}

async function post(base_url: string, path: string, body?: any): Promise<any> {
    let res = await axios.post(`${base_url}${path}`, body || {}, AXIOS_CONFIG)
    return res.data
}

export async function daemon_health(): Promise<any> {
    return get(WALLET_DAEMON_URL, '/_health')
}

export async function synchronize_account(wallet_name: string): Promise<void> {
    return await post(WALLET_DAEMON_URL, `/pools/local_pool/wallets/${wallet_name}/accounts/0/operations/synchronize`)
}

export async function get_account_info(wallet_name: string): Promise<any> {
    return await get(WALLET_DAEMON_URL, `/pools/local_pool/wallets/${wallet_name}/accounts/0`)
}

export async function init_account(wallet_name: string, root_key: BIP32Interface): Promise<any>{
    // Create pool
    await post(WALLET_DAEMON_URL, '/pools', {
        pool_name: 'local_pool'
    })
    // Create wallet
    await post(WALLET_DAEMON_URL, '/pools/local_pool/wallets', {
        wallet_name: wallet_name,
        currency_name: 'bitcoin_testnet',
    })
    // Create account
    console.log(root_key.neutered().toBase58())
    await post(WALLET_DAEMON_URL, `/pools/local_pool/wallets/${wallet_name}/accounts/extended`, {
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

export async function get_operations(wallet_name: string): Promise<any> {
    return (await get(WALLET_DAEMON_URL, `/pools/local_pool/wallets/${wallet_name}/accounts/0/operations?full_op=1`)).operations
}

export async function is_transaction_on_wallet_daemon(wallet_name: string, tx_hash: string): Promise<boolean> {
    let operations = await get_operations(wallet_name)
    for (let operation of operations) {
        if (operation.transaction.hash == tx_hash) {
            return true
        }
    }
    return false
}

export async function build_transaction(wallet_name: string, amount: number, recipient: string): Promise<Transaction> {
    // Prepare a transaction from wallet daemon
    return await post(WALLET_DAEMON_URL, `/pools/local_pool/wallets/${wallet_name}/accounts/0/transactions`, {
        recipient: recipient,
        fees_per_byte: '1000',
        amount: amount.toString(),
        partial_tx: true
    });
}

export async function broadcast_transaction(wallet_name: string, raw_tx: string, signatures: string[], pubkeys: string[]): Promise<Transaction> {
    // Broadcast with wallet daemon
    return await post(WALLET_DAEMON_URL, `/pools/local_pool/wallets/${wallet_name}/accounts/0/transactions/sign`, {
        raw_transaction: raw_tx,
        signatures: signatures,
        pubkeys: pubkeys
    })
}
