// cli.js
// Phase 10 : interface CLI interactive pour interroger le corpus
import 'dotenv/config';
import readline from 'node:readline';
import { ragQuery } from './rag-pipeline.js';

const MAX_QUESTION_LENGTH = 4000;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let closed = false;
rl.on('close', () => { closed = true; });

// Ctrl+C en plein milieu d'une recherche : on ferme proprement
process.on('SIGINT', () => {
  console.log('\nFermeture propre...');
  rl.close();
  process.exit(0);
});

function ask(prompt) {
  if (closed) return Promise.resolve(null);
  return new Promise(resolve => {
    try { rl.question(prompt, resolve); }
    catch { resolve(null); }
  });
}

console.log('Mini-Perplexity — posez vos questions sur le corpus (Ctrl+C pour quitter)\n');

while (true) {
  const raw = await ask('> ');
  if (raw === null) break;

  const question = raw.trim();
  if (!question) continue;

  if (question.length > MAX_QUESTION_LENGTH) {
    console.log(`[ERR] Question trop longue (${question.length} > ${MAX_QUESTION_LENGTH} caracteres). Reformulez plus court.\n`);
    continue;
  }

  console.log('\nRecherche en cours...\n');

  try {
    const result = await ragQuery(question, { topK: 5, verbose: false });

    console.log(result.answer);

    if (result.sources.length > 0) {
      const fileList = result.sources.map(s => s.file).join(', ');
      console.log(`\nSources : [${fileList}]`);
      console.log(`Pertinence moyenne : ${result.metrics.avgScore}`);
    }
    console.log('');
  } catch (err) {
    console.log(`[ERR] ${err.message}\n`);
  }
}

console.log('\nA bientot !');
