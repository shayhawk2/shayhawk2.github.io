/* There and Snack Again: recipe box, cook mode, tonight picker, grocery list, pantry.
   Recipes come from recipes.json (the master copy in the repo).
   Everything personal (favorites, ratings, notes, lists, drafts) lives in this device's localStorage. */
(() => {
'use strict';

const KEY = 'tasa:v1';
const AISLES = ['Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Bakery', 'Pantry', 'Spices', 'Frozen', 'Other'];
const TYPES = [['Main', 'Mains'], ['Side', 'Sides'], ['Appetizer', 'Appetizers'], ['Sauce & Condiment', 'Sauces & Condiments'], ['Building Block', 'Building Blocks'], ['Dessert', 'Desserts'], ['Drink', 'Drinks']];
const SHELVES = [['cuisines', 'Cuisines'], ['meals', 'Meals & Occasions'], ['collections', 'Collections']];
const DEFAULTS = { theme: 'light', units: 'us', favs: [], ratings: {}, again: {}, notes: {}, grocery: [], pantry: [], drafts: [], rail: false };
const METRIC = { cup: [240, 'ml'], tbsp: [15, 'ml'], tsp: [5, 'ml'], 'fl oz': [30, 'ml'], pt: [473, 'ml'], qt: [946, 'ml'], gal: [3785, 'ml'], oz: [28.35, 'g'], lb: [453.6, 'g'] };
const PLURAL = new Set(['cup', 'clove', 'can', 'slice', 'piece', 'pinch', 'stick', 'bunch', 'sprig']);
const UNIT_ALIASES = { cups: 'cup', c: 'cup', tablespoon: 'tbsp', tablespoons: 'tbsp', tbsps: 'tbsp', tbs: 'tbsp', teaspoon: 'tsp', teaspoons: 'tsp', tsps: 'tsp', ounce: 'oz', ounces: 'oz', pound: 'lb', pounds: 'lb', lbs: 'lb', cloves: 'clove', cans: 'can', slices: 'slice', pieces: 'piece', sticks: 'stick', pint: 'pt', pints: 'pt', quart: 'qt', quarts: 'qt', gallon: 'gal', gallons: 'gal', grams: 'g', gram: 'g', liter: 'L', liters: 'L', l: 'L' };
const UNITS = ['cup', 'tbsp', 'tsp', 'fl oz', 'oz', 'lb', 'pt', 'qt', 'gal', 'clove', 'can', 'slice', 'piece', 'pinch', 'stick', 'bunch', 'sprig', 'g', 'kg', 'ml', 'L'];
const AISLE_GUESS = [
  ['Frozen', /frozen/],
  ['Spices', /salt|black pepper|cumin|paprika|oregano|powder|flakes|seasoning|cinnamon|nutmeg|thyme|bay lea|vanilla/],
  ['Meat & Seafood', /beef|chicken|pork|sausage|bacon|turkey|steak|ham\b|fish|salmon|shrimp|brisket|ribs/],
  ['Dairy & Eggs', /milk|cheese|butter|egg|cream|yogurt|parmesan|mozzarella|cheddar|ricotta/],
  ['Bakery', /bread|bun|tortilla|roll|bagel|pita/],
  ['Produce', /onion|garlic|tomato\b|tomatoes|lettuce|cilantro|parsley|lemon|lime|pepper|potato|carrot|basil|avocado|celery|spinach|mushroom|apple|banana|berr|ginger|scallion|cucumber|zucchini|broccoli|corn\b/],
  ['Pantry', /flour|sugar|oil|rice|pasta|crumb|panko|sauce|broth|stock|vinegar|bean|paste|honey|syrup|shell|noodle|oat|nut|chip|cracker|canned|mustard|ketchup|mayo/]
];

const GENERIC = new Set(['fresh', 'freshly', 'large', 'small', 'medium', 'ground', 'dried', 'whole', 'kosher', 'black', 'white', 'yellow', 'sweet', 'unsalted', 'sodium', 'extra', 'virgin', 'grated', 'chopped', 'minced', 'sliced', 'boneless', 'skinless', 'size', 'style', 'optional', 'soft', 'crisp', 'baby', 'plain', 'lite', 'lean', 'mild', 'aged', 'pure', 'coarse', 'mesh', 'leaves', 'neutral', 'double', 'concentrated', 'imported', 'stale', 'raw', 'thick', 'slices', 'with', 'from', 'pieces']);
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'recipe';

let S = load();
let DATA = { categories: [], recipes: [] };
const V = { serv: {}, tab: {}, checked: {}, timers: [], q: '', tonight: { max: 0, cat: '', kid: false, again: false }, cook: null, sheet: false, autoRead: false, pick: null };

function load() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...DEFAULTS }; }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { toast('Could not save on this device. Storage may be full or blocked.'); }
}

/* ---------- data helpers ---------- */
function norm(r) {
  return { tags: [], equipment: [], ingredients: [], ...r, steps: (r.steps || []).map(s => typeof s === 'string' ? { text: s } : s) };
}
function all() {
  const drafts = new Map(S.drafts.map(r => [r.id, r]));
  const ids = new Set(DATA.recipes.map(r => r.id));
  const out = DATA.recipes.map(r => drafts.has(r.id) ? { ...drafts.get(r.id), _draft: true } : r);
  S.drafts.forEach(r => { if (!ids.has(r.id)) out.push({ ...r, _draft: true }); });
  return out.map(norm).sort((a, b) => a.title.localeCompare(b.title));
}
const byId = id => all().find(r => r.id === id);
const total = r => (r.prep || 0) + (r.cook || 0);
const catName = id => (DATA.categories.find(c => c.id === id) || {}).name || 'Uncategorized';
const mins = m => m >= 60 ? `${Math.floor(m / 60)} hr${m % 60 ? ' ' + (m % 60) + ' min' : ''}` : `${m} min`;

