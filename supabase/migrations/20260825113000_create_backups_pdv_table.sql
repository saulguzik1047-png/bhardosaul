CREATE TABLE IF NOT EXISTS backups_pdv (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tipo text NOT NULL DEFAULT 'clientes_comandas',
  origem text NOT NULL DEFAULT 'periodico',
  quantidade_clientes integer NOT NULL DEFAULT 0,
  quantidade_comandas integer NOT NULL DEFAULT 0,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE backups_pdv ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_backups_pdv" ON backups_pdv;
CREATE POLICY "anon_select_backups_pdv" ON backups_pdv FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_backups_pdv" ON backups_pdv;
CREATE POLICY "anon_insert_backups_pdv" ON backups_pdv FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_backups_pdv" ON backups_pdv;
CREATE POLICY "anon_update_backups_pdv" ON backups_pdv FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_backups_pdv" ON backups_pdv;
CREATE POLICY "anon_delete_backups_pdv" ON backups_pdv FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS backups_pdv_created_at_idx ON backups_pdv (created_at DESC);
CREATE INDEX IF NOT EXISTS backups_pdv_tipo_created_at_idx ON backups_pdv (tipo, created_at DESC);
