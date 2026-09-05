-- Merge "Coins" wallet into "Cash" wallet

DO $$
DECLARE
    cash_id UUID;
    coins_id UUID;
BEGIN
    -- Get the IDs of the two wallets
    SELECT id INTO cash_id FROM wallets WHERE name = 'Cash' LIMIT 1;
    SELECT id INTO coins_id FROM wallets WHERE name = 'Coins' LIMIT 1;

    -- If both wallets exist, proceed with the merge
    IF coins_id IS NOT NULL AND cash_id IS NOT NULL THEN
        -- 1. Point all existing transactions involving 'Coins' to 'Cash' instead
        UPDATE wallet_ledger 
        SET wallet_id = cash_id 
        WHERE wallet_id = coins_id;
        
        -- 2. Safely delete the 'Coins' wallet from the database
        DELETE FROM wallets 
        WHERE id = coins_id;
    END IF;
END $$;