function fracStr(n) {
  const w = Math.floor(n + 1e-9), f = n - w;
  const opts = [[0, ''], [.125, '⅛'], [.25, '¼'], [.333, '⅓'], [.5, '½'], [.667, '⅔'], [.75, '¾'], [1, '']];
  let best = opts[0];
  for (const o of opts) if (Math.abs(o[0] - f) < Math.abs(best[0] - f)) best = o;
  const whole = w + (best[0] === 1 ? 1 : 0);
  return ((whole || '') + best[1]) || '⅛';
}
function qtyUnit(g, f = 1) {
  let u = g.unit || '';
  if (g.qty == null) return { q: '', u };
  let q = g.qty * f;
  if (S.units === 'metric' && METRIC[u]) {
    q *= METRIC[u][0]; u = METRIC[u][1];
    if (q >= 1000) return { q: String(+(q / 1000).toFixed(2)), u: u === 'ml' ? 'L' : 'kg' };
    return { q: String(q >= 20 ? Math.round(q / 5) * 5 : Math.max(1, Math.round(q))), u };
  }
  if (['g', 'kg', 'ml', 'L'].includes(u)) return { q: String(+q.toFixed(1)), u };
  return { q: fracStr(q), u: PLURAL.has(u) && q > 1 ? u + 's' : u };
}
function ingHTML(g, f = 1) {
  const { q, u } = qtyUnit(g, f);
  const amt = [q, u].filter(Boolean).join(' ');
  return `${amt ? `<b>${esc(amt)}</b> ` : ''}${esc(g.item)}${g.note ? `<span class="note">, ${esc(g.note)}</span>` : ''}`;
}
function ingPlain(g, f = 1) {
  const { q, u } = qtyUnit(g, f);
  return [q, u, g.item].filter(Boolean).join(' ') + (g.note ? `, ${g.note}` : '');
}
function stepText(t) {
  if (S.units !== 'metric') return t;
  return t.replace(/(\d{2,3})\s*°\s*F/g, (_, f) => `${Math.round((f - 32) * 5 / 9 / 5) * 5}°C`);
}
function stepUses(r, st) {
  if (Array.isArray(st.uses)) return st.uses;
  const t = st.text.toLowerCase();
  const stem = w => w.endsWith('oes') ? w.slice(0, -2) : w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w;
  return r.ingredients.map((g, i) => i).filter(i =>
    r.ingredients[i].item.toLowerCase().split(/[^a-z]+/).filter(w => w.length > 3 && !GENERIC.has(w)).some(w => t.includes(stem(w))));
}
function findTimers(text) {
  const out = [], re = /(\d+)(?:\s*(?:-|–|to)\s*(\d+))?\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b/gi;
  let m;
  while ((m = re.exec(text))) {
    const n = +(m[2] || m[1]), unit = m[3][0].toLowerCase();
    out.push({ label: `${n} ${unit === 'h' ? 'hr' : unit === 'm' ? 'min' : 'sec'}`, secs: n * (unit === 'h' ? 3600 : unit === 'm' ? 60 : 1) });
  }
  return out;
}
function guessAisle(item) {
  const t = item.toLowerCase();
  for (const [a, re] of AISLE_GUESS) if (re.test(t)) return a;
  return 'Other';
}
function parseQty(s) {
  return s.trim().split(/\s+/).reduce((sum, p) => {
    const [a, b] = p.split('/');
    return sum + (b ? a / b : +a);
  }, 0);
}
function parseIng(line) {
  const uni = { '¼': ' 1/4', '½': ' 1/2', '¾': ' 3/4', '⅓': ' 1/3', '⅔': ' 2/3', '⅛': ' 1/8' };
  line = line.replace(/[¼½¾⅓⅔⅛]/g, c => uni[c]).trim().replace(/^[-•*]\s*/, '');
  const m = line.match(/^((?:\d+\s+)?\d+\/\d+|\d+(?:\.\d+)?)?\s*(.*)$/);
  const qty = m[1] ? +parseQty(m[1]).toFixed(3) : null;
  let rest = m[2], unit = '';
  const um = rest.match(/^(fl\.? oz|[a-zA-Z]+)\.?\s+(.+)$/);
  if (um) {
    const raw = um[1].toLowerCase().replace('.', '');
    const u = UNIT_ALIASES[raw] || (raw === 'l' ? 'L' : raw);
    if (UNITS.includes(u)) { unit = u; rest = um[2].replace(/^of\s+/i, ''); }
  }
  const [item, ...note] = rest.split(',');
  const g = { qty, unit, item: item.trim(), aisle: guessAisle(item) };
  if (note.length) g.note = note.join(',').trim();
  return g;
}
const pantryHas = item => S.pantry.find(p => p.status !== 'out' && (item.toLowerCase().includes(p.item.toLowerCase()) || p.item.toLowerCase().includes(item.toLowerCase())));
function pantryMatch(r) {
  if (!S.pantry.length || !r.ingredients.length) return null;
  return Math.round(100 * r.ingredients.filter(g => pantryHas(g.item)).length / r.ingredients.length);
}

/* ---------- small UI helpers ---------- */
let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600);
}
function applyTheme() {
  document.documentElement.dataset.theme = S.theme;
  const dark = S.theme === 'dark';
  $('#themeIcon').textContent = $('#topTheme').textContent = dark ? '☀️' : '🌙';
  $('#themeLabel').textContent = dark ? 'Light mode' : 'Dark mode';
  $('meta[name="theme-color"]').content = dark ? '#1D1814' : '#FBF4E4';
  $('#app').classList.toggle('rail', !!S.rail);
  $('#railIcon').textContent = S.rail ? '⇥' : '⇤';
}
function updateBadge() {
  const n = S.grocery.filter(g => !g.done).length, b = $('#listBadge');
  b.hidden = !n; b.textContent = n;
}
async function shareOrCopy(title, text, url) {
  try {
    if (navigator.share) { await navigator.share(url ? { title, url } : { title, text }); return; }
  } catch (e) { if (e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(url || text); toast('Copied'); }
  catch { toast('Sharing is not available in this browser.'); }
}
async function exportFile(name, text) {
  const file = new File([text], name, { type: 'application/json' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return; }
  } catch (e) { if (e.name === 'AbortError') return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file); a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const enc = o => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const dec = s => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))));

/* ---------- views ---------- */
const head = (title, back = '#/') => `<div class="page-head"><a class="back" href="${back}" aria-label="Back">←</a><h1>${esc(title)}</h1></div>`;
const starsText = id => S.ratings[id] ? '★'.repeat(S.ratings[id]) : '';

