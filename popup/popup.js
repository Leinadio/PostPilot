const apiKeyInput = document.getElementById('api-key');
const modelSelect = document.getElementById('model-select');
const form = document.getElementById('settings-form');
const status = document.getElementById('status');
const toggleBtn = document.getElementById('toggle-visibility');

// Load saved settings
chrome.storage.local.get(['anthropic_api_key', 'anthropic_model'], (result) => {
  if (result.anthropic_api_key) {
    apiKeyInput.value = result.anthropic_api_key;
    showStatus('Clé API configurée.', 'success');
  }
  if (result.anthropic_model) {
    modelSelect.value = result.anthropic_model;
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

  chrome.storage.local.set({ anthropic_api_key: key, anthropic_model: modelSelect.value }, () => {
    showStatus('Paramètres sauvegardés !', 'success');
  });
});

function showStatus(message, type) {
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';
}

