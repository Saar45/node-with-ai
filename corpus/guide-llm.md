# Les Large Language Models (LLM)

## Definition

Un LLM, pour Large Language Model, est un modele statistique entraine sur des milliards de
tokens de texte. Sa tache d'entrainement est de predire le token suivant etant donne le
contexte precedent. De cette tache simple emergent des comportements qui ressemblent a du
raisonnement, de la creativite, et de la comprehension.

Les LLMs modernes sont bases sur l'architecture Transformer, introduite en 2017 dans le
papier "Attention is All You Need" de Vaswani et al. Le mecanisme d'attention permet au
modele de ponderer l'importance relative de chaque token du contexte pour predire le suivant.

## Tokens

Un token n'est pas un mot. C'est une unite de sous-mot generee par un algorithme de
tokenization comme BPE (Byte Pair Encoding). Les mots frequents restent en un seul token,
les mots rares sont decoupes. "anticonstitutionnellement" peut devenir 4-5 tokens en
francais.

En anglais, 1 token correspond a environ 4 caracteres ou 0.75 mots. En francais, c'est plus
proche de 3 caracteres car les tokenizers sont entraines majoritairement sur de l'anglais.
Cette difference a un impact direct sur le cout : un meme contenu en francais coute 25-30%
plus cher en tokens qu'en anglais.

## Temperature

La temperature controle l'aleatoire de la generation. A temperature 0, le modele choisit
toujours le token le plus probable, ce qui donne des reponses deterministes. A temperature
1, il echantillonne parmi les tokens probables, ce qui donne des reponses plus creatives
mais moins reproductibles. Les valeurs au-dessus de 1 produisent du n'importe quoi.

Pour les taches factuelles (resume, traduction, classification, extraction), on utilise
0.1 a 0.3. Pour la conversation generale, 0.7. Pour la creativite (brainstorming, ecriture),
0.9 ou plus.

## Hallucinations

Un LLM hallucine quand il genere des informations fausses avec une confiance totale. Ce
n'est pas un bug : c'est une consequence du fait que le modele genere le token le plus
probable selon ses statistiques d'entrainement, sans notion de verite. Les hallucinations
sont particulierement frequentes sur des faits precis (dates, noms, references), des
domaines specialises (droit, medecine), et des informations posterieures a la date de
coupure du modele.

Les techniques pour reduire les hallucinations sont :
- RAG (donner des sources fiables au modele)
- Temperature basse
- System prompts qui demandent explicitement de dire "je ne sais pas"
- Validation cote code des outputs structures

## Fenetre de contexte

La context window est la quantite maximale de tokens que le modele peut traiter en une
seule requete. GPT-4o gere 128k tokens, Claude 3.5 200k, Gemini 1M. Plus la fenetre est
grande, plus on peut passer de contexte, mais plus l'inference est lente et chere.

Le phenomene "lost in the middle" decrit la tendance des modeles a moins bien retenir les
informations placees au milieu d'un long contexte que celles placees au debut ou a la fin.
C'est une raison de plus pour utiliser le RAG plutot que de charger tout un corpus dans le
contexte.

## Modeles open vs closed source

Les modeles closed-source (GPT-4, Claude, Gemini) sont accessibles uniquement via les APIs
de leurs providers. On n'a pas acces aux poids, l'entrainement est opaque, et le provider
peut changer le comportement du modele a tout moment.

Les modeles open-weight (Llama, Mistral 7B, Qwen, Gemma) ont leurs poids publies. On peut
les telecharger, les faire tourner sur sa propre infrastructure, voire les fine-tuner. Ca
donne plus de controle mais necessite des ressources GPU significatives en production.
