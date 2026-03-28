# Prompt Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bloated 6,500-token prompt system (13 blocks, 30+ banned expressions, 12 categories) with a minimal ~500-token prompt powered by 14 few-shot examples.

**Architecture:** `lib/supabase.js` fetches all examples once, `lib/prompts.js` builds a minimal prompt (mission + polarity + voice + length + examples + one closing instruction), `content/content.js` shows 4 simple categories instead of 12.

**Tech Stack:** Vanilla JS (Chrome Extension MV3), Supabase REST API, Anthropic Claude API

---

### Task 1: Simplify Supabase example fetching

**Files:**
- Modify: `lib/supabase.js` (full rewrite)

- [ ] **Step 1: Rewrite `lib/supabase.js` to fetch all examples without category filter**

Replace the entire file content with:

```js
// --- Supabase Configuration ---
var SUPABASE_URL = 'https://ohlyepvbhflczyijlrqs.supabase.co';
var SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_yz475pIA7XJhlQV1s7lTYQ_wttTQUVn';

var _cachedExamples = null;

async function fetchAllExamples() {
  if (_cachedExamples) return _cachedExamples;

  var url = SUPABASE_URL + '/rest/v1/comment_examples?select=text';

  var response = await fetch(url, {
    headers: {
      'apikey': SUPABASE_PUBLISHABLE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_PUBLISHABLE_KEY
    }
  });

  if (!response.ok) {
    throw new Error('Supabase fetch failed: ' + response.status);
  }

  var data = await response.json();
  _cachedExamples = data.map(function(row) { return row.text; });
  return _cachedExamples;
}
```

This removes: category filtering, chrome.storage cache (24h TTL), `getExamplesForCategory()`, `getCachedOrFetchExamples()`. Replaces with a simple in-memory cache and a single `fetchAllExamples()` function.

- [ ] **Step 2: Verify extension still loads**

Reload the extension in `chrome://extensions`, open LinkedIn, open DevTools console, check for errors. No functionality yet — just ensure no load-time crash.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase.js
git commit -m "refactor: simplify supabase to fetch all examples without category filter"
```

---

### Task 2: Rewrite `lib/prompts.js` with minimal prompt

**Files:**
- Modify: `lib/prompts.js` (full rewrite)

- [ ] **Step 1: Rewrite `lib/prompts.js` with 4 categories and minimal `buildPrompt`**

Replace the entire file content with:

```js
var CATEGORIES = {
  reagir: {
    label: 'Réagir',
    emoji: '💬',
    description: 'Donner ton avis, constater, approuver ou contester',
    mission: 'Tu réagis au post ci-dessous en donnant ton avis.'
  },
  questionner: {
    label: 'Questionner',
    emoji: '❓',
    description: 'Poser une question, creuser un angle',
    mission: 'Tu questionnes un point du post ci-dessous.'
  },
  prolonger: {
    label: 'Prolonger',
    emoji: '➡️',
    description: 'Aller plus loin, ajouter une idée',
    mission: 'Tu prolonges une idée du post ci-dessous.'
  },
  pousser: {
    label: 'Pousser à l\'action',
    emoji: '🎯',
    description: 'Recommander, défier, appeler à agir',
    mission: 'Tu pousses à l\'action en réponse au post ci-dessous.'
  }
};

