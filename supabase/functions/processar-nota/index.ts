import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("VITE_OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Chave da OpenAI não configurada" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.json();

    const normalizeOpenAIBody = (raw: any) => {
      if (raw && Array.isArray(raw.messages)) return raw;

      const input = Array.isArray(raw?.input) ? raw.input : [];
      const firstUser = input.find((item: any) => item?.role === "user") || input[0] || {};
      const content = Array.isArray(firstUser?.content) ? firstUser.content : [];

      return {
        model: raw?.model || "gpt-4o-mini",
        response_format: raw?.response_format,
        temperature: raw?.temperature,
        max_tokens: raw?.max_tokens,
        messages: [
          {
            role: "user",
            content: content.map((part: any) => {
              if (part?.type === "text") return { type: "text", text: part.text || "" };
              if (part?.type === "image_url") return { type: "image_url", image_url: part.image_url };
              return part;
            }),
          },
        ],
      };
    };

    const payload = normalizeOpenAIBody(body);

    const respostaOpenAI = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await respostaOpenAI.json();

    if (!respostaOpenAI.ok) {
      return new Response(JSON.stringify(data), {
        status: respostaOpenAI.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
