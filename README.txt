SentiSom — publicação GitHub + Vercel

1. Crie um repositório GitHub.
2. Envie index.html e a pasta api/ (com recommend.js).
3. Na Vercel, importe o repositório.
4. Em Settings > Environment Variables, crie:
   GEMINI_API_KEY = sua chave
5. Faça Deploy ou Redeploy.
6. Teste sentimento + preferência musical.
7. O botão "Ouvir agora no YouTube" abre a busca da música recomendada.

Nunca coloque a chave no index.html ou no GitHub.

Modelo usado: gemini-3.5-flash-lite.
Se a API falhar/atingir limite, o site usa fallback local para não quebrar durante a MOBIPE.
