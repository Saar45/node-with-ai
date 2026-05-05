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
  try {
    const result = eval(expression);
    return String(result);
  } catch (err) {
    return `Erreur d'evaluation : ${err.message}`;
  }
}

// Map des outils disponibles cote local
const availableTools = { calculate };

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

  // Boucle : tant que le modele veut appeler des outils, on execute et on relance
  while (choice.finish_reason === 'tool_calls') {
    console.log(`[INFO] Le modele demande ${choice.message.tool_calls.length} appel(s) d'outil`);

    // On pousse le message assistant qui contient les tool_calls (obligatoire)
    messages.push(choice.message);

    // Pour chaque tool_call demande, on execute localement et on push le resultat
    for (const toolCall of choice.message.tool_calls) {
      const fnName = toolCall.function.name;
      const fnArgs = JSON.parse(toolCall.function.arguments);

      console.log(`  -> ${fnName}(${JSON.stringify(fnArgs)})`);

      const fn = availableTools[fnName];
      const result = fn ? fn(fnArgs.expression) : `Outil inconnu : ${fnName}`;

      console.log(`     resultat : ${result}`);

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        name: fnName,
        content: result
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
