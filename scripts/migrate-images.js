#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');

function parseEnv(file) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (const l of lines) {
    const s = l.split('#')[0].trim();
    if (!s) continue;
    const eq = s.indexOf('=');
    if (eq === -1) continue;
    const k = s.slice(0, eq).trim();
    const v = s.slice(eq + 1).trim();
    process.env[k] = v.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  }
}

parseEnv(path.resolve(process.cwd(), '.env'));

const argv = require('minimist')(process.argv.slice(2), {
  boolean: ['dry-run'],
  alias: { n: 'dry-run', l: 'limit' },
  default: { 'dry-run': true, limit: 50 }
});

const DRY_RUN = Boolean(argv['dry-run']);
const LIMIT = parseInt(argv.limit || 50, 10);

(async () => {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    let SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    let SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    // if not provided, try to parse fallback values from supabase.js
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      try {
        const supFile = path.resolve(process.cwd(), 'supabase.js');
        if (fs.existsSync(supFile)) {
          const txt = fs.readFileSync(supFile, 'utf8');
          const urlMatch = txt.match(/const\s+supabaseUrl\s*=\s*import\.meta\.env\.VITE_SUPABASE_URL\s*\|\|\s*['"]([^'"]+)['"]/);
          const keyMatch = txt.match(/const\s+supabaseAnonKey\s*=\s*import\.meta\.env\.VITE_SUPABASE_ANON_KEY\s*\|\|\s*['"]([^'"]+)['"]/);
          if (!SUPABASE_URL && urlMatch) SUPABASE_URL = urlMatch[1];
          if (!SUPABASE_ANON_KEY && keyMatch) SUPABASE_ANON_KEY = keyMatch[1];
        }
      } catch (e) {
        // ignore
      }
    }
    const BUCKET = process.env.VITE_SUPABASE_STORAGE_BUCKET || process.env.SUPABASE_STORAGE_BUCKET || 'produtos';

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('Faltando variáveis SUPABASE_URL ou SUPABASE_ANON_KEY no ambiente ou em .env');
      process.exit(1);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    console.log('Buscando produtos...');
    const { data: produtos, error: errSelect } = await supabase
      .from('produtos')
      .select('id,nome,imagem')
      .order('id', { ascending: false })
      .limit(1000);

    if (errSelect) {
      console.error('Erro ao buscar produtos:', errSelect);
      process.exit(1);
    }

    const toMigrate = produtos.filter(p => {
      const img = String(p.imagem || '').trim();
      if (!img) return false;
      if (img.startsWith('data:image/')) return false;
      if (!/^https?:\/\//i.test(img)) return false;
      // already in our storage?
      if (img.includes('/storage/v0/') || (SUPABASE_URL && img.includes(new URL(SUPABASE_URL).hostname))) return false;
      return true;
    }).slice(0, LIMIT);

    console.log(`Encontrados ${toMigrate.length} produtos para migrar (limit ${LIMIT}). dry-run=${DRY_RUN}`);

    const results = [];

    for (const p of toMigrate) {
      console.log(`\n[ID ${p.id}] ${p.nome} -> ${p.imagem}`);
      try {
        const res = await fetch(p.imagem, { method: 'GET' });
        if (!res.ok) {
          console.warn(`  Falha ao baixar imagem: ${res.status} ${res.statusText}`);
          results.push({ id: p.id, ok: false, reason: `download ${res.status}` });
          continue;
        }
        const contentType = res.headers.get('content-type') || 'image/jpeg';
        if (!contentType.startsWith('image/')) {
          console.warn('  Conteúdo não é imagem:', contentType);
          results.push({ id: p.id, ok: false, reason: 'not-image' });
          continue;
        }

        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const extFromType = (contentType.split('/')[1] || 'jpg').split(';')[0].replace('jpeg', 'jpg');
        const safeName = String(p.nome || 'produto').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'produto';
        const filename = `${Date.now()}-${safeName}-${Math.random().toString(36).slice(2,8)}.${extFromType}`;
        const tmpPath = path.join(os.tmpdir(), filename);
        fs.writeFileSync(tmpPath, buffer);

        if (DRY_RUN) {
          console.log(`  dry-run: arquivo pronto em ${tmpPath} (não enviado)`);
          fs.unlinkSync(tmpPath);
          results.push({ id: p.id, ok: true, action: 'dry' });
          continue;
        }

        // upload
        const stream = fs.createReadStream(tmpPath);
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filename, stream, {
          cacheControl: '3600',
          upsert: false,
          contentType
        });
        if (uploadError) {
          console.error('  Erro ao enviar para Storage:', uploadError);
          fs.unlinkSync(tmpPath);
          results.push({ id: p.id, ok: false, reason: 'upload-error', detail: uploadError });
          continue;
        }

        const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(filename);
        const publicUrl = (publicData && publicData.publicUrl) ? publicData.publicUrl : '';

        if (!publicUrl) {
          console.warn('  Não foi possível obter publicUrl');
          fs.unlinkSync(tmpPath);
          results.push({ id: p.id, ok: false, reason: 'no-public-url' });
          continue;
        }

        const { error: updateError } = await supabase.from('produtos').update({ imagem: publicUrl }).eq('id', p.id);
        fs.unlinkSync(tmpPath);
        if (updateError) {
          console.error('  Erro ao atualizar produto:', updateError);
          results.push({ id: p.id, ok: false, reason: 'update-error', detail: updateError });
          continue;
        }

        console.log('  Migrado com sucesso ->', publicUrl);
        results.push({ id: p.id, ok: true, publicUrl });

      } catch (err) {
        console.error('  Exceção:', err.message || err);
        results.push({ id: p.id, ok: false, reason: 'exception', detail: String(err) });
      }
    }

    console.log('\nResumo:');
    const ok = results.filter(r => r.ok).length;
    const bad = results.length - ok;
    console.log(`  total processados: ${results.length}`);
    console.log(`  OK: ${ok}`);
    console.log(`  Falhas: ${bad}`);

    if (DRY_RUN) {
      console.log('\nDry-run concluído. Remova --dry-run para executar a migração real.');
    }

    process.exit(0);
  } catch (err) {
    console.error('Erro fatal:', err);
    process.exit(1);
  }
})();
