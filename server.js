const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const port = Number(process.env.PORT) || 3000;
const adminToken = process.env.ADMIN_TOKEN || 'troque-esta-chave';
const publicDirectory = __dirname;
const dataDirectory = path.join(__dirname, 'data');
const dataFile = path.join(dataDirectory, 'championship.json');

function readData() {
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

function writeData(data) {
  const temporaryFile = `${dataFile}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(data, null, 2));
  fs.renameSync(temporaryFile, dataFile);
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function isAuthorized(request) {
  const providedToken = request.headers['x-admin-token'];
  return typeof providedToken === 'string' && providedToken.length === adminToken.length && crypto.timingSafeEqual(Buffer.from(providedToken), Buffer.from(adminToken));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('JSON inválido')); }
    });
    request.on('error', reject);
  });
}

function normalizeCategory(input, current, index) {
  const name = String(input.name || '').trim();
  if (!name) throw new Error('O nome do evento é obrigatório.');
  return {
    id: current?.id || input.id || `evento-${Date.now()}`,
    name,
    icon: current?.icon || input.icon || String(index + 1).padStart(2, '0'),
    red: Math.max(0, Number(input.red) || 0),
    blue: Math.max(0, Number(input.blue) || 0),
    status: input.status === 'finished' ? 'finished' : 'ongoing',
    label: input.status === 'finished' ? 'Finalizada' : 'Em andamento',
    note: String(input.note || 'Resultado atualizado pela organização.').trim()
  };
}

async function handleApi(request, response, url) {
  if (request.method === 'GET' && url.pathname === '/api/championship') return sendJson(response, 200, readData());
  if (request.method === 'POST' && url.pathname === '/api/admin/login') {
    const body = await readBody(request);
    return sendJson(response, body.token === adminToken ? 200 : 401, { authenticated: body.token === adminToken });
  }
  if (!isAuthorized(request)) return sendJson(response, 401, { error: 'Chave administrativa inválida.' });

  const data = readData();
  if (request.method === 'POST' && url.pathname === '/api/categories') {
    const category = normalizeCategory(await readBody(request), null, data.categories.length);
    data.categories.push(category); writeData(data); return sendJson(response, 201, category);
  }
  if (request.method === 'PUT' && url.pathname.startsWith('/api/categories/')) {
    const id = decodeURIComponent(url.pathname.split('/').pop());
    const index = data.categories.findIndex((category) => category.id === id);
    if (index < 0) return sendJson(response, 404, { error: 'Evento não encontrado.' });
    data.categories[index] = normalizeCategory(await readBody(request), data.categories[index], index);
    writeData(data); return sendJson(response, 200, data.categories[index]);
  }
  if (request.method === 'DELETE' && url.pathname.startsWith('/api/categories/')) {
    const id = decodeURIComponent(url.pathname.split('/').pop());
    const nextCategories = data.categories.filter((category) => category.id !== id);
    if (nextCategories.length === data.categories.length) return sendJson(response, 404, { error: 'Evento não encontrado.' });
    data.categories = nextCategories; writeData(data); return sendJson(response, 204, null);
  }
  if (request.method === 'POST' && url.pathname === '/api/admin/reset') {
    const initialData = JSON.parse(fs.readFileSync(path.join(dataDirectory, 'championship.initial.json'), 'utf8'));
    writeData(initialData); return sendJson(response, 200, initialData);
  }
  return sendJson(response, 404, { error: 'Rota não encontrada.' });
}

function serveStatic(response, url) {
  const requestedPath = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = path.normalize(path.join(publicDirectory, requestedPath));
  if (!filePath.startsWith(publicDirectory) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return sendJson(response, 404, { error: 'Página não encontrada.' });
  const contentTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };
  response.writeHead(200, { 'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(response);
}

if (!fs.existsSync(dataDirectory)) fs.mkdirSync(dataDirectory);
if (!fs.existsSync(dataFile)) fs.copyFileSync(path.join(dataDirectory, 'championship.initial.json'), dataFile);

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) await handleApi(request, response, url);
    else if (request.method === 'GET') serveStatic(response, url);
    else sendJson(response, 405, { error: 'Método não permitido.' });
  } catch (error) {
    sendJson(response, error.message === 'JSON inválido' ? 400 : 500, { error: error.message });
  }
});

server.listen(port, () => console.log(`Interclasses disponível em http://localhost:${port}`));