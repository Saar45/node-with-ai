// calculatrice-agent.js
// Demo function calling : le LLM appelle une fonction calculate() locale
import 'dotenv/config';
import { runAgent } from './agent-loop.js';

// --- Definition de l'outil ---
export const calculatorTool = {
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
};

// --- Implementation de l'outil ---
// Attention : eval() fonctionne ici pour les tests, mais jamais en prod
// (risque d'injection de code). Pour une vraie app : utiliser mathjs.
export function calculate({ expression }) {
  const result = eval(expression);
  return String(result);
}

// --- Lancement standalone ---
const isMain = process.argv[1]?.endsWith('calculatrice-agent.js');
if (isMain) {
  const reply = await runAgent(
    'Combien fait 2 a la puissance 32 ? Et 15 fois 24 ?',
    [calculatorTool],
    { calculate }
  );
  console.log('\nReponse finale :', reply);
}
