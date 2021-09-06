#!/usr/bin/env bash
set -euo pipefail

# Faucet 10 BTC
./dist/index.js faucet .mnemonic "m/49'/1'/0'/0/0" 10
# Send 100k sats
./dist/index.js send .mnemonic tb1qtk45wh2x0zqxgpw76jr3wnds2q0z6tw5d6lrux 100000
