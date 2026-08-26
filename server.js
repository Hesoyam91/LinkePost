const http = require('node:http');

const PORT = Number(process.env.PORT || 8787);
const LLAMA_API_URL = process.env.LLAMA_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
const LLAMA_API_KEY = process.env.LLAMA_API_KEY;
const LLAMA_MODEL = process.env.LLAMA_MODEL || 'llama-3.1-8b-instant';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*').split(',').map(value => value.trim());
const MAX_REQUESTS_PER_HOUR = Number(process.env.MAX_REQUESTS_PER_HOUR || 30);
const requestLog = new Map();

const SYSTEM_PROMPT = `Eres LinkePost, un generador de publicaciones profesionales para LinkedIn.
Devuelve únicamente el texto final de la publicación, sin prefacios, títulos ni explicaciones.
Convierte la idea del usuario en una publicación humana, concreta y conversacional.
Usa un gancho inicial, párrafos breves, una lección o reflexión útil y una pregunta final.
No inventes datos, logros, cifras ni experiencias que no aparezcan en la idea.
Evita clichés, lenguaje corporativo vacío y más de dos emojis. Usa como máximo tres hashtags relevantes.`;

function sendJSON(response, statusCode, payload, origin) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  });
  response.end(JSON.stringify(payload));
}

function getClientKey(request) {
  return request.headers['x-forwarded-for']?.split(',')[0].trim() || request.socket.remoteAddress || 'unknown';
}

function isRateLimited(clientKey) {
  const now = Date.now();
  const hourAgo = now - 60 * 60 * 1000;
  const recentRequests = (requestLog.get(clientKey) || []).filter(timestamp => timestamp > hourAgo);
  recentRequests.push(now);
  requestLog.set(clientKey, recentRequests);
  return recentRequests.length > MAX_REQUESTS_PER_HOUR;
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', chunk => {
      body += chunk;
      if (body.length > 10000) request.destroy(new Error('Payload demasiado grande'));
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

async function generatePost(promptInput) {
  const providerResponse = await fetch(LLAMA_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LLAMA_API_KEY}`
    },
    body: JSON.stringify({
      model: LLAMA_MODEL,
      temperature: 0.85,
      max_tokens: 650,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: promptInput }
      ]
    })
  });

  const data = await providerResponse.json().catch(() => ({}));
  if (!providerResponse.ok) {
    throw new Error(data.error?.message || `Proveedor Llama respondió con ${providerResponse.status}`);
  }

  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('El proveedor Llama no devolvió texto');
  return text;
}

const server = http.createServer(async (request, response) => {
  const origin = request.headers.origin || '*';
  const allowedOrigin = ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin) ? origin : 'null';

  if (request.method === 'OPTIONS') {
    sendJSON(response, 204, {}, allowedOrigin);
    return;
  }

  if (request.method === 'GET' && request.url === '/health') {
    sendJSON(response, 200, { ok: true, model: LLAMA_MODEL }, allowedOrigin);
    return;
  }

  if (request.method !== 'POST' || request.url !== '/generate') {
    sendJSON(response, 404, { error: 'Ruta no encontrada' }, allowedOrigin);
    return;
  }

  if (!LLAMA_API_KEY) {
    sendJSON(response, 503, { error: 'El backend no tiene configurada la credencial del proveedor' }, allowedOrigin);
    return;
  }

  if (isRateLimited(getClientKey(request))) {
    sendJSON(response, 429, { error: 'Límite temporal de generaciones alcanzado. Inténtalo más tarde.' }, allowedOrigin);
    return;
  }

  try {
    const body = JSON.parse(await readBody(request));
    const promptInput = typeof body.promptInput === 'string' ? body.promptInput.trim() : '';
    if (!promptInput || promptInput.length > 4000) {
      sendJSON(response, 400, { error: 'La idea debe tener entre 1 y 4000 caracteres' }, allowedOrigin);
      return;
    }

    const text = await generatePost(promptInput);
    sendJSON(response, 200, { text }, allowedOrigin);
  } catch (error) {
    sendJSON(response, 500, { error: error.message || 'Error interno del backend' }, allowedOrigin);
  }
});

server.listen(PORT, () => {
  console.log(`LinkePost backend escuchando en http://localhost:${PORT}`);
});
