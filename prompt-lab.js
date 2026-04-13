// prompt-lab.js
// Phase 7 : Meme prompt, 3 providers, 3 temperatures — 9 reponses en parallele
import 'dotenv/config';

const PROMPT = 'Explique ce qu\'est un cookie HTTP en 2 phrases.';
const TEMPERATURES = [0, 0.5, 1.0];

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

async function callProvider(provider, prompt, temperature) {
  if (!provider.key || provider.key.startsWith('your_')) {
    return { provider: provider.name, temperature, content: null, error: 'Cle manquante' };
  }

  // HuggingFace n'accepte pas temperature: 0
  const temp = provider.format === 'huggingface' && temperature === 0 ? 0.01 : temperature;

  let body;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${provider.key}`
  };

  if (provider.format === 'huggingface') {
    body = JSON.stringify({
      inputs: prompt,
      parameters: { max_new_tokens: 150, temperature: temp }
    });
  } else {
    body = JSON.stringify({
      model: provider.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: temp
    });
  }

  try {
    const response = await fetch(provider.url, { method: 'POST', headers, body });
    const data = await response.json();

    if (!response.ok) {
      return { provider: provider.name, temperature, content: null, error: `HTTP ${response.status}` };
    }

    let content;
    if (provider.format === 'huggingface') {
      const generated = Array.isArray(data) ? data[0]?.generated_text : data.generated_text;
      content = generated ? generated.replace(prompt, '').trim() : '(vide)';
    } else {
      content = data.choices?.[0]?.message?.content || '(vide)';
    }

    return { provider: provider.name, temperature, content };
  } catch (err) {
    return { provider: provider.name, temperature, content: null, error: err.message };
  }
}

// === Main ===
async function main() {
  console.log('Prompt Lab — Temperature x Provider');
  console.log('═'.repeat(60));
  console.log(`Prompt : "${PROMPT}"\n`);

  // Generer toutes les combinaisons et lancer en parallele
  const tasks = providers.flatMap(p =>
    TEMPERATURES.map(t => callProvider(p, PROMPT, t))
  );

  const results = await Promise.all(tasks);

  // Affichage
  for (const r of results) {
    const status = r.error ? `[ERR] ${r.error}` : r.content?.substring(0, 80) + '...';
    console.log(`${r.provider.padEnd(14)} | temp ${r.temperature.toFixed(1)} | ${status}`);
  }

  console.log('\n' + '─'.repeat(60));
  console.log('Observation : a temperature 0, reponses seches et repetables.');
  console.log('A temperature 1, elles varient entre les runs.\n');
}

main();
