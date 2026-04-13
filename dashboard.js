// dashboard.js
// Phase 14 : Genere un fichier results.html avec tous les resultats
import 'dotenv/config';
import { writeFileSync } from 'fs';

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

async function callProvider(provider, prompt, temperature = 0.3) {
  if (!provider.key || provider.key.startsWith('your_')) {
    return { provider: provider.name, content: null, latency: 0, error: 'Cle manquante' };
  }

  let body;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${provider.key}`
  };

  const temp = provider.format === 'huggingface' && temperature === 0 ? 0.01 : temperature;

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

  const start = Date.now();

  try {
    const response = await fetch(provider.url, { method: 'POST', headers, body });
    const data = await response.json();
    const latency = Date.now() - start;

    if (!response.ok) {
      return { provider: provider.name, content: null, latency, error: `HTTP ${response.status}`, tokens: 0 };
    }

    let content;
    if (provider.format === 'huggingface') {
      const generated = Array.isArray(data) ? data[0]?.generated_text : data.generated_text;
      content = generated ? generated.replace(prompt, '').trim() : '(vide)';
    } else {
      content = data.choices?.[0]?.message?.content || '(vide)';
    }

    return { provider: provider.name, content, latency, tokens: data.usage?.total_tokens || 0 };
  } catch (err) {
    return { provider: provider.name, content: null, latency: Date.now() - start, error: err.message, tokens: 0 };
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function statusBadge(status) {
  if (status === 'OK') return '<span style="color:#22c55e;font-weight:bold">OK</span>';
  if (status === 'SKIP') return '<span style="color:#f59e0b;font-weight:bold">SKIP</span>';
  return '<span style="color:#ef4444;font-weight:bold">ERROR</span>';
}

// === Main ===
async function main() {
  console.log('Generation du dashboard...\n');

  const sections = [];

  // 1. Connexions
  console.log('  [1/4] Test des connexions...');
  const connectionResults = await Promise.all(
    providers.map(async (p) => {
      const r = await callProvider(p, 'Dis ok.', 0.1);
      return {
        name: p.name,
        status: r.error ? (r.error.includes('manquante') ? 'SKIP' : 'ERROR') : 'OK',
        latency: r.latency,
        error: r.error
      };
    })
  );

  let connectionRows = connectionResults.map(r =>
    `<tr>
      <td>${r.name}</td>
      <td>${statusBadge(r.status)}</td>
      <td>${r.latency > 0 ? r.latency + 'ms' : '—'}</td>
      <td>${escapeHtml(r.error) || '—'}</td>
    </tr>`
  ).join('\n');

  sections.push(`
    <h2>1. Connexions API</h2>
    <table>
      <tr><th>Provider</th><th>Status</th><th>Latence</th><th>Erreur</th></tr>
      ${connectionRows}
    </table>
  `);

  // 2. Comparaison providers
  console.log('  [2/4] Comparaison des providers...');
  const comparePrompt = 'Explique le concept de recursion en 2 phrases.';
  const compareResults = await Promise.all(
    providers.map(p => callProvider(p, comparePrompt, 0.3))
  );

  let compareRows = compareResults.map(r =>
    `<tr>
      <td>${r.provider}</td>
      <td>${r.latency > 0 ? r.latency + 'ms' : '—'}</td>
      <td>${r.tokens || '—'}</td>
      <td>${escapeHtml(r.content?.substring(0, 200)) || escapeHtml(r.error) || '—'}</td>
    </tr>`
  ).join('\n');

  sections.push(`
    <h2>2. Comparaison Providers</h2>
    <p><strong>Prompt :</strong> "${escapeHtml(comparePrompt)}"</p>
    <table>
      <tr><th>Provider</th><th>Latence</th><th>Tokens</th><th>Reponse</th></tr>
      ${compareRows}
    </table>
  `);

  // 3. Estimation des couts
  console.log('  [3/4] Calcul des couts...');
  const pricing = [
    { name: 'Mistral Small', pricePerM: 0.20 },
    { name: 'Groq Llama 3',  pricePerM: 0.05 },
    { name: 'GPT-4o',        pricePerM: 2.50 }
  ];

  const sampleText = 'Bonjour, explique-moi le machine learning en termes simples.';
  const tokens = Math.ceil(sampleText.length / 4);

  let costRows = pricing.map(p => {
    const costPerReq = (tokens / 1_000_000) * p.pricePerM;
    return `<tr>
      <td>${p.name}</td>
      <td>${costPerReq.toFixed(10)}€</td>
      <td>${(costPerReq * 1000).toFixed(6)}€</td>
      <td>${(costPerReq * 1000 * 30).toFixed(4)}€</td>
    </tr>`;
  }).join('\n');

  sections.push(`
    <h2>3. Estimation des Couts</h2>
    <p>Texte : ${sampleText.length} caracteres → ~${tokens} tokens</p>
    <table>
      <tr><th>Provider</th><th>Cout/requete</th><th>Pour 1 000 req</th><th>Pour 30 000 req</th></tr>
      ${costRows}
    </table>
  `);

  // 4. Multi-langue
  console.log('  [4/4] Test multi-langue...');
  const activeProv = providers.find(p => p.key && !p.key.startsWith('your_'));

  let langSection = '<h2>4. Multi-langue</h2>';
  if (activeProv) {
    const langPrompts = [
      { lang: 'Francais', prompt: 'Explique le machine learning en 2 phrases.' },
      { lang: 'English',  prompt: 'Explain machine learning in 2 sentences.' },
      { lang: 'Espanol',  prompt: 'Explica el machine learning en 2 frases.' }
    ];

    const langResults = await Promise.all(
      langPrompts.map(q => callProvider(activeProv, q.prompt, 0.3).then(r => ({ lang: q.lang, ...r })))
    );

    let langRows = langResults.map(r =>
      `<tr>
        <td>${r.lang}</td>
        <td>${r.tokens || '—'}</td>
        <td>${r.latency}ms</td>
        <td style="max-width:400px">${escapeHtml(r.content?.substring(0, 150)) || escapeHtml(r.error) || '—'}</td>
      </tr>`
    ).join('\n');

    langSection += `
      <p>Provider : ${activeProv.name}</p>
      <table>
        <tr><th>Langue</th><th>Tokens</th><th>Latence</th><th>Reponse</th></tr>
        ${langRows}
      </table>
    `;
  } else {
    langSection += '<p>Aucun provider disponible pour ce test.</p>';
  }

  sections.push(langSection);

  // Generer le HTML
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard - Check Connections J1</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 1000px; margin: 0 auto; padding: 2rem; background: #0f172a; color: #e2e8f0; }
    h1 { color: #38bdf8; margin-bottom: 0.5rem; }
    h2 { color: #7dd3fc; margin: 2rem 0 1rem; border-bottom: 1px solid #334155; padding-bottom: 0.5rem; }
    p { margin-bottom: 1rem; color: #94a3b8; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
    th { background: #1e293b; color: #38bdf8; padding: 0.75rem; text-align: left; font-weight: 600; }
    td { padding: 0.75rem; border-bottom: 1px solid #1e293b; }
    tr:hover td { background: #1e293b; }
    .timestamp { color: #64748b; font-size: 0.85rem; margin-bottom: 2rem; }
    strong { color: #e2e8f0; }
  </style>
</head>
<body>
  <h1>Dashboard — Check Connections J1</h1>
  <p class="timestamp">Genere le ${new Date().toLocaleString('fr-FR')}</p>
  ${sections.join('\n')}
  <hr style="border-color:#334155;margin-top:2rem">
  <p style="text-align:center;margin-top:1rem;color:#64748b">Mini-Perplexity — Projet IPSSI NodeJs avec IA</p>
</body>
</html>`;

  writeFileSync('results.html', html);
  console.log('\nDashboard genere : results.html');
  console.log('Ouvrez avec : open results.html\n');
}

main();
