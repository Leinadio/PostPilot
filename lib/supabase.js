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
