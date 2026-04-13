// prompt-sensitivity.js
// Phase 12 : Sensibilite du prompt — 5 formulations, meme sens
import 'dotenv/config';

const VARIATIONS = [
  'Explique le machine learning',
  'Explique-moi le machine learning',
  'Peux-tu m\'expliquer le machine learning ?',
  'C\'est quoi le machine learning ?',
  'Machine learning : definition et explication'
];

// On utilise un seul provider pour isoler l'effet du prompt
const provider = {
  name: 'Groq',
  url: 'https://api.groq.com/openai/v1/chat/completions',
  key: process.env.GROQ_API_KEY,
  model: 'llama-3.3-70b-versatile'
};

// Fallback sur Mistral si Groq n'est pas dispo
const fallback = {
  name: 'Mistral',
  url: 'https://api.mistral.ai/v1/chat/completions',
  key: process.env.MISTRAL_API_KEY,
  model: 'mistral-small-latest'
};

async function callWithPrompt(prov, prompt) {
  if (!prov.key || prov.key.startsWith('your_')) return null;

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
  if (!response.ok) return null;

  return {
    content: data.choices[0].message.content,
    tokens: data.usage?.total_tokens || 0,
    completionTokens: data.usage?.completion_tokens || 0
  };
}

// === Main ===
async function main() {
  // Choisir le provider disponible
  const active = (provider.key && !provider.key.startsWith('your_')) ? provider : fallback;

  if (!active.key || active.key.startsWith('your_')) {
    console.log('[ERR] Aucune cle API disponible (Groq ou Mistral requis)');
    return;
  }

  console.log(`\nSensibilite du prompt (${active.name}, temperature 0.3)`);
  console.log('═'.repeat(80));

  // Lancer toutes les variantes en parallele
  const results = await Promise.all(
    VARIATIONS.map(async (prompt) => {
      const result = await callWithPrompt(active, prompt);
      return { prompt, ...result };
    })
  );

  // Affichage en tableau
  console.log('\n' +
    '| Formulation'.padEnd(35) +
    '| Tokens'.padEnd(10) +
    '| Longueur'.padEnd(12) +
    '| Premiere phrase'.padEnd(45) + '|'
  );
  console.log('|' + '-'.repeat(33) + '|' + '-'.repeat(8) + '|' + '-'.repeat(10) + '|' + '-'.repeat(43) + '|');

  for (const r of results) {
    if (!r.content) {
      console.log(`| ${r.prompt.padEnd(31)} | [ERR]     |`);
      continue;
    }

    const firstSentence = r.content.split(/[.!?\n]/)[0]?.trim() || '';
    console.log(
      `| ${r.prompt.substring(0, 31).padEnd(31)} ` +
      `| ${String(r.tokens).padEnd(6)} ` +
      `| ${(r.content.length + ' cars').padEnd(8)} ` +
      `| ${('"' + firstSentence.substring(0, 38) + '..."').padEnd(41)} |`
    );
  }

  console.log('\n' + '─'.repeat(80));
  console.log('Observation : la formulation impacte le ton et la longueur, pas le fond.\n');
}

main();
