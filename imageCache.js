const DATABASE_NAME = 'bhar-pdv-image-cache';
const DATABASE_VERSION = 1;
const IMAGE_STORE = 'product-images';

function abrirBancoImagens() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('O navegador não oferece armazenamento local de imagens.'));
      return;
    }

    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(IMAGE_STORE)) {
        database.createObjectStore(IMAGE_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Não foi possível abrir o cache de imagens.'));
  });
}

function blobParaDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Não foi possível restaurar uma imagem do cache.'));
    reader.readAsDataURL(blob);
  });
}

export async function salvarImagensProdutosNoCache(imagens) {
  const database = await abrirBancoImagens();
  const falhas = [];

  for (const { id, imagem } of imagens) {
    const source = String(imagem || '').trim();
    if (id === undefined || id === null || !source) continue;

    try {
      const response = await fetch(source);
      if (!response.ok) throw new Error(`Download da imagem falhou (${response.status}).`);
      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) {
        throw new Error(`O conteúdo recebido não é uma imagem (${blob.type || 'tipo desconhecido'}).`);
      }

      await new Promise((resolve, reject) => {
        const transaction = database.transaction(IMAGE_STORE, 'readwrite');
        transaction.objectStore(IMAGE_STORE).put({
          id: String(id),
          source,
          blob,
          cachedAt: Date.now(),
        });
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error || new Error('Não foi possível salvar uma imagem no cache.'));
        transaction.onabort = () => reject(transaction.error || new Error('O salvamento de uma imagem no cache foi cancelado.'));
      });
    } catch (error) {
      falhas.push({ id, error });
    }
  }

  database.close();
  return { salvas: imagens.length - falhas.length, falhas };
}

export async function carregarImagensProdutosDoCache() {
  const database = await abrirBancoImagens();

  try {
    const registros = await new Promise((resolve, reject) => {
      const transaction = database.transaction(IMAGE_STORE, 'readonly');
      const request = transaction.objectStore(IMAGE_STORE).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error || new Error('Não foi possível ler o cache de imagens.'));
    });

    return await Promise.all(registros.map(async (registro) => ({
      id: String(registro.id),
      source: registro.source,
      imagem: registro.blob ? await blobParaDataUrl(registro.blob) : registro.source,
    })));
  } finally {
    database.close();
  }
}
