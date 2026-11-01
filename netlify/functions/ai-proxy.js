/**
 * DailyVet AI Proxy — Vercel Serverless Function
 * Same contract as Netlify: POST /api/ai-proxy
 * Body: { provider, model, body, keyIndex? }
 */
/* XOR-obfuscated fallbacks — env vars preferred when set */
const _S = 90;
function _dk(a) {
  let o = '', i = 0, n = a.length;
  for (; i < n; i++) o += String.fromCharCode(a[i] ^ (_S + (i % 7)));
  return o;
}
function _envOr(arr, prefix, n) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    const e = process.env[prefix + '_' + i];
    if (e) out.push(e);
    else if (arr[i - 1]) out.push(_dk(arr[i - 1]));
  }
  return out.filter(Boolean);
}
const _G_ENC = [
    [27,10,114,28,60,103,50,20,109,22,62,42,27,80,31,106,55,42,9,10,8,27,111,106,24,11,23,6,44,29,17,52,8,105,80,11,33,4,10,22,30,19,20,53,50,45,54,59,33,53,52,31,42],
    [27,10,114,28,60,103,50,20,109,21,46,8,45,81,35,54,108,44,20,51,4,104,108,51,54,11,45,82,111,10,18,39,56,109,17,10,54,15,54,24,61,22,110,53,106,106,115,24,13,24,16,6,28],
    [27,10,114,28,60,103,50,20,109,23,27,111,60,36,53,30,18,22,49,27,4,106,60,26,58,16,110,51,43,51,47,101,19,27,43,55,110,26,42,22,21,54,18,57,4,39,31,105,25,62,30,40,28],
    [27,10,114,28,60,103,50,20,109,16,110,53,17,19,25,62,38,59,103,14,38,22,108,36,47,63,41,17,10,106,22,104,21,38,8,25,14,111,19,46,50,43,27,44,24,27,20,22,89,0,4,58,28],
    [27,10,114,28,60,103,50,20,109,16,41,38,8,84,35,51,55,14,22,60,12,8,99,104,12,1,104,55,62,46,59,108,29,10,45,23,110,110,105,49,18,83,35,33,36,39,102,109,12,53,33,31,42],
    [27,10,114,28,60,103,50,20,109,22,62,52,26,33,34,24,27,111,18,38,44,3,53,107,62,41,22,63,57,40,52,106,115,5,15,49,41,50,60,49,104,19,27,22,45,110,14,53,43,46,20,50,12],
    [27,10,114,28,60,103,50,20,109,16,25,6,13,26,108,111,36,4,11,62,5,30,21,109,2,4,42,52,46,63,101,112,48,108,14,119,21,52,50,38,103,53,111,42,111,48,51,11,7,10,57,48,42],
    [27,10,114,28,60,103,50,20,109,16,50,61,106,24,41,28,100,63,111,10,45,43,111,27,14,36,106,63,0,118,110,108,103,16,51,0,57,6,22,39,29,80,104,12,101,25,109,6,19,50,11,110,58],
    [27,10,114,28,60,103,50,20,109,16,12,43,51,33,50,54,41,30,115,26,33,17,30,3,57,25,111,56,15,22,38,63,53,109,46,98,56,54,20,29,21,37,28,107,10,50,52,0,44,3,21,107,12],
    [27,10,114,28,60,103,50,20,109,23,10,108,24,54,34,42,44,57,43,12,22,48,106,55,112,109,12,1,106,21,14,36,54,5,34,28,106,53,36,1,23,51,54,2,48,101,109,106,52,25,15,47,42],
    [27,10,114,28,60,103,50,20,109,23,20,57,48,26,104,31,23,106,55,53,83,32,51,11,31,23,11,40,53,57,55,31,19,23,56,61,98,22,52,42,103,13,107,51,15,107,9,30,18,40,24,15,58],
    [27,10,114,28,60,103,50,20,109,21,11,25,56,10,18,19,48,18,22,54,23,56,33,59,104,51,24,6,12,15,44,12,9,44,49,16,48,53,43,26,106,14,107,20,104,106,23,11,12,47,52,16,42],
    [27,10,114,28,60,103,50,20,109,22,56,29,23,19,44,1,25,112,103,54,4,28,56,13,47,4,44,53,111,45,42,112,105,105,51,8,16,37,15,103,30,52,16,1,106,51,50,27,88,35,42,31,28],
    [27,10,114,28,60,103,50,20,109,16,27,9,17,43,34,1,36,30,38,58,36,29,56,110,4,26,102,21,99,8,50,12,47,40,49,53,23,44,17,16,106,53,48,41,42,54,50,8,21,15,63,101,58],
    [27,10,114,28,60,103,50,20,109,16,5,40,114,37,106,62,45,23,15,107,14,54,58,13,26,38,109,57,14,2,41,31,110,109,2,43,30,111,110,1,43,49,55,106,62,54,36,43,80,104,51,4,28],
    [27,10,114,28,60,103,50,20,109,23,112,57,105,19,43,9,42,9,50,44,83,104,104,59,41,11,5,6,43,111,38,100,54,28,80,119,41,36,41,108,23,7,41,14,27,21,109,18,41,105,20,40,58],
    [27,10,114,28,60,103,50,20,109,21,10,14,5,42,61,4,111,63,47,48,85,27,3,42,10,58,53,8,49,3,3,19,103,37,85,45,40,10,12,103,41,13,12,17,104,54,59,43,40,42,12,6,28],
    [27,10,114,28,60,103,50,20,109,22,11,103,6,53,27,108,3,104,31,43,46,99,28,19,11,27,105,4,111,42,25,48,57,56,1,15,31,4,47,109,37,20,3,30,57,46,40,12,40,27,2,17,12],
    [27,10,114,28,60,103,50,20,109,21,31,115,57,34,104,43,13,63,105,27,4,48,53,18,46,56,12,86,46,58,13,106,108,5,19,99,22,30,40,36,45,46,42,60,23,42,53,7,47,43,31,37,42],
    [27,10,114,28,60,103,50,20,109,23,59,29,0,48,48,44,4,63,28,25,25,9,110,113,2,51,102,77,15,104,4,43,18,114,4,49,19,109,51,6,47,25,13,118,40,23,28,106,47,43,9,48,42],
    [27,10,114,28,60,103,50,20,109,23,59,25,61,18,9,23,44,55,106,47,14,108,55,20,58,21,50,44,61,58,44,41,48,13,85,51,22,10,28,28,18,81,12,31,36,44,22,60,26,30,17,4,42]
];
const _R_ENC = [
    [61,40,55,2,53,56,7,17,14,23,60,42,5,58,11,19,5,47,63,57,56,9,3,10,10,25,59,25,56,104,26,4,7,7,2,108,15,23,7,39,59,50,10,53,24,27,21,28,46,110,61,30,31,13,55,15],
    [61,40,55,2,51,50,12,98,63,8,110,11,110,14,42,108,49,43,18,104,83,61,21,107,10,25,59,25,56,104,26,4,53,48,48,53,8,41,48,43,21,38,48,29,44,28,18,6,38,32,30,56,23,28,24,49],
    [61,40,55,2,6,29,23,49,25,54,46,111,28,13,3,17,63,50,57,102,82,29,99,111,10,25,59,25,56,104,26,4,25,47,48,49,58,20,28,53,25,45,107,25,105,5,8,105,3,56,22,27,5,106,58,13],
    [61,40,55,2,108,52,38,35,98,14,14,17,57,22,63,25,25,111,9,44,50,31,30,53,10,25,59,25,56,104,26,4,24,60,26,19,21,6,59,48,43,33,104,43,55,37,16,40,88,3,104,8,59,47,50,5],
    [61,40,55,2,107,37,49,22,33,37,15,108,60,2,29,62,62,36,106,19,47,53,110,59,10,25,59,25,56,104,26,4,26,51,55,50,24,104,37,10,20,43,59,47,18,104,29,17,51,27,51,107,46,38,6,9]
];
const _O_ENC = [
    [41,48,113,50,44,114,22,107,118,100,101,102,111,81,99,107,101,101,104,104,86,104,98,57,60,58,102,4,62,105,110,105,104,110,87,99,58,57,56,56,110,84,57,62,56,56,111,61,80,60,63,100,63,104,61,4,107,104,57,57,106,111,86,111,110,107,104,59,62,5,60,108,101],
    [41,48,113,50,44,114,22,107,118,104,57,110,57,1,111,104,111,100,63,61,85,59,107,107,105,103,59,83,56,99,57,108,108,58,85,111,111,63,106,59,61,86,104,106,63,62,109,60,82,56,110,62,101,110,60,89,110,105,108,100,60,108,84,56,99,58,110,104,60,5,107,62,106],
    [41,48,113,50,44,114,22,107,118,57,60,60,107,80,107,106,104,105,105,60,2,110,111,56,111,111,104,2,109,61,108,111,102,107,83,111,98,56,104,63,107,87,99,99,100,56,109,110,6,108,57,106,110,58,102,84,110,62,58,63,61,109,84,62,61,57,59,104,103,3,110,62,63]
];
const KEYS = {
  gemini: _envOr(_G_ENC, 'GEMINI_KEY', 21),
  groq: _envOr(_R_ENC, 'GROQ_KEY', 5),
  openrouter: _envOr(_O_ENC, 'OPENROUTER_KEY', 3),
};

