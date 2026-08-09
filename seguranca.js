// Arquivo: seguranca.js
// Motor de Criptografia de Via Única (SHA-256)

export async function criptografarSenha(senhaPura) {
    if (!senhaPura) return '';
    
    // 1. Transforma o texto da senha em bytes
    const encoder = new TextEncoder();
    const data = encoder.encode(senhaPura);
    
    // 2. Passa os bytes no "triturador" criptográfico do navegador
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // 3. Converte o resultado de volta para texto (código hexadecimal ilegível)
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex; // Retorna a senha blindada (Ex: 03ac674216f3e15c...)
  }