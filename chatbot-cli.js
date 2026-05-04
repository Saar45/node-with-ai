// chatbot-cli.js
// Projet J2 Phase 1-7 : Chatbot CLI multi-provider avec memoire, streaming,
// switch provider a la volee, compression auto, /resume et /translate.
import 'dotenv/config';
import readline from 'node:readline';

// ===== Configuration =====
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

const MAX_HISTORY = 20;

const PRICE_PER_M = {
  mistral: 0.20,
  groq: 0.05
};

// ===== Etat global =====
let currentProvider = PROVIDERS.mistral;

const history = [
  {
    role: 'system',
    content: 'Tu es un assistant utile et concis. Tu te souviens de tout ce qui a ete dit dans cette conversation.'
  }
];

let totalTokens = 0;
let totalCostEur = 0;

// ===== Readline =====
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let closed = false;
rl.on('close', () => {
  closed = true;
});

function question(prompt) {
  if (closed) return Promise.resolve(null);
  return new Promise(resolve => {
    try {
      rl.question(prompt, resolve);
    } catch {
      resolve(null);
    }
  });
}

// ===== Helpers =====
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

function trackCost(tokens) {
  totalTokens += tokens;
  totalCostEur += (tokens / 1_000_000) * (PRICE_PER_M[currentProvider.name] || 0.20);
}

// ===== Phase 3 : streaming =====
async function chatStream(userMessage) {
  history.push({ role: 'user', content: userMessage });

  const start = Date.now();

  const response = await fetch(currentProvider.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${currentProvider.key}`
    },
    body: JSON.stringify({
      model: currentProvider.model,
      messages: history,
      temperature: 0.7,
      stream: true
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    history.pop();
    process.stdout.write(`[ERR] ${response.status} ${errText.substring(0, 200)}\n`);
    return '';
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';

  process.stdout.write('IA : ');

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

    for (const line of lines) {
      const jsonStr = line.slice(6);
      if (jsonStr.trim() === '[DONE]') continue;

      try {
        const parsed = JSON.parse(jsonStr);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          process.stdout.write(delta);
          fullContent += delta;
        }
      } catch {
        // chunks decoupes : on ignore
      }
    }
  }

  process.stdout.write('\n');

  const latency = Date.now() - start;

  history.push({ role: 'assistant', content: fullContent });

  // Metriques (estimation tokens car streaming ne renvoie pas usage)
  const inputTokens = estimateTokens(history.map(m => m.content).join(' '));
  const outputTokens = estimateTokens(fullContent);
  const turnTokens = inputTokens + outputTokens;
  trackCost(turnTokens);

  console.log(`[INFO] tokens turn: ~${turnTokens} | latence: ${latency}ms | cumul: ${totalTokens} tokens, ${totalCostEur.toFixed(6)}€`);

  // Phase 5 : declenchement compression
  if (history.length > MAX_HISTORY) {
    const before = history.length;
    await compressHistory();
    console.log(`[INFO] Contexte compresse (${before} messages -> ${history.length} messages)`);
  }

  return fullContent;
}

// ===== Phase 5 : compression automatique =====
async function compressHistory() {
  const conversation = history
    .slice(1)
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  const response = await fetch(PROVIDERS.mistral.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PROVIDERS.mistral.key}`
    },
    body: JSON.stringify({
      model: PROVIDERS.mistral.model,
      messages: [
        {
          role: 'system',
          content: 'Tu resumes une conversation utilisateur/assistant en 3 a 5 phrases. Conserve les faits cles, les prenoms, les preferences exprimees. Pas de phrase d\'introduction.'
        },
        { role: 'user', content: `Conversation a resumer :\n${conversation}` }
      ],
      temperature: 0.3
    })
  });

  const data = await response.json();
  const summary = data.choices[0].message.content;

  history.splice(1, history.length - 1, {
    role: 'system',
    content: `Resume de la conversation precedente : ${summary}`
  });
}