function buildPrompt(postContent, category, polarity, examples, wordCount, voice, authorInfo) {
  var cat = CATEGORIES[category];
  if (!cat) return null;

  var systemParts = [];

  // Mission
  systemParts.push('Tu commentes sur LinkedIn. ' + cat.mission);

  // Polarité
  if (polarity === 'desaccord') {
    systemParts.push('Position : en désaccord avec l\'auteur.');
  } else {
    systemParts.push('Position : en accord avec l\'auteur.');
  }

  // Voix
  if (voice === 'je') {
    systemParts.push('Écris à la première personne (\"je\").');
  } else {
    systemParts.push('Écris de façon neutre, sans \"je\".');
  }

  // Nombre de mots
  if (wordCount && wordCount > 0) {
    systemParts.push('Objectif : environ ' + wordCount + ' mots.');
  }

  // Exemples
  if (examples && examples.length > 0) {
    var exBlock = 'Voici des exemples du ton et du style à adopter :\n\n' +
      examples.map(function(ex, i) { return 'Exemple ' + (i + 1) + ' :\n' + ex; }).join('\n\n');
    systemParts.push(exBlock);
  }

  // Consigne finale
  systemParts.push('Commente dans la langue du post. Ton direct, pas de formules creuses, pas de flatterie. Sois spécifique : mentionne un élément concret du post.');

  // User message
  var userParts = [];
  userParts.push('Post LinkedIn\n\n---\n' + postContent + '\n---');

  if (authorInfo) {
    var authorContext = '\nAuteur :';
    if (authorInfo.name) authorContext += ' ' + authorInfo.name;
    if (authorInfo.headline) authorContext += ' — ' + authorInfo.headline;
    userParts.push(authorContext);
  }

  userParts.push('Retourne UNIQUEMENT le commentaire.');

  return {
    system: systemParts.join('\n\n'),
    user: userParts.join('\n')
  };
}
```

This removes: `PILIER_ORDER`, `PILIER_LABELS`, `COMMENT_CATEGORIES` (12 entries), `getWordCount()`, `getExamplesWordStats()`, all 6 BLOC sections, EXPRESSIONS BANNIES, ÉCRITURE, SPÉCIFICITÉ, ANCRAGE, RAPPEL FINAL.

- [ ] **Step 2: Commit**

```bash
git add lib/prompts.js
git commit -m "refactor: rewrite prompts.js with minimal few-shot-first prompt"
```

---

### Task 3: Update `content/content.js` UI from 12 to 4 categories

**Files:**
- Modify: `content/content.js`

- [ ] **Step 1: Replace the panel HTML category section**

In `content/content.js`, inside `createPanel()`, find the `pp-types` div generation (lines 216-231):

```js
        <div class="pp-types" id="pp-types">
          ${PILIER_ORDER.map(pilier => {
            const entries = Object.entries(COMMENT_CATEGORIES).filter(([_, c]) => c.pilier === pilier);
            if (!entries.length) return '';
            return `<div class="pp-pilier-label">${PILIER_LABELS[pilier]}</div>` +
              entries.map(([key, category]) => `
                <button class="pp-type-btn" data-type="${key}">
                  <span class="pp-type-emoji">${category.emoji}</span>
                  <span class="pp-type-info">
                    <span class="pp-type-label">${category.label}</span>
                    <span class="pp-type-desc">${category.description}</span>
                  </span>
                </button>
              `).join('');
          }).join('')}
        </div>
```

Replace with:

```js
        <div class="pp-types" id="pp-types">
          ${Object.entries(CATEGORIES).map(([key, cat]) => `
            <button class="pp-type-btn" data-type="${key}">
              <span class="pp-type-emoji">${cat.emoji}</span>
              <span class="pp-type-info">
                <span class="pp-type-label">${cat.label}</span>
                <span class="pp-type-desc">${cat.description}</span>
              </span>
            </button>
          `).join('')}
        </div>
