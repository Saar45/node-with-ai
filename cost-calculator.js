// cost-calculator.js
// Phase 6 : Estimation des couts par provider

// Pricing indicatif (par million de tokens, en euros)
const PRICING = [
  { provider: 'Mistral Small', inputPerM: 0.20, outputPerM: 0.60 },
  { provider: 'Groq Llama 3',  inputPerM: 0.05, outputPerM: 0.08 },
  { provider: 'GPT-4o',        inputPerM: 2.50, outputPerM: 10.00 }
];

// Approximation : 1 token ≈ 4 caracteres
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

// Calcul et affichage du cout estime
function estimateCost(text, label) {
  const tokens = estimateTokens(text);

  console.log(`\nTexte${label ? ` (${label})` : ''} : ${text.length} caracteres → ~${tokens} tokens\n`);

  // En-tete du tableau
  console.log('Provider'.padEnd(16) + 'Cout estime (input)'.padEnd(22) + 'Pour 1000 requetes');
  console.log('-'.repeat(16) + ' ' + '-'.repeat(21) + ' ' + '-'.repeat(18));

  for (const p of PRICING) {
    const costPerReq = (tokens / 1_000_000) * p.inputPerM;
    const costPer1000 = costPerReq * 1000;

    console.log(
      p.provider.padEnd(16) +
      `${costPerReq.toFixed(10)}€`.padEnd(22) +
      `${costPer1000.toFixed(5)}€`
    );
  }
}

// Calcul et retour des donnees (pour server.js et dashboard.js)
function estimateCostData(text) {
  const tokens = estimateTokens(text);
  return PRICING.map(p => ({
    provider: p.provider,
    tokens,
    estimatedCost: `${((tokens / 1_000_000) * p.inputPerM).toFixed(10)}€`,
    per1000: `${(((tokens / 1_000_000) * p.inputPerM) * 1000).toFixed(5)}€`
  }));
}

// === Main ===
function main() {
  const sampleTexts = [
    { text: 'Bonjour, comment ca va ?', label: 'phrase courte' },
    { text: 'Explique le concept de recursion a un lyceen, en 3 phrases maximum. La recursion est un concept fondamental en informatique.', label: 'prompt moyen' },
    { text: 'a'.repeat(4000), label: '~1000 tokens' }
  ];

  console.log('Calculateur de couts API LLM');
  console.log('═'.repeat(60));

  for (const s of sampleTexts) {
    estimateCost(s.text, s.label);
    console.log('');
  }

  // Estimation mensuelle pour un chatbot
  console.log('─'.repeat(60));
  console.log('\nEstimation mensuelle (chatbot 1000 questions/jour, ~500 tokens/echange) :\n');

  const dailyTokens = 1000 * 500;
  const monthlyTokens = dailyTokens * 30;

  for (const p of PRICING) {
    const monthlyCost = (monthlyTokens / 1_000_000) * p.inputPerM;
    console.log(`  ${p.provider.padEnd(16)} ~${monthlyCost.toFixed(2)}€/mois`);
  }
  console.log('');
}

// Executer main() uniquement si lance directement
const isMain = process.argv[1]?.endsWith('cost-calculator.js');
if (isMain) main();

export { estimateTokens, estimateCost, estimateCostData, PRICING };
