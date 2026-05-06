# Questions de reference

10 questions calibrees pour evaluer la pipeline RAG. Sert de baseline pour les optimisations
(Phase 11) et la demo (J5).

## 6 happy paths (reponse claire dans le corpus)

1. Quels sont les quatre types de streams en Node.js ?
2. A quoi sert la similarite cosinus dans un RAG ?
3. Quelle taille de chunk recommande-t-on en pratique pour un RAG ?
4. Comment se defendre contre une injection de prompt ?
5. Qu'est-ce que l'event loop dans Node.js ?
6. Quelle est la difference entre createStuffDocumentsChain et createMapReduceDocumentsChain ?

## 2 ambigues (plusieurs chunks pourraient repondre)

7. Comment gerer les erreurs en Node.js ?
8. C'est quoi un embedding ?

## 2 adversariales (hors corpus, doit dire "je ne sais pas")

9. Quel est le PIB de la France en 2023 ?
10. Quelle est la capitale du Perou ?

---

## Format de notation (rempli en Phase 8)

Pour chaque question, on releve :
- **Top-1 score** : score Pinecone du chunk le plus pertinent
- **Avg top-3 score** : moyenne des 3 meilleurs scores
- **Tokens (in/out)** : prompt + completion
- **Cout estime** : en USD
- **Pertinence (1-5)** : note humaine — les chunks recuperes etaient-ils relies a la question ?
- **Fidelite (1-5)** : note humaine — la reponse reflete-t-elle fidelement les sources ?
