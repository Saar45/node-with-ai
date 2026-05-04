# Mini-Perplexity — IPSSI NodeJs avec IA

Projet ecole pour apprendre a communiquer avec des LLMs en Node.js. Construction progressive : verification de connexions, comparaisons multi-provider, chatbot CLI avec memoire et streaming, API HTTP.

## Setup

```bash
npm install
cp .env.example .env
# Editez .env avec vos vraies cles API
```

## Cles API necessaires

| Provider    | Ou les obtenir                              | Variable          |
|-------------|---------------------------------------------|-------------------|
| Mistral     | console.mistral.ai > API Keys               | MISTRAL_API_KEY   |
| Groq        | console.groq.com > API Keys                 | GROQ_API_KEY      |
| HuggingFace | huggingface.co > Settings > Access Tokens   | HF_API_KEY        |
| Pinecone    | app.pinecone.io > API Keys                  | PINECONE_API_KEY  |

Note : pour HuggingFace, le token doit avoir la permission **"Make calls to Inference Providers"**.

---

## Jour 1 — Check Connections

Scripts de verification des connexions API et comparaison des providers LLM (Mistral, Groq, HuggingFace, Pinecone).

```bash
npm run check              # verifie toutes les connexions
npm run check:verbose      # + affiche les reponses et modeles Mistral

npm run cost               # estimation des couts par provider
npm run lab                # meme prompt, 3 providers, 3 temperatures
npm run compare            # 5 types de taches, 3 providers
npm run same-model         # compare Groq vs HuggingFace (meme modele Llama)
npm run stress             # 10 requetes paralleles avec p95
npm run sensitivity        # 5 formulations du meme prompt
npm run multilang          # FR/EN/ES comparaison tokens et couts
npm run dashboard          # genere results.html
npm run server             # serveur Express (/check, /ask, /cost) sur :3000
```

---

## Jour 2 — Chatbot CLI multi-provider

### Demo : chatbot sans memoire

```bash
node chatbot-sans-memoire.js
```

Montre l'amnesie d'un LLM stateless. Test : "Mon prenom est Alice" puis "Quel est mon prenom ?" — l'IA ne se souvient pas.

### Le vrai chatbot

```bash
npm run chatbot
```

Phases 1 a 7 du projet J2 reunies :

- **Memoire conversationnelle** (history cote client renvoye a chaque appel)
- **Streaming SSE** (les tokens apparaissent un par un, comme ChatGPT)
- **Switch provider a la volee** : `/provider mistral` ou `/provider groq`
- **Compression automatique** quand l'historique depasse 20 messages
- **Meta-commandes** :
  - `/history` affiche l'historique interne
  - `/resume` resume la conversation en bullet points
  - `/translate <langue>` traduit la derniere reponse de l'IA
  - `/help` affiche l'aide
- **Metriques** par tour : tokens, latence, cout cumule

### Mini API Express

```bash
npm run api
```

Demarre sur `http://localhost:3000` avec un historique de session partage.

```bash
curl "http://localhost:3000/chat?q=Mon+prenom+est+Alice&provider=mistral"
curl "http://localhost:3000/chat?q=Quel+est+mon+prenom"
curl "http://localhost:3000/chat?q=Capitale+France&provider=groq"
curl http://localhost:3000/history          # voir l'historique
curl -X DELETE http://localhost:3000/history # reinitialiser
```

---

## Structure du projet

```
.
├── chatbot-cli.js              # chatbot CLI multi-provider (J2 phases 1-7)
├── api.js                      # API Express avec historique (J2 phase 8)
├── chatbot-sans-memoire.js     # demo : LLM sans memoire
├── check-connections.js        # ping des 4 providers
├── server.js                   # serveur J1 (/check, /ask, /cost)
├── cost-calculator.js          # estimation des couts
├── prompt-lab.js               # 3 providers x 3 temperatures
├── comparateur.js              # 5 taches x 3 providers
├── same-model.js               # Groq vs HuggingFace
├── stress-test.js              # 10 requetes paralleles
├── prompt-sensitivity.js       # 5 formulations du meme prompt
├── multi-langue.js             # FR/EN/ES
├── dashboard.js                # genere results.html
├── .env.example                # template des cles API
├── .gitignore
└── package.json
```
