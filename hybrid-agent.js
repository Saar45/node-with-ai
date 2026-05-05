// hybrid-agent.js
// Phase 9 du projet J3 : agent qui choisit entre 4 outils
//   calculate    -> calculs arithmetiques
//   get_weather  -> meteo temps reel (wttr.in)
//   web_search   -> recherche web (DuckDuckGo)
//   rag_search   -> corpus prive indexe dans Pinecone
import 'dotenv/config';
import { runAgent } from './agent-loop.js';
import { calculatorTool, calculate } from './calculatrice-agent.js';
import { weatherTool, get_weather } from './weather-agent.js';
import { searchSimilar } from './rag-query.js';

// --- Outil RAG (cherche dans le corpus prive Pinecone) ---
const ragTool = {
  type: 'function',
  function: {
    name: 'rag_search',
    description: "Cherche des informations dans la base de documents internes indexee. Utiliser pour des questions sur le contenu du corpus prive (Node.js, Express, ecosysteme JS) ou quand web_search ne retourne pas de resultats pertinents.",
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'La requete de recherche semantique'
        }
      },
      required: ['query']
    }
  }
};

async function rag_search({ query }) {
  const matches = await searchSimilar(query, 3);
  return matches.map(m => ({ score: Number(m.score.toFixed(3)), text: m.text }));
}

// --- Outil websearch (DuckDuckGo) ---
const searchTool = {
  type: 'function',
  function: {
    name: 'web_search',
    description: "Recherche des informations recentes sur le web public. Utiliser pour des faits actuels, evenements recents, donnees en temps reel.",
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Requete de recherche' }
      },
      required: ['query']
    }
  }
};

async function web_search({ query }) {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (educational project)' } });
  if (!res.ok) return { error: `HTTP ${res.status}` };
  const data = await res.json();
  const topics = (data.RelatedTopics || [])
    .filter(t => t.Text && t.FirstURL)
    .slice(0, 5)
    .map(t => ({ text: t.Text, url: t.FirstURL }));
  if (topics.length > 0) return { results: topics };
  if (data.AbstractText) return { results: [{ text: data.AbstractText, url: data.AbstractURL }] };
  return { message: 'Aucun resultat trouve.' };
}

// --- Agent hybride : 4 outils + memoire conversationnelle ---
const tools = [calculatorTool, weatherTool, searchTool, ragTool];
const toolFunctions = { calculate, get_weather, web_search, rag_search };

const SYSTEM_PROMPT = `Tu es un assistant qui choisit le bon outil selon la question :
- calculate pour les calculs arithmetiques
- get_weather pour la meteo en temps reel
- web_search pour les actualites et faits publics
- rag_search pour le contenu du corpus interne (Node.js, Express, ecosysteme JS)
Si une question concerne notre corpus interne, utilise rag_search en priorite.
Cite tes sources quand elles viennent du web ou du corpus interne. Reponds directement de memoire si la question est generale.`;

// Historique partage entre les appels successifs
const conversationHistory = [];

export async function chatWithAgent(userMessage) {
  return runAgent(userMessage, tools, toolFunctions, {
    system: SYSTEM_PROMPT,
    history: conversationHistory
  });
}

const isMain = process.argv[1]?.endsWith('hybrid-agent.js');
if (isMain) {
  const questions = process.argv.slice(2);
  if (questions.length === 0) {
    questions.push('Qui a cree Node.js et quand ?');
    questions.push('Et quelle est la meteo a Paris en ce moment ?');
    questions.push('Combien fait 17 au carre plus 4 puissance 5 ?');
  }

  for (const q of questions) {
    console.log(`\n=== Vous : ${q} ===\n`);
    const reply = await chatWithAgent(q);
    console.log(`\n=== Agent : ${reply}\n`);
  }
}
