/* There and Snack Again: recipe box, cook mode, tonight picker, grocery list, pantry.
   Recipes come from recipes.json (the master copy in the repo).
   Everything personal (favorites, ratings, notes, lists, drafts) lives in this device's localStorage. */
(() => {
'use strict';

const KEY = 'tasa:v1';
const TYPES = [['Main', 'Mains'], ['Side', 'Sides'], ['Appetizer', 'Appetizers'], ['Sauce & Condiment', 'Sauces & Condiments'], ['Building Block', 'Building Blocks'], ['Dessert', 'Desserts'], ['Drink', 'Drinks']];
const SHELVES = [['cuisines', 'Cuisines'], ['meals', 'Meals & Occasions'], ['collections', 'Collections']];
const DEFAULTS = { theme: 'light', units: 'us', favs: [], ratings: {}, again: {}, notes: {}, grocery: [], pantry: [], drafts: [], rail: false };
const METRIC = { cup: [240, 'ml'], tbsp: [15, 'ml'], tsp: [5, 'ml'], 'fl oz': [30, 'ml'], pt: [473, 'ml'], qt: [946, 'ml'], gal: [3785, 'ml'], oz: [28.35, 'g'], lb: [453.6, 'g'] };
const PLURAL = new Set(['cup', 'clove', 'can', 'slice', 'piece', 'pinch', 'stick', 'bunch', 'sprig']);
const UNIT_ALIASES = { cups: 'cup', c: 'cup', tablespoon: 'tbsp', tablespoons: 'tbsp', tbsps: 'tbsp', tbs: 'tbsp', teaspoon: 'tsp', teaspoons: 'tsp', tsps: 'tsp', ounce: 'oz', ounces: 'oz', pound: 'lb', pounds: 'lb', lbs: 'lb', cloves: 'clove', cans: 'can', slices: 'slice', pieces: 'piece', sticks: 'stick', pint: 'pt', pints: 'pt', quart: 'qt', quarts: 'qt', gallon: 'gal', gallons: 'gal', grams: 'g', gram: 'g', liter: 'L', liters: 'L', l: 'L' };
const UNITS = ['cup', 'tbsp', 'tsp', 'fl oz', 'oz', 'lb', 'pt', 'qt', 'gal', 'clove', 'can', 'slice', 'piece', 'pinch', 'stick', 'bunch', 'sprig', 'g', 'kg', 'ml', 'L'];
const AISLES = ['Produce', 'Bakery', 'Deli & Cheese', 'Meat & Seafood', 'Dairy & Eggs', 'Canned & Jarred', 'Pasta, Rice & Grains', 'Baking', 'Oils, Vinegars & Condiments', 'Spices', 'Frozen', 'Beverages', 'Other'];
const RE_CHEESE = /cheese|parmesan|parmigiano|pecorino|mozzarella|cheddar|ricotta|fontina|gruy[eè]re|provolone|feta|mascarpone|burrata|curd/;
const RE_DELI = /prosciutto|salami|soppressata|pancetta|guanciale|pepperoni|deli |lunch ?meat|hummus/;
// Splits the shelf-stable middle of the store. Order matters: first match wins.
const SHELF_GUESS = [
  ['Beverages', /coffee/],
  ['Spices', /dried .*chil|guajillo|ancho chil/],
  ['Oils, Vinegars & Condiments', /vinegar|\boil\b|mayo|mustard|ketchup|worcestershire|soy sauce|aminos|fish sauce|hot sauce|sriracha|bbq sauce|barbecue sauce|dressing|peanut butter|tahini|tallow|lard|cooking spray|liquid smoke|balsamic|relish|horseradish|wasabi|miso|chili crisp|chil[ei] oil/],
  ['Canned & Jarred', /canned|tomato (paste|sauce|pur[eé]e)|tomatoes|passata|marinara|broth|stock|bouillon|beef base|\bbeans?\b|chickpea|coconut milk|tuna|anchov|olives?\b|capers?|pickle|green chil|chipotle|adobo|artichoke|roasted red pepper|sun-dried|evaporated|condensed|salsa|preserves|jam\b|jelly|nacho cheese|calabrian|corn kernels/],
  ['Pasta, Rice & Grains', /pasta|rigatoni|penne|spaghetti|noodle|macaroni|orzo|lasagn|tortellini|\brice\b|arborio|quinoa|couscous|farro|barley|\boats?\b|polenta|grits|lentil|chia/],
  ['Baking', /flour|sugar|baking (soda|powder)|cornstarch|arrowroot|cornmeal|yeast|vanilla|cocoa|chocolate|honey|maple|syrup|agave|molasses|panko|crumb|\bnuts?\b|pecan|walnut|almond|peanut|pistachio|coconut|raisin|gelatin|shortening|citric acid|rennet/],
  ['Beverages', /wine|beer|vodka|sherry|marsala|bourbon|whiskey|tequila|coffee|\btea\b|juice|soda|seltzer/]
];
const AISLE_GUESS = [
  ['Frozen', /frozen/],
  ['Oils, Vinegars & Condiments', /vinegar|\boil\b/],
  ['Spices', /\bsalt\b|black pepper|white pepper|peppercorn|pepper flakes|cumin|paprika|oregano|powder(?!ed)|flakes|seasoning|cinnamon|nutmeg|dried thyme|bay lea|cayenne|coriander|turmeric|marjoram|allspice|fennel seed|sesame seed|\brub\b/],
  ['Deli & Cheese', RE_CHEESE], ['Deli & Cheese', RE_DELI],
  ['Canned & Jarred', /tomato (paste|sauce|pur[eé]e)|canned|broth|stock|\bbeans?\b|tuna|coconut milk/],
  ['Meat & Seafood', /beef|chicken|pork|sausage|bacon|turkey|steak|ham\b|fish|salmon|shrimp|brisket|ribs|chuck|bison|lamb/],
  ['Dairy & Eggs', /milk|butter|egg|cream|yogurt|half-and-half|cr[eè]me/],
  ['Bakery', /bread|bun|tortilla|roll|bagel|pita|baguette|sourdough|brioche/],
  ['Produce', /onion|garlic|tomato|lettuce|cilantro|parsley|lemon|lime|pepper|potato|carrot|basil|avocado|celery|spinach|arugula|mushroom|apple|banana|berr|ginger|scallion|shallot|cucumber|zucchini|broccoli|asparagus|jalape|thyme|rosemary|\bcorn\b|pear|orange|cabbage|kale|herb/],
  ...SHELF_GUESS
];
const LOCS = ['Fridge', 'Freezer', 'Cabinet', 'Spice Rack', 'Counter', 'Basement Fridge', 'Garage Freezer'];
const LOC_EMOJI = { Fridge: '🧊', Freezer: '❄️', Cabinet: '🚪', 'Spice Rack': '🧂', Counter: '🍌', 'Basement Fridge': '🧊', 'Garage Freezer': '❄️' };

const GENERIC = new Set(['fresh', 'freshly', 'large', 'small', 'medium', 'ground', 'dried', 'whole', 'kosher', 'black', 'white', 'yellow', 'sweet', 'unsalted', 'sodium', 'extra', 'virgin', 'grated', 'chopped', 'minced', 'sliced', 'boneless', 'skinless', 'size', 'style', 'optional', 'soft', 'crisp', 'baby', 'plain', 'lite', 'lean', 'mild', 'aged', 'pure', 'coarse', 'mesh', 'leaves', 'neutral', 'double', 'concentrated', 'imported', 'stale', 'raw', 'thick', 'slices', 'with', 'from', 'pieces']);
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'recipe';

let S = load();
let DATA = { categories: [], recipes: [], sections: [], tips: [] };
const V = { serv: {}, tab: {}, checked: {}, timers: [], q: '', gq: '', gPick: null, pEdit: '', tq: '', tkind: '', tipsOpen: {}, tonight: { max: 0, cat: '', kid: false, again: false }, cook: null, sheet: false, autoRead: false, pick: null };

function load() {
  try { return migrate({ ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }); } catch { return { ...DEFAULTS }; }
}
// Same tasa:v1 key and shape. Fills in what older saves lack: 13 departments on the list, location and category on pantry items.
function migrate(d) {
  d.grocery = (d.grocery || []).map(g => ({ ...g, aisle: deptOf(g.item, g.aisle) }));
  d.pantry = (d.pantry || []).map(p => {
    const cat = AISLES.includes(p.cat) ? p.cat : deptOf(p.item);
    return { ...p, cat, loc: LOCS.includes(p.loc) ? p.loc : guessLoc(p.item, cat) };
  });
  return d;
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
// Old lists and recipes used 8 aisles with one big "Pantry". Map those to the 13 departments.
function deptOf(item, aisle) {
  const t = String(item || '').toLowerCase();
  if (aisle === 'Pantry' || !AISLES.includes(aisle)) {
    if (aisle === 'Pantry') { for (const [a, re] of SHELF_GUESS) if (re.test(t)) return a; return 'Other'; }
    return guessAisle(t);
  }
  if (aisle === 'Dairy & Eggs' && RE_CHEESE.test(t)) return 'Deli & Cheese';
  if (aisle === 'Meat & Seafood' && RE_DELI.test(t)) return 'Deli & Cheese';
  if (aisle === 'Other' && SHELF_GUESS[SHELF_GUESS.length - 1][1].test(t)) return 'Beverages';
  return aisle;
}
// Where a pantry item most likely lives at home. A guess; the pantry page lets you move it.
function guessLoc(item, cat) {
  const t = item.toLowerCase();
  if (cat === 'Frozen') return 'Freezer';
  if (cat === 'Spices') return 'Spice Rack';
  if (cat === 'Bakery') return 'Counter';
  if (cat === 'Produce') return /onion|garlic|potato|tomato|banana|avocado|shallot|squash/.test(t) ? 'Counter' : 'Fridge';
  if (['Meat & Seafood', 'Dairy & Eggs', 'Deli & Cheese'].includes(cat)) return 'Fridge';
  if (/mayo|ketchup|mustard|jam\b|jelly|preserves|pickle|relish|salsa|miso|horseradish/.test(t)) return 'Fridge';
  return 'Cabinet';
}
function pantryItem(item, status = 'have', aisle) {
  const cat = deptOf(item, aisle);
  return { item, status, cat, loc: guessLoc(item, cat) };
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

/* ---------- techniques ---------- */
const KIND = { house: "Jim's way", method: 'Technique', optional: 'Optional' };
const tipById = id => DATA.tips.find(t => t.id === id);
const rich = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
// Every tip on a recipe: step tips first (with their step number), then recipe-wide ones.
function recipeTips(r) {
  const out = [];
  r.steps.forEach((st, i) => (st.tips || []).forEach(id => { const t = tipById(id); if (t) out.push({ t, step: i }); }));
  (r.tips || []).forEach(id => { const t = tipById(id); if (t && !out.some(x => x.t.id === id)) out.push({ t, step: null }); });
  return out;
}
function tipsUsing(id) {
  return all().filter(r => (r.tips || []).includes(id) || r.steps.some(st => (st.tips || []).includes(id)));
}
function tipNote(t, open) {
  return `<details class="tip ${esc(t.kind)}" ${open ? 'open' : ''}><summary><span class="tip-kind">${KIND[t.kind] || KIND.method}</span> ${esc(t.title)}</summary>
    <p>${rich(t.text)}</p><a class="small-text" href="#/tips/${esc(t.id)}">Open in Techniques</a></details>`;
}
function stepExtras(st, open) {
  const tips = (st.tips || []).map(tipById).filter(Boolean);
  return tips.map(t => tipNote(t, open || t.kind === 'house')).join('')
    + (st.asWritten ? `<details class="as-written"><summary>As written</summary><p>${esc(stepText(st.asWritten))}</p></details>` : '');
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
  const tab = V.tab[id] || 'ing', rating = S.ratings[id] || 0, n = r.nutrition, rt = recipeTips(r);
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
        <button class="btn" data-act="gPick" data-id="${esc(id)}">🧺 Add to grocery list</button>
      </div>

      <div class="tabs no-print" role="tablist">
        <button role="tab" aria-selected="${tab === 'ing'}" data-act="tab" data-id="${esc(id)}" data-t="ing">Ingredients</button>
        <button role="tab" aria-selected="${tab === 'steps'}" data-act="tab" data-id="${esc(id)}" data-t="steps">Steps</button>
        ${rt.length ? `<button role="tab" aria-selected="${tab === 'tips'}" data-act="tab" data-id="${esc(id)}" data-t="tips">Tips <span class="tab-count">${rt.length}</span></button>` : ''}
      </div>
      <div style="padding-top:8px">
        ${tab === 'ing' ? ingListHTML(r, f)
          : tab === 'tips' && rt.length ? `<div class="tip-list">${rt.map(x => `<div class="tip-row"><span class="pill ${x.step == null ? '' : 'sage'}">${x.step == null ? 'Whole recipe' : 'Step ' + (x.step + 1)}</span>${tipNote(x.t, true)}</div>`).join('')}</div>`
          : `<ol class="steps">${r.steps.map(st => `<li>${esc(stepText(st.text))}${usesHTML(r, st, f)}${stepExtras(st)}</li>`).join('')}</ol>`}
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
    </section>
    ${gPickHTML()}`;
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
    : `<div><div class="muted small-text">${esc(r.title)}</div><div class="cook-count">Step ${i + 1} of ${nSteps}</div></div><p class="cook-text">${esc(stepText(st.text))}</p>${usesHTML(r, st, f)}<div class="cook-tips">${stepExtras(st, true)}</div>`;
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

const byItem = (a, b) => a.item.localeCompare(b.item);
function groceryText() {
  return AISLES.map(a => {
    const items = S.grocery.filter(g => g.aisle === a && !g.done).sort(byItem);
    return items.length ? `${a}\n${items.map(g => '- ' + ingPlain(g)).join('\n')}` : '';
  }).filter(Boolean).join('\n\n');
}
const NO_BUY = /^(cold |cool |warm |hot |ice )?water$|non-chlorinated water/i;
function gFindHTML() {
  const q = V.gq.trim();
  if (!q) return '';
  const hits = searchList(q).slice(0, 6);
  return hits.length
    ? `<div class="pick-results">${hits.map(r => `<button class="pick-result" data-act="gPick" data-id="${esc(r.id)}"><span>${esc(r.emoji || '🍴')}</span><span>${esc(r.title)}</span><span class="muted small-text">${r.ingredients.length} items</span></button>`).join('')}</div>`
    : `<p class="muted small-text">No recipes match “${esc(q)}”.</p>`;
}
// Opens with everything checked except what the pantry says is on hand.
function gPickStart(id) {
  const r = byId(id); if (!r) return;
  V.gPick = { id, serv: V.serv[id] || r.servings || 1, on: r.ingredients.map(g => !pantryHas(g.item) && !NO_BUY.test(g.item)) };
}
function gPickHTML() {
  const P = V.gPick, r = P && byId(P.id);
  if (!r) return '';
  const f = P.serv / (r.servings || 1), n = P.on.filter(Boolean).length;
  const skipped = r.ingredients.filter((g, i) => !P.on[i] && pantryHas(g.item)).length;
  return `<div class="sheet-scrim" data-act="gPickX"></div>
    <div class="sheet pick-sheet" role="dialog" aria-label="Add ingredients from ${esc(r.title)}">
      <div class="row spread"><h2>${esc(r.emoji || '🍴')} ${esc(r.title)}</h2><button class="btn small" data-act="gPickX">Close</button></div>
      <div class="row spread" style="margin:10px 0">
        <div class="stepper" role="group" aria-label="Servings"><button data-act="gPickServ" data-d="-1" aria-label="Fewer servings">−</button><span>Serves ${P.serv}</span><button data-act="gPickServ" data-d="1" aria-label="More servings">+</button></div>
        <div class="row" style="gap:6px"><button class="btn small plain" data-act="gPickAll" data-on="1">Select all</button><button class="btn small plain" data-act="gPickAll" data-on="">None</button></div>
      </div>
      ${skipped ? `<p class="pantry-warn">⚠️ ${skipped} unchecked because the pantry says you have ${skipped === 1 ? 'it' : 'them'}. The pantry may be out of date, so confirm before you shop.</p>` : ''}
      <ul class="ruled">${r.ingredients.map((g, i) => `<li><label><input type="checkbox" data-in="gPickOne" data-i="${i}" ${P.on[i] ? 'checked' : ''}><span>${ingHTML(g, f)}${pantryHas(g.item) ? ' <span class="pill sage">in pantry</span>' : ''}</span></label></li>`).join('')}</ul>
      <div class="row pick-foot"><button class="btn primary" data-act="gPickAdd" ${n ? '' : 'disabled style="opacity:.4"'}>Add ${n} ${n === 1 ? 'item' : 'items'} to the list</button></div>
    </div>`;
}
function viewList() {
  const open = S.grocery.filter(g => !g.done).length;
  const groups = AISLES.map(a => {
    const items = S.grocery.filter(g => g.aisle === a).sort(byItem);
    if (!items.length) return '';
    return `<div class="aisle">${esc(a)} <span class="group-count">${items.filter(g => !g.done).length}</span></div><ul class="ruled">${items.map(g => `<li><label><input type="checkbox" data-in="gDone" data-gid="${esc(g.id)}" ${g.done ? 'checked' : ''}><span>${ingHTML(g)}${pantryHas(g.item) && !g.done ? ' <span class="pill sage">in pantry</span>' : ''}${g.from && g.from.length ? `<span class="note small-text"> (${esc(g.from.join(', '))})</span>` : ''}</span></label></li>`).join('')}</ul>`;
  }).join('');
  return head('Grocery list') + `
    <form class="addbar" data-form="gAdd"><input type="text" name="item" placeholder="Add an item, like 2 lb chicken thighs" aria-label="Add an item" autocomplete="off"><button class="btn primary">Add</button></form>
    <div class="search no-print" style="margin:0 0 8px;max-width:none"><input type="search" data-in="gSearch" value="${esc(V.gq)}" placeholder="Add from a recipe: search by name or ingredient" aria-label="Search recipes to add ingredients"></div>
    <div id="gFind" class="no-print">${gFindHTML()}</div>
    ${S.grocery.length ? `<div class="row no-print" style="margin:10px 0">
        <button class="btn small" data-act="gShare">📤 Send list</button>
        <button class="btn small" data-act="gCopy">📋 Copy as text</button>
        <button class="btn small plain" data-act="gToPantry">Move checked to pantry</button>
        <button class="btn small plain" data-act="gClear">Clear checked</button>
      </div><p class="muted small-text">${open} left to get, in store-walk order. “Send list” opens the share sheet, where you can pick Reminders or Messages.</p>
      <div class="card">${groups}</div>`
      : `<div class="empty"><span class="big">🧺</span>The basket is empty. Add items above, search a recipe, or open a recipe and tap “Add to grocery list”.</div>`}
    ${gPickHTML()}`;
}
function viewPantry() {
  const label = { have: 'Have it', low: 'Running low', out: 'Out' };
  const row = p => `<div class="pantry-item"><button class="name" data-act="pEdit" data-item="${esc(p.item)}" aria-expanded="${V.pEdit === p.item}">${esc(p.item)}</button>
        <button class="status ${p.status}" data-act="pCycle" data-item="${esc(p.item)}">${label[p.status]}</button>
        ${p.status !== 'have' ? `<button class="btn small plain" data-act="pToList" data-item="${esc(p.item)}">+ list</button>` : ''}
        <button class="x" data-act="pDel" data-item="${esc(p.item)}" aria-label="Remove ${esc(p.item)}">✕</button></div>
        ${V.pEdit === p.item ? `<div class="pantry-move">
          <label>Where<select data-in="pLoc" data-item="${esc(p.item)}">${LOCS.map(l => `<option ${p.loc === l ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
          <label>Category<select data-in="pCat" data-item="${esc(p.item)}">${AISLES.map(c => `<option ${p.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label></div>` : ''}`;
  const groups = LOCS.map(loc => {
    const here = S.pantry.filter(p => p.loc === loc);
    if (!here.length) return '';
    return `<div class="card"><div class="aisle" style="margin-top:0">${LOC_EMOJI[loc]} ${esc(loc)} <span class="group-count">${here.length}</span></div>
      ${AISLES.map(c => { const items = here.filter(p => p.cat === c).sort(byItem); return items.length ? `<div class="pantry-cat">${esc(c)}</div>${items.map(row).join('')}` : ''; }).join('')}</div>`;
  }).join('');
  return head('Pantry') + `
    <form class="addbar" data-form="pAdd"><input type="text" name="item" placeholder="Add something you keep on hand" aria-label="Add a pantry item" autocomplete="off"><button class="btn primary">Add</button></form>
    <p class="muted small-text">Sorted by where it lives, then by category. New items are placed by best guess; tap a name to move it. Tap a status to change it.</p>
    ${S.pantry.length ? groups
      : `<div class="empty"><span class="big">🫙</span>Nothing on the shelves yet. Start with the staples: olive oil, salt, garlic, eggs.</div>`}`;
}

function tipsBody() {
  const q = V.tq.toLowerCase().trim();
  const match = t => (!V.tkind || t.kind === V.tkind) && (!q || [t.title, t.text, t.where].join(' ').toLowerCase().includes(q));
  const out = DATA.sections.map(sec => {
    const list = DATA.tips.filter(t => t.section === sec.id && match(t));
    if (!list.length) return '';
    return `<h2 class="group-name">${esc(sec.emoji || '')} ${esc(sec.name)} <span class="group-count">${list.length}</span></h2>
      ${list.map(t => {
        const rs = tipsUsing(t.id);
        return `<article class="card tip-card ${esc(t.kind)}" id="tip-${esc(t.id)}">
          <h3>${esc(t.title)}</h3>
          <div class="row" style="gap:6px;margin:6px 0 8px"><span class="pill ${t.kind === 'house' ? 'red' : t.kind === 'optional' ? '' : 'sage'}">${KIND[t.kind] || KIND.method}</span></div>
          <p>${rich(t.text)}</p>
          ${t.where ? `<p class="muted small-text"><b>Where:</b> ${esc(t.where)}</p>` : ''}
          ${rs.length ? `<div class="row" style="gap:6px">${rs.map(r => `<a class="chip" href="#/r/${esc(r.id)}">${esc(r.emoji || '🍴')} ${esc(r.title)}</a>`).join('')}</div>` : ''}
          ${t.sources && t.sources.length ? `<p class="small-text" style="margin:10px 0 0">Backed by: ${t.sources.map(x => `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.name)}</a>`).join(' · ')}</p>` : ''}
        </article>`;
      }).join('')}`;
  }).join('');
  return out || `<div class="empty"><span class="big">🧭</span>No techniques match. Try another word or clear the filter.</div>`;
}
function viewTips() {
  const chip = (k, label) => `<button class="chip" data-act="tKind" data-k="${k}" aria-pressed="${V.tkind === k}">${label}</button>`;
  return head('Techniques') + `
    <p class="muted small-text">${DATA.tips.length} tips, tricks and flavor enhancers. They also show on the recipe steps where they matter.</p>
    <div class="search" style="margin:0 0 10px"><input type="search" data-in="tipSearch" value="${esc(V.tq)}" placeholder="Search techniques" aria-label="Search techniques"></div>
    <div class="row" style="gap:8px;margin-bottom:6px">${chip('', 'All')}${chip('house', "Jim's way")}${chip('method', 'Techniques')}${chip('optional', 'Optional')}</div>
    <div id="tipsBody">${tipsBody()}</div>`;
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
    pantry: viewPantry, favorites: viewFavs, add: () => viewForm(), edit: () => viewForm(arg), settings: viewSettings, import: () => viewImport(arg), tips: viewTips
  };
  const cooking = name === 'cook';
  document.body.classList.toggle('cooking', cooking);
  if (cooking) wakeOn(); else { wakeOff(); V.cook = null; V.sheet = false; if (window.speechSynthesis) speechSynthesis.cancel(); }
  $('#main').innerHTML = (views[name] || viewHome)();
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.nav === (['c', 'r', 'edit', 'import'].includes(name) ? '' : name)));
  $('#app').classList.remove('menu-open');
  updateBadge();
  if (!keepScroll) window.scrollTo(0, 0);
  if (name === 'tips' && arg && !keepScroll) { const el = document.getElementById('tip-' + arg); if (el) { el.classList.add('flash'); el.scrollIntoView({ block: 'start' }); } }
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
    S.grocery.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), item: g.item, qty: g.qty ?? null, unit: g.unit || '', aisle: deptOf(g.item, g.aisle), done: false, from: from ? [from] : [] });
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
  tKind(el) { V.tkind = el.dataset.k; render(true); },
  tMax(el) { V.tonight.max = +el.dataset.m; V.pick = null; render(true); },
  tCat(el) { V.tonight.cat = el.dataset.c; V.pick = null; render(true); },
  tFlag(el) { V.tonight[el.dataset.k] = !V.tonight[el.dataset.k]; V.pick = null; render(true); },
  pick() {
    const list = tonightList(); if (!list.length) return;
    const d = $('#dice'); d.classList.add('roll');
    setTimeout(() => { const pool = list.length > 1 ? list.filter(r => r.id !== V.pick) : list; V.pick = pool[Math.floor(Math.random() * pool.length)].id; render(true); }, 600);
  },
  gPick(el) { gPickStart(el.dataset.id); render(true); },
  gPickX() { V.gPick = null; render(true); },
  gPickServ(el) { V.gPick.serv = Math.max(1, V.gPick.serv + +el.dataset.d); render(true); },
  gPickAll(el) { V.gPick.on = V.gPick.on.map(() => !!el.dataset.on); render(true); },
  gPickAdd() {
    const P = V.gPick, r = byId(P.id), f = P.serv / (r.servings || 1);
    const picked = r.ingredients.filter((g, i) => P.on[i]);
    picked.forEach(g => addGrocery({ ...g, qty: g.qty != null ? +(g.qty * f).toFixed(3) : null }, r.title));
    V.gPick = null; V.gq = ''; save(); render(true); toast(`Added ${picked.length} from ${r.title}`);
  },
  pEdit(el) { V.pEdit = V.pEdit === el.dataset.item ? '' : el.dataset.item; render(true); },
  gShare: () => shareOrCopy('Grocery list', groceryText()),
  async gCopy() { try { await navigator.clipboard.writeText(groceryText()); toast('List copied'); } catch { toast('Copying is not available in this browser.'); } },
  gClear() { S.grocery = S.grocery.filter(g => !g.done); save(); render(true); },
  gToPantry() {
    const done = S.grocery.filter(g => g.done);
    if (!done.length) return toast('Check off what you bought first.');
    done.forEach(g => { const p = S.pantry.find(p => p.item.toLowerCase() === g.item.toLowerCase()); p ? p.status = 'have' : S.pantry.push(pantryItem(g.item, 'have', g.aisle)); });
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
  else if (k === 'gSearch') { V.gq = el.value; $('#gFind').innerHTML = gFindHTML(); }
  else if (k === 'tipSearch') { V.tq = el.value; $('#tipsBody').innerHTML = tipsBody(); }
  else if (k === 'note') { S.notes[el.dataset.id] = el.value; save(); }
});
document.addEventListener('change', e => {
  const el = e.target, k = el.dataset.in;
  if (k === 'check') (V.checked[el.dataset.id] ||= {})[el.dataset.i] = el.checked;
  else if (k === 'gPickOne') { V.gPick.on[+el.dataset.i] = el.checked; render(true); }
  else if (k === 'pLoc' || k === 'pCat') { const p = S.pantry.find(p => p.item === el.dataset.item); if (p) { p[k === 'pLoc' ? 'loc' : 'cat'] = el.value; save(); render(true); } }
  else if (k === 'gDone') { const g = S.grocery.find(g => g.id === el.dataset.gid); if (g) { g.done = el.checked; save(); render(true); } }
  else if (k === 'restore' && el.files[0]) {
    el.files[0].text().then(t => {
      const d = JSON.parse(t);
      if (!d || typeof d !== 'object' || !Array.isArray(d.grocery)) throw 0;
      S = migrate({ ...DEFAULTS, ...d }); save(); applyTheme(); render(); toast('Backup restored');
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
    else if (!S.pantry.some(p => p.item.toLowerCase() === text.toLowerCase())) S.pantry.push(pantryItem(text));
    save(); render(true); $(`[data-form="${k}"] input`).focus();
  } else if (k === 'recipe') {
    const list = s => (s || '').split(',').map(x => x.trim()).filter(Boolean);
    const num = s => { const n = parseFloat(s); return isNaN(n) ? undefined : n; };
    const lines = s => (s || '').split('\n').map(x => x.trim()).filter(Boolean);
    let id = form.dataset.id;
    if (!id) { id = slug(d.title); let n = 2; const base = id; while (byId(id)) id = `${base}-${n++}`; }
    const r = { id, title: d.title.trim(), emoji: d.emoji.trim() || '🍴', category: d.category, type: d.type || undefined, tags: list(d.tags), prep: num(d.prep), cook: num(d.cook), servings: num(d.servings) || 4, equipment: list(d.equipment), kid: !!d.kid, notes: d.notes.trim() || undefined, ingredients: lines(d.ingredients).map(parseIng), steps: lines(d.steps).map(t => ({ text: t.replace(/^\d+[.)]\s*/, '') })) };
    const old = byId(id);
    if (old) {
      if (old.tips) r.tips = old.tips;
      if (old.placeholder) r.placeholder = true;
      r.steps = r.steps.map(st => { const o = old.steps.find(x => x.text === st.text); return o ? { ...o } : st; });
    }
    if (d.sname || d.surl) r.source = { name: d.sname.trim(), url: d.surl.trim() };
    if (num(d.cal) != null) r.nutrition = { cal: num(d.cal), protein: num(d.protein) || 0, carbs: num(d.carbs) || 0, fat: num(d.fat) || 0 };
    S.drafts = S.drafts.filter(x => x.id !== id).concat(r); save(); toast('Recipe saved'); location.hash = `#/r/${id}`;
  }
});

window.addEventListener('hashchange', () => { V.gPick = null; render(); });
window.addEventListener('keydown', e => { if (e.key === 'Escape') { $('#app').classList.remove('menu-open'); if (V.gPick) { V.gPick = null; render(true); } } });

/* ---------- start ---------- */
applyTheme();
const getJSON = f => fetch(f, { cache: 'no-cache' }).then(r => r.json());
Promise.all([getJSON('recipes.json'), getJSON('techniques.json').catch(() => ({}))])
  .then(([d, t]) => { DATA = { categories: d.categories || [], recipes: d.recipes || [], sections: t.sections || [], tips: t.techniques || [] }; })
  .catch(() => toast('Could not load the recipe book. Check your connection and reopen.'))
  .finally(() => render());
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
