# LangChain.js : framework RAG

LangChain.js est un framework JavaScript qui abstrait les operations courantes des
applications LLM en primitives reutilisables. Il s'occupe du plumbing : serialisation des
chunks, gestion des embeddings, construction des prompts, parsing des outputs structures,
gestion des erreurs.

## Concepts cles

Une chain est un pipeline composable. Les chains principales pour le RAG :
- createStuffDocumentsChain : prend des documents et les "stuff" (entasse) dans un seul
  prompt. Simple, ideal pour les petits contextes (< 4k tokens).
- createMapReduceDocumentsChain : chaque document est traite separement, puis les reponses
  sont agregees. Utile quand le contexte est trop grand pour tenir en une seule requete.
- createRefineChain : reponse iterative, chaque document affine la reponse precedente.
  Plus precis mais beaucoup plus d'appels LLM.

Un retriever est une abstraction sur la recherche vectorielle. On lui donne une question,
il retourne des Documents pertinents. Les retrievers les plus utilises sont
VectorStoreRetriever (Pinecone, Weaviate, Chroma...) et MultiQueryRetriever (qui reformule
la question pour augmenter le recall).

Un PromptTemplate est un prompt parametrise. ChatPromptTemplate.fromTemplate(`Contexte :
{context} Question : {input}`) cree un template avec deux variables. La chain les remplit
au runtime.

## Output parsers

Par defaut, les LLMs retournent du texte libre. LangChain permet de forcer une structure
JSON via Zod, une lib de validation de schema. Vous decrivez la forme attendue (champs,
types, contraintes), Zod la valide a l'execution, et LangChain l'utilise pour cadrer la
sortie du modele.

Exemple :
```
const parser = StructuredOutputParser.fromZodSchema(
  z.object({
    answer: z.string().describe("La reponse a la question"),
    sources: z.array(z.string()).describe("Les fichiers sources utilises"),
    confidence: z.enum(['high', 'medium', 'low']).describe("Niveau de confiance")
  })
);
```

C'est particulierement utile pour construire des APIs qui exposent un RAG : les clients
recoivent du JSON structure, pas du texte brut.

## Avantages et critiques

LangChain est le framework le plus connu pour le RAG. Il a popularise les concepts de
chains et d'agents. Sa documentation est riche, sa communaute large.

Mais il a des critiques legitimes : "trop magique", "on ne comprend plus ce qui se passe
sous le capot", "trop d'abstractions empilees pour debugger". En pratique, certaines equipes
utilisent LangChain pour prototyper vite, puis le remplacent par du code custom en
production quand le debugging devient trop difficile. C'est une strategie valide.

## LangSmith

LangSmith est la plateforme de tracing/observability livree avec LangChain. Elle enregistre
chaque chain run pour pouvoir le rejouer et le debugger apres coup. C'est precieux en
production : la meme question peut donner des reponses differentes (LLM stochastique), donc
sans tracing on ne peut pas reproduire un bug.

## Alternatives

LlamaIndex : focus sur le RAG, plus specialise que LangChain. Tres bon pour les pipelines
de retrieval complexes, les graph RAG, les agents avec memoire persistante.

Haystack (par deepset) : oriente enterprise search et NLP, bon support pour les evaluations
et les pipelines de production.

Vercel AI SDK : si vous etes dans l'ecosysteme Next.js/React, c'est la solution la plus
integree pour exposer des LLMs cote serveur.

La regle pratique : commencez par comprendre les briques. Ensuite, utilisez l'abstraction
pour aller plus vite. Ne faites jamais l'inverse.