const ENDPOINTS = {
  gemini: (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
  groq: () => 'https://api.groq.com/openai/v1/chat/completions',
  openrouter: () => 'https://openrouter.ai/api/v1/chat/completions'
};

function pickKey(provider, preferredIndex) {
  const list = KEYS[provider] || [];
  if (!list.length) return null;
  const idx = (typeof preferredIndex === 'number' && preferredIndex >= 0)
    ? preferredIndex % list.length
    : Math.floor(Math.random() * list.length);
  return { key: list[idx], index: idx };
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
}


exports.handler = async function (event, context) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let payload;
  try {
    payload = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body || {});
  } catch (e) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { provider, model, body, keyIndex } = payload;

  if (!provider || !model || !body) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'provider, model, body required' }) };
  }
  if (!['gemini', 'groq', 'openrouter'].includes(provider)) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Invalid provider' }) };
  }

  const picked = pickKey(provider, keyIndex);
  if (!picked) {
    return { statusCode: 503, headers: cors, body: JSON.stringify({ error: 'No keys configured for ' + provider }) };
  }

  let url;
  const headers = { 'Content-Type': 'application/json' };

  if (provider === 'gemini') {
    url = ENDPOINTS.gemini(model) + '?key=' + encodeURIComponent(picked.key);
  } else if (provider === 'groq') {
    url = ENDPOINTS.groq();
    headers['Authorization'] = 'Bearer ' + picked.key;
  } else {
    url = ENDPOINTS.openrouter();
    headers['Authorization'] = 'Bearer ' + picked.key;
    headers['HTTP-Referer'] = 'https://dailyvet.app';
    headers['X-Title'] = 'DailyVet';
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const upstream = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(timeout);

    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    return {
      statusCode: upstream.status,
      headers: Object.assign({}, cors, { 'X-Key-Index': String(picked.index) }),
      body: JSON.stringify(data)
    };
  } catch (err) {
    const isAbort = err.name === 'AbortError';
    return {
      statusCode: isAbort ? 504 : 502,
      headers: cors,
      body: JSON.stringify({
        error: isAbort ? 'Upstream timeout' : (err.message || 'Proxy error')
      })
    };
  }
};