function rowHTML(r) {
  const pm = pantryMatch(r);
  return `<a class="rrow" href="#/r/${esc(r.id)}">
    <span class="blob">${esc(r.emoji || '🍴')}</span>
    <span><h3>${esc(r.title)}</h3>
      <span class="meta">
        ${total(r) ? `<span>${mins(total(r))}</span>` : ''}
        <span>serves ${esc(r.servings || '?')}</span>
        ${starsText(r.id) ? `<span style="color:var(--mustard)">${starsText(r.id)}</span>` : ''}
        ${S.favs.includes(r.id) ? '<span>❤️</span>' : ''}
        ${r.kid ? '<span class="pill sage">kid-approved</span>' : ''}
        ${r._draft ? '<span class="pill">my draft</span>' : ''}
        ${r.placeholder ? '<span class="pill red">stand-in</span>' : ''}
        ${pm != null && location.hash.startsWith('#/tonight') ? `<span class="pill">${pm}% in pantry</span>` : ''}
      </span></span></a>`;
}
const rowsHTML = (list, emptyMsg) => list.length
  ? `<div class="rows">${list.map(rowHTML).join('')}</div>`
  : `<div class="empty"><span class="big">🗺️</span>${emptyMsg}</div>`;

function searchList(q) {
  q = q.toLowerCase().trim();
  return all().filter(r => [r.title, catName(r.category), ...(r.tags || []), ...(r.equipment || []), ...r.ingredients.map(g => g.item)].join(' ').toLowerCase().includes(q));
}
function homeBody() {
  if (V.q.trim()) return rowsHTML(searchList(V.q), `No recipes match “${esc(V.q)}”. Try an ingredient or a tag.`);
  const rs = all();
  const tile = t => `<a class="tile" href="${t.href}"><span class="tile-emoji">${t.e}</span><span class="tile-name">${esc(t.n)}</span><span class="tile-count">${t.k} ${t.k === 1 ? 'recipe' : 'recipes'}</span></a>`;
  const known = new Set(SHELVES.map(s => s[0]));
  const tiles = DATA.categories.map(c => ({ shelf: known.has(c.shelf) ? c.shelf : 'cuisines', href: `#/c/${c.id}`, e: c.emoji, n: c.name, k: rs.filter(r => r.category === c.id).length }));
  tiles.push({ shelf: 'collections', href: '#/c/kids', e: '⭐', n: 'Kid-approved', k: rs.filter(r => r.kid).length });
  tiles.push({ shelf: 'collections', href: '#/c/again', e: '🔁', n: 'Make again', k: rs.filter(r => S.again[r.id]).length });
  tiles.push({ shelf: 'collections', href: '#/c/all', e: '📚', n: 'Everything', k: rs.length });
  return SHELVES.map(([id, name]) => {
    const list = tiles.filter(t => t.shelf === id);
    return list.length ? `<section class="shelf"><h2 class="shelf-name">${name}</h2><div class="tiles">${list.map(tile).join('')}</div></section>` : '';
  }).join('');
}
function viewHome() {
  return `<div class="hero">
      <h1><span>There and</span> <span class="snack">Snack</span> <span>Again</span></h1>
      <p class="tag">a cook's tale</p>
      <div class="search"><input type="search" data-in="search" value="${esc(V.q)}" placeholder="Search recipes, ingredients, tags" aria-label="Search recipes"></div>
    </div>
    <hr class="trail">
    <div id="homeBody">${homeBody()}</div>`;
}
function viewCat(id) {
  const rs = all();
  const special = { all: ['Everything', rs], kids: ['Kid-approved', rs.filter(r => r.kid)], again: ['Make again', rs.filter(r => S.again[r.id])] };
  const [title, list] = special[id] || [catName(id), rs.filter(r => r.category === id)];
  if (special[id] || !list.length) return head(title) + rowsHTML(list, `Nothing filed here yet. <a href="#/add">Add a recipe</a>.`);
  const groups = [...TYPES, ['', 'Not sorted yet']].map(([t, label]) => {
    const rows = list.filter(r => t ? r.type === t : !TYPES.some(x => x[0] === r.type));
    return rows.length ? `<h2 class="group-name">${label} <span class="group-count">${rows.length}</span></h2>${rowsHTML(rows)}` : '';
  }).join('');
  return head(title) + groups;
}
function viewFavs() {
  return head('Favorites') + rowsHTML(all().filter(r => S.favs.includes(r.id)), 'No favorites yet. Tap the heart on a recipe to keep it here.');
}

