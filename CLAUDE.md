# PostPilot - Extension Chrome LinkedIn Comment Generator

## Architecture

Extension Chrome Manifest V3 (vanilla JS, pas de framework, pas de build step).

### Fichiers

- `manifest.json` - Config extension, content scripts chargés en séquence, permissions (storage, activeTab, linkedin, anthropic API)
- `lib/prompts.js` - RULES_CRITICAL, RULES_CORE, COMMENT_APPROACHES, TON_OPTIONS, buildPrompt(), buildResizePrompt()
- `content/content.js` - Injection UI LinkedIn (Shadow DOM), panel, detection posts via MutationObserver, insertion commentaires
- `content/styles.css` - Styles du bouton trigger PostPilot (externe au Shadow DOM)
- `background/service-worker.js` - Appels API Claude Sonnet, reçoit {system, user} de buildPrompt()
- `popup/popup.html` + `popup.js` + `popup.css` - Config clé API Anthropic (stockée dans chrome.storage.local)

### Flux de donnees

1. `content.js` detecte les posts LinkedIn via les boutons "menu de commandes" (aria-label), remonte de 2 niveaux pour trouver la post card
2. Un bouton "PostPilot" est injecté dans la barre d'actions de chaque post (à côté de Commenter/Republier)
3. Au clic, un panel Shadow DOM s'ouvre avec le sélecteur ton et la grille des 8 approches
4. L'utilisateur choisit ton + approche
5. `buildPrompt(type, postContent, ton)` construit {system, user}
6. Le message est envoyé au service worker via `chrome.runtime.sendMessage`
7. Le service worker appelle l'API Claude et renvoie le commentaire
8. Le commentaire s'affiche dans le panel, l'utilisateur peut insérer, régénérer, ou changer d'approche

### Points techniques importants

- Les variables globales dans `prompts.js` utilisent `var` (pas const/let) pour être accessibles depuis `content.js` car les deux sont des content scripts chargés en séquence par le manifest
- Le panel UI utilise Shadow DOM pour isoler ses styles de ceux de LinkedIn
- L'interface {system, user} vers le service worker est stable. Modifier les prompts ne nécessite jamais de toucher au service worker
- La detection des posts utilise MutationObserver + debounce (500ms) + scroll listener + deux setTimeout initiaux (1.5s et 4s) pour couvrir le chargement dynamique de LinkedIn
- L'extraction du texte du post prend le `<p>` le plus long qui n'est pas dans un `<a>` ou `<button>`, avec fallback sur `span[dir]`
- L'insertion du commentaire clique d'abord le bouton "Commenter", attend 800ms, puis trouve l'éditeur le plus proche géographiquement du post. Fallback sur clipboard si l'éditeur est introuvable

## Systeme de commentaires

### 8 approches (terme UI, pas "stratégies")

| Clé | Label | Description | Points d'attention |
|-----|-------|-------------|-------------------|
| `rebond_concret` | Rebond concret | Exemple/fait externe lié au sujet | Pas de vécu inventé, éclairage factuel uniquement |
| `desaccord_nuance` | Désaccord / nuance | Contrepoint constructif | Respectueux, pas là pour corriger, assumer sans s'excuser |
| `apprentissage` | Apprentissage | Réagir à ce que le post apprend | Spécifique, pas de "ça fait réfléchir" vague |
| `question` | Question | Soulever un angle non abordé | Vraie question, pas rhétorique, bienveillante |
| `soutien` | Soutien | Valoriser sans être creux | Citer un passage précis, pas de surenchère |
| `complement` | Complément | Ajouter un point non couvert | Complément, pas un oubli de l'auteur |
| `opinion_franche` | Opinion franche | Prise de position directe | Ancré dans du concret (observation, logique, bon sens) |
| `legerete` | Légèreté | Observation malicieuse et bienveillante | PAS humour noir/moqueur/sarcasme, sourire complice, 1-2 phrases max |

### Ton (contextuel, choisi à chaque commentaire, défaut = neutre)

| Clé | Label | Comportement |
|-----|-------|-------------|
| `familier` | Familier | Tutoiement, décontracté, comme un ami ou collègue proche |
| `pro` | Pro | Vouvoiement, professionnel mais oral et naturel, pas guindé |
| `neutre` | Neutre | Formulations impersonnelles, aucune adresse directe à l'auteur |

### Architecture des prompts (sandwich XML)

`buildPrompt()` assemble le system prompt dans cet ordre :
1. `RULES_CRITICAL` (formatage + authenticité) — position haute attention
2. `<approche>` instructions spécifiques — position middle
3. `RULES_CORE` (contenu + indépendance + style + posture, inclut règle de longueur) — position haute attention
4. `<ton>` prompt du ton choisi

Le user prompt contient le post (wrappé dans `<post>` tags) + instruction de raisonnement + rappels formatage/indépendance/ton renforcés avec "sera rejeté".

## Regles (6 blocs XML)

Les règles sont organisées en 6 blocs XML sémantiques, répartis en deux groupes pour éviter le "lost in the middle".

### RULES_CRITICAL (top du system prompt, haute attention)

