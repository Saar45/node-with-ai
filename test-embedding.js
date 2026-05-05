// test-embedding.js
// Section 5 du PDF J3 : premier embedding pour comprendre ce qu'on recoit
import 'dotenv/config';

export async function getEmbedding(text) {
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
  if (!response.ok) {
    throw new Error(`Mistral embeddings : HTTP ${response.status} ${JSON.stringify(data)}`);
  }
  return data.data[0].embedding;
}

// Similarite cosinus entre deux vecteurs
export function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const normB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  return dot / (normA * normB);
}

const isMain = process.argv[1]?.endsWith('test-embedding.js');
if (isMain) {
  console.log('Generation d\'un embedding pour "Le chat est sur le tapis"...\n');
  const embedding = await getEmbedding('Le chat est sur le tapis');
  console.log('Dimensions   :', embedding.length);
  console.log('5 premiers   :', embedding.slice(0, 5));

  console.log('\nDemo similarite cosinus :');
  const phrases = [
    'Le chat est sur le tapis',
    'Un felin repose sur le sol',
    'La Bourse de Tokyo baisse'
  ];
  const vectors = await Promise.all(phrases.map(getEmbedding));

  console.log(`\n  "${phrases[0]}" vs "${phrases[1]}" : ${cosineSimilarity(vectors[0], vectors[1]).toFixed(4)}`);
  console.log(`  "${phrases[0]}" vs "${phrases[2]}" : ${cosineSimilarity(vectors[0], vectors[2]).toFixed(4)}`);
  console.log('\nLes 2 premieres phrases parlent du meme sujet -> score plus eleve.');
}
