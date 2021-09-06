
CREATE KEYSPACE btc_like WITH replication =  {'class': 'SimpleStrategy', 'replication_factor': '1'};

CREATE TABLE IF NOT EXISTS btc_like.block (
    hash        ASCII,
    height      INT,
    parent_hash ASCII,
    created_at  TIMESTAMP,
    tx_hashes   FROZEN<LIST<ASCII>>,
    PRIMARY KEY (hash)
);

CREATE TABLE IF NOT EXISTS btc_like.block_by_height (
    height  INT,
    hash    ASCII,
    PRIMARY KEY ((height), hash)
);

CREATE TYPE IF NOT EXISTS btc_like.transaction_coinbase_data (
    coinbase ASCII,
    sequence BIGINT
);

CREATE TYPE IF NOT EXISTS btc_like.transaction_input_data (
      output_txid  ASCII,
      output_index INT,
      value        VARINT,
      address      ASCII,
      script_sig   ASCII,
      txinwitness  FROZEN<LIST<ASCII>>,
      sequence     BIGINT
);

CREATE TYPE IF NOT EXISTS btc_like.transaction_output_data (
      output_index INT,
      address      ASCII,
      value        VARINT,
      script_hex   ASCII,
      script_type  ASCII,
      req_sigs     INT
);

CREATE TABLE IF NOT EXISTS btc_like.transaction (
    txid         ASCII,
    hash         ASCII,
    created_at   TIMESTAMP,
    lock_time    BIGINT,
    block_hash   ASCII,
    block_height INT,
    coinbases    FROZEN<LIST<FROZEN<btc_like.transaction_coinbase_data>>>,
    inputs       FROZEN<LIST<FROZEN<btc_like.transaction_input_data>>>,
    outputs      FROZEN<LIST<FROZEN<btc_like.transaction_output_data>>>,
    PRIMARY KEY (txid)
);

CREATE TABLE IF NOT EXISTS btc_like.transaction_by_address (
    address      ASCII,
    block_height INT,
    txid         ASCII,
    PRIMARY KEY ((address), block_height, txid)
);

CREATE TABLE IF NOT EXISTS btc_like.pending_transaction (
    txid         ASCII,
    hash         ASCII,
    created_at   TIMESTAMP,
    lock_time    BIGINT,
    hex          ASCII,
    inputs       FROZEN<LIST<FROZEN<btc_like.transaction_input_data>>>,
    outputs      FROZEN<LIST<FROZEN<btc_like.transaction_output_data>>>,
    PRIMARY KEY (txid)
) WITH gc_grace_seconds = 10;

CREATE TABLE IF NOT EXISTS btc_like.pending_transaction_by_address (
    address      ASCII,
    txid         ASCII,
    PRIMARY KEY ((address), txid)
) WITH gc_grace_seconds = 10;

CREATE TABLE IF NOT EXISTS btc_like.pending_transaction_hashes (
    shard      INT,
    hashes     SET<ASCII>,
    PRIMARY KEY (shard)
);

CREATE TABLE IF NOT EXISTS btc_like.indexer_state (
    key   ASCII,
    value ASCII,
    PRIMARY KEY(key)
);
