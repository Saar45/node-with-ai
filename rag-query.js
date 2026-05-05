// rag-query.js
// Phase 7 + 8 du projet J3 : retrieval (searchSimilar) + generation (ragQuery)
import 'dotenv/config';
import { getEmbedding } from './test-embedding.js';

// Cherche les topK chunks les plus proches semantiquement de `question`
export async function searchSimilar(question, topK = 3) {
  const questionVec = await getEmbedding(question);

  const host = process.env.PINECONE_INDEX_HOST;
  if (!host) throw new Error('PINECONE_INDEX_HOST manquant dans .env');

  const url = host.startsWith('http') ? `${host}/query` : `https://${host}/query`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Api-Key': process.env.PINECONE_API_KEY,
      'Content-Type': 'application/json',
      'X-Pinecone-API-Version': '2024-07'
    },
    body: JSON.stringify({
      vector: questionVec,
      topK,
      includeMetadata: true
    })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(`Pinecone query : HTTP ${response.status} ${JSON.stringify(data)}`);
  }

  const data = await response.json();
  return data.matches.map(m => ({
    score: m.score,
    text: m.metadata?.text || ''
  }));
}

// Pipeline RAG complet : retrieval + generation
export async function ragQuery(question, opts = {}) {
  const topK = opts.topK || 3;

  console.log(`Question : ${question}`);

  // 1) Retrieval
  const chunks = await searchSimilar(question, topK);

  console.log('\nContexte recupere :');
  for (const c of chunks) {
    console.log(`  [${c.score.toFixed(2)}] ${c.text.substring(0, 100)}...`);
  }

  // 2) Generation avec backoff sur 429 (Mistral free tier sature parfois)
  const context = chunks.map(c => c.text).join('\n\n');
  const body = JSON.stringify({
    model: 'mistral-small-latest',
    messages: [
      {
        role: 'system',
        content: 'Tu reponds uniquement a partir du contexte fourni. Si l\'information demandee n\'est pas dans le contexte, dis-le explicitement. Ne fabule pas.'
      },
      {
        role: 'user',
        content: `Contexte :\n${context}\n\nQuestion : ${question}`
      }
    ],
    temperature: 0.3
  });

  // Mistral en priorite, fallback Groq si 429 (free tier sature)
  const providers = [
    { name: 'Mistral', url: 'https://api.mistral.ai/v1/chat/completions', key: process.env.MISTRAL_API_KEY, model: 'mistral-small-latest' },
    { name: 'Groq',    url: 'https://api.groq.com/openai/v1/chat/completions', key: process.env.GROQ_API_KEY, model: 'llama-3.3-70b-versatile' }
  ];

  let answer = null;
  for (const p of providers) {
    if (!p.key || p.key.startsWith('your_')) continue;
    const providerBody = body.replace(/"model":"[^"]+"/, `"model":"${p.model}"`);
    const response = await fetch(p.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${p.key}` },
      body: providerBody
    });
    const data = await response.json();
    if (response.ok && data.choices) {
      answer = data.choices[0].message.content;
      if (p.name !== 'Mistral') console.log(`[INFO] Generation via ${p.name} (Mistral indispo)`);
      break;
    }
    console.log(`[WARN] ${p.name} : HTTP ${response.status}, on bascule au suivant`);
  }
  if (!answer) throw new Error('Aucun provider disponible pour la generation');
  console.log(`\nReponse : ${answer}\n`);
  return answer;
}

const isMain = process.argv[1]?.endsWith('rag-query.js');
if (isMain) {
  const question = process.argv[2] || 'Qui a cree Node.js et quand ?';
  await ragQuery(question);
}
