// check-connections.js
// Phases 1-5 : Verifie les connexions API de tous les providers
import 'dotenv/config';

const verbose = process.argv.includes('--verbose');

// Configuration des providers
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

// Fonction generique pour tester un provider LLM
async function checkProvider(provider) {
  // Verifier que la cle est presente
  if (!provider.key || provider.key.startsWith('your_')) {
    return {
      provider: provider.name,
      status: 'SKIP',
      latency: 0,
      error: 'Cle API manquante dans .env'
    };
  }

  const prompt = verbose
    ? 'Donne-moi la capitale de la France en un mot.'
    : 'Dis juste ok.';

  let body;
  let headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${provider.key}`
  };

  if (provider.format === 'huggingface') {
    body = JSON.stringify({
      inputs: prompt,
      parameters: { max_new_tokens: 20, temperature: 0.3 }
    });
  } else {
    body = JSON.stringify({
      model: provider.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 20,
      temperature: 0.3
    });
  }

  const start = Date.now();

  try {
    const response = await fetch(provider.url, {
      method: 'POST',
      headers,
      body
    });

    const latency = Date.now() - start;
    const data = await response.json();

    if (!response.ok) {
      return {
        provider: provider.name,
        status: 'ERROR',
        latency,
        error: `HTTP ${response.status} — ${data.message || data.error?.message || JSON.stringify(data)}`
      };
    }

    // Extraire le contenu selon le format
    let content;
    if (provider.format === 'huggingface') {
      const generated = Array.isArray(data) ? data[0]?.generated_text : data.generated_text;
      content = generated ? generated.replace(prompt, '').trim() : '(vide)';
    } else {
      content = data.choices?.[0]?.message?.content || '(vide)';
    }

    return {
      provider: provider.name,
      status: 'OK',
      latency,
      ...(verbose && { response: content })
    };
  } catch (err) {
    return {
      provider: provider.name,
      status: 'ERROR',
      latency: Date.now() - start,
      error: err.message
    };
  }
}

// Verifier la connexion Pinecone (Phase 5)
async function checkPinecone() {
  const key = process.env.PINECONE_API_KEY;

  if (!key || key.startsWith('your_')) {
    return {
      provider: 'Pinecone',
      status: 'SKIP',
      latency: 0,
      error: 'Cle API manquante dans .env'
    };
  }

  const start = Date.now();

  try {
    const response = await fetch('https://api.pinecone.io/indexes', {
      method: 'GET',
      headers: {
        'Api-Key': key,
        'X-Pinecone-API-Version': '2024-07'
      }
    });

    const latency = Date.now() - start;

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        provider: 'Pinecone',
        status: 'ERROR',
        latency,
        error: `HTTP ${response.status} — ${data.message || data.error?.message || ''}`
      };
    }

    return { provider: 'Pinecone', status: 'OK', latency };
  } catch (err) {
    return {
      provider: 'Pinecone',
      status: 'ERROR',
      latency: Date.now() - start,
      error: err.message
    };
  }
}

// Lister les modeles Mistral disponibles (Phase 5)
async function listMistralModels() {
  const key = process.env.MISTRAL_API_KEY;
  if (!key || key.startsWith('your_')) {
    console.log('\n[WARN] Impossible de lister les modeles Mistral (cle manquante)');
    return;
  }

  try {
    const response = await fetch('https://api.mistral.ai/v1/models', {
      headers: { 'Authorization': `Bearer ${key}` }
    });
    const data = await response.json();

    if (data.data) {
      console.log('\nModeles Mistral disponibles :');
      data.data.forEach(m => console.log(`   - ${m.id}`));
    }
  } catch (err) {
    console.log(`\n[ERR] Erreur listing modeles Mistral : ${err.message}`);
  }
}

// Affichage formate (Phase 4)
function displayResult(result) {
  const icon = result.status === 'OK' ? '[OK]' : result.status === 'SKIP' ? '[SKIP]' : '[ERR]';
  const latency = result.latency > 0 ? `${result.latency}ms` : '—';
  const name = result.provider.padEnd(14);

  let line = `  ${icon} ${name} ${latency.padStart(7)}`;

  if (result.status === 'ERROR') {
    line += `  ${result.error}`;
  } else if (result.status === 'SKIP') {
    line += `  ${result.error}`;
  } else if (result.response) {
    line += `  → "${result.response}"`;
  }

  console.log(line);
}

// === Main ===
async function main() {
  console.log('\nVerification des connexions API...\n');

  // Verifier que les cles sont presentes
  const keys = [
    { name: 'MISTRAL_API_KEY', value: process.env.MISTRAL_API_KEY },
    { name: 'GROQ_API_KEY', value: process.env.GROQ_API_KEY },
    { name: 'HF_API_KEY', value: process.env.HF_API_KEY },
    { name: 'PINECONE_API_KEY', value: process.env.PINECONE_API_KEY }
  ];

  for (const k of keys) {
    const present = k.value && !k.value.startsWith('your_');
    console.log(`  ${k.name}: ${present ? 'presente' : 'manquante'}`);
  }

  console.log('\n' + '─'.repeat(60) + '\n');

  // Lancer tous les checks en parallele
  const results = await Promise.all([
    ...providers.map(p => checkProvider(p)),
    checkPinecone()
  ]);

  // Affichage
  for (const r of results) {
    displayResult(r);
  }

  // Resume
  const active = results.filter(r => r.status === 'OK').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  const total = results.length;

  console.log('\n' + '─'.repeat(60));
  console.log(`\n  ${active}/${total} connexions actives`);
  if (skipped > 0) {
    console.log(`  ${skipped} provider(s) ignores (cle manquante)`);
  }

  if (active === total) {
    console.log('  Tout est vert. Vous etes prets pour la suite !\n');
  } else if (active > 0) {
    console.log('  Certains providers sont disponibles. Ajoutez les cles manquantes dans .env\n');
  } else {
    console.log('  Aucune connexion active. Verifiez vos cles dans .env\n');
  }

  // Lister les modeles Mistral si verbose
  if (verbose) {
    await listMistralModels();
    console.log('');
  }
}

// Executer main() uniquement si lance directement (pas importe)
const isMain = process.argv[1]?.endsWith('check-connections.js');
if (isMain) main();

// Export pour reutilisation dans server.js
export { checkProvider, checkPinecone, providers, displayResult };
