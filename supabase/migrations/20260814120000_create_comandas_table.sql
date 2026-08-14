CREATE TABLE IF NOT EXISTS comandas (
  id bigint PRIMARY KEY,
  nome text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Aberto',
  itens jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE comandas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_comandas" ON comandas;
CREATE POLICY "anon_select_comandas" ON comandas FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_comandas" ON comandas;
CREATE POLICY "anon_insert_comandas" ON comandas FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_comandas" ON comandas;
CREATE POLICY "anon_update_comandas" ON comandas FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_comandas" ON comandas;
CREATE POLICY "anon_delete_comandas" ON comandas FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS comandas_updated_at_idx ON comandas (updated_at DESC);
