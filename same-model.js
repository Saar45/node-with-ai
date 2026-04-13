// same-model.js
// Phase 10 : Meme modele (ou similaire), deux hebergeurs — Groq vs HuggingFace
import 'dotenv/config';

const PROMPT = 'Explique le machine learning en 2 phrases.';

async function callGroq(prompt) {
  const key = process.env.GROQ_API_KEY;
  if (!key || key.startsWith('your_')) {
    return { content: null, latency: 0, error: 'Cle Groq manquante' };
  }

  const start = Date.now();
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0.5
    })
  });

  const data = await response.json();
  const latency = Date.now() - start;

  if (!response.ok) return { content: null, latency, error: `HTTP ${response.status}` };

  return {
    content: data.choices[0].message.content,
    latency,
    tokens: data.usage?.total_tokens
  };
}

async function callHuggingFace(prompt) {
  const key = process.env.HF_API_KEY;
  if (!key || key.startsWith('your_')) {
    return { content: null, latency: 0, error: 'Cle HuggingFace manquante' };
  }

  const start = Date.now();
  const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({
      model: 'meta-llama/Llama-3.1-8B-Instruct',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0.5
    })
  });

  const data = await response.json();
  const latency = Date.now() - start;

  if (!response.ok) return { content: null, latency, error: `HTTP ${response.status}` };

  return {
    content: data.choices?.[0]?.message?.content || '(vide)',
    latency
  };
}

// === Main ===
async function main() {
  console.log('Comparaison : meme question, deux hebergeurs');
  console.log('═'.repeat(60));
  console.log(`Prompt : "${PROMPT}"\n`);

  const [groq, hf] = await Promise.all([
    callGroq(PROMPT),
    callHuggingFace(PROMPT)
  ]);

  // Groq
  if (groq.error) {
    console.log(`[ERR] Groq (Llama 3.3 70B) : ${groq.error}`);
  } else {
    console.log(`[OK]  Groq (Llama 3.3 70B) :     ${groq.latency}ms`);
    console.log(`   "${groq.content}"\n`);
  }

  // HuggingFace
  if (hf.error) {
    console.log(`[ERR] HuggingFace (Llama 3.1 8B) : ${hf.error}`);
  } else {
    console.log(`[OK]  HuggingFace (Llama 3.1 8B) : ${hf.latency}ms`);
    console.log(`   "${hf.content}"\n`);
  }

  // Comparaison
  if (!groq.error && !hf.error) {
    const ratio = (hf.latency / groq.latency).toFixed(1);
    console.log('─'.repeat(60));
    console.log(`\nLatence : Groq ${ratio}x plus rapide que HuggingFace`);
    console.log(`   Reponses : ${groq.content?.length || 0} vs ${hf.content?.length || 0} caracteres`);
  }
  console.log('');
}

main();
