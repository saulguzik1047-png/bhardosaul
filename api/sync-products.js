import { createClient } from '@supabase/supabase-js';

function normalizeProduct(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const id = raw.id ?? raw.id_produto ?? null;
  const nome = (raw.nome ?? raw.name ?? '').toString().trim();
  if (!id || !nome) return null;

  return {
    id,
    nome,
    category: raw.category ?? raw.categoria ?? 'Geral',
    preco: Number(raw.preco ?? raw.preco_venda ?? 0) || 0,
    preco_custo: Number(raw.preco_custo ?? raw.precoCusto ?? 0) || 0,
    estoque: Number(raw.estoque ?? 0) || 0,
    estoque_minimo: Number(raw.estoque_minimo ?? raw.estoqueMinimo ?? 0) || 0,
    imagem: raw.imagem ?? '',
    fator_conversao: Number(raw.fator_conversao ?? raw.fatorConversao ?? 1) || 1,
    apelidos: Array.isArray(raw.apelidos) ? raw.apelidos : [],
    data_ultima_compra: raw.data_ultima_compra ?? raw.dataUltimaCompra ?? null,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.URL_SUPABASE;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRole) {
      return res.status(500).json({ error: 'Missing SUPABASE URL or service role key in environment' });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

    const body = req.body || {};
    const products = Array.isArray(body.products) ? body.products : (Array.isArray(body) ? body : []);

    if (!products || products.length === 0) {
      return res.status(400).json({ error: 'No products provided' });
    }

    const normalizedProducts = products
      .map(normalizeProduct)
      .filter(Boolean);

    if (normalizedProducts.length === 0) {
      return res.status(400).json({ error: 'No valid products after normalization' });
    }

    // upsert in a single batch (Supabase supports batch upsert)
    const { data, error } = await supabaseAdmin
      .from('produtos')
      .upsert(normalizedProducts, { onConflict: 'id' });
    if (error) {
      return res.status(500).json({ error: error.message || error });
    }

    return res.status(200).json({ ok: true, count: normalizedProducts.length, data });
  } catch (err) {
    console.error('sync-products error', err);
    return res.status(500).json({ error: String(err) });
  }
}
