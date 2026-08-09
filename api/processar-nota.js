export default async function handler(req, res) {
    // 1. Bloqueia qualquer tentativa que não seja de envio de dados (POST)
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método não permitido' });
    }
  
    // 2. Puxa a chave SECRETAMENTE do cofre do Vercel (ninguém de fora consegue ver isso)
    const apiKey = process.env.VITE_OPENAI_API_KEY;
  
    try {
      // 3. Faz a comunicação direta e oficial com a OpenAI
      const respostaOpenAI = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(req.body)
      });
  
      const data = await respostaOpenAI.json();
      return res.status(200).json(data);
      
    } catch (error) {
      console.error("Erro no backend:", error);
      return res.status(500).json({ error: 'Erro ao conectar com a IA' });
    }
  }