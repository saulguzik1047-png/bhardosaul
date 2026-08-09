/*
  # Revert RLS policies to allow anon + authenticated access

  The previous security audit migrations restricted all tables to
  authenticated-only, but the app uses its own local password system
  (not Supabase auth), so the client connects with the anon key.
  Restoring anon access so the app functions correctly.
*/

-- vendas
DROP POLICY IF EXISTS "auth_select_vendas" ON vendas;
DROP POLICY IF EXISTS "auth_insert_vendas" ON vendas;
DROP POLICY IF EXISTS "auth_update_vendas" ON vendas;
DROP POLICY IF EXISTS "auth_delete_vendas" ON vendas;

GRANT SELECT, INSERT, UPDATE, DELETE ON vendas TO anon;

CREATE POLICY "anon_select_vendas" ON vendas FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_vendas" ON vendas FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_vendas" ON vendas FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_vendas" ON vendas FOR DELETE
  TO anon, authenticated USING (true);

-- clientes
DROP POLICY IF EXISTS "auth_select_clientes" ON clientes;
DROP POLICY IF EXISTS "auth_insert_clientes" ON clientes;
DROP POLICY IF EXISTS "auth_update_clientes" ON clientes;
DROP POLICY IF EXISTS "auth_delete_clientes" ON clientes;

GRANT SELECT, INSERT, UPDATE, DELETE ON clientes TO anon;

CREATE POLICY "anon_select_clientes" ON clientes FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_clientes" ON clientes FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_clientes" ON clientes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_clientes" ON clientes FOR DELETE
  TO anon, authenticated USING (true);

-- crediarios
DROP POLICY IF EXISTS "auth_select_crediarios" ON crediarios;
DROP POLICY IF EXISTS "auth_insert_crediarios" ON crediarios;
DROP POLICY IF EXISTS "auth_update_crediarios" ON crediarios;
DROP POLICY IF EXISTS "auth_delete_crediarios" ON crediarios;

GRANT SELECT, INSERT, UPDATE, DELETE ON crediarios TO anon;

CREATE POLICY "anon_select_crediarios" ON crediarios FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_crediarios" ON crediarios FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_crediarios" ON crediarios FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_crediarios" ON crediarios FOR DELETE
  TO anon, authenticated USING (true);

-- produtos
DROP POLICY IF EXISTS "auth_select_produtos" ON produtos;
DROP POLICY IF EXISTS "auth_insert_produtos" ON produtos;
DROP POLICY IF EXISTS "auth_update_produtos" ON produtos;
DROP POLICY IF EXISTS "auth_delete_produtos" ON produtos;

GRANT SELECT, INSERT, UPDATE, DELETE ON produtos TO anon;

CREATE POLICY "anon_select_produtos" ON produtos FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_produtos" ON produtos FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_produtos" ON produtos FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_produtos" ON produtos FOR DELETE
  TO anon, authenticated USING (true);
