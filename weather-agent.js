// weather-agent.js
// Agent qui combine 2 outils : meteo (wttr.in) + calculatrice
import 'dotenv/config';
import { runAgent } from './agent-loop.js';
import { calculatorTool, calculate } from './calculatrice-agent.js';

// --- Outil meteo ---
const weatherTool = {
  type: 'function',
  function: {
    name: 'get_weather',
    description: 'Recupere la meteo actuelle pour une ville donnee. Utiliser quand on parle de meteo, temperature, conditions climatiques.',
    parameters: {
      type: 'object',
      properties: {
        city: {
          type: 'string',
          description: "Le nom de la ville, en anglais de preference (ex: 'Paris', 'London', 'Tokyo')"
        }
      },
      required: ['city']
    }
  }
};

// --- Implementation de l'outil ---
async function get_weather({ city }) {
  // wttr.in : API meteo publique, format JSON, aucune cle requise
  const response = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);

  if (!response.ok) {
    return { error: `Impossible de recuperer la meteo pour ${city}` };
  }

  const data = await response.json();
  const current = data.current_condition[0];

  return {
    city,
    temperature_c: current.temp_C,
    feels_like_c: current.FeelsLikeC,
    description: current.weatherDesc[0].value,
    humidity: current.humidity + '%',
    wind_kmph: current.windspeedKmph
  };
}

// --- Agent qui combine calculatrice + meteo ---
const tools = [weatherTool, calculatorTool];
const toolFunctions = { get_weather, calculate };

// --- Lancement ---
const isMain = process.argv[1]?.endsWith('weather-agent.js');
if (isMain) {
  const userMessage = process.argv[2] ||
    'Quelle est la meteo a Paris et a Tokyo en ce moment ? Donne-moi aussi la difference de temperature entre les deux.';

  console.log(`\nQuestion : ${userMessage}\n`);
  const reply = await runAgent(userMessage, tools, toolFunctions);
  console.log('\nReponse finale :', reply);
}

export { weatherTool, get_weather };
