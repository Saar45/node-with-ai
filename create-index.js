
// On utilise l'API REST Pinecone directement 
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';

const PINECONE_HOST = process.env.PINECONE_INDEX_HOST?.replace(/^https?:\/\//, '');

// Parametres du chunking - ajustables
const CHUNK_SIZE = 400;       // tokens approximatifs (en mots)
const OVERLAP = 50;
const BATCH_SIZE = 50;        // vecteurs par upsert Pinecone
const EMBED_CONCURRENCY = 5;  // appels d'embedding en parallele max

// Fonctions utilitaires

function chunkWithOverlap(text, size, overlap) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  let i = 0;
  while (i < words.length) {
    chunks.push(words.slice(i, i + size).join(' '));
    i += size - overlap;
  }
  return chunks.filter(c => c.trim().length > 0);
}

async function embedText(text) {
  const response = await fetch('https://api.mistral.ai/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
    },
    body: JSON.stringify({
      model: 'mistral-embed',
      input: text
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Mistral embed : HTTP ${response.status} ${JSON.stringify(data)}`);
  return data.data[0].embedding;
}

async function embedBatch(texts) {
  // L'API Mistral accepte un tableau dans "input" : 1 appel pour N textes
  const response = await fetch('https://api.mistral.ai/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
    },
    body: JSON.stringify({
      model: 'mistral-embed',
      input: texts
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Mistral embed batch : HTTP ${response.status} ${JSON.stringify(data)}`);
  // L'API garantit l'ordre via index — on trie au cas ou
  return data.data
    .sort((a, b) => a.index - b.index)
    .map(d => d.embedding);
}

// Traitement d'un fichier

async function upsertVectors(vectors) {
  const response = await fetch(`https://${PINECONE_HOST}/vectors/upsert`, {
    method: 'POST',
    headers: {
      'Api-Key': process.env.PINECONE_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ vectors })
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(`Pinecone upsert : HTTP ${response.status} ${JSON.stringify(data)}`);
  }
  return response.json();
}

async function processFile(filePath, indexName) {
  const text = readFileSync(filePath, 'utf-8');
  const filename = filePath.split('/').pop();

  console.log(`\n-> Traitement de ${filename}...`);

  // Decoupage
  const rawChunks = chunkWithOverlap(text, CHUNK_SIZE, OVERLAP);
  console.log(`  ${rawChunks.length} chunks crees`);

  // Embedding par lots concurrents (1 appel = N textes)
  const vectors = [];
  for (let i = 0; i < rawChunks.length; i += EMBED_CONCURRENCY) {
    const batch = rawChunks.slice(i, i + EMBED_CONCURRENCY);
    let embeddings;
    try {
      embeddings = await embedBatch(batch);
    } catch (err) {
      console.error(`  [ERR embed] batch ${i} : ${err.message}`);
      continue;
    }
    if (!Array.isArray(embeddings) || embeddings.length !== batch.length) {
      console.error(`  [ERR embed] batch ${i} : got ${embeddings?.length} embeddings for ${batch.length} chunks`);
      continue;
    }
    batch.forEach((chunkText, j) => {
      vectors.push({
        id: `${filename}-chunk-${i + j}`,
        values: embeddings[j],
        metadata: {
          text: chunkText,
          source: filename,
          chunkIndex: i + j
        }
      });
    });
  }
  console.log(`  ${vectors.length} embeddings generes`);

  // Upsert dans Pinecone par lots
  for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
    const batch = vectors.slice(i, i + BATCH_SIZE);
    await upsertVectors(batch);
    console.log(`  Upsert ${Math.min(i + BATCH_SIZE, vectors.length)}/${vectors.length} vecteurs...`);
  }

  console.log(`  [OK] ${vectors.length} vecteurs indexes`);
  return vectors.length;
}

// --- Point d'entree ---

async function main() {
  const INDEX_NAME = process.env.PINECONE_INDEX_NAME;
  const CORPUS_DIR = './corpus';

  if (!INDEX_NAME) {
    console.error('[ERR] PINECONE_INDEX_NAME manquant dans .env');
    process.exit(1);
  }

  let files;
  try {
    files = readdirSync(CORPUS_DIR)
      .filter(f => f.endsWith('.txt') || f.endsWith('.md'))
      .map(f => join(CORPUS_DIR, f));
  } catch (err) {
    console.error(`[ERR] Impossible de lire ${CORPUS_DIR} : ${err.message}`);
    console.error('Creez le dossier ./corpus/ et mettez-y des fichiers .txt ou .md');
    process.exit(1);
  }

  if (files.length === 0) {
    console.log(`Aucun fichier .txt ou .md dans ${CORPUS_DIR}/`);
    return;
  }

  console.log(`Indexation de ${files.length} fichier(s) dans l'index "${INDEX_NAME}"`);

  let total = 0;
  for (const file of files) {
    try {
      total += await processFile(file, INDEX_NAME);
    } catch (err) {
      console.error(`[ERR] ${file} a plante : ${err.message}`);
      console.error('     On continue avec les autres fichiers.');
    }
  }

  console.log(`\nIndexation terminee. ${total} vecteurs au total.`);
}

main().catch(err => {
  console.error('[ERR fatale]', err);
  process.exit(1);
});
