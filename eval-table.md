# eval-table.md — Baseline RAG

Pipeline : retrieveContext (topK=5, threshold=0.5) + generateCompletion (mistral-small-latest, temperature 0.1)

## Run "baseline"

| # | Question | Top-1 | Avg-3 | Tokens (in/out) | Cout ($) | Latence (ms) | Pertinence | Fidelite | Notes |
|---|----------|-------|-------|-----------------|----------|--------------|-----------|---------|-------|
| 1 | Quels sont les quatre types de streams en Node.js ... | 0.91 | 0.85 | 2082/32 | 0.000218 | 1706 | _ | _ | a noter |
| 2 | A quoi sert la similarite cosinus dans un RAG ? | 0.776 | 0.756 | 1928/137 | 0.000234 | 1744 | _ | _ | a noter |
| 3 | Quelle taille de chunk recommande-t-on en pratique... | 0.773 | 0.749 | 2415/45 | 0.000255 | 785 | _ | _ | a noter |
| 4 | Comment se defendre contre une injection de prompt... | 0.837 | 0.763 | 1951/190 | 0.000252 | 1057 | _ | _ | a noter |
| 5 | Qu'est-ce que l'event loop dans Node.js ? | 0.865 | 0.826 | 2082/115 | 0.000243 | 1256 | _ | _ | a noter |
| 6 | Quelle est la difference entre createStuffDocument... | 0.799 | 0.771 | 2332/124 | 0.00027 | 3214 | _ | _ | a noter |
| 7 | Comment gerer les erreurs en Node.js ? | 0 | 0 | 0/0 | 0 | 0 | _ | _ | a noter |
| 8 | C'est quoi un embedding ? | 0.778 | 0.77 | 2255/222 | 0.000292 | 1927 | _ | _ | a noter |
| 9 | Quel est le PIB de la France en 2023 ? | 0 | 0 | 0/0 | 0 | 0 | _ | _ | A FAIRE : doit refuser |
| 10 | Quelle est la capitale du Perou ? | 0.716 | 0.708 | 2022/67 | 0.000222 | 1331 | _ | _ | OK refus |

### Agregats

- **Avg Top-1 score** (happy+ambigue) : 0.717
- **Avg Top-3 score** (happy+ambigue) : 0.686
- **Cout total** des 10 requetes : $0.001986
- **Latence moyenne** : 1302ms
- **Refus adversariales** : 1/2

### Notes humaines a remplir

Pertinence et Fidelite sont des notes 1-5 a remplir manuellement apres avoir lu chaque reponse.
- Pertinence : les chunks recuperes etaient-ils relies a la question ?
- Fidelite : la reponse reflete-t-elle fidelement les sources ?