function usesHTML(r, st, f) {
  const uses = stepUses(r, st), timers = findTimers(st.text);
  if (!uses.length && !timers.length) return '';
  return `<div class="uses">${uses.map(i => r.ingredients[i] ? `<span class="chip">${ingHTML(r.ingredients[i], f)}</span>` : '').join('')}
    ${timers.map(t => `<button class="chip timer-chip" data-act="timer" data-secs="${t.secs}" data-label="${esc(t.label)}">⏱ ${esc(t.label)}</button>`).join('')}</div>`;
}
function ingListHTML(r, f) {
  const ck = V.checked[r.id] || (V.checked[r.id] = {});
  return `<ul class="ruled">${r.ingredients.map((g, i) => `<li><label><input type="checkbox" data-in="check" data-id="${esc(r.id)}" data-i="${i}" ${ck[i] ? 'checked' : ''}><span>${ingHTML(g, f)}</span></label></li>`).join('')}</ul>`;
}
function viewRecipe(id) {
  const r = byId(id);
  if (!r) return head('Not found') + `<div class="empty"><span class="big">🧭</span>That recipe is not in the book. <a href="#/">Back to recipes</a>.</div>`;
  const serv = V.serv[id] || r.servings || 1, f = serv / (r.servings || 1);
  const tab = V.tab[id] || 'ing', rating = S.ratings[id] || 0, n = r.nutrition;
  return `<div class="page-head no-print">
      <a class="back" href="#/c/${esc(r.category || 'all')}" aria-label="Back">←</a><span style="flex:1"></span>
      <button class="icon-btn" data-act="fav" data-id="${esc(id)}" aria-label="Favorite" aria-pressed="${S.favs.includes(id)}">${S.favs.includes(id) ? '❤️' : '🤍'}</button>
      <button class="icon-btn" data-act="shareRecipe" data-id="${esc(id)}" aria-label="Share recipe">📤</button>
      <a class="icon-btn" style="display:grid;place-items:center;text-decoration:none" href="#/edit/${esc(id)}" aria-label="Edit recipe">✏️</a>
    </div>
    <article class="card index">
      <div class="rhead"><span class="blob">${esc(r.emoji || '🍴')}</span>
        <div><h1>${esc(r.title)}</h1>
        <div class="row" style="gap:6px;margin-top:6px">
          <span class="pill">${esc(catName(r.category))}</span>${r.type ? `<span class="pill">${esc(r.type)}</span>` : ''}
          ${r.kid ? '<span class="pill sage">kid-approved</span>' : ''}${r._draft ? '<span class="pill">my draft</span>' : ''}${r.placeholder ? '<span class="pill red">stand-in recipe</span>' : ''}
        </div></div></div>
      <hr class="redline">
      <div class="facts">
        ${r.prep ? `<span><b>Prep</b>${mins(r.prep)}</span>` : ''}${r.cook ? `<span><b>Cook</b>${mins(r.cook)}</span>` : ''}${total(r) ? `<span><b>Total</b>${mins(total(r))}</span>` : ''}
      </div>
      ${r.equipment.length ? `<div class="row" style="gap:6px;margin-top:10px">${r.equipment.map(e => `<span class="chip">🍳 ${esc(e)}</span>`).join('')}</div>` : ''}
      ${r.tags.length ? `<p class="muted small-text" style="margin:10px 0 0">${r.tags.map(t => '#' + esc(t)).join('  ')}</p>` : ''}
      ${n ? `<p class="small-text" style="margin:8px 0 0">Per serving, roughly: ${[['cal', ' cal'], ['protein', ' g protein'], ['carbs', ' g carbs'], ['fat', ' g fat']].filter(([k]) => n[k] != null).map(([k, l]) => `<b>${esc(n[k])}</b>${l}`).join(', ')}</p>` : ''}
      ${r.source && (r.source.name || r.source.url) ? `<p class="small-text" style="margin:8px 0 0">From ${r.source.url ? `<a href="${esc(r.source.url)}" target="_blank" rel="noopener">${esc(r.source.name || r.source.url)}</a>` : esc(r.source.name)}</p>` : ''}

      <div class="row spread no-print" style="margin-top:16px">
        <div class="stepper" role="group" aria-label="Servings">
          <button data-act="serv" data-id="${esc(id)}" data-d="-1" aria-label="Fewer servings">−</button>
          <span>Serves ${serv}</span>
          <button data-act="serv" data-id="${esc(id)}" data-d="1" aria-label="More servings">+</button>
        </div>
        <div class="seg" role="group" aria-label="Units">
          <button data-act="units" data-u="us" aria-pressed="${S.units === 'us'}">US</button>
          <button data-act="units" data-u="metric" aria-pressed="${S.units === 'metric'}">Metric</button>
        </div>
      </div>
      <div class="row no-print" style="margin-top:16px">
        <a class="btn primary" href="#/cook/${esc(id)}">👩‍🍳 Start cooking</a>
        <button class="btn" data-act="addToList" data-id="${esc(id)}">🧺 Add to grocery list</button>
      </div>

      <div class="tabs no-print" role="tablist">
        <button role="tab" aria-selected="${tab === 'ing'}" data-act="tab" data-id="${esc(id)}" data-t="ing">Ingredients</button>
        <button role="tab" aria-selected="${tab === 'steps'}" data-act="tab" data-id="${esc(id)}" data-t="steps">Steps</button>
      </div>
      <div style="padding-top:8px">
        ${tab === 'ing' ? ingListHTML(r, f)
          : `<ol class="steps">${r.steps.map(st => `<li>${esc(stepText(st.text))}${usesHTML(r, st, f)}</li>`).join('')}</ol>`}
      </div>
    </article>

    <section class="card">
      <div class="row spread"><h2>How was it?</h2>
        <div class="stars" role="group" aria-label="Rating">${[1, 2, 3, 4, 5].map(i => `<button class="${i <= rating ? 'on' : ''}" data-act="rate" data-id="${esc(id)}" data-n="${i}" aria-label="${i} star${i > 1 ? 's' : ''}">★</button>`).join('')}</div>
      </div>
      <div class="row" style="margin:10px 0 14px"><button class="chip" data-act="again" data-id="${esc(id)}" aria-pressed="${!!S.again[id]}">🔁 Make again</button></div>
      ${r.notes ? `<div class="sticky-note hand">${esc(r.notes)}</div>` : ''}
      <label class="field"><span>My notes and tweaks</span>
        <textarea class="hand" data-in="note" data-id="${esc(id)}" placeholder="Less salt next time, double the garlic…">${esc(S.notes[id] || '')}</textarea>
        <small>Saved on this device as you type.</small></label>
    </section>`;
}

