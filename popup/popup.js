const apiKeyInput = document.getElementById('api-key');
const form = document.getElementById('settings-form');
const status = document.getElementById('status');
const toggleBtn = document.getElementById('toggle-visibility');

// Load saved key
chrome.storage.local.get(['anthropic_api_key'], (result) => {
  if (result.anthropic_api_key) {
    apiKeyInput.value = result.anthropic_api_key;
    showStatus('Clé API configurée.', 'success');
  }
});

// Toggle visibility
toggleBtn.addEventListener('click', () => {
  apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
});

// Save
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const key = apiKeyInput.value.trim();

  if (!key) {
    showStatus('Veuillez entrer une clé API.', 'error');
    return;
  }

  if (!key.startsWith('sk-ant-')) {
    showStatus('La clé doit commencer par "sk-ant-".', 'error');
    return;
  }

  chrome.storage.local.set({ anthropic_api_key: key }, () => {
    showStatus('Clé sauvegardée avec succès !', 'success');
  });
});

function showStatus(message, type) {
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';
}

// --- Examples ---
const examplesList = document.getElementById('examples-list');
const newExampleInput = document.getElementById('new-example');
const addExampleBtn = document.getElementById('add-example');

function loadExamples() {
  chrome.storage.local.get(['comment_examples'], (result) => {
    renderExamples(result.comment_examples || []);
  });
}

function renderExamples(examples) {
  examplesList.innerHTML = '';
  examples.forEach((ex, i) => {
    const item = document.createElement('div');
    item.className = 'example-item';
    const text = document.createElement('span');
    text.className = 'example-text';
    text.textContent = ex;
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-example';
    removeBtn.textContent = '×';
    removeBtn.title = 'Supprimer';
    removeBtn.addEventListener('click', () => removeExample(i));
    item.appendChild(text);
    item.appendChild(removeBtn);
    examplesList.appendChild(item);
  });
}

function addExample() {
  const text = newExampleInput.value.trim();
  if (!text) return;
  chrome.storage.local.get(['comment_examples'], (result) => {
    const examples = result.comment_examples || [];
    examples.push(text);
    chrome.storage.local.set({ comment_examples: examples }, () => {
      newExampleInput.value = '';
      renderExamples(examples);
    });
  });
}

function removeExample(index) {
  chrome.storage.local.get(['comment_examples'], (result) => {
    const examples = result.comment_examples || [];
    examples.splice(index, 1);
    chrome.storage.local.set({ comment_examples: examples }, () => {
      renderExamples(examples);
    });
  });
}

addExampleBtn.addEventListener('click', addExample);
loadExamples();