```

- [ ] **Step 2: Update `generateComment` to use new `buildPrompt` signature**

In `content/content.js`, find the `generateComment` function (line 337). Change the parameter name from `type` to `category` and update the two calls inside:

Change function signature:
```js
  async function generateComment(shadow, category, postContent, polarity, wordCount, voice, authorInfo) {
```

Change the examples fetch (line 372) from:
```js
    const examples = await getExamplesForCategory(type);
    const prompt = buildPrompt(type, postContent, polarity, examples, wordCount, voice, authorInfo);
```

To:
```js
    const examples = await fetchAllExamples();
    const prompt = buildPrompt(postContent, category, polarity, examples, wordCount, voice, authorInfo);
```

- [ ] **Step 3: Update all `generateComment` call sites to use `category` instead of `type`**

In the type button click handler (lines 291-298), change `currentType` to `currentCategory`:

Replace all occurrences of `currentType` with `currentCategory` in `createPanel()`:
- Declaration (line 255): `let currentCategory = null;`
- Button click handler (line 293): `currentCategory = btn.dataset.type;`
- Button click handler (line 296): `generateComment(shadow, currentCategory, postContent, currentPolarity, currentWordCount, currentVoice, authorInfo);`
- Regenerate handler (line 321): `if (currentCategory) generateComment(shadow, currentCategory, postContent, currentPolarity, currentWordCount, currentVoice, authorInfo);`
- Retry handler (line 331): `if (currentCategory) generateComment(shadow, currentCategory, postContent, currentPolarity, currentWordCount, currentVoice, authorInfo);`

- [ ] **Step 4: Remove the default word count from examples logic**

In `createPanel()`, find the block that sets default word count from examples stats (lines 283-289):

```js
    // Set default from examples avg
    getExamplesForCategory(null).then(examples => {
      if (examples && examples.length > 0) {
        var stats = getExamplesWordStats(examples);
        updateWordCount(stats.avg);
      }
    });
```

Remove this block entirely. The default word count of 30 (already set in the HTML input) is fine.

- [ ] **Step 5: Commit**

```bash
git add content/content.js
git commit -m "refactor: update UI to 4 categories and new buildPrompt signature"
```

---

### Task 4: Remove CSS for pilier labels

**Files:**
- Modify: `content/content.js` (inside `getPanelStyles()`)

- [ ] **Step 1: Remove pilier-label CSS rules**

In `getPanelStyles()` (line 474), find and remove these two CSS rules:

```css
      .pp-pilier-label { font-size:11px; font-weight:700; color:#0a66c2; text-transform:uppercase; letter-spacing:0.5px; margin:12px 0 6px; }
      .pp-pilier-label:first-child { margin-top:0; }
```

These classes are no longer used since we removed the pilier group headers.

- [ ] **Step 2: Commit**

```bash
git add content/content.js
git commit -m "cleanup: remove unused pilier-label CSS"
```

---

### Task 5: Delete old prompt markdown files

**Files:**
- Delete: all 12 files in `prompts/` directory

- [ ] **Step 1: Delete all prompt markdown files**

```bash
git rm prompts/declarative_constat.md prompts/declarative_contrepied.md prompts/declarative_prolongement.md prompts/interrogative_angle_mort.md prompts/interrogative_curiosite.md prompts/interrogative_mise_a_lepreuve.md prompts/exclamative_enthousiasme.md prompts/exclamative_etonnement.md prompts/exclamative_resonance.md prompts/imperative_appel.md prompts/imperative_defi.md prompts/imperative_recommandation.md
```

- [ ] **Step 2: Remove the empty `prompts/` directory if it still exists**

```bash
rmdir prompts/
```

- [ ] **Step 3: Commit**

```bash
git commit -m "cleanup: remove 12 old category prompt files"
```

---

### Task 6: End-to-end manual test

- [ ] **Step 1: Reload the extension**

Go to `chrome://extensions`, click reload on PostPilot.

- [ ] **Step 2: Open LinkedIn and find a post**

Navigate to LinkedIn feed. Click the PostPilot button on any post.

- [ ] **Step 3: Verify the panel shows 4 categories**

Confirm the panel displays: Réagir, Questionner, Prolonger, Pousser à l'action. No pilier group headers. No old categories.

- [ ] **Step 4: Test each category**

For each of the 4 categories:
1. Select it
2. Verify a comment is generated
3. Check the comment tone matches the examples (natural, no AI tics)
4. Verify "Insérer le commentaire" works

- [ ] **Step 5: Test toggles**

Verify polarity (Accord/Désaccord), voice (Neutre/Je), and word count slider all work correctly.

- [ ] **Step 6: Check DevTools console**

Open DevTools, verify no errors. Check `[PostPilot]` logs are clean.
