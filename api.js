const crypto = require('node:crypto');
const { getStore } = require('@netlify/blobs');

const initialData = require('../../data/championship.initial.json');
let dataStore;

function getDataStore() {
  if (!dataStore) dataStore = getStore({ name: 'interclasses', consistency: 'strong' });
  return dataStore;
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: body === null ? '' : JSON.stringify(body)
  };
}

function isAuthorized(event) {
  const expectedToken = process.env.ADMIN_TOKEN || '';
  const providedToken = event.headers['x-admin-token'] || event.headers['X-Admin-Token'] || '';
  return Boolean(expectedToken) && providedToken.length === expectedToken.length && crypto.timingSafeEqual(Buffer.from(providedToken), Buffer.from(expectedToken));
}

async function readData() {
  return (await getDataStore().get('championship', { type: 'json' })) || structuredClone(initialData);
}

async function writeData(data) {
  await getDataStore().setJSON('championship', data);
  return data;
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

exports.handler = async (event) => {
  const route = event.path.replace(/^\/\.netlify\/functions\/api/, '').replace(/^\/api/, '').replace(/\/$/, '') || '/championship';
  try {
    if (event.httpMethod === 'GET' && route === '/championship') return json(200, await readData());
    if (event.httpMethod === 'POST' && route === '/admin/login') {
      const body = JSON.parse(event.body || '{}');
      return json(body.token === process.env.ADMIN_TOKEN ? 200 : 401, { authenticated: body.token === process.env.ADMIN_TOKEN });
    }
    if (!isAuthorized(event)) return json(401, { error: 'Chave administrativa inválida.' });

    const data = await readData();
    if (event.httpMethod === 'POST' && route === '/categories') {
      const category = normalizeCategory(JSON.parse(event.body || '{}'), null, data.categories.length);
      data.categories.push(category);
      await writeData(data);
      return json(201, category);
    }
    if (route.startsWith('/categories/')) {
      const id = decodeURIComponent(route.split('/').pop());
      const index = data.categories.findIndex((category) => category.id === id);
      if (index < 0) return json(404, { error: 'Evento não encontrado.' });
      if (event.httpMethod === 'PUT') {
        data.categories[index] = normalizeCategory(JSON.parse(event.body || '{}'), data.categories[index], index);
        await writeData(data);
        return json(200, data.categories[index]);
      }
      if (event.httpMethod === 'DELETE') {
        data.categories = data.categories.filter((category) => category.id !== id);
        await writeData(data);
        return json(204, null);
      }
    }
    if (event.httpMethod === 'POST' && route === '/admin/reset') return json(200, await writeData(structuredClone(initialData)));
    return json(404, { error: 'Rota não encontrada.' });
  } catch (error) {
    return json(error instanceof SyntaxError ? 400 : 500, { error: error.message });
  }
};