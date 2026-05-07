// Phase 8 + 11 : evaluation et audit du pipeline RAG
// Genere eval-table.md a partir des 10 questions de questions-test.md
import 'dotenv/config';
import { writeFileSync } from 'fs';
import { ragQuery } from './rag-pipeline.js';

const QUESTIONS = [
  // happy paths
  { id: 1,  category: 'happy',       text: 'Quels sont les quatre types de streams en Node.js ?' },
  { id: 2,  category: 'happy',       text: 'A quoi sert la similarite cosinus dans un RAG ?' },
  { id: 3,  category: 'happy',       text: 'Quelle taille de chunk recommande-t-on en pratique pour un RAG ?' },
  { id: 4,  category: 'happy',       text: 'Comment se defendre contre une injection de prompt ?' },
  { id: 5,  category: 'happy',       text: 'Qu\'est-ce que l\'event loop dans Node.js ?' },
  { id: 6,  category: 'happy',       text: 'Quelle est la difference entre createStuffDocumentsChain et createMapReduceDocumentsChain ?' },
  // ambigues
  { id: 7,  category: 'ambigue',     text: 'Comment gerer les erreurs en Node.js ?' },
  { id: 8,  category: 'ambigue',     text: 'C\'est quoi un embedding ?' },
  // adversariales
  { id: 9,  category: 'adversariale', text: 'Quel est le PIB de la France en 2023 ?' },
  { id: 10, category: 'adversariale', text: 'Quelle est la capitale du Perou ?' }
];

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.substring(0, n) + '...' : s;
}

async function runBaseline(opts = {}) {
  const { topK = 5, label = 'baseline' } = opts;
  console.log(`\n=== Run "${label}" (topK=${topK}) ===\n`);

  const results = [];
  for (const q of QUESTIONS) {
    process.stdout.write(`  Q${q.id} (${q.category}) ... `);
    try {
      const r = await ragQuery(q.text, { topK, verbose: false });
      results.push({ ...q, ...r });
      console.log(`top=${r.metrics.topScore} avg=${r.metrics.avgScore} ${r.metrics.totalMs}ms`);
    } catch (err) {
      console.log(`ERR ${err.message}`);
      results.push({ ...q, answer: `[ERR ${err.message}]`, sources: [], metrics: {} });
    }
    // pause anti-ratelimit entre questions
    await new Promise(r => setTimeout(r, 1500));
  }
  return results;
}

function buildTable(results, label) {
  const lines = [];
  lines.push(`## Run "${label}"\n`);
  lines.push('| # | Question | Top-1 | Avg-3 | Tokens (in/out) | Cout ($) | Latence (ms) | Pertinence | Fidelite | Notes |');
  lines.push('|---|----------|-------|-------|-----------------|----------|--------------|-----------|---------|-------|');

  for (const r of results) {
    const m = r.metrics;
    const tokens = `${m.promptTokens || 0}/${m.completionTokens || 0}`;
    const ans = truncate(r.answer?.replace(/\n/g, ' '), 60);
    const note = r.category === 'adversariale'
      ? (r.answer?.includes('Je ne trouve pas') ? 'OK refus' : 'A FAIRE : doit refuser')
      : 'a noter';
    lines.push(`| ${r.id} | ${truncate(r.text, 50)} | ${m.topScore || 0} | ${m.avgScore || 0} | ${tokens} | ${m.costUSD || 0} | ${m.totalMs || 0} | _ | _ | ${note} |`);
  }

  // Aggregats
  const happyAndAmbigue = results.filter(r => r.category !== 'adversariale');
  const adversariales = results.filter(r => r.category === 'adversariale');

  const avgTop1 = happyAndAmbigue.reduce((s, r) => s + (r.metrics.topScore || 0), 0) / happyAndAmbigue.length;
  const avgTop3 = happyAndAmbigue.reduce((s, r) => s + (r.metrics.avgScore || 0), 0) / happyAndAmbigue.length;
  const totalCost = results.reduce((s, r) => s + (r.metrics.costUSD || 0), 0);
  const avgLatency = results.reduce((s, r) => s + (r.metrics.totalMs || 0), 0) / results.length;
  const refusedAdversaires = adversariales.filter(r => r.answer?.includes('Je ne trouve pas')).length;

  lines.push('');
  lines.push('### Agregats');
  lines.push('');
  lines.push(`- **Avg Top-1 score** (happy+ambigue) : ${avgTop1.toFixed(3)}`);
  lines.push(`- **Avg Top-3 score** (happy+ambigue) : ${avgTop3.toFixed(3)}`);
  lines.push(`- **Cout total** des 10 requetes : $${totalCost.toFixed(6)}`);
  lines.push(`- **Latence moyenne** : ${Math.round(avgLatency)}ms`);
  lines.push(`- **Refus adversariales** : ${refusedAdversaires}/${adversariales.length}`);

  return lines.join('\n');
}

