/*
# Add apelidos (aliases) column to produtos table

## Overview
Adds a text array column `apelidos` to the `produtos` table so that each product
can have multiple alternative names (aliases). This is used by the OCR/nota import
feature to match products even when suppliers use different names for the same item.

## Modified Tables
- **produtos**
  - New column: `apelidos` (text[], default empty array) — list of alternative names/keywords

## Notes
- Uses DO block for idempotent column addition (IF NOT EXISTS pattern)
- No data loss — purely additive change
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'produtos' AND column_name = 'apelidos'
  ) THEN
    ALTER TABLE produtos ADD COLUMN apelidos text[] DEFAULT '{}';
  END IF;
END $$;
