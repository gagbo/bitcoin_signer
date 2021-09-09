#!/usr/bin/env bash
set -euo pipefail

# Send 0.01 ETH
# ./dist/index.js ethsend .mnemonic 0x000000000000000000000000000000000000dead 1

# 49'/1'/0'/0/0
# ./dist/index.js ethsend .mnemonic 0xd8c5d4823c2d3fc888f229272d89cd8a5ff29b75 100000000000000000

# 49'/1'/1'/0/0
# ./dist/index.js ethsend .mnemonic 0x10a5864e11fd6d1012bd973516a2c162292387c7 100000000000000000

# 44'/60'/0'/0/0
./dist/index.js ethsend .mnemonic 0x8ef2bdd7f892b77eb1de6c7959fa083efeb4c2fa 107000000000000000

# 44'/60'/1'/0/0
# ./dist/index.js ethsend .mnemonic 0x9d438c8fc5c769acad9374ad387a5abbbd05b237 100000000000000000
