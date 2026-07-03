const SHEET_ID = '1FvMqrnt5MnwbhKFfjVkT7HFT3fC8yKnyvrQnPtjxrPQ';
const SHEET_BASE = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
const CORS_PROXY = 'https://corsproxy.io/?';

const CATEGORIES = [
  { key: 'spells', label: 'Spells', gid: '7929475', icon: '✦', skipRows: 1, proxied: true, filters: [{ key: 'magicClass', label: 'Magic Class', options: ['All', 'arcane', 'oath', 'mystic', 'occult'] }, { key: 'level', label: 'Level', options: ['All', 'Cantrip', '1', '2', '3', '4', '5', '6'] }] },
  { key: 'backgrounds', label: 'Backgrounds', gid: '782758810', icon: '◈', skipRows: 1 },
  { key: 'races', label: 'Playable Races', gid: '1936715235', icon: '☽', skipRows: 1 },
  { key: 'weapons', label: 'Weapons', gid: '0', icon: '⚔', skipRows: 2, proxied: true, filters: [{ key: 'weaponGroup', label: 'Group', options: ['All'] }, { key: 'weaponCategory', label: 'Category', options: ['All', 'simple', 'martial'] }] },
];

const state = { items: [], active: 'spells', selected: null, query: '', filters: {}, loading: true, error: '' };
const app = document.querySelector('#app');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') { cell += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((cells) => cells.some((value) => value.trim()));
}

function sheetUrl(category) {
  const url = `${SHEET_BASE}&gid=${category.gid}&_v=${Date.now()}`;
  return category.proxied ? `${CORS_PROXY}${encodeURIComponent(url)}` : url;
}

function notationToHtml(text) {
  return escapeHtml(text).replaceAll('|', '<br>').replaceAll('[', '<ul><li>').replaceAll(';', '</li><li>').replaceAll(']', '</li></ul>');
}

function cleanCommas(value) {
  return value.split(',').map((part) => part.trim()).filter(Boolean).join(', ');
}

function normalizeRow(row, category) {
  if (category.key === 'spells') {
    const [magicClass = '', level = '', name = '', type = '', casting = '', components = '', range = '', duration = '', effect = '', higherLevel = '', passive = '', upgrades = '', creatures = ''] = row;
    return { category: category.key, categoryLabel: category.label, title: name, subtitle: [level === '0' ? 'Cantrip' : `Level ${level}`, magicClass, type].filter(Boolean).join(' • '), body: effect, magicClass, level: Number(level), type, casting, components, range, duration, higherLevel, passive, upgrades, creatures };
  }
  if (category.key === 'backgrounds') {
    const [name = '', proficiencies = '', description = ''] = row;
    return { category: category.key, categoryLabel: category.label, title: name, subtitle: proficiencies, body: description, proficiencies };
  }
  if (category.key === 'races') {
    const [name = '', types = '', description = '', attributeBonus = '', size = '', speed = '', traits = '', proficiencies = ''] = row;
    return { category: category.key, categoryLabel: category.label, title: name, subtitle: [types, size].filter(Boolean).join(' • '), body: description, types, attributeBonus, size, speed, traits, proficiencies };
  }
  const [weaponCategory = '', weaponGroup = '', name = '', damage = '', generalProperties = '', miscProperties = '', attackManeuvers = '', tacticalManeuvers = '', critProperties = ''] = row;
  return { category: category.key, categoryLabel: category.label, title: name, subtitle: [weaponCategory, weaponGroup, damage].filter(Boolean).join(' • '), body: '', weaponCategory, weaponGroup, damage, generalProperties: cleanCommas(generalProperties), miscProperties: cleanCommas(miscProperties), attackManeuvers, tacticalManeuvers, critProperties };
}

