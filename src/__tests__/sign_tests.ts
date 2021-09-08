import { signTxWithKeyPairs, generateKeychain } from "../lib/sign";
import { seedFromMnemonic } from "../lib/seeds";
import { Transaction } from "bitcoinjs-lib";
import * as bitcoin from "bitcoinjs-lib";

const TEST_NETWORK = bitcoin.networks.testnet;
// Extra newline for the mnemonic to match tested data.
const TEST_SEED =
    "praise you muffin lion enable neck grocery crumble super myself license ghost\n";
const TEST_TX =
    "010000000155BA21ABE435517069355FC4D7A5BAFF0F5E4C4A5822198DB26F33E0B20DBC55000000" +
    "001976A9146000C1060728DB3DD964E7E805F93F0DB9C711AC88ACFFFFFFFF02A086010000000000" +
    "1600145DAB475D4678806405DED487174DB0501E2D2DD490D0953B000000001976A9145D55A191CC" +
    "804B6B777E2DBB1D43D453A99453D988AC00000000";

test("signTxWithKeyPairs signs testnet transaction from seed with derivation", () => {
    const seed = seedFromMnemonic(TEST_SEED, TEST_NETWORK);

    const parsed = Transaction.fromHex(TEST_TX);

    const derivations = ["m/49'/1'/0'/0/0"];
    const keyChain = generateKeychain(seed, derivations, TEST_NETWORK);

    const signedTx = signTxWithKeyPairs(parsed, keyChain, TEST_NETWORK);
    expect(signedTx.toHex().length - parsed.toHex().length).toBe(162);
});

test("signTxWithKeyPairs signs testnet transaction from seed with derivation in list", () => {
    const seed = seedFromMnemonic(TEST_SEED, TEST_NETWORK);

    const parsed = Transaction.fromHex(TEST_TX);

    const derivations = ["m/49'/1'/0'/0/0", "m/49'/1'/0'/1/1"];
    const keyChain = generateKeychain(seed, derivations, TEST_NETWORK);

    const signedTx = signTxWithKeyPairs(parsed, keyChain, TEST_NETWORK);
    expect(signedTx.toHex().length - parsed.toHex().length).toBe(162);
});

test("signTxWithKeyPairs signs testnet transaction from seed with derivation not first in list", () => {
    const seed = seedFromMnemonic(TEST_SEED, TEST_NETWORK);

    const parsed = Transaction.fromHex(TEST_TX);

    const derivations = ["m/49/1/0/0/0", "m/49'/1'/0'/0/0", "m/49'/1'/1'/0/0"];
    const keyChain = generateKeychain(seed, derivations, TEST_NETWORK);

    const signedTx = signTxWithKeyPairs(parsed, keyChain, TEST_NETWORK);
    expect(signedTx.toHex().length - parsed.toHex().length).toBe(162);
});

test("signTxWithKeyPairs fails to sign testnet transaction from seed with wrong derivation", () => {
    const seed = seedFromMnemonic(TEST_SEED, TEST_NETWORK);

    const parsed = Transaction.fromHex(TEST_TX);

    const derivations = ["m/49'/1'/0'/0/1"];
    const keyChain = generateKeychain(seed, derivations, TEST_NETWORK);

    expect(() => signTxWithKeyPairs(parsed, keyChain, TEST_NETWORK)).toThrow();
});

test("hardened (or not) derivation matters in keychain", () => {
    const seed = seedFromMnemonic(TEST_SEED, TEST_NETWORK);

    const parsed = Transaction.fromHex(TEST_TX);

    const derivations = ["m/49/1/0/0/1"];
    const keyChain = generateKeychain(seed, derivations, TEST_NETWORK);

    expect(() => signTxWithKeyPairs(parsed, keyChain, TEST_NETWORK)).toThrow();
});