// ===== Phase 2 : afficher l'historique =====
function printHistory() {
  console.log('\n--- Historique interne ---');
  history.forEach((m, i) => {
    const preview = m.content.replace(/\n/g, ' ').substring(0, 80);
    const ellipsis = m.content.length > 80 ? '...' : '';
    console.log(`  ${String(i).padStart(2)} ${m.role.padEnd(9)} ${preview}${ellipsis}`);
  });
  console.log(`--- ${history.length} messages | cumul ${totalTokens} tokens, ${totalCostEur.toFixed(6)}€ ---\n`);
}

// ===== Phase 4 : switch provider =====
function switchProvider(name) {
  const next = PROVIDERS[name?.toLowerCase()];
  if (!next) {
    console.log(`[ERR] Provider inconnu : "${name}". Disponibles : ${Object.keys(PROVIDERS).join(', ')}`);
    return false;
  }
  if (!next.key || next.key.startsWith('your_')) {
    console.log(`[ERR] Cle API manquante pour ${name}`);
    return false;
  }
  currentProvider = next;
  console.log(`[INFO] Provider change : ${currentProvider.name} (${currentProvider.model})`);
  return true;
}

// ===== Phase 6 : commande /resume =====
async function resumeConversation() {
  if (history.length <= 1) {
    return '(rien a resumer pour le moment)';
  }

  const conversation = history
    .slice(1)
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  const response = await fetch(PROVIDERS.mistral.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PROVIDERS.mistral.key}`
    },
    body: JSON.stringify({
      model: PROVIDERS.mistral.model,
      messages: [
        {
          role: 'system',
          content: 'Resume la conversation en 5 bullet points maximum. Chaque bullet commence par un verbe d\'action conjugue au passe. Format : "- Verbe ...". Rien d\'autre que les bullets.'
        },
        { role: 'user', content: conversation }
      ],
      temperature: 0.3
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

// ===== Phase 7 : commande /translate =====
async function translateLast(targetLanguage) {
  const lastAssistant = [...history].reverse().find(m => m.role === 'assistant');
  if (!lastAssistant) {
    return '(aucune reponse de l\'IA a traduire pour le moment)';
  }

  const response = await fetch(PROVIDERS.mistral.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PROVIDERS.mistral.key}`
    },
    body: JSON.stringify({
      model: PROVIDERS.mistral.model,
      messages: [
        {
          role: 'system',
          content: `Tu es un traducteur professionnel. Traduis le texte fourni en ${targetLanguage}. Retourne uniquement la traduction, sans commentaires, sans introduction.`
        },
        { role: 'user', content: lastAssistant.content }
      ],
      temperature: 0.1
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

// ===== Aide =====
function printHelp() {
  console.log(`
Commandes disponibles :
  /history             affiche l'historique interne
  /provider <nom>      change de provider (mistral | groq)
  /resume              resume la conversation en bullet points
  /translate <langue>  traduit la derniere reponse de l'IA
  /help                affiche cette aide
  Ctrl+C               quitter
`);
}

// ===== Boucle principale =====
console.log(`Chatbot CLI multi-provider — provider actuel : ${currentProvider.name} (${currentProvider.model})`);
console.log('Tapez /help pour la liste des commandes.\n');

while (true) {
  const raw = await question('Vous : ');
  if (raw === null) {
    console.log('\n[INFO] Fin de session.');
    break;
  }
  const input = raw.trim();
  if (!input) continue;

  if (input === '/help') {
    printHelp();
    continue;
  }

  if (input === '/history') {
    printHistory();
    continue;
  }

  if (input.startsWith('/provider ')) {
    switchProvider(input.slice(10).trim());
    continue;
  }

  if (input === '/resume') {
    const summary = await resumeConversation();
    console.log(`\nResume :\n${summary}\n`);
    continue;
  }

  if (input.startsWith('/translate ')) {
    const lang = input.slice(11).trim();
    if (!lang) {
      console.log('[ERR] Usage : /translate <langue>');
      continue;
    }
    const translation = await translateLast(lang);
    console.log(`\nTraduction : ${translation}\n`);
    continue;
  }

  await chatStream(input);
}
