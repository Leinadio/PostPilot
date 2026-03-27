(() => {
  const PROCESSED_ATTR = 'data-postpilot-processed';
  const LOG = '[PostPilot]';
  let activePanel = null;

  function log(...args) { console.log(LOG, ...args); }

  // --- Post Detection ---

  function findPostContainer(menuBtn) {
    // Walk up the DOM from the menu button to find the post container
    // A valid container has a comment button AND text content (p or span[dir])
    let el = menuBtn.parentElement;
    for (let i = 0; i < 10; i++) {
      if (!el) return null;
      const hasCommentBtn = Array.from(el.querySelectorAll('button')).some(b => {
        const t = b.textContent.trim();
        return t === 'Commenter' || t === 'Comment';
      });
      const hasText = el.querySelector('p:not(a p):not(button p)') ||
                      Array.from(el.querySelectorAll('span[dir]')).some(s =>
                        s.textContent.trim().length > 20 && !s.closest('button') && !s.closest('a')
                      );
      if (hasCommentBtn && hasText) return el;
      el = el.parentElement;
    }
    return null;
  }

  function findPosts() {
    const menuButtons = document.querySelectorAll('button[aria-label*="menu de commandes pour le post"], button[aria-label*="control menu for post"]');

    let count = 0;
    menuButtons.forEach(menuBtn => {
      const postCard = findPostContainer(menuBtn);
      if (!postCard || postCard.getAttribute(PROCESSED_ATTR)) return;

      postCard.setAttribute(PROCESSED_ATTR, 'true');
      injectButton(postCard);
      count++;
    });

    if (count > 0) log(`Injected ${count} button(s)`);
  }

  // --- Extract Post Text ---

  function extractPostContent(postCard) {
    // Strategy 1: Collect ALL paragraphs (not just the biggest one)
    const pTags = postCard.querySelectorAll('p');
    const paragraphs = [];

    for (const p of pTags) {
      if (p.closest('a') || p.closest('button')) continue;
      const text = p.textContent.trim();
      if (text.length > 5) paragraphs.push(text);
    }

    if (paragraphs.length > 0) {
      const fullText = paragraphs.join('\n\n');
      if (fullText.length > 20) return fullText;
    }

    // Strategy 2: Fallback to span[dir] elements
    const spans = postCard.querySelectorAll('span[dir]');
    const spanTexts = [];
    for (const s of spans) {
      if (s.closest('button') || s.closest('a')) continue;
      const text = s.textContent.trim();
      if (text.length > 5) spanTexts.push(text);
    }

    if (spanTexts.length > 0) {
      const fullText = spanTexts.join('\n\n');
      if (fullText.length > 20) return fullText;
    }

    return null;
  }

  // --- Extract Author Context ---

  function extractAuthorInfo(postCard) {
    const info = { name: null, headline: null };

    // Author name: typically in a span inside a link with strong styling
    const actorLink = postCard.querySelector('a[data-test-app-aware-link] span[dir="ltr"] span[aria-hidden="true"]');
    if (actorLink) {
      info.name = actorLink.textContent.trim();
    }

    // Fallback: look for the first strong/bold text in a link
    if (!info.name) {
      const nameEl = postCard.querySelector('.update-components-actor__name span[dir="ltr"]') ||
                     postCard.querySelector('a span.visually-hidden');
      if (nameEl) info.name = nameEl.textContent.trim().replace(/^Voir le profil de\s*/i, '').replace(/^View\s*/i, '');
    }

    // Headline: author description below name
    const headlineEl = postCard.querySelector('.update-components-actor__description span[dir="ltr"]') ||
                       postCard.querySelector('.update-components-actor__supplementary-actor-info span[dir="ltr"]');
    if (headlineEl) {
      info.headline = headlineEl.textContent.trim();
    }

    // Fallback: look for secondary text near the author area
    if (!info.headline) {
      const descSpans = postCard.querySelectorAll('span.visually-hidden');
      for (const s of descSpans) {
        const text = s.textContent.trim();
        if (text.length > 10 && text.length < 200 && !text.includes('menu') && !text.includes('Commenter')) {
          info.headline = text;
          break;
        }
      }
    }

    return (info.name || info.headline) ? info : null;
  }

  // --- Button Injection ---

  function injectButton(postCard) {
    const allChildren = Array.from(postCard.children);
    let actionBar = null;

    for (const child of allChildren) {
      if (child.tagName !== 'DIV') continue;
      const btns = Array.from(child.querySelectorAll('button'));
      const hasAction = btns.some(b => {
        const t = b.textContent.trim();
        return t === 'Commenter' || t === 'Comment' || t === 'Republier' || t === 'Repost';
      });
      if (hasAction) {
        actionBar = child;
        break;
      }
    }

    const btn = document.createElement('button');
    btn.className = 'postpilot-trigger';
    btn.innerHTML = '<span class="postpilot-trigger-icon">✨</span> PostPilot';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      onTriggerClick(postCard, btn);
    });

    if (actionBar) {
      actionBar.appendChild(btn);
    } else {
      postCard.appendChild(btn);
    }
  }

  // --- Panel UI ---

  function onTriggerClick(postCard, triggerBtn) {
    if (activePanel) { activePanel.remove(); activePanel = null; }

    const seeMoreBtn = Array.from(postCard.querySelectorAll('button')).find(b => {
      const t = b.textContent.trim().toLowerCase();
      return t.length < 20 && (t.endsWith('plus') || t.endsWith('see more') || t.endsWith('more'));
    });
    if (seeMoreBtn) {
      seeMoreBtn.click();
      log('Auto-expanded post');
    }

    setTimeout(() => {
      const postContent = extractPostContent(postCard);
      if (!postContent) {
        showToast('Impossible de lire le contenu du post.');
        return;
      }

      const authorInfo = extractAuthorInfo(postCard);
      log('Post:', postContent.substring(0, 80) + '...');
      if (authorInfo) log('Author:', authorInfo.name, '|', authorInfo.headline);
      const panel = createPanel(postContent, postCard, authorInfo);
      postCard.appendChild(panel);
      activePanel = panel;
    }, seeMoreBtn ? 300 : 0);
  }

  function createPanel(postContent, postCard, authorInfo) {
    const host = document.createElement('div');
    host.className = 'postpilot-panel-host';
    const shadow = host.attachShadow({ mode: 'open' });

    shadow.innerHTML = `
      <style>${getPanelStyles()}</style>
      <div class="pp-panel">
        <div class="pp-header">
          <span class="pp-title">✨ PostPilot</span>
          <button class="pp-close">&times;</button>
        </div>
        <div class="pp-toggles">
          <div class="pp-polarity-toggle">
            <button class="pp-polarity-btn selected" data-polarity="accord">Accord</button>
            <button class="pp-polarity-btn" data-polarity="desaccord">Désaccord</button>
          </div>
          <div class="pp-voice-toggle">
            <button class="pp-voice-btn selected" data-voice="neutre">Neutre</button>
            <button class="pp-voice-btn" data-voice="je">Je</button>
          </div>
        </div>
        <div class="pp-word-count">
          <div class="pp-word-count-header">
            <label>Nombre de mots</label>
            <input type="number" class="pp-word-input" id="pp-word-input" min="1" max="150" value="30" />
          </div>
          <input type="range" class="pp-word-slider" id="pp-word-slider" min="1" max="150" value="30" />
          <div class="pp-word-label" id="pp-word-label">Sweet spot — meilleur ratio engagement/effort</div>
        </div>
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
        <div class="pp-result" id="pp-result" style="display:none;">
          <div class="pp-loading" id="pp-loading">
            <div class="pp-skeleton">
              <div class="pp-skeleton-line pp-skeleton-long"></div>
              <div class="pp-skeleton-line pp-skeleton-medium"></div>
              <div class="pp-skeleton-line pp-skeleton-short"></div>
            </div>
          </div>
          <div class="pp-comment-box" id="pp-comment-box" style="display:none;">
            <p class="pp-comment-text" id="pp-comment-text"></p>
            <div class="pp-actions">
              <button class="pp-btn pp-btn-primary" id="pp-insert">Insérer le commentaire</button>
              <button class="pp-btn pp-btn-secondary" id="pp-regenerate">Régénérer</button>
            </div>
          </div>
          <div class="pp-error" id="pp-error" style="display:none;">
            <p id="pp-error-text"></p>
            <button class="pp-btn pp-btn-secondary" id="pp-retry">Réessayer</button>
          </div>
        </div>
      </div>
    `;

    let currentType = null;
    let currentPolarity = 'accord';
    let currentWordCount = 30;
    let currentVoice = 'neutre';

    const wordSlider = shadow.getElementById('pp-word-slider');
    const wordInput = shadow.getElementById('pp-word-input');
    const wordLabel = shadow.getElementById('pp-word-label');

    function getWordLabel(count) {
      if (count <= 5) return 'Réaction brute — visibilité rapide, +likes';
      if (count <= 15) return 'Une phrase — se faire remarquer sans effort';
      if (count <= 35) return 'Sweet spot — meilleur ratio engagement/effort';
      if (count <= 60) return 'Développé — montre ton expertise, +vues de profil';
      if (count <= 100) return 'Détaillé — génère des réponses et des connexions';
      return 'Long format — risque de ne pas être lu entièrement';
    }

    function updateWordCount(value) {
      currentWordCount = Math.max(1, Math.min(150, parseInt(value) || 30));
      wordSlider.value = currentWordCount;
      wordInput.value = currentWordCount;
      wordLabel.textContent = getWordLabel(currentWordCount);
    }

    wordSlider.addEventListener('input', () => updateWordCount(wordSlider.value));
    wordInput.addEventListener('input', () => updateWordCount(wordInput.value));

    // Set default from examples avg
    getExamplesForCategory(null).then(examples => {
      if (examples && examples.length > 0) {
        var stats = getExamplesWordStats(examples);
        updateWordCount(stats.avg);
      }
    });

    shadow.querySelectorAll('.pp-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentType = btn.dataset.type;
        shadow.querySelectorAll('.pp-type-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        generateComment(shadow, currentType, postContent, currentPolarity, currentWordCount, currentVoice, authorInfo);
      });
    });

    shadow.querySelector('.pp-close').addEventListener('click', () => {
      host.remove(); activePanel = null;
    });

    shadow.querySelectorAll('.pp-polarity-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentPolarity = btn.dataset.polarity;
        shadow.querySelectorAll('.pp-polarity-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });

    shadow.querySelectorAll('.pp-voice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentVoice = btn.dataset.voice;
        shadow.querySelectorAll('.pp-voice-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });

    shadow.getElementById('pp-regenerate').addEventListener('click', () => {
      if (currentType) generateComment(shadow, currentType, postContent, currentPolarity, currentWordCount, currentVoice, authorInfo);
    });

    shadow.getElementById('pp-insert').addEventListener('click', () => {
      const text = shadow.getElementById('pp-comment-text').textContent;
      insertComment(postCard, text);
      host.remove(); activePanel = null;
    });

    shadow.getElementById('pp-retry').addEventListener('click', () => {
      if (currentType) generateComment(shadow, currentType, postContent, currentPolarity, currentWordCount, currentVoice, authorInfo);
    });

    return host;
  }

  async function generateComment(shadow, type, postContent, polarity, wordCount, voice, authorInfo) {
    const resultArea = shadow.getElementById('pp-result');
    const loading = shadow.getElementById('pp-loading');
    const commentBox = shadow.getElementById('pp-comment-box');
    const errorBox = shadow.getElementById('pp-error');

    const allTypeBtns = shadow.querySelectorAll('.pp-type-btn');
    const allPolarityBtns = shadow.querySelectorAll('.pp-polarity-btn');
    const allVoiceBtns = shadow.querySelectorAll('.pp-voice-btn');
    const wordSliderEl = shadow.getElementById('pp-word-slider');
    const wordInputEl = shadow.getElementById('pp-word-input');

    const disableAll = () => {
      allTypeBtns.forEach(b => { b.disabled = true; b.classList.add('pp-type-btn-disabled'); });
      allPolarityBtns.forEach(b => { b.disabled = true; b.classList.add('pp-toggle-disabled'); });
      allVoiceBtns.forEach(b => { b.disabled = true; b.classList.add('pp-toggle-disabled'); });
      wordSliderEl.disabled = true; wordSliderEl.classList.add('pp-slider-disabled');
      wordInputEl.disabled = true; wordInputEl.classList.add('pp-input-disabled');
    };

    const enableAll = () => {
      allTypeBtns.forEach(b => { b.disabled = false; b.classList.remove('pp-type-btn-disabled'); });
      allPolarityBtns.forEach(b => { b.disabled = false; b.classList.remove('pp-toggle-disabled'); });
      allVoiceBtns.forEach(b => { b.disabled = false; b.classList.remove('pp-toggle-disabled'); });
      wordSliderEl.disabled = false; wordSliderEl.classList.remove('pp-slider-disabled');
      wordInputEl.disabled = false; wordInputEl.classList.remove('pp-input-disabled');
    };

    disableAll();

    resultArea.style.display = 'block';
    loading.style.display = 'block';
    commentBox.style.display = 'none';
    errorBox.style.display = 'none';

    const examples = await getExamplesForCategory(type);
    const prompt = buildPrompt(type, postContent, polarity, examples, wordCount, voice, authorInfo);
    if (!prompt) { enableAll(); return; }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_COMMENT',
        payload: { ...prompt, wordCount: wordCount }
      });

      loading.style.display = 'none';
      enableAll();

      if (response.error) {
        showError(shadow, response.error);
        return;
      }

      shadow.getElementById('pp-comment-text').textContent = response.comment.replace(/\n\n+/g, '\n');
      commentBox.style.display = 'block';
    } catch (err) {
      loading.style.display = 'none';
      enableAll();
      showError(shadow, err.message);
    }
  }

  function showError(shadow, errorMsg) {
    const errorBox = shadow.getElementById('pp-error');
    const errorText = shadow.getElementById('pp-error-text');

    let message = 'Une erreur est survenue.';
    if (errorMsg === 'API_KEY_MISSING') {
      message = 'Clé API manquante. Cliquez sur l\'icône PostPilot pour configurer votre clé Anthropic.';
    } else if (errorMsg === 'API_KEY_INVALID') {
      message = 'Clé API invalide. Vérifiez votre clé dans les paramètres.';
    } else if (errorMsg) {
      message = errorMsg;
    }

    errorText.textContent = message;
    errorBox.style.display = 'block';
  }

  // --- Comment Insertion ---

  function insertComment(postCard, text) {
    const commentBtn = Array.from(postCard.querySelectorAll('button')).find(b =>
      b.textContent.trim() === 'Commenter' || b.textContent.trim() === 'Comment'
    );
    if (commentBtn) commentBtn.click();

    setTimeout(() => {
      const editors = document.querySelectorAll(
        '.ql-editor, div[contenteditable="true"][role="textbox"], div[contenteditable="true"][data-placeholder]'
      );

      let editor = null;
      const postRect = postCard.getBoundingClientRect();
      let minDist = Infinity;
      editors.forEach(ed => {
        const edRect = ed.getBoundingClientRect();
        const dist = Math.abs(edRect.top - postRect.bottom);
        if (dist < minDist) { minDist = dist; editor = ed; }
      });

      if (!editor) {
        navigator.clipboard.writeText(text).then(() => {
          showToast('Commentaire copié ! Collez avec Cmd+V.');
        }).catch(() => showToast('Champ de commentaire introuvable.'));
        return;
      }

      const lines = text.split('\n').filter(l => l.trim());
      editor.innerHTML = '';
      lines.forEach(line => {
        const p = document.createElement('p');
        p.textContent = line;
        editor.appendChild(p);
      });

      editor.dispatchEvent(new Event('input', { bubbles: true }));
      editor.focus();
      showToast('Commentaire inséré !');
    }, 800);
  }

  // --- Toast ---

  function showToast(msg) {
    const old = document.querySelector('.postpilot-toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.className = 'postpilot-toast';
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1d2226;color:#fff;padding:12px 24px;border-radius:8px;font-size:14px;font-family:-apple-system,system-ui,sans-serif;z-index:10001;box-shadow:0 4px 12px rgba(0,0,0,.3);';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  // --- Panel Styles ---

  function getPanelStyles() {
    return `
      * { box-sizing: border-box; }
      .pp-panel { background:#fff; border:1px solid #e0e0e0; border-radius:12px; padding:16px; margin:8px 0; box-shadow:0 4px 16px rgba(0,0,0,.1); font-family:-apple-system,system-ui,sans-serif; }
      .pp-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
      .pp-title { font-size:15px; font-weight:700; color:#0a66c2; }
      .pp-close { background:none; border:none; font-size:22px; color:#666; cursor:pointer; padding:4px 8px; border-radius:4px; }
      .pp-close:hover { background:#f3f3f3; }
      .pp-toggles { display:flex; gap:12px; margin-bottom:12px; }
      .pp-polarity-toggle { display:flex; gap:4px; }
      .pp-polarity-btn { padding:6px 16px; border:1px solid #e0e0e0; border-radius:20px; background:#fafafa; cursor:pointer; font-size:12px; font-weight:600; color:#666; transition:all .15s; }
      .pp-polarity-btn:hover { border-color:#0a66c2; color:#0a66c2; }
      .pp-polarity-btn.selected { background:#0a66c2; color:#fff; border-color:#0a66c2; }
      .pp-voice-toggle { display:flex; gap:4px; }
      .pp-voice-btn { padding:6px 16px; border:1px solid #e0e0e0; border-radius:20px; background:#fafafa; cursor:pointer; font-size:12px; font-weight:600; color:#666; transition:all .15s; }
      .pp-voice-btn:hover { border-color:#0a66c2; color:#0a66c2; }
      .pp-voice-btn.selected { background:#0a66c2; color:#fff; border-color:#0a66c2; }
      .pp-word-count { margin-bottom:12px; }
      .pp-word-count-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
      .pp-word-count-header label { font-size:12px; font-weight:600; color:#333; }
      .pp-word-input { width:52px; padding:4px 6px; border:1px solid #e0e0e0; border-radius:6px; font-size:12px; text-align:center; color:#333; font-weight:600; }
      .pp-word-input:focus { outline:none; border-color:#0a66c2; }
      .pp-word-slider { width:100%; height:4px; -webkit-appearance:none; appearance:none; background:#e0e0e0; border-radius:2px; outline:none; cursor:pointer; }
      .pp-word-slider::-webkit-slider-thumb { -webkit-appearance:none; appearance:none; width:16px; height:16px; border-radius:50%; background:#0a66c2; cursor:pointer; border:2px solid #fff; box-shadow:0 1px 3px rgba(0,0,0,.2); }
      .pp-word-label { font-size:11px; color:#666; margin-top:4px; font-style:italic; }
      .pp-pilier-label { font-size:11px; font-weight:700; color:#0a66c2; text-transform:uppercase; letter-spacing:0.5px; margin:12px 0 6px; }
      .pp-pilier-label:first-child { margin-top:0; }
      .pp-types { display:flex; flex-direction:column; gap:6px; }
      .pp-type-btn { display:flex; align-items:center; gap:10px; padding:10px 12px; border:1px solid #e0e0e0; border-radius:8px; background:#fafafa; cursor:pointer; transition:all .15s; text-align:left; }
      .pp-type-btn:hover:not(.pp-type-btn-disabled) { border-color:#0a66c2; background:#f0f7ff; }
      .pp-type-btn.selected { border-color:#0a66c2; background:#e8f0fe; box-shadow:0 0 0 1px #0a66c2; }
      .pp-type-btn-disabled { opacity:0.4; cursor:not-allowed; pointer-events:none; }
      .pp-toggle-disabled { opacity:0.4; cursor:not-allowed; pointer-events:none; }
      .pp-slider-disabled { opacity:0.4; cursor:not-allowed; pointer-events:none; }
      .pp-input-disabled { opacity:0.4; cursor:not-allowed; pointer-events:none; }
      .pp-type-emoji { font-size:18px; flex-shrink:0; }
      .pp-type-info { display:flex; flex-direction:column; gap:1px; }
      .pp-type-label { font-size:13px; font-weight:600; color:#333; }
      .pp-type-desc { font-size:11px; color:#666; line-height:1.3; }
      .pp-result { margin-top:12px; }
      .pp-loading { padding:12px; }
      .pp-skeleton { display:flex; flex-direction:column; gap:8px; }
      .pp-skeleton-line { height:12px; border-radius:6px; background:linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%); background-size:200% 100%; animation:ppShimmer 1.5s infinite; }
      .pp-skeleton-long { width:100%; }
      .pp-skeleton-medium { width:75%; }
      .pp-skeleton-short { width:45%; }
      @keyframes ppShimmer { 0% { background-position:200% 0; } 100% { background-position:-200% 0; } }
      .pp-comment-box { margin-top:8px; }
      .pp-comment-text { background:#f8f9fa; border:1px solid #e0e0e0; border-radius:8px; padding:12px; font-size:13px; line-height:1.5; color:#333; margin:0 0 12px; white-space:pre-wrap; }
      .pp-actions { display:flex; gap:8px; }
      .pp-btn { padding:8px 16px; border-radius:20px; font-size:13px; font-weight:600; cursor:pointer; border:none; transition:all .15s; }
      .pp-btn-primary { background:#0a66c2; color:#fff; }
      .pp-btn-primary:hover { background:#004182; }
      .pp-btn-secondary { background:#fff; color:#0a66c2; border:1px solid #0a66c2; }
      .pp-btn-secondary:hover { background:#f0f7ff; }
      .pp-error { padding:12px; background:#fef2f2; border:1px solid #fecaca; border-radius:8px; margin-top:8px; }
      .pp-error p { color:#991b1b; font-size:13px; margin:0 0 8px; }
    `;
  }

  // --- Observer ---

  let debounce = null;
  const observer = new MutationObserver(() => {
    clearTimeout(debounce);
    debounce = setTimeout(findPosts, 500);
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  setTimeout(findPosts, 1500);
  setTimeout(findPosts, 4000);

  let scrollDebounce = null;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollDebounce);
    scrollDebounce = setTimeout(findPosts, 500);
  }, { passive: true });

  log('Loaded');
})();
