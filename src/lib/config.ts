import { Network } from 'bitcoinjs-lib';
import * as bitcoin from 'bitcoinjs-lib';
import { PralineConfig } from './praline-api';
import { WDConfig } from './wd-api';

type NetworkConfiguration = {
    network: Network,
    explorer_id: string,
    chain_id: string
    root_wallet_path: string
};

const network_identifier_map: { [key: string]: NetworkConfiguration } = {
    "btc_testnet": {
        network: bitcoin.networks.testnet,
        explorer_id: "btc_testnet",
        chain_id: "2N6HfrLYH2yxWPXpuXkX5auQRTntWyHoJiC",
        root_wallet_path: "m/49'/1'/0'"
    }
};

export function network(): NetworkConfiguration {
    return network_identifier_map[process.env.BTC_SIGNER_NETWORK];
}

export function praline_url(): string {
    return process.env.BTC_SIGNER_PRALINE_URL;
}

export function praline(): PralineConfig {
    return {
        url: praline_url(),
        explorer_url: explorer_url(),
        explorer_id: network().explorer_id,
        praline_chain_id: network().chain_id
    }
}

export function wallet_daemon(): WDConfig {
    return {
        url: process.env.BTC_SIGNER_WD_URL,
        pubkey: process.env.BTC_SIGNER_WD_PUBKEY,
        wallet_name: process.env.BTC_SIGNER_WD_WALLET_NAME,
    }
}

export function explorer_url(): string {
    return process.env.BTC_SIGNER_EXPLORER_URL;
}