function currentCategory() { return CATEGORIES.find((category) => category.key === state.active); }
function categoryItems() { return state.items.filter((item) => item.category === state.active); }
function dynamicOptions(key) { return ['All', ...new Set(categoryItems().map((item) => item[key]).filter(Boolean).sort())]; }
function filteredItems() {
  return categoryItems().filter((item) => {
    if (state.filters.level && state.filters.level !== 'All') {
      const level = state.filters.level === 'Cantrip' ? 0 : Number(state.filters.level);
      if (item.level !== level) return false;
    }
    for (const key of ['magicClass', 'weaponGroup', 'weaponCategory']) {
      if (state.filters[key] && state.filters[key] !== 'All' && item[key] !== state.filters[key]) return false;
    }
    return true;
  });
}
function suggestions() {
  const query = state.query.trim().toLowerCase();
  if (!query) return [];
  return state.items.filter((item) => `${item.title} ${item.subtitle} ${item.categoryLabel} ${item.body}`.toLowerCase().includes(query)).slice(0, 12);
}
function detailHtml() {
  const item = state.selected;
  if (!item) return '<div class="empty"><div class="empty-icon">☰</div><h2>Choose an entry</h2><p>Browse sheet-powered spells, backgrounds, playable races, and weapons, or use search to jump straight to an entry.</p></div>';
  const hidden = new Set(['title', 'subtitle', 'body', 'category', 'categoryLabel']);
  const stats = Object.entries(item).filter(([key, value]) => !hidden.has(key) && value !== null && value !== '' && value !== undefined).map(([key, value]) => `<div class="stat"><b>${escapeHtml(key.replace(/([A-Z])/g, ' $1'))}</b><span>${notationToHtml(value)}</span></div>`).join('');
  return `<article class="detail-card"><div class="detail-top"><span>${escapeHtml(item.categoryLabel)}</span>${item.subtitle ? `<span>${escapeHtml(item.subtitle)}</span>` : ''}</div><h2>${escapeHtml(item.title)}</h2>${item.body ? `<p class="lead">${notationToHtml(item.body)}</p>` : ''}<div class="stat-grid">${stats}</div></article>`;
}
function render() {
  const category = currentCategory();
  const list = filteredItems();
  app.innerHTML = `<main><section class="hero"><div class="brand"><div class="logo">☉</div><span>Open D&D Library</span></div><h1>Your sheet-powered D&D reference.</h1><p>This app now loads the same public Google Sheet data used by the Open D&D reference site.</p><div class="search-shell"><span class="search-icon">⌕</span><input id="search" value="${escapeHtml(state.query)}" placeholder="Search spells, races, weapons, backgrounds..." aria-label="Search compendium" autocomplete="off" />${state.query ? '<button class="clear" id="clearSearch" aria-label="Clear search">×</button>' : ''}${suggestions().length ? `<div class="suggestions">${suggestions().map((item, index) => `<button data-pick="${index}"><b>${escapeHtml(item.title)}</b><span>${escapeHtml(item.categoryLabel)}${item.subtitle ? ` • ${escapeHtml(item.subtitle)}` : ''}</span></button>`).join('')}</div>` : ''}</div></section>${state.error ? `<div class="notice">${escapeHtml(state.error)}</div>` : ''}<nav class="tabs" aria-label="Compendium categories">${CATEGORIES.map((cat) => `<button data-tab="${cat.key}" class="${state.active === cat.key ? 'active' : ''}"><span>${cat.icon}</span>${cat.label}</button>`).join('')}</nav><section class="workspace"><aside class="list-panel"><div class="panel-head"><h2>${category.label}</h2><span>${state.loading ? 'Loading…' : `${list.length} entries`}</span></div>${(category.filters || []).map((filter) => { const options = filter.options.length > 1 ? filter.options : dynamicOptions(filter.key); return `<div class="filter"><label>${filter.label}</label><select data-filter="${filter.key}">${options.map((option) => `<option ${((state.filters[filter.key] || 'All') === option) ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}</select></div>`; }).join('')}<div class="entry-list">${list.map((item, index) => `<button data-entry="${index}" class="${state.selected?.title === item.title && state.selected?.category === item.category ? 'selected' : ''}"><b>${escapeHtml(item.title)}</b>${item.subtitle ? `<span>${escapeHtml(item.subtitle)}</span>` : ''}</button>`).join('')}</div></aside>${detailHtml()}</section></main>`;
  bindEvents(list, suggestions());
}
function bindEvents(list, found) {
  document.querySelector('#search')?.addEventListener('input', (event) => { state.query = event.target.value; render(); document.querySelector('#search')?.focus(); });
  document.querySelector('#clearSearch')?.addEventListener('click', () => { state.query = ''; render(); });
  document.querySelectorAll('[data-pick]').forEach((button) => button.addEventListener('mousedown', () => { const item = found[Number(button.dataset.pick)]; state.selected = item; state.active = item.category; state.query = ''; render(); }));
  document.querySelectorAll('[data-tab]').forEach((button) => button.addEventListener('click', () => { state.active = button.dataset.tab; state.selected = categoryItems()[0] || state.selected; render(); }));
  document.querySelectorAll('[data-filter]').forEach((select) => select.addEventListener('change', () => { state.filters[select.dataset.filter] = select.value; render(); }));
  document.querySelectorAll('[data-entry]').forEach((button) => button.addEventListener('click', () => { state.selected = list[Number(button.dataset.entry)]; render(); }));
}
async function loadAll() {
  render();
  try {
    const batches = await Promise.all(CATEGORIES.map(async (category) => {
      const response = await fetch(sheetUrl(category), { cache: 'no-store' });
      if (!response.ok) throw new Error(`Could not load ${category.label}`);
      const rows = parseCSV(await response.text()).slice(category.skipRows);
      return rows.map((row) => normalizeRow(row, category)).filter((item) => item.title);
    }));
    state.items = batches.flat().sort((a, b) => a.title.localeCompare(b.title));
    state.selected = state.items.find((item) => item.category === 'spells') || state.items[0];
  } catch (error) {
    state.error = `${error.message}. Check that the public Google Sheet is reachable and try refreshing.`;
  } finally {
    state.loading = false;
    render();
  }
}
loadAll();
