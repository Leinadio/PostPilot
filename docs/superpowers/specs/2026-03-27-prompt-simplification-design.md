# Simplification du système de prompts PostPilot

**Date :** 2026-03-27
**Problème :** Le prompt actuel (~6 500 tokens, 13 blocs, 30+ interdictions) cause des régressions à chaque correction — fixer un tic IA en casse un autre ou réintroduit un problème déjà résolu.

**Approche retenue :** Few-shot first — les exemples humains portent le style, le prompt se limite au strict minimum.

---

## 1. Nouveau système de catégories

On passe de 12 catégories à **4 catégories simples** :

| Catégorie | Intention | Remplace |
|-----------|-----------|----------|
| **Réagir** | Donner son avis, constater, approuver/désapprouver | constat, résonance, enthousiasme, étonnement |
| **Questionner** | Poser une question, creuser un angle | curiosité, angle mort, mise à l'épreuve |
| **Prolonger** | Aller plus loin, ajouter une idée | prolongement, contrepied |
| **Pousser à l'action** | Recommander, défier, appeler | appel, défi, recommandation |

## 2. Structure du nouveau prompt

Prompt système total : **~500 tokens** (vs ~6 500 aujourd'hui).

```
[Mission — 1 phrase]
"Tu es un commentateur LinkedIn. Tu [verbe catégorie] le post ci-dessous."

[Polarité — 1 phrase]
"Position : en accord/désaccord avec l'auteur."

[Voix — 1 phrase]
"Écris à la première personne." ou "Écris de façon neutre."

[Longueur — 1 phrase]
"Environ X mots."

[Exemples — tous les exemples Supabase]
"Voici des exemples du ton et du style à adopter :"
(liste des exemples)

[Consigne finale — 1 phrase]
"Commente dans la langue du post. Ton direct, pas de formules creuses, pas de flatterie. Sois spécifique : mentionne un élément concret du post."
```

### Principes clés

- **Zéro liste d'interdictions.** Pas d'EXPRESSIONS BANNIES. Les exemples montrent le ton voulu.
- **Instructions positives uniquement.** "Ton direct, pas de formules creuses" au lieu de 30 expressions bannies.
- **Corriger par l'exemple.** Si un tic IA apparaît, on ajoute/améliore un exemple dans Supabase — pas une règle au prompt.

## 3. Gestion des exemples Supabase

- Fetch **tous** les exemples au chargement (pas de filtre par catégorie)
- Suppression du cache 24h par catégorie — un seul fetch, tout en mémoire
- Les 14 exemples actuels (~1 500 tokens) sont envoyés à chaque appel
- Si la base grossit au-delà de 15-20 exemples, échantillonner un sous-ensemble aléatoire de 10-15

**Budget tokens total :** ~500 (prompt) + ~1 500 (exemples) = **~2 000 tokens** (vs ~6 500 avant, soit -70%)

## 4. Signature de buildPrompt

**Avant :**
```js
buildPrompt(type, postContent, polarity, examples, wordCount, voice, authorInfo)
```

**Après :**
```js
buildPrompt(postContent, category, polarity, examples, wordCount, voice, authorInfo)
```

- `type` (parmi 12) remplacé par `category` (parmi 4 : réagir, questionner, prolonger, pousser)
- Tous les autres paramètres restent identiques

## 5. Fichiers impactés

### Supprimés
- `prompts/declarative_constat.md`
- `prompts/declarative_contrepied.md`
- `prompts/declarative_prolongement.md`
- `prompts/interrogative_angle_mort.md`
- `prompts/interrogative_curiosite.md`
- `prompts/interrogative_mise_a_lepreuve.md`
- `prompts/exclamative_enthousiasme.md`
- `prompts/exclamative_etonnement.md`
- `prompts/exclamative_resonance.md`
- `prompts/imperative_appel.md`
- `prompts/imperative_defi.md`
- `prompts/imperative_recommandation.md`

### Modifiés
- **`lib/prompts.js`** — Réécriture complète : suppression de COMMENT_CATEGORIES, des 6 blocs, de toute la logique catégorie/pilier. Nouveau buildPrompt minimaliste.
- **`content/content.js`** — UI passe de 12 boutons de catégorie à 4. Appel buildPrompt adapté à la nouvelle signature.
- **`lib/supabase.js`** — Fetch tous les exemples sans filtre de catégorie.

### Conservés tels quels
- Polarité (accord/désaccord)
- Voix (je/neutre)
- Slider de nombre de mots
- authorInfo (nom + headline de l'auteur)
