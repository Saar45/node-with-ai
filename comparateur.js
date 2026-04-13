// comparateur.js
// Phase 8 : 5 types de taches, 3 providers — comparaison en tableau markdown
import 'dotenv/config';

const PROMPTS = [
  { type: 'traduction', prompt: 'Traduis en anglais : "Le chat dort sur le canape."' },
  { type: 'resume', prompt: 'Resume en une phrase : "L\'intelligence artificielle est un domaine de l\'informatique qui vise a creer des systemes capables de realiser des taches necessitant normalement l\'intelligence humaine, comme la reconnaissance vocale, la prise de decision et la traduction linguistique."' },
  { type: 'code', prompt: 'Ecris une fonction JavaScript qui inverse une chaine de caracteres. Juste le code, pas d\'explication.' },
  { type: 'creatif', prompt: 'Donne une metaphore originale pour expliquer ce qu\'est un LLM. Une seule phrase.' },
  { type: 'factuel', prompt: 'Qui a invente l\'architecture Transformer en 2017 ? Reponds en une phrase.' }
];

const providers = [
  {
    name: 'Mistral',
    url: 'https://api.mistral.ai/v1/chat/completions',
    key: process.env.MISTRAL_API_KEY,
    model: 'mistral-small-latest',
    format: 'openai'
  },
  {
    name: 'Groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    key: process.env.GROQ_API_KEY,
    model: 'llama-3.3-70b-versatile',
    format: 'openai'
  },
  {
    name: 'HuggingFace',
    url: 'https://router.huggingface.co/v1/chat/completions',
    key: process.env.HF_API_KEY,
    model: 'meta-llama/Llama-3.1-8B-Instruct',
    format: 'openai'
  }
];

async function callProvider(provider, prompt) {
  if (!provider.key || provider.key.startsWith('your_')) {
    return { provider: provider.name, content: null, latency: 0, error: 'Cle manquante' };
  }

  let body;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${provider.key}`
  };

  if (provider.format === 'huggingface') {
    body = JSON.stringify({
      inputs: prompt,
      parameters: { max_new_tokens: 200, temperature: 0.3 }
    });
  } else {
    body = JSON.stringify({
      model: provider.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0.3
    });
  }

  const start = Date.now();

  try {
    const response = await fetch(provider.url, { method: 'POST', headers, body });
    const data = await response.json();
    const latency = Date.now() - start;

    if (!response.ok) {
      return { provider: provider.name, content: null, latency, error: `HTTP ${response.status}` };
    }

    let content;
    if (provider.format === 'huggingface') {
      const generated = Array.isArray(data) ? data[0]?.generated_text : data.generated_text;
      content = generated ? generated.replace(prompt, '').trim() : '(vide)';
    } else {
      content = data.choices?.[0]?.message?.content || '(vide)';
    }

    return { provider: provider.name, content, latency };
  } catch (err) {
    return { provider: provider.name, content: null, latency: Date.now() - start, error: err.message };
  }
}

// === Main ===
async function main() {
  console.log('Comparateur de modeles — 5 taches x 3 providers');
  console.log('═'.repeat(80));
  console.log('Temperature : 0.3 (stable)\n');

  // Lancer toutes les combinaisons en parallele
  const tasks = PROMPTS.flatMap(p =>
    providers.map(prov => callProvider(prov, p.prompt).then(r => ({ type: p.type, ...r })))
  );

  const results = await Promise.all(tasks);

  // Construire le tableau markdown
  const providerNames = providers.map(p => p.name);
  const headerLine = `| Type       | ${providerNames.map(n => n.padEnd(35)).join(' | ')} |`;
  const separator = `|${'-'.repeat(12)}|${providerNames.map(() => '-'.repeat(37)).join('|')}|`;

  console.log(headerLine);
  console.log(separator);

  for (const promptDef of PROMPTS) {
    const cells = providerNames.map(name => {
      const r = results.find(r => r.type === promptDef.type && r.provider === name);
      if (!r || r.error) return `[ERR] ${r?.error || 'erreur'}`.padEnd(35);
      return (r.content?.substring(0, 33) + (r.content?.length > 33 ? '..' : '')).padEnd(35);
    });

    console.log(`| ${promptDef.type.padEnd(10)} | ${cells.join(' | ')} |`);
  }

  console.log('\n' + '─'.repeat(80));

  // Afficher les latences
  console.log('\nLatences :');
  for (const name of providerNames) {
    const provResults = results.filter(r => r.provider === name && !r.error);
    if (provResults.length === 0) {
      console.log(`  ${name.padEnd(14)} — (aucune reponse)`);
      continue;
    }
    const avg = Math.round(provResults.reduce((s, r) => s + r.latency, 0) / provResults.length);
    console.log(`  ${name.padEnd(14)} avg ${avg}ms`);
  }
  console.log('');
}

main();
