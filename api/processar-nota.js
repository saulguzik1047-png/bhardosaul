function normalizeOpenAIBody(body) {
  if (body && Array.isArray(body.messages)) return body;

  const input = Array.isArray(body?.input) ? body.input : [];
  const firstUser = input.find((item) => item?.role === 'user') || input[0] || {};
  const content = Array.isArray(firstUser?.content) ? firstUser.content : [];

  return {
    model: body?.model || 'gpt-4o-mini',
    response_format: body?.response_format,
    temperature: body?.temperature,
    max_tokens: body?.max_tokens,
    messages: [
      {
        role: 'user',
        content: content.map((part) => {
          if (part?.type === 'text') return { type: 'text', text: part.text || '' };
          if (part?.type === 'image_url') return { type: 'image_url', image_url: part.image_url };
          return part;
        }),
      },
    ],
  };
}

export default async function handler(req, res) {
    // 1. Bloqueia qualquer tentativa que não seja de envio de dados (POST)
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método não permitido' });
    }
  
    // 2. Puxa a chave SECRETAMENTE do cofre do Vercel (ninguém de fora consegue ver isso)
    const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      console.error("Chave da OpenAI não configurada no servidor");
      return res.status(500).json({ error: "Chave da OpenAI não configurada no servidor" });
    }
  
    try {
      // 3. Faz a comunicação direta e oficial com a OpenAI
      const payload = normalizeOpenAIBody(req.body || {});

      const respostaOpenAI = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      });
  
      const data = await respostaOpenAI.json();
      if (!respostaOpenAI.ok) {
        console.error("Erro OpenAI:", data);
        return res.status(respostaOpenAI.status).json(data);
      }
      return res.status(200).json(data);
      
    } catch (error) {
      console.error("Erro no backend:", error);
      return res.status(500).json({ error: error.message || 'Erro ao conectar com a IA' });
    }
  }