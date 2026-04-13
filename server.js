// server.js
// Phase 9 : Mini-serveur Express — 3 routes
import 'dotenv/config';
import express from 'express';
import { checkProvider, checkPinecone, providers } from './check-connections.js';
import { estimateCostData } from './cost-calculator.js';

const app = express();
const PORT = 3000;

// GET /check → lance les checks de connexion, renvoie le JSON
app.get('/check', async (req, res) => {
  const results = await Promise.all([
    ...providers.map(p => checkProvider(p)),
    checkPinecone()
  ]);
  res.json(results);
});

// GET /ask?q=...&provider=mistral|groq|huggingface → envoie le prompt au provider
app.get('/ask', async (req, res) => {
  const { q, provider: providerName } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Parametre "q" requis' });
  }

  const providerNameLower = (providerName || 'mistral').toLowerCase();
  const provider = providers.find(p => p.name.toLowerCase() === providerNameLower);

  if (!provider) {
    return res.status(400).json({
      error: `Provider "${providerName}" non trouve. Disponibles : ${providers.map(p => p.name.toLowerCase()).join(', ')}`
    });
  }

  if (!provider.key || provider.key.startsWith('your_')) {
    return res.status(400).json({ error: `Cle API manquante pour ${provider.name}` });
  }

  // Appel au provider
  let body;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${provider.key}`
  };

  if (provider.format === 'huggingface') {
    body = JSON.stringify({
      inputs: q,
      parameters: { max_new_tokens: 500, temperature: 0.7 }
    });
  } else {
    body = JSON.stringify({
      model: provider.model,
      messages: [{ role: 'user', content: q }],
      max_tokens: 500,
      temperature: 0.7
    });
  }

  try {
    const start = Date.now();
    const response = await fetch(provider.url, { method: 'POST', headers, body });
    const data = await response.json();
    const latency = Date.now() - start;

    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }

    let content;
    if (provider.format === 'huggingface') {
      const generated = Array.isArray(data) ? data[0]?.generated_text : data.generated_text;
      content = generated ? generated.replace(q, '').trim() : '(vide)';
    } else {
      content = data.choices?.[0]?.message?.content || '(vide)';
    }

    res.json({
      provider: provider.name,
      response: content,
      latency,
      tokens: data.usage?.total_tokens || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /cost?text=... → estime les couts pour le texte donne
app.get('/cost', (req, res) => {
  const { text } = req.query;

  if (!text) {
    return res.status(400).json({ error: 'Parametre "text" requis' });
  }

  res.json(estimateCostData(text));
});

app.listen(PORT, () => {
  console.log(`\nServeur demarre sur http://localhost:${PORT}`);
  console.log(`\nRoutes disponibles :`);
  console.log(`  GET /check                          -> verifier les connexions`);
  console.log(`  GET /ask?q=...&provider=mistral      -> poser une question`);
  console.log(`  GET /cost?text=...                   -> estimer les couts\n`);
});
