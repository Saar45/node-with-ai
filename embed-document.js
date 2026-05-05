// embed-document.js
// Phase 6 du projet J3 : decouper un texte en chunks, generer les embeddings,
// les pousser dans Pinecone.
import 'dotenv/config';
import { getEmbedding } from './test-embedding.js';

// Decoupage simple : par groupes de N mots
export function simpleChunk(text, maxWords = 50) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  for (let i = 0; i < words.length; i += maxWords) {
    chunks.push(words.slice(i, i + maxWords).join(' '));
  }
  return chunks;
}

// Pousse un tableau de chunks dans Pinecone
export async function upsertChunks(chunks, idPrefix = 'chunk') {
  const host = process.env.PINECONE_INDEX_HOST;
  if (!host) throw new Error('PINECONE_INDEX_HOST manquant dans .env');

  // 1) Embed chaque chunk
  console.log(`[INFO] Generation de ${chunks.length} embeddings...`);
  const vectors = [];
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await getEmbedding(chunks[i]);
    vectors.push({
      id: `${idPrefix}-${i}`,
      values: embedding,
      metadata: { text: chunks[i] }
    });
  }

  // 2) Upsert dans Pinecone (le host inclut deja https://)
  const url = host.startsWith('http') ? `${host}/vectors/upsert` : `https://${host}/vectors/upsert`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Api-Key': process.env.PINECONE_API_KEY,
      'Content-Type': 'application/json',
      'X-Pinecone-API-Version': '2024-07'
    },
    body: JSON.stringify({ vectors })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(`Pinecone upsert : HTTP ${response.status} ${JSON.stringify(data)}`);
  }

  const data = await response.json();
  return { upsertedCount: data.upsertedCount || vectors.length };
}

const isMain = process.argv[1]?.endsWith('embed-document.js');
if (isMain) {
  // Document de demo : quelques infos sur Node.js
  const document = `
Node.js est un environnement d'execution JavaScript cote serveur, cree par Ryan Dahl en 2009.
Il utilise le moteur V8 de Google Chrome pour executer du JavaScript hors du navigateur.
Node.js est particulierement performant pour les applications I/O-intensives, grace a son
modele non-bloquant base sur les evenements. Il a popularise l'usage de JavaScript cote
backend et a donne naissance a un ecosysteme massif autour de npm, le gestionnaire de
paquets le plus utilise au monde. Express est le framework web minimaliste le plus utilise
sur Node.js, cree par TJ Holowaychuk en 2010. Il permet de creer des APIs REST en quelques
lignes de code. La communaute Node.js a aussi produit des frameworks plus opinionates comme
NestJS pour les architectures plus structurees, ou Fastify pour la performance brute.
Le langage TypeScript, cree par Microsoft en 2012, est devenu le standard pour les projets
Node.js d'envergure car il ajoute un systeme de types statiques au-dessus de JavaScript.
  `.trim();

  console.log(`[INFO] Document de ${document.length} caracteres`);
  const chunks = simpleChunk(document, 40);
  console.log(`[INFO] Decoupe en ${chunks.length} chunks\n`);

  chunks.forEach((c, i) => console.log(`  chunk ${i} : "${c.substring(0, 70)}..."`));

  console.log('');
  const result = await upsertChunks(chunks, 'nodejs');
  console.log(`\n[OK] ${result.upsertedCount} chunks pousses dans Pinecone.`);
}
