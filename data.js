const apiBaseUrl = window.location.protocol === 'file:' ? 'http://localhost:3000' : '';

async function getChampionshipData() {
  let response;
  try {
    response = await fetch(`${apiBaseUrl}/api/championship`);
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Confira se a Function do Netlify foi publicada.');
  }
  if (!response.ok) throw new Error(`A API do placar respondeu com erro ${response.status}. Confira as Functions e as variáveis do Netlify.`);
  return response.json();
}

async function adminRequest(url, options = {}) {
  const token = sessionStorage.getItem('interclasses-admin-token');
  const response = await fetch(`${apiBaseUrl}${url}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token || '', ...(options.headers || {}) }
  });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(body?.error || 'Erro na comunicação com o servidor.');
  return body;
}