ALTER TABLE comandas
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS comandas_deleted_at_idx
  ON comandas (deleted_at)
  WHERE deleted_at IS NULL;