- `<formatage>` — Zéro hashtag, émoji, tiret cadratin, tiret demi-cadratin, deux-points. "sera rejeté" pour enforcement
- `<authenticite>` — Pas de passé, mémoire, relations. Formulé comme principe, pas comme liste (Claude contourne les listes)

### RULES_CORE (bottom du system prompt, haute attention)

- `<contenu>` — Identifier le point clé, première phrase = idée originale, chaque phrase apporte du concret
- `<independance>` — Ne reprendre ni mots ni expressions du post. Commentaire trop générique = rejeté
- `<style>` — Réagir pas analyser, pas de structure visible, mots simples, varier les tournures
- `<posture>` — Pair pas expert, affirmer OK mais jamais corriger, pas de catégorisation, toujours bienveillant

### Renforcement multi-couche

- Les règles critiques apparaissent dans le system prompt (RULES_CRITICAL/RULES_CORE) ET dans le user prompt (rappels avec "sera rejeté")
- Le user prompt ne contient PAS les caractères interdits (Claude imite ce qu'il voit)

## Prompt engineering - Lecons apprises

### Technique du "sera rejeté"

Pour les règles strictes (formatage, registre neutre), ajouter "Si tu utilises X, le commentaire sera rejeté" est beaucoup plus efficace qu'un simple "n'utilise pas X".

### Coherence prompt / regles

Le user prompt ne doit jamais contenir de caractères interdits. Si le prompt utilise des deux-points, Claude les reproduit dans sa réponse.

### Principe vs liste

Pour les interdits comportementaux (faux vécu), formuler un principe ("tu n'as pas de passé") est plus robuste qu'une liste de formulations interdites. Claude contourne les listes en trouvant des variantes.

### Architecture sandwich (lost in the middle)

Les règles les plus violées sont positionnées en début (RULES_CRITICAL) et fin (RULES_CORE) du system prompt, car les LLMs ont une attention maximale à ces positions. Les instructions d'approche sont au milieu, où elles sont bien respectées de toute façon.

## Decisions de design

| Decision | Alternatives rejetees | Raison |
|---|---|---|
| 8 approches basées sur réactions naturelles | 6 stratégies artificielles (ancien système) | Plus ancré dans le comportement réel LinkedIn |
| Pas de "vécu perso" comme approche | Vécu perso, mini-profil, amorce à compléter | L'IA inventerait du faux vécu |
| "Rebond concret" au lieu de "vécu perso" | Anecdote personnelle | L'IA apporte un fait externe sans prétendre que c'est son vécu |
| Ton (Familier/Pro/Neutre) fusionné depuis registre+expression | Registre + Expression séparés | Trop de combinaisons contradictoires, une seule dimension suffit |
| Ton oral toujours, même en vouvoiement | Ton formel en vouvoiement | Plus authentique LinkedIn |
| Affirmer OK, jamais corriger | Pair-à-pair strict (jamais affirmer) | Affirmer son point de vue est différent de juger |
| Pas de génération phrase-par-phrase | Génération incrémentale | La longueur dépend du contexte, mieux géré par prompt |
| Pas d'humour noir/moqueur, légèreté bienveillante | Humour comme stratégie | Trop risqué pour de l'IA, le sourire malicieux suffit |
| Panel ne se ferme PAS au clic extérieur | Fermeture au clic extérieur | L'utilisateur perdait son commentaire par accident |
| Principe "pas de passé" vs liste de formulations | Liste exhaustive de formulations | Claude contourne les listes, le principe est plus robuste |
| Interdits formatage dans system + user prompt | Seulement dans system prompt | Claude ne respectait pas les interdits du system prompt seul |
| Ton bienveillant même face à un post provoc | Reproduire le ton du post | Le commentaire ne doit jamais rabaisser, même si le post le fait |
| Architecture sandwich XML (rules critical top + core bottom) | 17 règles plates dans BASE_RULES | Lost in the middle, les règles 8-14 n'étaient pas respectées |
| User prompt sans caractères interdits | Montrer (:) (—) (–) dans le user prompt | Claude imite ce qu'il voit dans le prompt |
| Raccourcir/Allonger post-génération | Paramètre longueur pré-génération | Ajuster après avoir vu le résultat est plus naturel et évite les contradictions avec les règles |

## UI Panel

### Structure

Le panel est un Shadow DOM attaché à un div `.postpilot-panel-host`, inséré en fin de post card.

### Layout

1. Header (titre + bouton fermeture X)
2. Options (une ligne de toggles pills)
   - Ton (Familier / Pro / **Neutre**)
3. Label "Approche"
4. Grille 4 colonnes x 2 rangées (8 approches, chacune avec emoji + label + description)
5. Zone résultat (loading spinner / commentaire + boutons Insérer/Régénérer / erreur + Réessayer)

### Comportements

- Un seul panel actif à la fois. Ouvrir un nouveau panel ferme l'ancien
- Le panel ne se ferme QUE via le bouton X (pas au clic extérieur)
- Cliquer une approche lance la génération immédiatement
- Après génération, la grille d'approches réapparaît pour permettre de changer d'approche
- Deux boutons "↓ Court" / "↑ Long" permettent de raccourcir ou allonger le commentaire (appel API séparé via buildResizePrompt)
- Régénérer relance avec les mêmes paramètres (approche + ton)
- Le toggle ton peut être changé entre deux générations