function timersHTML() {
  return V.timers.length ? `<div class="timers">${V.timers.map(t => `<span class="timer${t.done ? ' done' : ''}" data-timer="${t.id}"><span>${fmtLeft(t)}</span><button data-act="timerX" data-tid="${t.id}" aria-label="Dismiss timer">✕</button></span>`).join('')}</div>` : '';
}
function fmtLeft(t) {
  if (t.done) return `${t.label} done`;
  const s = Math.max(0, Math.round((t.end - Date.now()) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
function viewCook(id) {
  const r = byId(id);
  if (!r) return viewRecipe(id);
  if (!V.cook || V.cook.id !== id) V.cook = { id, i: -1 };
  const i = V.cook.i, nSteps = r.steps.length;
  const f = (V.serv[id] || r.servings || 1) / (r.servings || 1);
  const st = r.steps[i];
  const body = i < 0
    ? `<div><div class="cook-count">Before you start</div><p class="cook-text" style="font-size:1.5rem">Gather everything for ${V.serv[id] || r.servings} servings.</p></div>${ingListHTML(r, f)}`
    : `<div><div class="muted small-text">${esc(r.title)}</div><div class="cook-count">Step ${i + 1} of ${nSteps}</div></div><p class="cook-text">${esc(stepText(st.text))}</p>${usesHTML(r, st, f)}`;
  return `<div class="cook">
    <div class="cook-top">
      <a class="icon-btn" style="display:grid;place-items:center;text-decoration:none" href="#/r/${esc(id)}" aria-label="Leave cook mode">✕</a>
      <span style="flex:1"></span>
      <button class="icon-btn" data-act="speak" aria-label="Read this step aloud">🔊</button>
      <button class="chip" data-act="autoRead" aria-pressed="${V.autoRead}">Read every step</button>
      <button class="icon-btn" data-act="sheet" aria-label="Show ingredients">🧾</button>
    </div>
    <div class="progress" aria-hidden="true">${r.steps.map((_, k) => `<i class="${k < i ? 'done' : k === i ? 'now' : ''}"></i>`).join('')}</div>
    <div id="timerBar">${timersHTML()}</div>
    <div class="cook-body">${body}</div>
    <div class="cook-nav">
      <button class="btn" data-act="cookGo" data-d="-1" ${i < 0 ? 'disabled style="opacity:.4"' : ''}>← Back</button>
      ${i < nSteps - 1 ? `<button class="btn primary" data-act="cookGo" data-d="1">${i < 0 ? 'Start step 1' : 'Next step'} →</button>`
        : `<a class="btn primary" href="#/r/${esc(id)}">Done. Time to eat 🍽️</a>`}
    </div>
    ${V.sheet ? `<div class="sheet"><div class="row spread"><h2>Ingredients</h2><button class="btn small" data-act="sheet">Close</button></div>${ingListHTML(r, f)}</div>` : ''}
  </div>`;
}

function tonightList() {
  const T = V.tonight;
  return all().filter(r => (!T.max || (total(r) && total(r) <= T.max)) && (!T.cat || r.category === T.cat) && (!T.kid || r.kid) && (!T.again || S.again[r.id]))
    .sort((a, b) => (pantryMatch(b) || 0) - (pantryMatch(a) || 0) || total(a) - total(b));
}
function viewTonight() {
  const T = V.tonight, list = tonightList();
  const chip = (on, act, attrs, label) => `<button class="chip" data-act="${act}" ${attrs} aria-pressed="${on}">${label}</button>`;
  return head('What sounds good tonight?') + `
    <div class="card">
      <p style="margin-bottom:6px"><b>How much time do you have?</b></p>
      <div class="row" style="gap:8px">${[[20, '20 min'], [30, '30 min'], [45, '45 min'], [60, '1 hour'], [0, 'No rush']].map(([m, l]) => chip(T.max === m, 'tMax', `data-m="${m}"`, l)).join('')}</div>
      <p style="margin:14px 0 6px"><b>What kind of meal?</b></p>
      <div class="row" style="gap:8px">${chip(!T.cat, 'tCat', 'data-c=""', 'Anything')}${DATA.categories.map(c => chip(T.cat === c.id, 'tCat', `data-c="${esc(c.id)}"`, `${c.emoji} ${esc(c.name)}`)).join('')}</div>
      <div class="row" style="gap:8px;margin-top:14px">${chip(T.kid, 'tFlag', 'data-k="kid"', '⭐ Kid-approved only')}${chip(T.again, 'tFlag', 'data-k="again"', '🔁 Make-again only')}</div>
      <div style="text-align:center;margin-top:18px">
        <div><span class="dice" id="dice">🎲</span></div>
        <button class="btn primary" data-act="pick" ${list.length ? '' : 'disabled style="opacity:.4"'}>Pick one for me</button>
      </div>
      ${V.pick && byId(V.pick) ? `<div style="margin-top:16px"><p class="hand" style="margin-bottom:6px">Tonight's adventure:</p>${rowHTML(byId(V.pick))}</div>` : ''}
    </div>
    <h2 style="margin-bottom:10px">${list.length} ${list.length === 1 ? 'recipe fits' : 'recipes fit'}</h2>
    ${rowsHTML(list, 'Nothing fits those filters. Loosen the time or the meal type.')}`;
}

function groceryText() {
  return AISLES.map(a => {
    const items = S.grocery.filter(g => g.aisle === a && !g.done);
    return items.length ? `${a}\n${items.map(g => '- ' + ingPlain(g)).join('\n')}` : '';
  }).filter(Boolean).join('\n\n');
}
function viewList() {
  const open = S.grocery.filter(g => !g.done).length;
  const groups = AISLES.map(a => {
    const items = S.grocery.filter(g => g.aisle === a);
    if (!items.length) return '';
    return `<div class="aisle">${esc(a)}</div><ul class="ruled">${items.map(g => `<li><label><input type="checkbox" data-in="gDone" data-gid="${esc(g.id)}" ${g.done ? 'checked' : ''}><span>${ingHTML(g)}${pantryHas(g.item) && !g.done ? ' <span class="pill sage">in pantry</span>' : ''}${g.from && g.from.length ? `<span class="note small-text"> (${esc(g.from.join(', '))})</span>` : ''}</span></label></li>`).join('')}</ul>`;
  }).join('');
  return head('Grocery list') + `
    <form class="addbar" data-form="gAdd"><input type="text" name="item" placeholder="Add an item, like 2 lb chicken thighs" aria-label="Add an item" autocomplete="off"><button class="btn primary">Add</button></form>
    ${S.grocery.length ? `<div class="row no-print" style="margin:10px 0">
        <button class="btn small" data-act="gShare">📤 Send list</button>
        <button class="btn small" data-act="gCopy">📋 Copy as text</button>
        <button class="btn small plain" data-act="gToPantry">Move checked to pantry</button>
        <button class="btn small plain" data-act="gClear">Clear checked</button>
      </div><p class="muted small-text">${open} left to get. “Send list” opens the share sheet, where you can pick Reminders or Messages.</p>
      <div class="card">${groups}</div>`
      : `<div class="empty"><span class="big">🧺</span>The basket is empty. Add items above, or open a recipe and tap “Add to grocery list”.</div>`}`;
}
function viewPantry() {
  const items = [...S.pantry].sort((a, b) => a.item.localeCompare(b.item));
  const label = { have: 'Have it', low: 'Running low', out: 'Out' };
  return head('Pantry') + `
    <form class="addbar" data-form="pAdd"><input type="text" name="item" placeholder="Add something you keep on hand" aria-label="Add a pantry item" autocomplete="off"><button class="btn primary">Add</button></form>
    <p class="muted small-text">Tap a status to change it. Recipes and the grocery list flag what you already have.</p>
    ${items.length ? `<div class="card">${items.map(p => `<div class="pantry-item"><span class="name">${esc(p.item)}</span>
        <button class="status ${p.status}" data-act="pCycle" data-item="${esc(p.item)}">${label[p.status]}</button>
        ${p.status !== 'have' ? `<button class="btn small plain" data-act="pToList" data-item="${esc(p.item)}">+ list</button>` : ''}
        <button class="x" data-act="pDel" data-item="${esc(p.item)}" aria-label="Remove ${esc(p.item)}">✕</button></div>`).join('')}</div>`
      : `<div class="empty"><span class="big">🫙</span>Nothing on the shelves yet. Start with the staples: olive oil, salt, garlic, eggs.</div>`}`;
}

function viewForm(id) {
  const r = id ? byId(id) : null;
  const v = r || { title: '', emoji: '', category: (DATA.categories[0] || {}).id, tags: [], equipment: [], ingredients: [], steps: [], servings: 4 };
  const ingLines = v.ingredients.map(g => [g.qty != null ? +(+g.qty).toFixed(3) : '', g.unit, g.item].filter(x => x !== '' && x != null).join(' ') + (g.note ? `, ${g.note}` : '')).join('\n');
  const n = v.nutrition || {};
  const f = (label, name, val, extra = '') => `<label class="field"><span>${label}</span><input type="text" name="${name}" value="${esc(val ?? '')}" ${extra}></label>`;
  return head(r ? 'Edit recipe' : 'Add a recipe', r ? `#/r/${esc(id)}` : '#/') + `
    <form class="card" data-form="recipe" data-id="${esc(id || '')}">
      ${f('Recipe name', 'title', v.title, 'required')}
      <div class="grid2">
        ${f('Emoji', 'emoji', v.emoji, 'placeholder="🍲" maxlength="8"')}
        <label class="field"><span>Category</span><select name="category">${DATA.categories.map(c => `<option value="${esc(c.id)}" ${v.category === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
        <label class="field"><span>Type</span><select name="type"><option value="">Not sorted yet</option>${TYPES.map(([t]) => `<option ${v.type === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
        ${f('Prep minutes', 'prep', v.prep, 'inputmode="numeric"')}
        ${f('Cook minutes', 'cook', v.cook, 'inputmode="numeric"')}
        ${f('Servings', 'servings', v.servings, 'inputmode="numeric"')}
      </div>
      <label class="field"><span>Ingredients</span><textarea name="ingredients" rows="8" placeholder="1 1/2 cup flour, sifted&#10;2 large eggs&#10;1 lb ground beef" required>${esc(ingLines)}</textarea><small>One per line: amount, unit, item, then a comma and any note.</small></label>
      <label class="field"><span>Steps</span><textarea name="steps" rows="8" placeholder="Heat the oven to 400°F.&#10;Bake for 20 minutes." required>${esc(v.steps.map(s => s.text).join('\n'))}</textarea><small>One per line. Times like “20 minutes” become timers in cook mode.</small></label>
      ${f('Tags', 'tags', v.tags.join(', '), 'placeholder="chicken, quick"')}
      ${f('Equipment', 'equipment', v.equipment.join(', '), 'placeholder="Grill, Instant Pot"')}
      <div class="grid2">${f('Source name', 'sname', v.source && v.source.name, 'placeholder="Cookbook p. 42"')}${f('Source link', 'surl', v.source && v.source.url, 'inputmode="url"')}</div>
      <div class="grid2">${f('Calories', 'cal', n.cal, 'inputmode="numeric"')}${f('Protein g', 'protein', n.protein, 'inputmode="numeric"')}${f('Carbs g', 'carbs', n.carbs, 'inputmode="numeric"')}${f('Fat g', 'fat', n.fat, 'inputmode="numeric"')}</div>
      <label class="row" style="margin-bottom:14px"><input type="checkbox" name="kid" ${v.kid ? 'checked' : ''} style="width:22px;height:22px"> Kid-approved</label>
      ${f('Recipe note', 'notes', v.notes)}
      <div class="row"><button class="btn primary">Save recipe</button>
        ${r && r._draft ? `<button type="button" class="btn plain" data-act="delDraft" data-id="${esc(id)}">${DATA.recipes.some(x => x.id === id) ? 'Undo my edits' : 'Delete draft'}</button>` : ''}</div>
      <p class="muted small-text" style="margin-top:12px">Saved on this device as a draft. Export drafts from Settings to add them to the shared recipe book.</p>
    </form>`;
}

function viewSettings() {
  return head('Settings') + `
    <div class="card"><h2>Look and units</h2>
      <div class="row" style="margin-top:10px">
        <div class="seg"><button data-act="setTheme" data-t="light" aria-pressed="${S.theme === 'light'}">☀️ Light</button><button data-act="setTheme" data-t="dark" aria-pressed="${S.theme === 'dark'}">🌙 Dark</button></div>
        <div class="seg"><button data-act="units" data-u="us" aria-pressed="${S.units === 'us'}">US</button><button data-act="units" data-u="metric" aria-pressed="${S.units === 'metric'}">Metric</button></div>
      </div></div>
    <div class="card"><h2>My drafts</h2>
      <p>${S.drafts.length} ${S.drafts.length === 1 ? 'recipe' : 'recipes'} added or edited on this device. Export them to merge into <code>recipes.json</code> in the repo, which makes them appear on every device.</p>
      <button class="btn" data-act="exportDrafts" ${S.drafts.length ? '' : 'disabled style="opacity:.4"'}>Export drafts</button></div>
    <div class="card"><h2>Move to another device</h2>
      <p>Favorites, ratings, notes, the grocery list, the pantry and drafts live on this device only. Back them up here and restore the file on your iPad or PC.</p>
      <div class="row"><button class="btn" data-act="backup">Back up everything</button>
      <label class="btn">Restore from a backup<input type="file" accept=".json,application/json" data-in="restore" hidden></label></div></div>
    <div class="card"><h2>About</h2>
      <p class="muted small-text" style="margin:6px 0 0">${all().length} recipes in the book. Works offline once installed. To install on iPhone or iPad: open in Safari, tap Share, then “Add to Home Screen”.</p></div>`;
}

function viewImport(data) {
  try {
    const r = norm(dec(data));
    if (!r.title) throw 0;
    V.importing = r;
    return head('A recipe was shared with you') + `<div class="card index"><div class="rhead"><span class="blob">${esc(r.emoji || '🍴')}</span><h1>${esc(r.title)}</h1></div>
      <p style="margin-top:12px">${r.ingredients.length} ingredients, ${r.steps.length} steps.</p>
      <div class="row"><button class="btn primary" data-act="importSave">Save to my recipes</button><a class="btn plain" href="#/">No thanks</a></div></div>`;
  } catch { return head('Shared recipe') + `<div class="empty"><span class="big">🧭</span>This share link is damaged. Ask for a fresh one.</div>`; }
}

/* ---------- router ---------- */
function render(keepScroll) {
  const [name = '', arg, arg2] = location.hash.replace(/^#\/?/, '').split('/');
  const views = {
    '': viewHome, c: () => viewCat(arg), r: () => viewRecipe(arg), cook: () => viewCook(arg), tonight: viewTonight, list: viewList,
    pantry: viewPantry, favorites: viewFavs, add: () => viewForm(), edit: () => viewForm(arg), settings: viewSettings, import: () => viewImport(arg)
  };
  const cooking = name === 'cook';
  document.body.classList.toggle('cooking', cooking);
  if (cooking) wakeOn(); else { wakeOff(); V.cook = null; V.sheet = false; if (window.speechSynthesis) speechSynthesis.cancel(); }
  $('#main').innerHTML = (views[name] || viewHome)();
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.nav === (['c', 'r', 'edit', 'import'].includes(name) ? '' : name)));
  $('#app').classList.remove('menu-open');
  updateBadge();
  if (!keepScroll) window.scrollTo(0, 0);
}

/* ---------- wake lock, speech, timers ---------- */
let wake = null;
async function wakeOn() {
  try { if (!wake && 'wakeLock' in navigator) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch {}
}
function wakeOff() { if (wake) { wake.release().catch(() => {}); wake = null; } }
document.addEventListener('visibilitychange', () => { if (!document.hidden && document.body.classList.contains('cooking')) wakeOn(); });

function speakStep() {
  if (!window.speechSynthesis || !V.cook) return toast('Read-aloud is not available in this browser.');
  const r = byId(V.cook.id), i = V.cook.i;
  const f = (V.serv[r.id] || r.servings || 1) / (r.servings || 1);
  const text = i < 0 ? 'Gather your ingredients. ' + r.ingredients.map(g => ingPlain(g, f)).join('. ')
    : `Step ${i + 1}. ${stepText(r.steps[i].text)}`;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/°F/g, ' degrees Fahrenheit').replace(/°C/g, ' degrees Celsius'));
  u.rate = 0.95; speechSynthesis.speak(u);
}
function beep() {
  try {
    const A = new (window.AudioContext || window.webkitAudioContext)();
    [0, .35, .7].forEach(t => { const o = A.createOscillator(), g = A.createGain(); o.frequency.value = 880; o.connect(g); g.connect(A.destination); g.gain.setValueAtTime(.25, A.currentTime + t); g.gain.exponentialRampToValueAtTime(.001, A.currentTime + t + .28); o.start(A.currentTime + t); o.stop(A.currentTime + t + .3); });
  } catch {}
  if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
}
setInterval(() => {
  let changed = false;
  V.timers.forEach(t => { if (!t.done && Date.now() >= t.end) { t.done = true; changed = true; beep(); toast(`⏱ ${t.label} timer is done`); } });
  const bar = $('#timerBar');
  if (!bar) return;
  if (changed) bar.innerHTML = timersHTML();
  else V.timers.forEach(t => { const el = $(`[data-timer="${t.id}"] span`, bar); if (el) el.textContent = fmtLeft(t); });
}, 1000);

/* ---------- actions ---------- */
function addGrocery(g, from) {
  const key = (g.item + '|' + (g.unit || '')).toLowerCase();
  const hit = S.grocery.find(x => !x.done && (x.item + '|' + (x.unit || '')).toLowerCase() === key);
  if (hit) {
    hit.qty = hit.qty != null && g.qty != null ? +(hit.qty + g.qty).toFixed(3) : (hit.qty ?? g.qty);
    if (from && !hit.from.includes(from)) hit.from.push(from);
  } else {
    S.grocery.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), item: g.item, qty: g.qty ?? null, unit: g.unit || '', aisle: AISLES.includes(g.aisle) ? g.aisle : guessAisle(g.item), done: false, from: from ? [from] : [] });
  }
}
const toggle = (arr, v) => { const i = arr.indexOf(v); i < 0 ? arr.push(v) : arr.splice(i, 1); };

const acts = {
  openMenu: () => $('#app').classList.add('menu-open'),
  closeMenu: () => $('#app').classList.remove('menu-open'),
  theme() { S.theme = S.theme === 'dark' ? 'light' : 'dark'; save(); applyTheme(); if (location.hash.startsWith('#/settings')) render(true); },
  setTheme(el) { S.theme = el.dataset.t; save(); applyTheme(); render(true); },
  rail() { S.rail = !S.rail; save(); applyTheme(); },
  units(el) { S.units = el.dataset.u; save(); render(true); },
  fav(el) { toggle(S.favs, el.dataset.id); save(); render(true); },
  again(el) { S.again[el.dataset.id] = !S.again[el.dataset.id]; save(); render(true); },
  rate(el) { const id = el.dataset.id, n = +el.dataset.n; S.ratings[id] = S.ratings[id] === n ? 0 : n; save(); render(true); },
  tab(el) { V.tab[el.dataset.id] = el.dataset.t; render(true); },
  serv(el) { const id = el.dataset.id, r = byId(id); V.serv[id] = Math.max(1, (V.serv[id] || r.servings || 1) + +el.dataset.d); render(true); },
  addToList(el) {
    const r = byId(el.dataset.id), f = (V.serv[r.id] || r.servings || 1) / (r.servings || 1);
    r.ingredients.forEach(g => addGrocery({ ...g, qty: g.qty != null ? +(g.qty * f).toFixed(3) : null }, r.title));
    save(); updateBadge(); toast(`Added ${r.ingredients.length} items to the grocery list`);
  },
  shareRecipe(el) {
    const r = byId(el.dataset.id), { _draft, ...clean } = r;
    shareOrCopy(r.title, '', `${location.origin}${location.pathname}#/import/${enc(clean)}`);
  },
  importSave() {
    const r = V.importing; if (!r) return;
    r.id = r.id || slug(r.title);
    S.drafts = S.drafts.filter(d => d.id !== r.id).concat(r); save(); toast('Saved'); location.hash = `#/r/${r.id}`;
  },
  timer(el) {
    V.timers.push({ id: Date.now().toString(36), label: el.dataset.label, end: Date.now() + el.dataset.secs * 1000, done: false });
    if ($('#timerBar')) $('#timerBar').innerHTML = timersHTML(); else toast(`⏱ ${el.dataset.label} timer started. It shows in cook mode.`);
  },
  timerX(el) { V.timers = V.timers.filter(t => t.id !== el.dataset.tid); $('#timerBar').innerHTML = timersHTML(); },
  cookGo(el) {
    const r = byId(V.cook.id);
    V.cook.i = Math.max(-1, Math.min(r.steps.length - 1, V.cook.i + +el.dataset.d)); V.sheet = false;
    render(); if (V.autoRead) speakStep();
  },
  speak: speakStep,
  autoRead() { V.autoRead = !V.autoRead; render(true); if (V.autoRead) speakStep(); else if (window.speechSynthesis) speechSynthesis.cancel(); },
  sheet() { V.sheet = !V.sheet; render(true); },
  tMax(el) { V.tonight.max = +el.dataset.m; V.pick = null; render(true); },
  tCat(el) { V.tonight.cat = el.dataset.c; V.pick = null; render(true); },
  tFlag(el) { V.tonight[el.dataset.k] = !V.tonight[el.dataset.k]; V.pick = null; render(true); },
  pick() {
    const list = tonightList(); if (!list.length) return;
    const d = $('#dice'); d.classList.add('roll');
    setTimeout(() => { const pool = list.length > 1 ? list.filter(r => r.id !== V.pick) : list; V.pick = pool[Math.floor(Math.random() * pool.length)].id; render(true); }, 600);
  },
  gShare: () => shareOrCopy('Grocery list', groceryText()),
  async gCopy() { try { await navigator.clipboard.writeText(groceryText()); toast('List copied'); } catch { toast('Copying is not available in this browser.'); } },
  gClear() { S.grocery = S.grocery.filter(g => !g.done); save(); render(true); },
  gToPantry() {
    const done = S.grocery.filter(g => g.done);
    if (!done.length) return toast('Check off what you bought first.');
    done.forEach(g => { const p = S.pantry.find(p => p.item.toLowerCase() === g.item.toLowerCase()); p ? p.status = 'have' : S.pantry.push({ item: g.item, status: 'have' }); });
    S.grocery = S.grocery.filter(g => !g.done); save(); render(true); toast(`Moved ${done.length} to the pantry`);
  },
  pCycle(el) { const p = S.pantry.find(p => p.item === el.dataset.item); p.status = { have: 'low', low: 'out', out: 'have' }[p.status]; save(); render(true); },
  pDel(el) { S.pantry = S.pantry.filter(p => p.item !== el.dataset.item); save(); render(true); },
  pToList(el) { addGrocery({ item: el.dataset.item, qty: null, unit: '' }); save(); updateBadge(); toast('Added to the grocery list'); },
  delDraft(el) { S.drafts = S.drafts.filter(d => d.id !== el.dataset.id); save(); toast('Removed'); location.hash = '#/'; },
  exportDrafts: () => exportFile('snack-again-drafts.json', JSON.stringify({ recipes: S.drafts }, null, 2)),
  backup: () => exportFile(`snack-again-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(S, null, 2))
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (el && acts[el.dataset.act]) { if (el.tagName !== 'A') e.preventDefault(); acts[el.dataset.act](el, e); }
});
document.addEventListener('input', e => {
  const el = e.target, k = el.dataset.in;
  if (k === 'search') { V.q = el.value; $('#homeBody').innerHTML = homeBody(); }
  else if (k === 'note') { S.notes[el.dataset.id] = el.value; save(); }
});
document.addEventListener('change', e => {
  const el = e.target, k = el.dataset.in;
  if (k === 'check') (V.checked[el.dataset.id] ||= {})[el.dataset.i] = el.checked;
  else if (k === 'gDone') { const g = S.grocery.find(g => g.id === el.dataset.gid); if (g) { g.done = el.checked; save(); render(true); } }
  else if (k === 'restore' && el.files[0]) {
    el.files[0].text().then(t => {
      const d = JSON.parse(t);
      if (!d || typeof d !== 'object' || !Array.isArray(d.grocery)) throw 0;
      S = { ...DEFAULTS, ...d }; save(); applyTheme(); render(); toast('Backup restored');
    }).catch(() => toast('That file is not a Snack Again backup.'));
  }
});
document.addEventListener('submit', e => {
  const form = e.target, k = form.dataset.form;
  if (!k) return;
  e.preventDefault();
  const d = Object.fromEntries(new FormData(form));
  if (k === 'gAdd' || k === 'pAdd') {
    const text = (d.item || '').trim(); if (!text) return;
    if (k === 'gAdd') addGrocery(parseIng(text));
    else if (!S.pantry.some(p => p.item.toLowerCase() === text.toLowerCase())) S.pantry.push({ item: text, status: 'have' });
    save(); render(true); $(`[data-form="${k}"] input`).focus();
  } else if (k === 'recipe') {
    const list = s => (s || '').split(',').map(x => x.trim()).filter(Boolean);
    const num = s => { const n = parseFloat(s); return isNaN(n) ? undefined : n; };
    const lines = s => (s || '').split('\n').map(x => x.trim()).filter(Boolean);
    let id = form.dataset.id;
    if (!id) { id = slug(d.title); let n = 2; const base = id; while (byId(id)) id = `${base}-${n++}`; }
    const r = { id, title: d.title.trim(), emoji: d.emoji.trim() || '🍴', category: d.category, type: d.type || undefined, tags: list(d.tags), prep: num(d.prep), cook: num(d.cook), servings: num(d.servings) || 4, equipment: list(d.equipment), kid: !!d.kid, notes: d.notes.trim() || undefined, ingredients: lines(d.ingredients).map(parseIng), steps: lines(d.steps).map(t => ({ text: t.replace(/^\d+[.)]\s*/, '') })) };
    if (d.sname || d.surl) r.source = { name: d.sname.trim(), url: d.surl.trim() };
    if (num(d.cal) != null) r.nutrition = { cal: num(d.cal), protein: num(d.protein) || 0, carbs: num(d.carbs) || 0, fat: num(d.fat) || 0 };
    S.drafts = S.drafts.filter(x => x.id !== id).concat(r); save(); toast('Recipe saved'); location.hash = `#/r/${id}`;
  }
});

window.addEventListener('hashchange', () => render());
window.addEventListener('keydown', e => { if (e.key === 'Escape') $('#app').classList.remove('menu-open'); });

/* ---------- start ---------- */
applyTheme();
fetch('recipes.json', { cache: 'no-cache' })
  .then(r => r.json())
  .then(d => { DATA = { categories: d.categories || [], recipes: d.recipes || [] }; })
  .catch(() => toast('Could not load the recipe book. Check your connection and reopen.'))
  .finally(() => render());
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
