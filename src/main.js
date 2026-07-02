const API = 'https://api.open5e.com';
const CATEGORIES = [
  { key: 'spells', label: 'Spells', endpoint: 'spells', icon: '✦', filters: [{ key: 'level', label: 'Level', options: ['All', 'Cantrip', '1', '2', '3', '4', '5', '6', '7', '8', '9'] }, { key: 'school', label: 'School', options: ['All', 'Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation'] }] },
  { key: 'backgrounds', label: 'Backgrounds', endpoint: 'backgrounds', icon: '◈' },
  { key: 'races', label: 'Races', endpoint: 'races', icon: '☽' },
  { key: 'classes', label: 'Classes', endpoint: 'classes', icon: '⚜' },
  { key: 'feats', label: 'Feats', endpoint: 'feats', icon: '✧' },
  { key: 'weapons', label: 'Weapons', endpoint: 'weapons', icon: '⚔' },
  { key: 'armor', label: 'Armor', endpoint: 'armor', icon: '⬟' },
  { key: 'magicitems', label: 'Magic Items', endpoint: 'magicitems', icon: '✺' },
];
const state = { items: [], active: 'spells', selected: null, query: '', filters: {}, loading: true, error: '' };
const app = document.querySelector('#app');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}
function plain(value) {
  if (Array.isArray(value)) return value.map(plain).join('\n');
  if (value && typeof value === 'object') return Object.entries(value).map(([key, val]) => `${key}: ${plain(val)}`).join('\n');
  return String(value ?? '');
}
function normalizeItem(item, category) {
  return { ...item, category: category.key, categoryLabel: category.label, title: item.name || item.document__title || 'Untitled', subtitle: [item.level !== undefined ? (item.level === 0 ? 'Cantrip' : `Level ${item.level}`) : null, item.school, item.type, item.rarity, item.subtype].filter(Boolean).join(' • '), body: item.desc || item.description || item.traits || item.text || item.feature || item.effects_desc || '' };
}
function currentCategory() { return CATEGORIES.find((category) => category.key === state.active); }
function filteredItems() {
  return state.items.filter((item) => {
    if (item.category !== state.active) return false;
    if (state.filters.level && state.filters.level !== 'All') {
      const level = state.filters.level === 'Cantrip' ? 0 : Number(state.filters.level);
      if (item.level !== level) return false;
    }
    if (state.filters.school && state.filters.school !== 'All' && item.school !== state.filters.school) return false;
    return true;
  });
}
function suggestions() {
  const query = state.query.trim().toLowerCase();
  if (!query) return [];
  return state.items.filter((item) => `${item.title} ${item.subtitle} ${item.categoryLabel}`.toLowerCase().includes(query)).slice(0, 12);
}
function detailHtml() {
  const item = state.selected;
  if (!item) return '<div class="empty"><div class="empty-icon">☰</div><h2>Choose an entry</h2><p>Browse categories or use the search dropdown to instantly jump to spells, races, equipment, feats, classes, and backgrounds.</p></div>';
  const hidden = new Set(['slug', 'name', 'title', 'subtitle', 'body', 'category', 'categoryLabel', 'document__slug', 'document__url']);
  const stats = Object.entries(item).filter(([key, value]) => !hidden.has(key) && value !== null && value !== '' && value !== undefined && !String(key).startsWith('document__')).slice(0, 12).map(([key, value]) => `<div class="stat"><b>${escapeHtml(key.replaceAll('_', ' '))}</b><span>${escapeHtml(plain(value))}</span></div>`).join('');
  return `<article class="detail-card"><div class="detail-top"><span>${escapeHtml(item.categoryLabel)}</span>${item.subtitle ? `<span>${escapeHtml(item.subtitle)}</span>` : ''}</div><h2>${escapeHtml(item.title)}</h2>${item.body ? `<p class="lead">${escapeHtml(plain(item.body))}</p>` : ''}<div class="stat-grid">${stats}</div></article>`;
}
function render() {
  const category = currentCategory();
  const list = filteredItems();
  app.innerHTML = `<main><section class="hero"><div class="brand"><div class="logo">☉</div><span>Open D&D Library</span></div><h1>A faster, cleaner rules reference for your table.</h1><p>Explore open 5e content with polished cards, responsive layouts, and instant client-side search.</p><div class="search-shell"><span class="search-icon">⌕</span><input id="search" value="${escapeHtml(state.query)}" placeholder="Search spells, races, items, feats..." aria-label="Search compendium" autocomplete="off" />${state.query ? '<button class="clear" id="clearSearch" aria-label="Clear search">×</button>' : ''}${suggestions().length ? `<div class="suggestions">${suggestions().map((item, index) => `<button data-pick="${index}"><b>${escapeHtml(item.title)}</b><span>${escapeHtml(item.categoryLabel)}${item.subtitle ? ` • ${escapeHtml(item.subtitle)}` : ''}</span></button>`).join('')}</div>` : ''}</div></section>${state.error ? `<div class="notice">${escapeHtml(state.error)}</div>` : ''}<nav class="tabs" aria-label="Compendium categories">${CATEGORIES.map((cat) => `<button data-tab="${cat.key}" class="${state.active === cat.key ? 'active' : ''}"><span>${cat.icon}</span>${cat.label}</button>`).join('')}</nav><section class="workspace"><aside class="list-panel"><div class="panel-head"><h2>${category.label}</h2><span>${state.loading ? 'Loading…' : `${list.length} entries`}</span></div>${(category.filters || []).map((filter) => `<div class="filter"><label>${filter.label}</label><select data-filter="${filter.key}">${filter.options.map((option) => `<option ${((state.filters[filter.key] || 'All') === option) ? 'selected' : ''}>${option}</option>`).join('')}</select></div>`).join('')}<div class="entry-list">${list.map((item, index) => `<button data-entry="${index}" class="${state.selected?.title === item.title && state.selected?.category === item.category ? 'selected' : ''}"><b>${escapeHtml(item.title)}</b>${item.subtitle ? `<span>${escapeHtml(item.subtitle)}</span>` : ''}</button>`).join('')}</div></aside>${detailHtml()}</section></main>`;
  bindEvents(list, suggestions());
}
function bindEvents(list, found) {
  const search = document.querySelector('#search');
  search?.addEventListener('input', (event) => { state.query = event.target.value; render(); document.querySelector('#search')?.focus(); });
  document.querySelector('#clearSearch')?.addEventListener('click', () => { state.query = ''; render(); });
  document.querySelectorAll('[data-pick]').forEach((button) => button.addEventListener('mousedown', () => { const item = found[Number(button.dataset.pick)]; state.selected = item; state.active = item.category; state.query = ''; render(); }));
  document.querySelectorAll('[data-tab]').forEach((button) => button.addEventListener('click', () => { state.active = button.dataset.tab; render(); }));
  document.querySelectorAll('[data-filter]').forEach((select) => select.addEventListener('change', () => { state.filters[select.dataset.filter] = select.value; render(); }));
  document.querySelectorAll('[data-entry]').forEach((button) => button.addEventListener('click', () => { state.selected = list[Number(button.dataset.entry)]; render(); }));
}
async function loadAll() {
  render();
  try {
    const batches = await Promise.all(CATEGORIES.map(async (category) => {
      const response = await fetch(`${API}/${category.endpoint}/?limit=1000`);
      if (!response.ok) throw new Error(`Could not load ${category.label}`);
      const data = await response.json();
      return (data.results || []).map((item) => normalizeItem(item, category));
    }));
    state.items = batches.flat().sort((a, b) => a.title.localeCompare(b.title));
    state.selected = state.items.find((item) => item.category === 'spells') || state.items[0];
  } catch (error) {
    state.error = `${error.message}. Check your connection and try refreshing.`;
  } finally {
    state.loading = false;
    render();
  }
}
loadAll();