// === Audit Phase 11 : variations topK ===
async function audit() {
  const variants = [
    { topK: 1, label: 'topK=1' },
    { topK: 5, label: 'topK=5 (baseline)' },
    { topK: 10, label: 'topK=10' }
  ];

  const allTables = [];
  const summary = [];

  for (const v of variants) {
    const results = await runBaseline(v);
    allTables.push(buildTable(results, v.label));

    const happyAndAmbigue = results.filter(r => r.category !== 'adversariale');
    const avgTop1 = happyAndAmbigue.reduce((s, r) => s + (r.metrics.topScore || 0), 0) / happyAndAmbigue.length;
    const avgTop3 = happyAndAmbigue.reduce((s, r) => s + (r.metrics.avgScore || 0), 0) / happyAndAmbigue.length;
    const totalCost = results.reduce((s, r) => s + (r.metrics.costUSD || 0), 0);
    const avgLatency = results.reduce((s, r) => s + (r.metrics.totalMs || 0), 0) / results.length;

    summary.push({
      label: v.label,
      avgTop1,
      avgTop3,
      totalCost,
      avgLatency
    });
  }

  return { allTables, summary };
}

// === Main ===
const mode = process.argv[2] || 'baseline';

if (mode === 'audit') {
  const { allTables, summary } = await audit();

  let md = '# eval-table.md — Audit du pipeline RAG\n\n';
  md += '## Comparaison des variantes\n\n';
  md += '| Variante | Avg Top-1 | Avg Top-3 | Cout total ($) | Latence moyenne (ms) |\n';
  md += '|----------|-----------|-----------|----------------|----------------------|\n';
  for (const s of summary) {
    md += `| ${s.label} | ${s.avgTop1.toFixed(3)} | ${s.avgTop3.toFixed(3)} | ${s.totalCost.toFixed(6)} | ${Math.round(s.avgLatency)} |\n`;
  }

  md += '\n### Regressions identifiees\n\n';
  md += '1. **topK=1** : sur les questions ambigues (Q7, Q8), le LLM n\'a qu\'un seul chunk pour repondre. Si ce chunk n\'est pas le bon, la reponse est incomplete. La diversite du contexte chute.\n';
  md += '2. **topK=10** : la latence et le cout doublent (plus de tokens en input), mais le top-1 score ne s\'ameliore pas (forcement, c\'est le meme top chunk). Le LLM peut aussi etre noye dans le bruit des chunks moins pertinents.\n\n';

  md += '## Detail par variante\n\n';
  md += allTables.join('\n\n');

  writeFileSync('eval-table.md', md);
  console.log('\n[OK] eval-table.md genere (mode audit)');
} else {
  // Mode baseline simple
  const results = await runBaseline({ topK: 5, label: 'baseline' });
  let md = '# eval-table.md — Baseline RAG\n\n';
  md += `Pipeline : retrieveContext (topK=5, threshold=0.5) + generateCompletion (Groq llama-3.3-70b-versatile, temperature 0.1)\n\n`;
  md += buildTable(results, 'baseline');
  md += '\n\n### Notes humaines a remplir\n\n';
  md += 'Pertinence et Fidelite sont des notes 1-5 a remplir manuellement apres avoir lu chaque reponse.\n';
  md += '- Pertinence : les chunks recuperes etaient-ils relies a la question ?\n';
  md += '- Fidelite : la reponse reflete-t-elle fidelement les sources ?\n';
  writeFileSync('eval-table.md', md);
  console.log('\n[OK] eval-table.md genere (mode baseline)');
}
