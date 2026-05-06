# Pinecone : base de donnees vectorielle

Pinecone est une base de donnees vectorielle en cloud, fondee en 2019, devenue la reference
du marche pour les pipelines RAG en production. Elle stocke des vecteurs d'embeddings et
permet de chercher les K plus proches voisins en temps logarithmique grace a des index
specialises.

## Architecture serverless

Depuis 2024, Pinecone propose un mode serverless qui facture a l'usage plutot qu'a
l'instance. On paie au volume de stockage et au nombre de queries, sans avoir a provisionner
de pods. C'est ideal pour les projets qui demarrent ou qui ont un trafic variable.

Le mode serverless est dispo sur AWS (us-east-1, eu-west-1), GCP, et Azure. Le choix de
region impacte la latence : choisir la region la plus proche de ses utilisateurs ou de son
backend.

## Creation d'un index

Un index Pinecone est defini par trois parametres immuables :
- name : identifiant unique
- dimension : taille des vecteurs (doit matcher le modele d'embedding)
- metric : cosine, euclidean, ou dotproduct

La metrique cosine est la plus courante pour les embeddings de texte car elle ignore la
magnitude et compare uniquement la direction des vecteurs. C'est ce qui permet de mesurer
la similarite semantique sans etre biaise par la longueur du document.

## Operations principales

L'upsert ajoute ou met a jour des vecteurs. Chaque vecteur a un id unique, des values (le
vecteur lui-meme), et optionnellement des metadata. Les metadata sont cruciales : c'est ce
qui permet de retrouver le texte d'origine, la source, la page, etc. Sans metadata, on a
des vecteurs orphelins.

La query prend un vecteur de recherche et retourne les topK plus proches. On peut filtrer
par metadata (par exemple "ne retourne que les chunks dont source = guide.pdf"), ce qui
permet de scoper la recherche a un sous-ensemble du corpus.

Le delete permet de supprimer des vecteurs par id ou par filtre metadata. C'est utile pour
mettre a jour un document : on supprime tous les chunks de ce document puis on les re-upsert.

## Hybrid search

Depuis 2023, Pinecone supporte la hybrid search qui combine un score vectoriel (similarite
cosinus) avec un score BM25 (TF-IDF sur les mots exacts). Les deux scores sont ponderes et
fusionnes. C'est particulierement utile pour les requetes qui contiennent des termes rares
ou des identifiants techniques que les embeddings denses captent mal.

## Limitations a connaitre

Le free tier de Pinecone permet 1 index serverless avec 100k vecteurs en region us-east-1.
Au-dela, il faut un plan paye. Les operations sont eventuellement consistantes : un upsert
peut prendre quelques secondes a etre visible dans les queries.

Le namespace permet de partitionner un index en sous-ensembles isoles. C'est pratique pour
le multi-tenant ou pour separer prod / staging / dev. Une query est scopee a un namespace
donne (defaut '').
