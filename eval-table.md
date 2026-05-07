# eval-table.md — Baseline RAG

Pipeline : retrieveContext (topK=5, threshold=0.5) + generateCompletion (Groq llama-3.3-70b-versatile, temperature 0.1)

## Run "baseline"

| # | Question | Top-1 | Avg-3 | Tokens (in/out) | Cout ($) | Latence (ms) | Pertinence | Fidelite | Notes |
|---|----------|-------|-------|-----------------|----------|--------------|-----------|---------|-------|
| 1 | Quels sont les quatre types de streams en Node.js ... | 0.91 | 0.851 | 2082/40 | 0.00126 | 1606 | _ | _ | a noter |
| 2 | A quoi sert la similarite cosinus dans un RAG ? | 0.776 | 0.756 | 1928/117 | 0.00123 | 903 | _ | _ | a noter |
| 3 | Quelle taille de chunk recommande-t-on en pratique... | 0.773 | 0.749 | 2415/45 | 0.00146 | 600 | _ | _ | a noter |
| 4 | Comment se defendre contre une injection de prompt... | 0 | 0 | 0/0 | 0 | 0 | _ | _ | a noter |
| 5 | Qu'est-ce que l'event loop dans Node.js ? | 0.865 | 0.826 | 2082/115 | 0.001319 | 1240 | _ | _ | a noter |
| 6 | Quelle est la difference entre createStuffDocument... | 0 | 0 | 0/0 | 0 | 0 | _ | _ | a noter |
| 7 | Comment gerer les erreurs en Node.js ? | 0.792 | 0.778 | 2074/350 | 0.0015 | 1927 | _ | _ | a noter |
| 8 | C'est quoi un embedding ? | 0 | 0 | 0/0 | 0 | 0 | _ | _ | a noter |
| 9 | Quel est le PIB de la France en 2023 ? | 0.744 | 0.738 | 2681/68 | 0.001636 | 7147 | _ | _ | OK refus |
| 10 | Quelle est la capitale du Perou ? | 0.716 | 0.708 | 2022/67 | 0.001246 | 7088 | _ | _ | OK refus |

### Agregats

- **Avg Top-1 score** (happy+ambigue) : 0.514
- **Avg Top-3 score** (happy+ambigue) : 0.495
- **Cout total** des 10 requetes : $0.009651
- **Latence moyenne** : 2051ms
- **Refus adversariales** : 2/2

### Notes humaines a remplir

Pertinence et Fidelite sont des notes 1-5 a remplir manuellement apres avoir lu chaque reponse.
- Pertinence : les chunks recuperes etaient-ils relies a la question ?
- Fidelite : la reponse reflete-t-elle fidelement les sources ?
