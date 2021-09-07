# This is INSECURE you WILL LOSE MONEY

Maybe you won't lose money, but this tool's sole purpose
is to be a quick and dirty offline signer. Development will
never stop to consider security risks, and dependencies were
not audited (by the author, at least).

**So don't trust this software with funds you care about.**

# Bitcoin CLI Signing utility

This is a small library/CLI utility for signing BTC-like transactions using
bitcoinlib-js. As an extra, it can also use internal Ledger Wallet Daemon and
Praline mock-node/explorer infrastructure to run broadcasting-based scenarii for
component testing.

  - [Quickstart](#quickstart)
  - [Testing with Wallet Daemon / Praline](#testing-with-wallet-daemon-praline)
  - [Design decisions and limitations](#design-decisions-and-limitations)
    - [UTXO consolidation](#utxo-consolidation)
    - [TransactionBuilder vs. PSBT](#transactionbuilder-vs-psbt)
  - [Half a roadmap](#half-a-roadmap)
    - [Targeted minimal features](#targeted-minimal-features)
    - [Other features](#other-features)

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

## Testing with Wallet Daemon / Praline

> *Note*: The [docker-compose file](./docker-compose.yml) uses ghcr images, so
> configure your docker CLI accordingly. (And unauthorized people won't be able to
> run this test, even including myself eventually)

There is a testing scenario that uses commands to successively :
- faucet some BTC on Praline handling a testnet
- build, sign, and broadcast a transaction using Wallet Daemon, Praline, and
  Wallet Daemon respectively.

This basic scenario uses the [Faucet](./src/commands/faucet.ts) and
[Send](./src/commands/send.ts) commands and serves the purpose of dogfooding the
API in [lib](./src/lib), as well as showing examples for building other
workflows.

``` bash
docker-compose up -d
 # Wait for all containers to start, lasts approx. 1min. You can monitor your CPU load
./tooling/scenario.sh
```

## Design decisions and limitations

### UTXO consolidation

It probably won't be able to sign transactions with inputs from different addresses.
At least it's not planned now.

### TransactionBuilder vs. PSBT

This tool is being created to help with Ledger testing, so the TransactionBuilder
format is way easier to use with the rawTransaction format lib-ledger-core
uses for communication.

That also means that this project uses deprecated code and will keep using old
code to be able to keep working.


## Half a roadmap

### Targeted minimal features

- [ ] Better Quickstart in 1 line
- [ ] Better packaging of the executable in one command
- [x] Import a BIP39 mnemonic as the wallet
- [x] Read transaction from hex string on path
- [x] Return the signature for a transaction

### Other features

- [x] Import a single xpub
      Use the xpub seed, and then just use it a root in the keychain
- [ ] Import a single address
- [ ] Show addresses to receive funds if necessary
- [ ] Add network as argument
      (and a .ts file that adds all common networks
      as dict outside of mainnet/regtest/testnet)
- [ ] Add path as argument, with a default that depends on network
