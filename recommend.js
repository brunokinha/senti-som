module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY não configurada no servidor." });
  }

  const feeling = typeof req.body?.feeling === "string"
    ? req.body.feeling.trim().slice(0, 500)
    : "";

  const genres = Array.isArray(req.body?.genres)
    ? req.body.genres.filter(v => typeof v === "string").map(v => v.trim()).filter(Boolean).slice(0, 3)
    : ["Tanto faz"];

  if (!feeling) {
    return res.status(400).json({ error: "Conte como você está se sentindo." });
  }

  const genreText = genres.length ? genres.join(", ") : "Tanto faz";

  const systemInstruction = `
Você é o mecanismo de recomendação musical do SentiSom, um projeto educacional de alunos do 9º ano.

Objetivo:
- interpretar um relato curto sobre o momento da pessoa;
- considerar também os estilos musicais escolhidos;
- recomendar UMA música real que combine com o momento e com a preferência musical.

Regras:
- Dê prioridade aos gêneros informados. Se houver mais de um, escolha o que combinar melhor.
- Se a preferência for "Tanto faz", escolha livremente.
- Recomende músicas apropriadas para uma apresentação escolar e público adolescente.
- Evite conteúdo sexual explícito, violência gráfica, glorificação de drogas ou comportamentos perigosos.
- Não faça diagnóstico psicológico ou médico.
- Não diga que música cura, trata ou substitui acompanhamento profissional.
- Não invente música, artista ou colaboração.
- Prefira músicas conhecidas e fáceis de encontrar no YouTube.
- A justificativa deve ter no máximo duas frases.

Responda SOMENTE em JSON válido, sem Markdown:
{
  "title": "nome da música",
  "artist": "nome do artista",
  "genre": "gênero principal da recomendação",
  "mood": "descrição curta de 2 a 6 palavras",
  "note": "explicação curta"
}
`.trim();

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{
            role: "user",
            parts: [{ text: `Relato: ${feeling}\nPreferências musicais: ${genreText}` }]
          }],
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 220
          }
        })
      }
    );

    const payload = await response.json();

    if (!response.ok) {
      console.error("Gemini error:", JSON.stringify(payload));
      return res.status(502).json({ error: "A IA está indisponível no momento." });
    }

    const raw = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) {
      return res.status(502).json({ error: "A IA não retornou uma recomendação." });
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (_) {
      return res.status(502).json({ error: "A IA retornou uma resposta inválida." });
    }

    const clean = {
      title: String(parsed.title || "").trim().slice(0, 120),
      artist: String(parsed.artist || "").trim().slice(0, 120),
      genre: String(parsed.genre || genreText).trim().slice(0, 80),
      mood: String(parsed.mood || "").trim().slice(0, 80),
      note: String(parsed.note || "").trim().slice(0, 320)
    };

    if (!clean.title || !clean.artist || !clean.mood || !clean.note) {
      return res.status(502).json({ error: "A IA retornou dados incompletos." });
    }

    return res.status(200).json(clean);
  } catch (error) {
    console.error("Falha ao consultar Gemini:", error);
    return res.status(502).json({ error: "Não foi possível consultar a IA agora." });
  }
};
