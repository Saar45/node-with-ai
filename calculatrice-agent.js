// calculatrice-agent.js
// Demo function calling : le LLM appelle une fonction calculate() locale
import 'dotenv/config';

// --- Definition de l'outil ---
const tools = [
  {
    type: 'function',
    function: {
      name: 'calculate',
      description: 'Evalue une expression mathematique et retourne le resultat. Utiliser pour tout calcul arithmetique.',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: "L'expression a evaluer, ex: '(15 * 4) / 3' ou '2 ** 32'"
          }
        },
        required: ['expression']
      }
    }
  }
];

// --- Implementation de l'outil ---
function calculate(expression) {
  // Attention : eval() fonctionne ici pour les tests, mais jamais en prod
  // (risque d'injection de code). Pour une vraie app : utiliser mathjs.
  const result = eval(expression);
  return String(result);
}

// Map des outils disponibles cote local
const availableTools = { calculate };

// --- Garde-fous : limite le nombre de rounds et retries par outil ---
const MAX_TOOL_ROUNDS = 5;       // securite anti-boucle infinie cote LLM
const MAX_TOOL_RETRIES = 2;      // tentatives par tool_call avant d'abandonner
const RETRY_INTERVAL_MS = 500;   // pause entre retries

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Execute un outil avec retry. En cas d'echec final, on renvoie un message
// d'erreur au modele pour qu'il puisse decider quoi faire (reformuler, abandonner).
async function runToolWithRetry(fnName, fnArgs) {
  const fn = availableTools[fnName];
  if (!fn) {
    return { ok: false, content: `Outil inconnu : ${fnName}` };
  }

  for (let attempt = 1; attempt <= MAX_TOOL_RETRIES; attempt++) {
    try {
      const result = fn(fnArgs.expression);
      if (attempt > 1) console.log(`     OK apres ${attempt} tentatives`);
      return { ok: true, content: result };
    } catch (err) {
      console.log(`     tentative ${attempt}/${MAX_TOOL_RETRIES} a echoue : ${err.message}`);
      if (attempt < MAX_TOOL_RETRIES) await sleep(RETRY_INTERVAL_MS);
    }
  }

  // Le modele recoit l'erreur explicite et peut reessayer avec une autre formulation
  return {
    ok: false,
    content: `Erreur : l'outil ${fnName} a echoue apres ${MAX_TOOL_RETRIES} tentatives. Reformule l'expression ou abandonne.`
  };
}

// --- L'appel au LLM avec les outils actives ---
async function callWithTools(userMessage) {
  const messages = [
    { role: 'user', content: userMessage }
  ];

  // 1er appel : on passe les outils, le modele decide
  let response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
    },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages,
      tools,
      tool_choice: 'auto'
    })
  });

  let data = await response.json();
  let choice = data.choices[0];
  let round = 0;

  // Boucle : tant que le modele veut appeler des outils, on execute et on relance
  while (choice.finish_reason === 'tool_calls') {
    round++;
    if (round > MAX_TOOL_ROUNDS) {
      console.log(`[WARN] Limite de ${MAX_TOOL_ROUNDS} rounds atteinte, on coupe.`);
      break;
    }

    console.log(`[INFO] Round ${round} : le modele demande ${choice.message.tool_calls.length} appel(s) d'outil`);

    // On pousse le message assistant qui contient les tool_calls (obligatoire)
    messages.push(choice.message);

    // Pour chaque tool_call demande, on execute (avec retry) et on push le resultat
    for (const toolCall of choice.message.tool_calls) {
      const fnName = toolCall.function.name;
      const fnArgs = JSON.parse(toolCall.function.arguments);

      console.log(`  -> ${fnName}(${JSON.stringify(fnArgs)})`);

      const { ok, content } = await runToolWithRetry(fnName, fnArgs);
      console.log(`     ${ok ? 'resultat' : 'erreur'} : ${content}`);

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        name: fnName,
        content
      });
    }

    // 2eme appel (ou plus) : on renvoie l'historique enrichi pour la reponse finale
    response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages,
        tools,
        tool_choice: 'auto'
      })
    });

    data = await response.json();
    choice = data.choices[0];
  }

  console.log('\nReponse finale :', choice.message.content);
}

callWithTools('Combien fait 2 a la puissance 32 ? Et 15 fois 24 ?');
