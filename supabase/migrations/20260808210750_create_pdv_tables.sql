/*
# Create PDV (Point of Sale) Database Tables

## Overview
Creates all tables required by the "Bhar do Saul" bar/restaurant POS system.
The app is single-tenant with no Supabase auth — it uses its own local password
system stored in localStorage. All policies allow anon + authenticated access.

## New Tables

1. **produtos** — Product catalog / inventory
   - id (bigint, primary key) — matches the app's Date.now()-based IDs
   - nome (text) — product name
   - category (text) — category (e.g. Cervejas, Drinks, Porções)
   - preco (float8) — sale price
   - preco_custo (float8) — cost price
   - estoque (float8) — current stock quantity
   - estoque_minimo (float8) — minimum stock threshold
   - imagem (text) — product image URL
   - data_ultima_compra (date) — last purchase date

2. **vendas** — Sales records
   - id (bigint, primary key, auto-generated)
   - data (text) — sale date/time as pt-BR string
   - cliente (text) — customer name
   - total (float8) — total sale amount
   - pagamento (text) — payment method description
   - itens_consumidos (jsonb) — array of consumed items

3. **clientes** — Customer registry
   - id (bigint, primary key, auto-generated)
   - nome (text) — customer first name
   - sobrenome (text) — customer surname
   - telefone (text) — phone number
   - foto (text) — photo URL/base64

4. **crediarios** — Credit/IOU records (fiado)
   - id_cred (bigint, primary key) — credit record ID
   - data (text) — creation date
   - cliente (text) — customer name
   - total (float8) — outstanding amount
   - status (text) — 'Pendente' or 'Pago'
   - itens_consumidos (jsonb) — consumed items array
   - pagamentos (jsonb) — payment history array

5. **auditoria_cancelamentos** — Audit log for cancellations
   - id (bigint, primary key, auto-generated)
   - operador (text) — operator who performed the action
   - tipo (text) — action type
   - motivo (text) — reason
   - data (timestamptz) — timestamp
   - detalhes (jsonb) — action details

## Security
- RLS enabled on all tables.
- All tables allow anon + authenticated CRUD (single-tenant, shared data model).
*/

CREATE TABLE IF NOT EXISTS produtos (
  id bigint PRIMARY KEY,
  nome text NOT NULL DEFAULT '',
  category text DEFAULT 'Geral',
  preco float8 DEFAULT 0,
  preco_custo float8 DEFAULT 0,
  estoque float8 DEFAULT 0,
  estoque_minimo float8 DEFAULT 0,
  imagem text DEFAULT '',
  data_ultima_compra date
);

ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_produtos" ON produtos;
CREATE POLICY "anon_select_produtos" ON produtos FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_produtos" ON produtos;
CREATE POLICY "anon_insert_produtos" ON produtos FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_produtos" ON produtos;
CREATE POLICY "anon_update_produtos" ON produtos FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_produtos" ON produtos;
CREATE POLICY "anon_delete_produtos" ON produtos FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS vendas (
  id bigint PRIMARY KEY DEFAULT (extract(epoch from now()) * 1000)::bigint,
  data text,
  cliente text,
  total float8 DEFAULT 0,
  pagamento text,
  itens_consumidos jsonb DEFAULT '[]'::jsonb
);

ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_vendas" ON vendas;
CREATE POLICY "anon_select_vendas" ON vendas FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_vendas" ON vendas;
CREATE POLICY "anon_insert_vendas" ON vendas FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_vendas" ON vendas;
CREATE POLICY "anon_update_vendas" ON vendas FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_vendas" ON vendas;
CREATE POLICY "anon_delete_vendas" ON vendas FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS clientes (
  id bigint PRIMARY KEY DEFAULT (extract(epoch from now()) * 1000)::bigint,
  nome text,
  sobrenome text,
  telefone text DEFAULT '',
  foto text DEFAULT ''
);

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_clientes" ON clientes;
CREATE POLICY "anon_select_clientes" ON clientes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_clientes" ON clientes;
CREATE POLICY "anon_insert_clientes" ON clientes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_clientes" ON clientes;
CREATE POLICY "anon_update_clientes" ON clientes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_clientes" ON clientes;
CREATE POLICY "anon_delete_clientes" ON clientes FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS crediarios (
  id_cred bigint PRIMARY KEY,
  data text,
  cliente text,
  total float8 DEFAULT 0,
  status text DEFAULT 'Pendente',
  itens_consumidos jsonb DEFAULT '[]'::jsonb,
  pagamentos jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE crediarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_crediarios" ON crediarios;
CREATE POLICY "anon_select_crediarios" ON crediarios FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_crediarios" ON crediarios;
CREATE POLICY "anon_insert_crediarios" ON crediarios FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_crediarios" ON crediarios;
CREATE POLICY "anon_update_crediarios" ON crediarios FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_crediarios" ON crediarios;
CREATE POLICY "anon_delete_crediarios" ON crediarios FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS auditoria_cancelamentos (
  id bigint PRIMARY KEY DEFAULT (extract(epoch from now()) * 1000)::bigint,
  operador text,
  tipo text,
  motivo text,
  data timestamptz DEFAULT now(),
  detalhes jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE auditoria_cancelamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_auditoria" ON auditoria_cancelamentos;
CREATE POLICY "anon_select_auditoria" ON auditoria_cancelamentos FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_auditoria" ON auditoria_cancelamentos;
CREATE POLICY "anon_insert_auditoria" ON auditoria_cancelamentos FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_auditoria" ON auditoria_cancelamentos;
CREATE POLICY "anon_update_auditoria" ON auditoria_cancelamentos FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_auditoria" ON auditoria_cancelamentos;
CREATE POLICY "anon_delete_auditoria" ON auditoria_cancelamentos FOR DELETE
  TO anon, authenticated USING (true);
