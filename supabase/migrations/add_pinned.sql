ALTER TABLE wallets ADD COLUMN is_pinned BOOLEAN DEFAULT false;
UPDATE wallets SET is_pinned = true WHERE name IN ('Maribank', 'Cash', 'Coins');
INSERT INTO wallets (name, group_type) VALUES ('CIMB Bank', 'Frequent'), ('Maya', 'Frequent');
