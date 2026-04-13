# Mini-Perplexity — Jour 1 : Check Connections

Projet IPSSI "NodeJs : Communication avec IA". Scripts de verification des connexions API et comparaison des providers LLM.

## Setup

```bash
npm install
cp .env.example .env
# Editez .env avec vos vraies cles API
```

## Cles API necessaires

| Provider    | Ou les obtenir                          | Variable       |
|-------------|----------------------------------------|----------------|
| Mistral     | console.mistral.ai > API Keys          | MISTRAL_API_KEY |
| Groq        | console.groq.com > API Keys            | GROQ_API_KEY    |
| HuggingFace | huggingface.co > Settings > Access Tokens | HF_API_KEY   |
| Pinecone    | app.pinecone.io > API Keys             | PINECONE_API_KEY |

## Scripts

### Phase 1-5 : Check Connections
```bash
node check-connections.js            # verifie toutes les connexions
node check-connections.js --verbose  # + affiche les reponses et modeles Mistral
```

### Phase 6 : Cost Calculator
```bash
node cost-calculator.js              # estimation des couts par provider
```

### Phase 7 : Prompt Lab
```bash
node prompt-lab.js                   # meme prompt, 3 providers, 3 temperatures
```

### Phase 8 : Comparateur de modeles
```bash
node comparateur.js                  # 5 types de taches, 3 providers
```

### Phase 9 : Serveur Express
```bash
node server.js                       # demarre sur http://localhost:3000

# Routes :
# GET /check                         → statut des connexions
# GET /ask?q=Bonjour&provider=groq   → poser une question
# GET /cost?text=Bonjour%20monde     → estimation des couts
```

### Phase 10 : Meme modele, deux hebergeurs
```bash
node same-model.js                   # compare Groq vs HuggingFace
```

### Phase 11 : Stress test
```bash
node stress-test.js                  # 10 requetes paralleles (defaut)
node stress-test.js 20               # 20 requetes paralleles
```

### Phase 12 : Sensibilite du prompt
```bash
node prompt-sensitivity.js           # 5 formulations du meme prompt
```

### Phase 13 : Multi-langue
```bash
node multi-langue.js                 # FR/EN/ES comparaison tokens et couts
```

### Phase 14 : Dashboard HTML
```bash
node dashboard.js                    # genere results.html
open results.html                    # ouvrir dans le navigateur
```
