// agent-loop.js
// Boucle d'agent reutilisable : passe les outils au LLM, execute les tool_calls,
// renvoie les resultats au LLM, repete jusqu'a ce qu'il formule sa reponse finale.
import 'dotenv/config';

const MAX_TOOL_ROUNDS = 5;       // securite anti-boucle infinie cote LLM
const MAX_TOOL_RETRIES = 2;      // tentatives par tool_call avant d'abandonner
const RETRY_INTERVAL_MS = 500;   // pause entre retries

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Execute un outil avec retry. En cas d'echec final, on renvoie un message
// d'erreur au modele pour qu'il decide quoi faire (reformuler, abandonner).
async function runToolWithRetry(fnName, fnArgs, toolFunctions) {
  const fn = toolFunctions[fnName];
  if (!fn) {
    return `Outil inconnu : ${fnName}`;
  }

  for (let attempt = 1; attempt <= MAX_TOOL_RETRIES; attempt++) {
    try {
      const result = await fn(fnArgs);
      if (attempt > 1) console.log(`     OK apres ${attempt} tentatives`);
      // Si le tool renvoie un objet, on le serialize pour le LLM
      return typeof result === 'string' ? result : JSON.stringify(result);
    } catch (err) {
      console.log(`     tentative ${attempt}/${MAX_TOOL_RETRIES} a echoue : ${err.message}`);
      if (attempt < MAX_TOOL_RETRIES) await sleep(RETRY_INTERVAL_MS);
    }
  }

  return `Erreur : l'outil ${fnName} a echoue apres ${MAX_TOOL_RETRIES} tentatives. Reformule l'expression ou abandonne.`;
}

/**
 * Lance un agent avec function calling.
 * @param {string} userMessage   La question utilisateur
 * @param {Array}  tools         Definitions des outils (format OpenAI tools[])
 * @param {Object} toolFunctions Map { nomDuTool: (args) => result }
 * @param {Object} [opts]
 * @param {string} [opts.model='mistral-small-latest']
 * @param {string} [opts.system]                       System prompt optionnel
 * @returns {Promise<string>}                           La reponse finale du modele
 */
export async function runAgent(userMessage, tools, toolFunctions, opts = {}) {
  const model = opts.model || 'mistral-small-latest';
  const messages = [];
  if (opts.system) messages.push({ role: 'system', content: opts.system });
  messages.push({ role: 'user', content: userMessage });

  async function callMistral() {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages,
        tools,
        tool_choice: 'auto'
      })
    });
    return response.json();
  }

  let data = await callMistral();
  let choice = data.choices[0];
  let round = 0;

  while (choice.finish_reason === 'tool_calls') {
    round++;
    if (round > MAX_TOOL_ROUNDS) {
      console.log(`[WARN] Limite de ${MAX_TOOL_ROUNDS} rounds atteinte, on coupe.`);
      break;
    }

    console.log(`[INFO] Round ${round} : le modele demande ${choice.message.tool_calls.length} appel(s) d'outil`);
    messages.push(choice.message);

    for (const toolCall of choice.message.tool_calls) {
      const fnName = toolCall.function.name;
      const fnArgs = JSON.parse(toolCall.function.arguments);

      console.log(`  -> ${fnName}(${JSON.stringify(fnArgs)})`);

      const content = await runToolWithRetry(fnName, fnArgs, toolFunctions);
      console.log(`     resultat : ${content.length > 120 ? content.substring(0, 120) + '...' : content}`);

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        name: fnName,
        content
      });
    }

    data = await callMistral();
    choice = data.choices[0];
  }

  return choice.message.content;
}
