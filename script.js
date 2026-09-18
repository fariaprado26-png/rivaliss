let championshipData;
let selectedCategory;
let activeFilter = 'all';

const $ = (selector) => document.querySelector(selector);
const categoryById = (id) => championshipData.categories.find((category) => category.id === id);

function getTotals() {
  return championshipData.categories.reduce((totals, category) => ({
    red: totals.red + category.red,
    blue: totals.blue + category.blue
  }), { red: 0, blue: 0 });
}

function getWins() {
  return championshipData.categories.reduce((wins, category) => {
    if (category.red > category.blue) wins.red += 1;
    if (category.blue > category.red) wins.blue += 1;
    if (category.red === category.blue) wins.draw += 1;
    return wins;
  }, { red: 0, blue: 0, draw: 0 });
}

function renderOverview() {
  const totals = getTotals();
  const wins = getWins();
  $('#redTotal').textContent = totals.red;
  $('#blueTotal').textContent = totals.blue;
  $('#redWins').textContent = wins.red;
  $('#blueWins').textContent = wins.blue;
  $('#drawCount').textContent = wins.draw;
  const difference = Math.abs(totals.red - totals.blue);
  const leader = totals.red === totals.blue ? 'EMPATE NO PLACAR' : `${totals.red > totals.blue ? 'VERMELHO' : 'AZUL'} NA FRENTE`;
  $('#leadership').innerHTML = totals.red === totals.blue ? '<span class="leader-arrow">=</span> EMPATE NO PLACAR' : `<span class="leader-arrow">▲</span> ${leader} <b>+${difference}</b>`;
}

function renderChart() {
  const maxScore = Math.max(...championshipData.categories.flatMap((category) => [category.red, category.blue]));
  $('#chart').innerHTML = championshipData.categories.map((category, index) => `
    <div class="chart-column" style="animation-delay: ${index * 50}ms">
      <div class="chart-bars">
        <div class="chart-bar red" style="height: ${(category.red / maxScore) * 100}%" data-score="${category.red}" title="Vermelho: ${category.red}"></div>
        <div class="chart-bar blue" style="height: ${(category.blue / maxScore) * 100}%" data-score="${category.blue}" title="Azul: ${category.blue}"></div>
      </div>
      <span class="chart-label">${category.name}</span>
    </div>`).join('');
}

function renderCategories() {
  const visibleCategories = championshipData.categories.filter((category) => activeFilter === 'all' || category.status === activeFilter);
  $('#categoryList').innerHTML = visibleCategories.map((category, index) => `
    <article class="category-card ${category.id === selectedCategory ? 'selected' : ''}" data-category="${category.id}" style="animation-delay: ${index * 55}ms">
      <span class="category-index">${category.icon}</span>
      <div class="category-info"><strong>${category.name}</strong><small>${category.status === 'ongoing' ? 'Acontecendo agora' : 'Pontuação oficial'}</small></div>
      <div class="mini-score"><span class="red">${category.red}</span><small>VM</small><span class="blue">${category.blue}</span><small>AZ</small><b class="status-badge ${category.status === 'finished' ? (category.red === category.blue ? 'draw' : 'done') : ''}">${category.label}</b></div>
    </article>`).join('');
  document.querySelectorAll('.category-card').forEach((card) => card.addEventListener('click', () => {
    selectedCategory = card.dataset.category;
    renderCategories();
    renderDetails();
  }));
}

function renderDetails() {
  const category = categoryById(selectedCategory);
  if (!category) {
    $('#detailPanel').innerHTML = '<p class="detail-note">Nenhum evento cadastrado.</p>';
    return;
  }
  const total = category.red + category.blue || 1;
  const redWidth = (category.red / total) * 100;
  $('#detailPanel').innerHTML = `
    <p class="eyebrow">DETALHE DA CATEGORIA</p><h3>${category.name}</h3>
    <div class="detail-meta"><span>${category.status === 'ongoing' ? 'Em disputa' : 'Resultado oficial'}</span><span>Categoria ${category.icon}</span></div>
    <div class="detail-score"><div><strong class="red">${category.red}</strong><span>VERMELHO</span></div><span class="vs">VS</span><div><strong class="blue">${category.blue}</strong><span>AZUL</span></div></div>
    <div class="detail-progress"><span class="red-fill" style="width: ${redWidth}%"></span><span class="blue-fill" style="width: ${100 - redWidth}%"></span></div>
    <p class="detail-note">${category.note}</p>`;
}

async function initializePublicScoreboard() {
  try {
    championshipData = await getChampionshipData();
    selectedCategory = championshipData.categories[0]?.id;
    document.querySelectorAll('.filter-button').forEach((button) => button.addEventListener('click', () => {
      activeFilter = button.dataset.filter;
      document.querySelectorAll('.filter-button').forEach((item) => item.classList.toggle('active', item === button));
      renderCategories();
    }));
    renderOverview(); renderChart(); renderCategories(); renderDetails();
  } catch (error) {
    document.querySelector('main').innerHTML = `<p class="detail-note">${error.message} Inicie o servidor para acessar o placar.</p>`;
  }
}

initializePublicScoreboard();