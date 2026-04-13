// multi-langue.js
// Phase 13 : Meme question en FR/EN/ES — comparaison tokens et couts
import 'dotenv/config';

const QUESTIONS = [
  { lang: 'Francais', prompt: 'Explique ce qu\'est le machine learning en 3 phrases.' },
  { lang: 'English',  prompt: 'Explain what machine learning is in 3 sentences.' },
  { lang: 'Espanol',  prompt: 'Explica que es el machine learning en 3 frases.' }
];

// Prix Mistral Small par million de tokens (input)
const PRICE_PER_M = 0.20;

// Provider principal
const providers = [
  {
    name: 'Groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    key: process.env.GROQ_API_KEY,
    model: 'llama-3.3-70b-versatile'
  },
  {
    name: 'Mistral',
    url: 'https://api.mistral.ai/v1/chat/completions',
    key: process.env.MISTRAL_API_KEY,
    model: 'mistral-small-latest'
  }
];

async function callProvider(prov, prompt) {
  if (!prov.key || prov.key.startsWith('your_')) return null;

  const start = Date.now();
  const response = await fetch(prov.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${prov.key}`
    },
    body: JSON.stringify({
      model: prov.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.3
    })
  });

  const data = await response.json();
  const latency = Date.now() - start;

  if (!response.ok) return null;

  return {
    content: data.choices[0].message.content,
    promptTokens: data.usage?.prompt_tokens || 0,
    completionTokens: data.usage?.completion_tokens || 0,
    totalTokens: data.usage?.total_tokens || 0,
    latency
  };
}

// === Main ===
async function main() {
  // Choisir le premier provider disponible
  const active = providers.find(p => p.key && !p.key.startsWith('your_'));

  if (!active) {
    console.log('[ERR] Aucune cle API disponible (Groq ou Mistral requis)');
    return;
  }

  console.log(`\nMulti-langue (${active.name}, meme question)`);
  console.log('═'.repeat(70));

  const results = await Promise.all(
    QUESTIONS.map(async (q) => {
      const result = await callProvider(active, q.prompt);
      return { lang: q.lang, ...result };
    })
  );

  // Tableau
  console.log('\n' +
    '| Langue'.padEnd(13) +
    '| Tokens input'.padEnd(16) +
    '| Tokens output'.padEnd(17) +
    '| Cout estime'.padEnd(15) +
    '| Qualite (1-5) |'
  );
  console.log('|' + '-'.repeat(11) + '|' + '-'.repeat(14) + '|' + '-'.repeat(15) + '|' + '-'.repeat(13) + '|' + '-'.repeat(15) + '|');

  for (const r of results) {
    if (!r.totalTokens) {
      console.log(`| ${r.lang.padEnd(9)} | [ERR]    ${' '.repeat(49)} |`);
      continue;
    }

    const cost = ((r.totalTokens / 1_000_000) * PRICE_PER_M).toFixed(6);
    console.log(
      `| ${r.lang.padEnd(9)} ` +
      `| ${String(r.promptTokens).padEnd(12)} ` +
      `| ${String(r.completionTokens).padEnd(13)} ` +
      `| $${cost.padEnd(10)} ` +
      `| —             |`
    );
  }

  // Comparaison FR vs EN
  const fr = results.find(r => r.lang === 'Francais');
  const en = results.find(r => r.lang === 'English');

  if (fr?.promptTokens && en?.promptTokens) {
    const ratio = ((fr.promptTokens / en.promptTokens - 1) * 100).toFixed(0);
    console.log(`\nFR consomme ${ratio}% de tokens input en plus que EN.`);
  }

  console.log('Colonne qualite : a remplir subjectivement.\n');
}

main();
