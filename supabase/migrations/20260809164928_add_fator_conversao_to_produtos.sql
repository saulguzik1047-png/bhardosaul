/*
# Add fator_conversao column to produtos

1. Modified Tables
   - `produtos`
     - Added `fator_conversao` (numeric, default 1) — conversion factor for stock unit calculations
2. Notes
   - Uses IF NOT EXISTS pattern for idempotency
   - Non-destructive: adds column only if missing
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'produtos' AND column_name = 'fator_conversao'
  ) THEN
    ALTER TABLE produtos ADD COLUMN fator_conversao numeric NOT NULL DEFAULT 1;
  END IF;
END $$;