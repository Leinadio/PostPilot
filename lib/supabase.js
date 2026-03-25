// --- Supabase Configuration ---
var SUPABASE_URL = 'https://ohlyepvbhflczyijlrqs.supabase.co';
var SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_yz475pIA7XJhlQV1s7lTYQ_wttTQUVn';

var SUPABASE_CACHE_PREFIX = 'supabase_examples_';
var SUPABASE_CACHE_TIME_PREFIX = 'supabase_examples_time_';
var CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

async function fetchSupabaseExamples(category) {
  var url = SUPABASE_URL + '/rest/v1/comment_examples?select=text';
  if (category) {
    url += '&categories=cs.%7B' + encodeURIComponent(category) + '%7D';
  }

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
  return data.map(function(row) { return row.text; });
}

async function getCachedOrFetchExamples(category) {
  var cacheKey = SUPABASE_CACHE_PREFIX + (category || 'all');
  var cacheTimeKey = SUPABASE_CACHE_TIME_PREFIX + (category || 'all');

  var storage = await chrome.storage.local.get([cacheKey, cacheTimeKey]);
  var cached = storage[cacheKey];
  var lastFetch = storage[cacheTimeKey];
  var now = Date.now();

  if (cached && lastFetch && (now - lastFetch) < CACHE_DURATION_MS) {
    return cached;
  }

  try {
    var examples = await fetchSupabaseExamples(category);
    var toStore = {};
    toStore[cacheKey] = examples;
    toStore[cacheTimeKey] = now;
    await chrome.storage.local.set(toStore);
    return examples;
  } catch (err) {
    console.log('[PostPilot] Supabase fetch failed, using cache:', err.message);
    return cached || [];
  }
}

async function getExamplesForCategory(category) {
  var examples = await getCachedOrFetchExamples(category);
  if (examples.length === 0) {
    // Fallback: fetch all examples if none for this category
    examples = await getCachedOrFetchExamples(null);
  }
  // Limit to 5 examples max to avoid prompt bloat
  return examples.slice(0, 5);
}
