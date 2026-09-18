let championshipData;
const $ = (selector) => document.querySelector(selector);

function totals() {
  return championshipData.categories.reduce((result, category) => ({ red: result.red + category.red, blue: result.blue + category.blue }), { red: 0, blue: 0 });
}

function renderSummary() {
  const result = totals();
  $('#adminTotal').textContent = championshipData.categories.length;
  $('#adminRedTotal').textContent = result.red;
  $('#adminBlueTotal').textContent = result.blue;
  const leader = result.red === result.blue ? 'Placar empatado' : `${result.red > result.blue ? 'Vermelho' : 'Azul'} lidera por ${Math.abs(result.red - result.blue)} ponto${Math.abs(result.red - result.blue) === 1 ? '' : 's'}`;
  $('#adminLeader').textContent = leader;
}

function renderEvents() {
  $('#adminEvents').innerHTML = championshipData.categories.map((category, index) => `
    <article class="admin-event ${category.status === 'ongoing' ? 'is-live' : ''}">
      <span class="event-index">${category.icon}</span><div class="event-copy"><strong>${category.name}</strong><small>${category.status === 'ongoing' ? 'Em andamento' : 'Finalizada'} · ${category.note || 'Sem observação'}</small></div>
      <div class="event-score"><b class="red-score">${category.red}</b><span>×</span><b class="blue-score">${category.blue}</b></div>
      <button class="edit-event" type="button" data-id="${category.id}" aria-label="Editar ${category.name}">Editar <span>↗</span></button>
      <button class="delete-event" type="button" data-id="${category.id}" aria-label="Excluir ${category.name}">×</button>
    </article>`).join('');
  document.querySelectorAll('.edit-event').forEach((button) => button.addEventListener('click', () => loadEvent(button.dataset.id)));
  document.querySelectorAll('.delete-event').forEach((button) => button.addEventListener('click', () => deleteEvent(button.dataset.id)));
}

function loadEvent(id) {
  const category = championshipData.categories.find((item) => item.id === id);
  if (!category) return;
  $('#eventId').value = category.id;
  $('#eventName').value = category.name;
  $('#eventRed').value = category.red;
  $('#eventBlue').value = category.blue;
  $('#eventStatus').value = category.status;
  $('#eventNote').value = category.note || '';
  $('#formTitle').textContent = 'Editar evento';
  $('#formNumber').textContent = category.icon;
  document.querySelector('.admin-editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function clearForm() {
  $('#eventForm').reset();
  $('#eventId').value = '';
  $('#formTitle').textContent = 'Novo evento';
  $('#formNumber').textContent = String(championshipData.categories.length + 1).padStart(2, '0');
  $('#formFeedback').textContent = '';
}

function deleteEvent(id) {
  const category = championshipData.categories.find((item) => item.id === id);
  if (!category || !window.confirm(`Excluir o evento ${category.name}?`)) return;
  adminRequest(`/api/categories/${encodeURIComponent(id)}`, { method: 'DELETE' }).then(() => {
    championshipData.categories = championshipData.categories.filter((item) => item.id !== id);
    renderSummary(); renderEvents(); clearForm();
  }).catch((error) => { $('#formFeedback').textContent = error.message; });
}

$('#eventForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const id = $('#eventId').value || `evento-${Date.now()}`;
  const existing = championshipData.categories.find((category) => category.id === id);
  const category = { id, name: $('#eventName').value.trim(), icon: existing?.icon || String(championshipData.categories.length + 1).padStart(2, '0'), red: Number($('#eventRed').value) || 0, blue: Number($('#eventBlue').value) || 0, status: $('#eventStatus').value, label: $('#eventStatus').value === 'ongoing' ? 'Em andamento' : 'Finalizada', note: $('#eventNote').value.trim() || 'Resultado atualizado pela organização.' };
  const request = existing ? adminRequest(`/api/categories/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(category) }) : adminRequest('/api/categories', { method: 'POST', body: JSON.stringify(category) });
  request.then((savedCategory) => {
    if (existing) Object.assign(existing, savedCategory); else championshipData.categories.push(savedCategory);
    renderSummary(); renderEvents(); clearForm();
    $('#formFeedback').textContent = 'Evento salvo. O placar público já está atualizado.';
  }).catch((error) => { $('#formFeedback').textContent = error.message; });
});

$('#cancelEdit').addEventListener('click', clearForm);
$('#resetData').addEventListener('click', () => {
  if (!window.confirm('Restaurar os dados iniciais do campeonato?')) return;
  adminRequest('/api/admin/reset', { method: 'POST' }).then((data) => {
    championshipData = data; renderSummary(); renderEvents(); clearForm();
  }).catch((error) => { $('#formFeedback').textContent = error.message; });
});

async function initializeAdmin() {
  try {
    championshipData = await getChampionshipData();
    renderSummary(); renderEvents(); clearForm();
  } catch (error) {
    $('#formFeedback').textContent = error.message;
  }
}

$('#adminToken').value = sessionStorage.getItem('interclasses-admin-token') || '';
$('#connectAdmin').addEventListener('click', async () => {
  const token = $('#adminToken').value.trim();
  try {
    const response = await fetch(`${apiBaseUrl}/api/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
    if (!response.ok) throw new Error('Chave inválida.');
    sessionStorage.setItem('interclasses-admin-token', token);
    $('#authStatus').textContent = 'Conectado. Edição liberada';
    $('#authStatus').classList.add('connected');
  } catch (error) { $('#authStatus').textContent = error.message; $('#authStatus').classList.remove('connected'); }
});

if (sessionStorage.getItem('interclasses-admin-token')) { $('#authStatus').textContent = 'Chave salva nesta sessão'; }
initializeAdmin();