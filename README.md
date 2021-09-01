# This is INSECURE you WILL LOSE MONEY

Maybe you won't lose money, but this tool's sole purpose
is to be a quick and dirty offline signer. Development will
never stop to consider security risks, and dependencies were
not audited (by the author, at least).

**So don't trust this software with funds you care about.**

# Bitcoin CLI Signing utility

This is mostly a draft for now.

## Quickstart

```bash
# Create a mnenomic and saves the string in a file
echo "abandon abandon abandon" > .mnemonic
# Build the stuff
npm run build # Or yarn build
# Test the stuff
node dist/index.js sign .mnemonic .tx-test
```

It will fail with messages like
```
pubkeyhash not supported (OP_DUP OP_HASH160 ed176f89c975db1fb6c9b798e446fba6023a9b10 OP_EQUALVERIFY OP_CHECKSIG)
```
if the key pair doesn't match one of the input to sign

## Design decisions and limitations

### UTXO consolidation

It probably won't be able to sign transactions with inputs from different addresses.
At least it's not planned now.

### TransactionBuilder vs. PSBT

This tool is being created to help with Ledger testing, so the TransactionBuilder
format is way easier to use with the rawTransaction format lib-ledger-core
uses for communication.


## Half a roadmap

### Targeted minimal features

- Better Quickstart in 1 line
- Better packaging of the executable in one command
- Import a BIP39 mnemonic as the wallet
- Read transaction from hex string on path
- Return the signature for a transaction

### Other features

- Import a single xpub
- Import a single address
- Show addresses to receive funds if necessary
- Add network as argument (and a .ts file that adds all common networks as dict outside of mainnet/regtest/testnet)
- Add path as argument, with a default that depends on network
