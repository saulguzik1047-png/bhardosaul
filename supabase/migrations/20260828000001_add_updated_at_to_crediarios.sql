ALTER TABLE crediarios
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS crediarios_updated_at_idx
  ON crediarios (updated_at DESC);