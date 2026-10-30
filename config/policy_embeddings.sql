-- Optional licensed payer-policy corpus. Load vectors produced by the configured embedding model.
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS policy_embeddings (
    payer text NOT NULL,
    policy_id text NOT NULL,
    version text NOT NULL,
    model text NOT NULL,
    effective date NOT NULL,
    expires date NOT NULL CHECK (expires >= effective),
    embedding vector NOT NULL,
    PRIMARY KEY (payer, policy_id, version, model)
);
