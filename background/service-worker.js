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

function countWords(text) {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

async function callAnthropic(apiKey, model, system, messages, wordCount) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: model,
      max_tokens: Math.max(300, (wordCount || 75) * 2),
      temperature: 0.9,
      system: system,
      messages: messages
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
  const comment = data.content?.[0]?.text?.trim();

  if (!comment) {
    throw new Error('No comment generated');
  }

  return comment;
}

async function handleGenerateComment({ system, user, wordCount }) {
  const result = await chrome.storage.local.get(['anthropic_api_key', 'anthropic_model']);
  const apiKey = result.anthropic_api_key;
  const model = result.anthropic_model || 'claude-sonnet-4-20250514';

  if (!apiKey) {
    throw new Error('API_KEY_MISSING');
  }

  const messages = [{ role: 'user', content: user }];
  const firstComment = await callAnthropic(apiKey, model, system, messages, wordCount);

  if (!wordCount || wordCount <= 0) {
    return { comment: firstComment };
  }

  const minWords = Math.max(1, wordCount - 5);
  const firstCount = countWords(firstComment);

  console.log(`[PostPilot] Mots: ${firstCount} (cible: ${minWords}-${wordCount})`);

  if (firstCount >= minWords && firstCount <= wordCount) {
    return { comment: firstComment };
  }

  const direction = firstCount < minWords
    ? `Ce commentaire fait ${firstCount} mots. Il en faut entre ${minWords} et ${wordCount}. Développe davantage pour atteindre ${wordCount} mots.`
    : `Ce commentaire fait ${firstCount} mots. Le maximum est ${wordCount}. Raccourcis pour rester entre ${minWords} et ${wordCount} mots.`;

  console.log(`[PostPilot] Retry: ${direction}`);

  const retryMessages = [
    { role: 'user', content: user },
    { role: 'assistant', content: firstComment },
    { role: 'user', content: direction + '\n\nRetourne UNIQUEMENT le commentaire corrigé. Rien d\'autre.' }
  ];

  const retryComment = await callAnthropic(apiKey, model, system, retryMessages, wordCount);
  const retryCount = countWords(retryComment);

  console.log(`[PostPilot] Retry mots: ${retryCount} (cible: ${minWords}-${wordCount})`);

  if (retryCount >= minWords && retryCount <= wordCount) {
    return { comment: retryComment };
  }

  const firstDiff = Math.abs(firstCount - wordCount);
  const retryDiff = Math.abs(retryCount - wordCount);
  return { comment: retryDiff <= firstDiff ? retryComment : firstComment };
}
