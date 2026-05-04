// chatbot-sans-memoire.js
// Demonstration : l'IA oublie tout a chaque tour
import 'dotenv/config';
import readline from 'node:readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => rl.question(prompt, resolve));
}

async function askOnce(userMessage) {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
    },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages: [{ role: 'user', content: userMessage }],
      temperature: 0.7
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

console.log('Chatbot SANS memoire. Essayez :');
console.log('  1. "Mon prenom est Alice"');
console.log('  2. "Quel est mon prenom ?"');
console.log('(Ctrl+C pour quitter)\n');

while (true) {
  const input = await question('Vous : ');
  const reply = await askOnce(input);
  console.log(`IA : ${reply}\n`);
}
