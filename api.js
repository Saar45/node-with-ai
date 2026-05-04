// api.js
// Projet J2 Phase 8 : Mini API HTTP qui expose le chatbot
import 'dotenv/config';
import express from 'express';

const PROVIDERS = {
  mistral: {
    name: 'mistral',
    url: 'https://api.mistral.ai/v1/chat/completions',
    key: process.env.MISTRAL_API_KEY,
    model: 'mistral-small-latest'
  },
  groq: {
    name: 'groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    key: process.env.GROQ_API_KEY,
    model: 'llama-3.3-70b-versatile'
  }
};

// Etat partage : vit pour toute la duree du serveur
const sessionHistory = [
  {
    role: 'system',
    content: 'Tu es un assistant utile et concis. Tu te souviens de tout ce qui a ete dit dans cette session.'
  }
];

const app = express();
app.use(express.json());

// GET /chat?q=...&provider=mistral|groq
app.get('/chat', async (req, res) => {
  const { q, provider: providerName } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Parametre "q" requis' });
  }

  const provider = PROVIDERS[(providerName || 'mistral').toLowerCase()];
  if (!provider) {
    return res.status(400).json({
      error: `Provider inconnu. Disponibles : ${Object.keys(PROVIDERS).join(', ')}`
    });
  }
  if (!provider.key || provider.key.startsWith('your_')) {
    return res.status(500).json({ error: `Cle API manquante pour ${provider.name}` });
  }

  sessionHistory.push({ role: 'user', content: q });

  try {
    const response = await fetch(provider.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.key}`
      },
      body: JSON.stringify({
        model: provider.model,
        messages: sessionHistory,
        temperature: 0.7
      })
    });

    const data = await response.json();

    if (!response.ok) {
      sessionHistory.pop();
      return res.status(response.status).json({ error: data });
    }

    const reply = data.choices[0].message.content;
    sessionHistory.push({ role: 'assistant', content: reply });

    res.json({
      reply,
      provider: provider.name,
      tokens: data.usage?.total_tokens || null
    });
  } catch (err) {
    sessionHistory.pop();
    res.status(500).json({ error: err.message });
  }
});

// DELETE /history → reinitialise la session (garde le system prompt)
app.delete('/history', (req, res) => {
  const removed = sessionHistory.length - 1;
  sessionHistory.splice(1);
  res.json({ message: `Historique reinitialise (${removed} messages supprimes)` });
});

// GET /history → utile pour debug
app.get('/history', (req, res) => {
  res.json(sessionHistory);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`\nAPI chatbot demarree sur http://localhost:${PORT}\n`);
  console.log('Routes :');
  console.log('  GET    /chat?q=...&provider=mistral|groq   poser une question');
  console.log('  GET    /history                             voir l\'historique');
  console.log('  DELETE /history                             reinitialiser\n');
});
