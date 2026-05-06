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

Pour le RAG (J3), il faut aussi `PINECONE_INDEX_NAME` et `PINECONE_INDEX_HOST` (lance `npm run pinecone` apres avoir cree l'index pour recuperer le host).

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

## Jour 3 — Tool Use et RAG

### Track A : agents avec outils

Boucle agentique reutilisable dans `agent-loop.js` (`runAgent(userMessage, tools, toolFunctions, opts)`) avec retry, max rounds, fallback Groq sur 429 Mistral, et historique partage optionnel.

```bash
npm run calc-agent       # agent calculatrice (eval expressions)
npm run weather-agent    # agent meteo (wttr.in) + calculatrice
npm run search-agent     # agent + websearch DuckDuckGo
```

### Track B : RAG avec Pinecone

```bash
npm run embedding        # demo embeddings Mistral + similarite cosinus
npm run pinecone         # verifie la connexion a l'index mini-perplexity
npm run embed            # chunke un document, embed, upsert dans Pinecone
npm run rag              # pipeline RAG complet : retrieval + generation
npm run rag "Qui a cree Express ?"
```

### Agent hybride (jonction Track A + B)

```bash
npm run hybrid                        # 3 questions de demo
npm run hybrid "ta question ici"      # question custom
```

Le LLM choisit lui-meme entre 4 outils :
- `calculate` — calculs arithmetiques
- `get_weather` — meteo temps reel
- `web_search` — informations publiques
- `rag_search` — corpus prive (Pinecone)

Avec memoire conversationnelle (les questions suivantes se souviennent du contexte).

---

## Jour 4 — Pipeline RAG de bout en bout

Pipeline RAG production-ready avec chunking + overlap, batch embedding, retrieval avec filtre de score, prompt RAG strict (anti-hallucination + anti-injection), observability, evaluation chiffree.

### Indexation du corpus

```bash
npm run index            # chunke ./corpus/, embed batch, upsert dans Pinecone
```

Parametres dans `create-index.js` : `CHUNK_SIZE=400` mots, `OVERLAP=50`, `BATCH_SIZE=50`, `EMBED_CONCURRENCY=5`. Mistral embeddings `mistral-embed` (1024 dims).

### Pipeline RAG complete

```bash
npm run rag:full         # ragQuery sur la question par defaut
npm run rag:full "ta question"
```

`ragQuery(question, { topK: 5, verbose: true })` retourne `{ answer, sources, chunks, chunksUsed, metrics }`. Mode verbose affiche les scores de retrieval et les tokens consommes — utile pour debugger la qualite.

System prompt strict :
- Reponds uniquement depuis le contexte
- Cite les sources entre `[Source N]`
- "Je ne trouve pas cette information" si hors corpus
- Resiste aux injections de prompt

### CLI interactif

```bash
npm run cli              # interface readline pour interroger le corpus
```

### Version LangChain (Phase 9)

```bash
npm run rag:lc           # meme pipeline en 30 lignes au lieu de 200
```

Compare a la version from-scratch : LangChain abstrait le retrieval, le prompt template, la chain. Embedding Mistral, generation Groq.

### Evaluation et audit

```bash
npm run eval             # tourne 10 questions de questions-test.md, genere eval-table.md
npm run eval:audit       # 3 variantes (topK=1, 5, 10), regressions identifiees
```

Aggregats : Top-1 score moyen, Avg Top-3, cout total, latence moyenne, taux de refus sur les questions adversariales.

---

## Structure du projet

```
.
├── J1 — Check Connections
│   ├── check-connections.js
│   ├── server.js
│   ├── cost-calculator.js
│   ├── prompt-lab.js
│   ├── comparateur.js
│   ├── same-model.js
│   ├── stress-test.js
│   ├── prompt-sensitivity.js
│   ├── multi-langue.js
│   └── dashboard.js
├── J2 — Chatbot CLI
│   ├── chatbot-sans-memoire.js
│   ├── chatbot-cli.js
│   └── api.js
├── J3 — Tool Use et RAG
│   ├── agent-loop.js              # runAgent reutilisable
│   ├── calculatrice-agent.js      # outil calculate
│   ├── weather-agent.js           # outil get_weather (wttr.in)
│   ├── search-agent.js            # outil web_search (DuckDuckGo)
│   ├── test-embedding.js          # embeddings Mistral + cosinus
│   ├── pinecone-setup.js          # verification de l'index
│   ├── embed-document.js          # chunking + upsert (demo)
│   ├── rag-query.js               # retrieval + generation (demo)
│   └── hybrid-agent.js            # 4 outils + memoire conv
├── J4 — Pipeline RAG
│   ├── corpus/                    # documents a indexer (.txt et .md)
│   ├── create-index.js            # indexeur batch (chunk + embed + upsert)
│   ├── rag-pipeline.js            # ragQuery production avec observability
│   ├── rag-pipeline-langchain.js  # meme pipeline en LangChain
│   ├── cli.js                     # interface CLI interactive
│   ├── eval.js                    # evaluation et audit
│   ├── questions-test.md          # 10 questions de reference
│   └── eval-table.md              # baseline mesuree
├── .env.example
├── .gitignore
└── package.json
```
