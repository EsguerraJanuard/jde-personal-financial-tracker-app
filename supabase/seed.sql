-- 1. DROP EXISTING TABLES IF ANY
DROP TABLE IF EXISTS allocation_ledger CASCADE;
DROP TABLE IF EXISTS wallet_ledger CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS allocations CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TYPE IF EXISTS tx_type CASCADE;

-- 2. CREATE SCHEMA WITH DECIMALS SUPPORT
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE tx_type AS ENUM ('INCOME_SPLIT', 'EXPENSE', 'TRANSFER', 'MANUAL_ADJUSTMENT');

CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    group_type TEXT NOT NULL CHECK (group_type IN ('Frequent', 'Extra', 'Utang Sakin (Receivable)', 'Utang Ko (Payable)')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    target_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type tx_type NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE wallet_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL 
);

CREATE TABLE allocation_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    allocation_id UUID NOT NULL REFERENCES allocations(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL 
);

CREATE OR REPLACE VIEW wallet_balances AS
SELECT w.id, w.name, w.group_type, COALESCE(SUM(wl.amount), 0) as balance
FROM wallets w LEFT JOIN wallet_ledger wl ON w.id = wl.wallet_id GROUP BY w.id;

CREATE OR REPLACE VIEW allocation_balances AS
SELECT a.id, a.name, a.target_percentage, COALESCE(SUM(al.amount), 0) as balance
FROM allocations a LEFT JOIN allocation_ledger al ON a.id = al.allocation_id GROUP BY a.id;

-- 3. INSERT ALLOCATIONS
INSERT INTO allocations (id, name, target_percentage) VALUES 
(uuid_generate_v4(), 'Needs', 20),
(uuid_generate_v4(), 'Love', 15),
(uuid_generate_v4(), 'Wants', 10),
(uuid_generate_v4(), 'New battery', 10),
(uuid_generate_v4(), 'Lord', 10),
(uuid_generate_v4(), 'Funds', 10),
(uuid_generate_v4(), 'Parents', 7.5),
(uuid_generate_v4(), 'Just in case', 7.5),
(uuid_generate_v4(), 'Her Birthday', 5),
(uuid_generate_v4(), 'Offering', 5),
(uuid_generate_v4(), 'Utang kay Mama (Offset)', 0);

-- 4. INSERT WALLETS
INSERT INTO wallets (id, name, group_type) VALUES 
(uuid_generate_v4(), 'Maribank', 'Frequent'),
(uuid_generate_v4(), 'Cash', 'Frequent'),
(uuid_generate_v4(), 'Coins', 'Frequent'),
(uuid_generate_v4(), 'Kuya ER', 'Utang Sakin (Receivable)'),
(uuid_generate_v4(), 'Kuya JP', 'Utang Sakin (Receivable)'),
(uuid_generate_v4(), 'GF', 'Utang Sakin (Receivable)'),
(uuid_generate_v4(), 'Mama', 'Utang Ko (Payable)');

-- 5. SEED INITIAL BALANCES (Based on your new EXACT numbers)
DO $$
DECLARE
    tx_id UUID;
BEGIN
    INSERT INTO transactions (type, description) 
    VALUES ('MANUAL_ADJUSTMENT', 'Initial System Seeding')
    RETURNING id INTO tx_id;

    -- WALLETS (Physical = 1226.93, Receivables = 10965, Payables = -800)
    INSERT INTO wallet_ledger (transaction_id, wallet_id, amount) SELECT tx_id, id, 948.93 FROM wallets WHERE name = 'Maribank';
    INSERT INTO wallet_ledger (transaction_id, wallet_id, amount) SELECT tx_id, id, 170 FROM wallets WHERE name = 'Cash';
    INSERT INTO wallet_ledger (transaction_id, wallet_id, amount) SELECT tx_id, id, 108 FROM wallets WHERE name = 'Coins';
    
    INSERT INTO wallet_ledger (transaction_id, wallet_id, amount) SELECT tx_id, id, 10000 FROM wallets WHERE name = 'Kuya ER';
    INSERT INTO wallet_ledger (transaction_id, wallet_id, amount) SELECT tx_id, id, 70 FROM wallets WHERE name = 'Kuya JP';
    INSERT INTO wallet_ledger (transaction_id, wallet_id, amount) SELECT tx_id, id, 895 FROM wallets WHERE name = 'GF';
    
    INSERT INTO wallet_ledger (transaction_id, wallet_id, amount) SELECT tx_id, id, -800 FROM wallets WHERE name = 'Mama';

    -- ALLOCATIONS (Base Total = 12191. Added .93 to Funds to match physical 12191.93. Added -800 offset for Mama).
    INSERT INTO allocation_ledger (transaction_id, allocation_id, amount) SELECT tx_id, id, 1635 FROM allocations WHERE name = 'Needs';
    INSERT INTO allocation_ledger (transaction_id, allocation_id, amount) SELECT tx_id, id, 645 FROM allocations WHERE name = 'Love';
    INSERT INTO allocation_ledger (transaction_id, allocation_id, amount) SELECT tx_id, id, 125 FROM allocations WHERE name = 'Wants';
    INSERT INTO allocation_ledger (transaction_id, allocation_id, amount) SELECT tx_id, id, 1996 FROM allocations WHERE name = 'New battery';
    INSERT INTO allocation_ledger (transaction_id, allocation_id, amount) SELECT tx_id, id, 2356 FROM allocations WHERE name = 'Lord';
    INSERT INTO allocation_ledger (transaction_id, allocation_id, amount) SELECT tx_id, id, 2117.93 FROM allocations WHERE name = 'Funds';
    INSERT INTO allocation_ledger (transaction_id, allocation_id, amount) SELECT tx_id, id, 693 FROM allocations WHERE name = 'Parents';
    INSERT INTO allocation_ledger (transaction_id, allocation_id, amount) SELECT tx_id, id, 2018 FROM allocations WHERE name = 'Her Birthday';
    INSERT INTO allocation_ledger (transaction_id, allocation_id, amount) SELECT tx_id, id, 575 FROM allocations WHERE name = 'Offering';
    INSERT INTO allocation_ledger (transaction_id, allocation_id, amount) SELECT tx_id, id, 31 FROM allocations WHERE name = 'Just in case';
    
    INSERT INTO allocation_ledger (transaction_id, allocation_id, amount) SELECT tx_id, id, -800 FROM allocations WHERE name = 'Utang kay Mama (Offset)';

END $$;
