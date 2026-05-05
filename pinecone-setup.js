// pinecone-setup.js
// Phase 5 du projet J3 : verifier que l'index Pinecone est accessible
import 'dotenv/config';

export async function getIndexInfo() {
  const name = process.env.PINECONE_INDEX_NAME;
  if (!name) throw new Error('PINECONE_INDEX_NAME manquant dans .env');

  const response = await fetch(`https://api.pinecone.io/indexes/${name}`, {
    headers: {
      'Api-Key': process.env.PINECONE_API_KEY,
      'X-Pinecone-API-Version': '2024-07'
    }
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(`Pinecone GET /indexes/${name} : HTTP ${response.status} ${JSON.stringify(data)}`);
  }

  return response.json();
}

const isMain = process.argv[1]?.endsWith('pinecone-setup.js');
if (isMain) {
  const info = await getIndexInfo();
  console.log('Index connecte :', {
    name: info.name,
    dimension: info.dimension,
    metric: info.metric,
    status: info.status?.state,
    host: info.host
  });
}
