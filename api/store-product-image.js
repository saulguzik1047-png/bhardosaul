import { createClient } from '@supabase/supabase-js';

function sanitizeName(name) {
  return String(name || 'produto')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'produto';
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  const contentType = match[1];
  const base64 = match[2];
  const buffer = Buffer.from(base64, 'base64');
  return { buffer, contentType };
}

function extFromContentType(contentType) {
  const ext = String(contentType || '').split('/')[1] || 'jpg';
  return ext.split(';')[0].replace('jpeg', 'jpg');
}

function normalizeSecret(value) {
  return String(value || '')
    .trim()
    .replace(/^Bearer\s+/i, '')
    .replace(/^['"]|['"]$/g, '')
    .trim();
}

function describeSecret(value) {
  if (value.startsWith('sb_secret_')) return 'new Supabase secret key';
  if (value.split('.').length === 3) return 'JWT-shaped key';
  return 'invalid key format';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = normalizeSecret(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.URL_SUPABASE);
    const serviceRole = normalizeSecret(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_KEY);
    const bucket = normalizeSecret(process.env.VITE_SUPABASE_STORAGE_BUCKET || process.env.SUPABASE_STORAGE_BUCKET || 'produtos');

    if (!supabaseUrl || !serviceRole) {
      return res.status(500).json({ error: 'Missing SUPABASE URL or service role key in environment' });
    }

    if (!serviceRole.startsWith('sb_secret_') && serviceRole.split('.').length !== 3) {
      return res.status(500).json({
        error: `Credencial do Supabase inválida (${describeSecret(serviceRole)}). Use a chave service_role JWT ou uma chave sb_secret_ em SUPABASE_SERVICE_ROLE_KEY.`
      });
    }

    const { imageUrl, productName } = req.body || {};
    const source = String(imageUrl || '').trim();

    if (!source) {
      return res.status(200).json({ ok: true, publicUrl: '' });
    }

    // Already a Supabase storage public URL.
    if (source.includes('/storage/v1/object/public/')) {
      return res.status(200).json({ ok: true, publicUrl: source, reused: true });
    }

    let buffer = null;
    let contentType = 'image/jpeg';

    const parsedData = parseDataUrl(source);
    if (parsedData) {
      buffer = parsedData.buffer;
      contentType = parsedData.contentType;
    } else {
      const fetched = await fetch(source, { method: 'GET' });
      if (!fetched.ok) {
        return res.status(400).json({ error: `Could not download image (${fetched.status})` });
      }
      contentType = fetched.headers.get('content-type') || contentType;
      if (!contentType.startsWith('image/')) {
        return res.status(400).json({ error: `Invalid content-type: ${contentType}` });
      }
      const arr = await fetched.arrayBuffer();
      buffer = Buffer.from(arr);
    }

    const ext = extFromContentType(contentType);
    const fileName = `${Date.now()}-${sanitizeName(productName)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const supabaseAdmin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
    const { error: uploadError } = await supabaseAdmin.storage.from(bucket).upload(fileName, buffer, {
      contentType,
      upsert: false,
      cacheControl: '3600',
    });

    if (uploadError) {
      return res.status(500).json({ error: uploadError.message || String(uploadError) });
    }

    const { data: publicData } = supabaseAdmin.storage.from(bucket).getPublicUrl(fileName);
    return res.status(200).json({ ok: true, publicUrl: publicData?.publicUrl || '' });
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
}
