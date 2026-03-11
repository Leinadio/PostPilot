chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GENERATE_COMMENT') {
    handleGenerateComment(message.payload)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (message.type === 'CHECK_API_KEY') {
    chrome.storage.local.get(['anthropic_api_key'], (result) => {
      sendResponse({ hasKey: !!result.anthropic_api_key });
    });
    return true;
  }
});

async function callAPI(apiKey, system, user, maxTokens) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: system,
      messages: [
        { role: 'user', content: user }
      ]
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('API_KEY_INVALID');
    }
    throw new Error(errorData.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text?.trim();

  if (!text) {
    throw new Error('No response generated');
  }

  return text;
}

async function handleGenerateComment({ step1, step2 }) {
  const result = await chrome.storage.local.get(['anthropic_api_key']);
  const apiKey = result.anthropic_api_key;

  if (!apiKey) {
    throw new Error('API_KEY_MISSING');
  }

  // Step 1: Generate raw comment (content + tone)
  const rawComment = await callAPI(apiKey, step1.system, step1.user, 300);

  // Step 2: Apply formatting + length constraints
  const step2User = step2.userTemplate.replace('{{RAW_COMMENT}}', rawComment);
  const comment = await callAPI(apiKey, step2.system, step2User, 200);

  return { comment };
}
