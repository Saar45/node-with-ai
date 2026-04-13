// stress-test.js
// Phase 11 : Stress test — N requetes paralleles par provider
import 'dotenv/config';

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

async function singleCall(provider) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${provider.key}`
  };

  let body;
  if (provider.format === 'huggingface') {
    body = JSON.stringify({
      inputs: 'Dis ok.',
      parameters: { max_new_tokens: 5, temperature: 0.1 }
    });
  } else {
    body = JSON.stringify({
      model: provider.model,
      messages: [{ role: 'user', content: 'Dis ok.' }],
      max_tokens: 5,
      temperature: 0.1
    });
  }

  const start = Date.now();
  const response = await fetch(provider.url, { method: 'POST', headers, body });
  const latency = Date.now() - start;

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(`HTTP ${response.status} ${data.error?.message || ''}`);
  }

  await response.json();
  return latency;
}

// Calcul du percentile
function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function stressTest(provider, n = 10) {
  if (!provider.key || provider.key.startsWith('your_')) {
    return { provider: provider.name, success: 0, failed: n, avgLatency: 0, p95: 0, errors: ['Cle manquante'] };
  }

  const promises = Array.from({ length: n }, () => singleCall(provider));
  const results = await Promise.allSettled(promises);

  const successes = results.filter(r => r.status === 'fulfilled');
  const failures = results.filter(r => r.status === 'rejected');

  const latencies = successes.map(r => r.value);
  const avgLatency = latencies.length > 0
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : 0;
  const p95 = latencies.length > 0 ? percentile(latencies, 95) : 0;

  const errors = [...new Set(failures.map(r => r.reason.message))];

  return {
    provider: provider.name,
    success: successes.length,
    failed: failures.length,
    avgLatency,
    p95,
    errors
  };
}

// === Main ===
async function main() {
  const n = parseInt(process.argv[2]) || 10;

  console.log(`\nStress test : ${n} requetes paralleles\n`);

  // Tester chaque provider sequentiellement pour ne pas tout melanger
  for (const provider of providers) {
    const result = await stressTest(provider, n);

    const icon = result.failed === 0 ? '[OK]' : result.failed === n ? '[FAIL]' : '[WARN]';
    const ratio = `${result.success}/${n}`;

    let line = `  ${provider.name.padEnd(14)} : ${ratio} ${icon}`;
    if (result.avgLatency > 0) {
      line += `  avg ${result.avgLatency}ms  p95 ${result.p95}ms`;
    }
    if (result.errors.length > 0) {
      line += `  (${result.errors.join(', ')})`;
    }

    console.log(line);
  }

  console.log('');
}

main();

export { stressTest };
