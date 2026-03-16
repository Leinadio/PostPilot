// --- Supabase Configuration ---
// Replace these with your Supabase project values
var SUPABASE_URL = 'https://ohlyepvbhflczyijlrqs.supabase.co';
var SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_yz475pIA7XJhlQV1s7lTYQ_wttTQUVn';

var SUPABASE_CACHE_KEY = 'supabase_examples';
var SUPABASE_CACHE_TIME_KEY = 'supabase_examples_last_fetch';
var CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

async function fetchSupabaseExamples() {
  var response = await fetch(SUPABASE_URL + '/rest/v1/comment_examples?select=text', {
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

async function getCachedOrFetchExamples() {
  var storage = await chrome.storage.local.get([SUPABASE_CACHE_KEY, SUPABASE_CACHE_TIME_KEY]);
  var cached = storage[SUPABASE_CACHE_KEY];
  var lastFetch = storage[SUPABASE_CACHE_TIME_KEY];
  var now = Date.now();

  if (cached && lastFetch && (now - lastFetch) < CACHE_DURATION_MS) {
    return cached;
  }

  try {
    var examples = await fetchSupabaseExamples();
    var toStore = {};
    toStore[SUPABASE_CACHE_KEY] = examples;
    toStore[SUPABASE_CACHE_TIME_KEY] = now;
    await chrome.storage.local.set(toStore);
    return examples;
  } catch (err) {
    console.log('[PostPilot] Supabase fetch failed, using cache:', err.message);
    return cached || [];
  }
}

async function getAllExamples() {
  var supabaseExamples = await getCachedOrFetchExamples();
  var storage = await chrome.storage.local.get(['comment_examples']);
  var userExamples = storage.comment_examples || [];
  console.log('[PostPilot] Supabase examples:', supabaseExamples.length, '| User examples:', userExamples.length, '| Total:', supabaseExamples.length + userExamples.length);
  return supabaseExamples.concat(userExamples);
}
