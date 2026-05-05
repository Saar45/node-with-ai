// search-agent.js
// Agent qui combine 3 outils : calculatrice + meteo + recherche web (DuckDuckGo)
import 'dotenv/config';
import { runAgent } from './agent-loop.js';
import { calculatorTool, calculate } from './calculatrice-agent.js';
import { weatherTool, get_weather } from './weather-agent.js';

// --- Outil de recherche web ---
const searchTool = {
  type: 'function',
  function: {
    name: 'web_search',
    description: "Recherche des informations recentes sur le web. Utiliser pour des faits actuels, des evenements recents, des prix, des donnees en temps reel, ou quand on n'est pas certain d'une information.",
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'La requete de recherche, en anglais pour de meilleurs resultats'
        }
      },
      required: ['query']
    }
  }
};

// --- Implementation ---
async function web_search({ query }) {
  // DuckDuckGo Instant Answers : gratuit, sans cle, mais necessite un User-Agent
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (educational project)' }
  });

  if (!response.ok) {
    return { error: `Echec de la recherche (HTTP ${response.status})` };
  }

  const data = await response.json();

  // 1er choix : les RelatedTopics
  const topics = (data.RelatedTopics || [])
    .filter(t => t.Text && t.FirstURL)
    .slice(0, 5)
    .map(t => ({ text: t.Text, url: t.FirstURL }));

  if (topics.length > 0) {
    return { query, results: topics };
  }

  // Fallback : l'Abstract (resume Wikipedia ou autre)
  if (data.AbstractText) {
    return {
      query,
      results: [{ text: data.AbstractText, url: data.AbstractURL || null }]
    };
  }

  // Rien trouve
  return { query, message: 'Aucun resultat trouve.' };
}

// --- Agent multi-outils ---
const tools = [calculatorTool, weatherTool, searchTool];
const toolFunctions = { calculate, get_weather, web_search };

// --- Lancement ---
const isMain = process.argv[1]?.endsWith('search-agent.js');
if (isMain) {
  const userMessage = process.argv[2] ||
    'Qui a gagne la derniere Coupe du monde de football masculine ?';

  console.log(`\nQuestion : ${userMessage}\n`);
  const reply = await runAgent(userMessage, tools, toolFunctions);
  console.log('\nReponse finale :', reply);
}
