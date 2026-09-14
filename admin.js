const ALLERGENS = [
  { code: 'G',  short: 'Gluten', name: 'Gluten (buğday, arpa, çavdar…)', color: '#e8630a' },
  { code: 'KV', short: 'Kabuklu', name: 'Kabuklular', color: '#d6336c' },
  { code: 'YM', short: 'Yumurta', name: 'Yumurta', color: '#f2a30b' },
  { code: 'BK', short: 'Balık', name: 'Balık', color: '#0d6efd' },
  { code: 'YF', short: 'Fıstık', name: 'Yer fıstığı', color: '#8a5a2b' },
  { code: 'SY', short: 'Soya', name: 'Soya', color: '#29a06c' },
  { code: 'SU', short: 'Süt', name: 'Süt (laktoz dahil)', color: '#7d6ff0' },
  { code: 'KM', short: 'Kuruyemiş', name: 'Sert kabuklu meyveler (fındık, ceviz, badem…)', color: '#9b59b6' },
  { code: 'KR', short: 'Kereviz', name: 'Kereviz', color: '#16a085' },
  { code: 'HD', short: 'Hardal', name: 'Hardal', color: '#b08a1f' },
  { code: 'SS', short: 'Susam', name: 'Susam', color: '#a67c52' },
  { code: 'SF', short: 'Sülfit', name: 'Sülfit (kükürt dioksit)', color: '#64748b' },
  { code: 'AB', short: 'Acı bakla', name: 'Acı bakla', color: '#334155' },
  { code: 'YQ', short: 'Yumuşakça', name: 'Yumuşakçalar', color: '#0e7490' }
];
const AG_CODE = Object.fromEntries(ALLERGENS.map(a => [a.code, a]));

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => { const v = Number(n) || 0; return v.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); };

let state = { business: {}, categories: [] };
let prodDraft = { id: null, categoryId: null, image: '' };
let catDraftId = null;
let catDraftImage = '';
let qrDataUrl = null;

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

/* ---- Koyu mod ---- */
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  const b = $('#themeBtn');
  if (b) b.textContent = t === 'dark' ? '☀️' : '🌙';
  try { localStorage.setItem('qrTheme', t); } catch (e) { }
}
{
  const saved = (localStorage && localStorage.getItem('qrTheme')) ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(saved);
  const b = $('#themeBtn');
  if (b) b.addEventListener('click', () => {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });
}
function btn(text, fn, cls) {
  const b = el('button', 'btn ' + (cls || ''), text);
  b.type = 'button';
  b.addEventListener('click', async e => { e.stopPropagation(); await fn(); });
  return b;
}
function iconBtn(sym, fn, title) {
  const b = el('button', 'icon-btn', sym);
  b.title = title;
  b.addEventListener('click', async e => { e.stopPropagation(); await fn(); });
  return b;
}

/* ---- Oturum (token: çereze güvenilmaz, her tarayıcıda çalışır) ---- */
const getToken = () => sessionStorage.getItem('qrAdminToken') || '';
const setToken = t => {
  if (t) sessionStorage.setItem('qrAdminToken', t);
  else sessionStorage.removeItem('qrAdminToken');
};

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  try {
    const res = await fetch(path, { ...opts, headers, credentials: 'same-origin' });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && path !== '/api/admin/login') getToken() && setToken('');
    return { status: res.status, data };
  } catch (e) {
    return { status: 0, data: { error: 'Sunucuya bağlanılamadı' } };
  }
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.hidden = true; }, 2200);
}

/* ---- Giriş / çıkış ---- */
function showLogin(msg) {
  $('#app').hidden = true;
  $('#loginView').hidden = false;
  if (msg) $('#loginErr').textContent = msg;
  else $('#loginErr').textContent = '';
}

async function init() {
  try {
    const r = await api('/api/admin/menu');
    if (r.status === 401) { showLogin('Oturumunuz geçti, tekrar giriş yapın.'); initLogin(); return; }
    if (r.status === 0) { showLogin(r.data.error || 'Sunucuya bağlanılamadı.'); return; }
    if (r.status !== 200) throw new Error((r.data && r.data.error) || 'Menü yüklenemedi');
    state = r.data || { business: {}, categories: [] };
    $('#app').hidden = false;
    fillBusiness();
    renderMenuList();
    renderQR();
  } catch (e) {
    console.error(e);
    showLogin('Sunucuya bağlanılamadı: ' + e.message);
  }
}

function initLogin() {
  $('#loginView').hidden = false;
  $('#pass').addEventListener('keydown', async e => { if (e.key === 'Enter') doLogin(); });
}

async function doLogin() {
  const pass = $('#pass').value;
  const r = await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: pass }) });
  if (r.status === 200) {
    if (r.data && r.data.token) setToken(r.data.token);
    $('#pass').value = '';
    $('#loginView').hidden = true;
    $('#loginErr').textContent = '';
    await init();
  } else if (r.status === 401) {
    $('#loginErr').textContent = r.data.error || 'Hatalı şifre';
  } else {
    $('#loginErr').textContent = (r.data && r.data.error) || 'Giriş başarısız';
  }
}

$('#loginForm').addEventListener('submit', e => { e.preventDefault(); doLogin(); });

/* ---- Şifre değiştirme ---- */
$('#passBtn').addEventListener('click', () => {
  $('#passErr').textContent = '';
  $('#pwCur').value = $('#pwNew').value = $('#pwNew2').value = '';
  $('#passModal').hidden = false;
  $('#pwCur').focus();
});
$('#passForm').addEventListener('submit', async e => {
  e.preventDefault();
  const cur = $('#pwCur').value;
  const n1 = $('#pwNew').value;
  const n2 = $('#pwNew2').value;
  const err = $('#passErr');
  if (n1.length < 6) { err.textContent = 'Yeni şifre en az 6 karakter olmalı'; return; }
  if (n1 !== n2) { err.textContent = 'Yeni şifreler eşleşmiyor'; return; }
  const r = await api('/api/admin/password', { method: 'POST', body: JSON.stringify({ current: cur, next: n1 }) });
  if (r.status === 200) {
    $('#passModal').hidden = true;
    toast('Şifre güncellendi');
  } else {
    err.textContent = (r.data && r.data.error) || 'Hata';
  }
});

$('#logoutBtn').addEventListener('click', async () => {
  await api('/api/admin/logout', { method: 'POST' });
  setToken('');
  location.reload();
});

/* ---- Sekmeler ---- */
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  ['biz', 'menu', 'qr'].forEach(v => $('#view-' + v).hidden = v !== t.dataset.view);
}));
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => {
  b.closest('.modal').hidden = true;
}));

/* ---- İşletme ---- */
let logoDraft = '';
let bgDraft = '';

function fillBusiness() {
  const f = $('#bizForm');
  ['name', 'phrase', 'address', 'phone', 'hours', 'instagram', 'wifiName', 'wifiPass'].forEach(k => {
    const inp = f.elements[k];
    if (inp) inp.value = state.business[k] || '';
  });
  logoDraft = state.business.logo || '';
  updateLogoPreview();
  bgDraft = state.business.bgImage || '';
  updateBgPreview();
}

function updateLogoPreview() {
  const p = $('#logoPreview');
  if (logoDraft) { p.src = logoDraft; p.hidden = false; } else p.hidden = true;
}

function updateBgPreview() {
  const p = $('#bgPreview');
  if (bgDraft) { p.src = bgDraft; p.hidden = false; } else p.hidden = true;
}

$('#logoPick').addEventListener('click', () => $('#logoFile').click());
$('#logoFile').addEventListener('change', e => {
  const f = e.target.files[0];
  if (!f) return;
  readImage(f, 300, d => { logoDraft = d; updateLogoPreview(); });
});
$('#logoClear').addEventListener('click', () => { logoDraft = ''; updateLogoPreview(); });

$('#bgPick').addEventListener('click', () => $('#bgFile').click());
$('#bgFile').addEventListener('change', e => {
  const f = e.target.files[0];
  if (!f) return;
  readImage(f, 1280, d => { bgDraft = d; updateBgPreview(); });
});
$('#bgClear').addEventListener('click', () => { bgDraft = ''; updateBgPreview(); });

$('#bizForm').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target;
  const payload = {
    name: f.elements.name.value.trim(),
    phrase: f.elements.phrase.value.trim(),
    address: f.elements.address.value.trim(),
    phone: f.elements.phone.value.trim(),
    hours: f.elements.hours.value.trim(),
    instagram: f.elements.instagram.value.trim(),
    wifiName: f.elements.wifiName.value.trim(),
    wifiPass: f.elements.wifiPass.value.trim(),
    logo: logoDraft,
    bgImage: bgDraft
  };
  const r = await api('/api/admin/business', { method: 'PUT', body: JSON.stringify(payload) });
  if (r.status === 200) {
    state.business = r.data.business;
    $('#bizSaved').textContent = '✓ Kaydedildi';
    setTimeout(() => { $('#bizSaved').textContent = ''; }, 2500);
  } else toast('Kaydedilemedi: ' + (r.data.error || ''));
});

/* ---- Kategori listesi ---- */
function renderMenuList() {
  const wrap = $('#catList');
  wrap.innerHTML = '';
  if (!state.categories.length) {
    wrap.appendChild(el('p', 'muted empty', 'Henüz kategori yok. Sağ üstten kategori ekleyin.'));
    return;
  }
  state.categories.forEach(cat => {
    const card = el('div', 'cat-card');

    const head = el('div', 'cat-head');
    const title = el('div', 'cat-title');
    if (cat.image) {
      const im = el('img', 'cat-thumb');
      im.src = cat.image;
      im.alt = '';
      im.style.marginRight = '8px';
      title.appendChild(im);
    }
    const nameEl = el('strong'); nameEl.textContent = cat.name;
    const count = el('span', 'muted', ` ${cat.products.filter(p => p.visible !== false).length}/${cat.products.length} ürün görünür`);
    title.append(nameEl, count);

    const tools = el('div', 'cat-tools');
    tools.append(
      iconBtn('↑', () => move('category', cat.id, -1), 'Kategoriyi yukarı taşı'),
      iconBtn('↓', () => move('category', cat.id, 1), 'Kategoriyi aşağı taşı'),
      btn('Düzenle', () => openCat(cat), 'ghost small'),
      btn('Sil', () => delCat(cat.id), 'ghost small danger')
    );
    head.append(title, tools);

    const list = el('div', 'prod-list');
    cat.products.forEach(p => list.appendChild(productRow(cat, p)));

    if (!cat.products.length) list.appendChild(el('p', 'muted empty', 'Kategori boş.'));

    const addBtn = btn('+ Ürün Ekle', () => openProd(cat.id, null), 'primary small');

    card.append(head, list, addBtn);
    wrap.appendChild(card);
  });
}

function productRow(cat, p) {
  const row = el('div', 'prod-row' + (p.visible === false ? ' off' : ''));

  const thumb = el('div', 'pthumb');
  if (p.image) { const im = el('img'); im.src = p.image; im.alt = ''; thumb.appendChild(im); }
  else thumb.textContent = '🍴';

  const info = el('div', 'pinfo');
  const n = el('strong'); n.textContent = p.name;
  const d = el('span', 'muted', p.description ? ' — ' + p.description : '');
  info.append(n, d);
  if (p.calories != null) {
    const kcal = el('span', 'pkcal', ' 🔥 ' + p.calories + ' kcal');
    info.appendChild(kcal);
  }

  const pr = el('span', 'pprice', '₺' + fmt(p.price));

  const ags = el('div', 'pags');
  (p.allergens || []).forEach(c => {
    const a = AG_CODE[c];
    if (!a) return;
    const b = el('span', 'ag', c);
    b.style.setProperty('--c', a.color);
    b.title = a.name;
    ags.appendChild(b);
  });

  const pTools = el('div', 'p-tools');
  pTools.append(
    iconBtn(p.visible === false ? '🚫' : '👁', () => toggleProd(p.id), 'Görünürlüğü değiştir'),
    iconBtn('↑', () => move('product', p.id, -1), 'Yukarı taşı'),
    iconBtn('↓', () => move('product', p.id, 1), 'Aşağı taşı'),
    btn('Düzenle', () => openProd(cat.id, p), 'ghost small'),
    btn('Sil', () => delProd(p.id), 'ghost small danger')
  );

  row.append(thumb, info, pr, ags, pTools);
  return row;
}

/* ---- Kategori işlemleri ---- */
$('#addCatBtn').addEventListener('click', () => openCat(null));

function openCat(cat) {
  catDraftId = cat ? cat.id : null;
  catDraftImage = cat ? (cat.image || '') : '';
  $('#catTitle').textContent = cat ? 'Kategori Düzenle' : 'Kategori Ekle';
  $('#catName').value = cat ? cat.name : '';
  updateCatPreview();
  $('#catModal').hidden = false;
  $('#catName').focus();
}

function updateCatPreview() {
  const p = $('#catPreview');
  if (catDraftImage) { p.src = catDraftImage; p.hidden = false; }
  else p.hidden = true;
}

$('#catImgPick').addEventListener('click', () => $('#catImgFile').click());
$('#catImgFile').addEventListener('change', e => {
  const f = e.target.files[0];
  if (!f) return;
  readImage(f, 640, d => { catDraftImage = d; updateCatPreview(); });
});
$('#catImgClear').addEventListener('click', () => { catDraftImage = ''; updateCatPreview(); });

$('#catForm').addEventListener('submit', async e => {
  e.preventDefault();
  const name = $('#catName').value.trim();
  if (!name) return;
  const payload = JSON.stringify({ name, image: catDraftImage });
  let r;
  if (catDraftId) {
    r = await api('/api/admin/categories/' + catDraftId, { method: 'PUT', body: payload });
  } else {
    r = await api('/api/admin/categories', { method: 'POST', body: payload });
  }
  if (r.status === 200) {
    $('#catModal').hidden = true;
    await refresh();
    toast('Kategori kaydedildi');
  } else toast(r.data.error || 'Hata');
});

/* ---- Ürün işlemleri ---- */
function buildAllergenGrid() {
  const grid = $('#agGrid');
  grid.innerHTML = '';
  ALLERGENS.forEach(a => {
    const b = el('button', 'ag-toggle');
    b.type = 'button';
    b.dataset.code = a.code;
    b.title = a.name;
    b.style.setProperty('--c', a.color);
    const code = el('span', 'ag-toggle-code', a.code);
    const label = el('span', 'ag-toggle-label', a.short);
    b.append(code, label);
    b.addEventListener('click', () => b.classList.toggle('on'));
    grid.appendChild(b);
  });
}

const selectedAllergens = () => Array.from($('#agGrid').querySelectorAll('.ag-toggle.on')).map(b => b.dataset.code);
const setAllergens = codes => {
  document.querySelectorAll('#agGrid .ag-toggle').forEach(b =>
    b.classList.toggle('on', codes.includes(b.dataset.code)));
};

$('#addProductBtn').addEventListener('click', () => {
  if (!state.categories.length) { toast('Önce kategori ekleyin'); return; }
  openProd(state.categories[0].id, null);
});

function openProd(catId, p) {
  prodDraft = { id: p ? p.id : null, categoryId: catId, image: p ? (p.image || '') : '' };

  $('#prodTitle').textContent = p ? 'Ürün Düzenle' : 'Ürün Ekle';
  $('#pName').value = p ? p.name : '';
  $('#pDesc').value = p ? (p.description || '') : '';
  $('#pPrice').value = p ? fmt(p.price) : '';
  $('#pCal').value = p && p.calories != null ? String(p.calories) : '';
  $('#pVisible').checked = p ? p.visible !== false : true;

  const sel = $('#pCat');
  sel.innerHTML = '';
  state.categories.forEach(c => {
    const o = el('option', '', c.name);
    o.value = c.id;
    sel.appendChild(o);
  });
  sel.value = catId;

  setAllergens(p ? (p.allergens || []) : []);

  updateProdPreview();
  $('#prodModal').hidden = false;
}

function updateProdPreview() {
  const pv = $('#pPreview');
  pv.innerHTML = '';
  if (prodDraft.image) {
    const im = el('img'); im.src = prodDraft.image; im.alt = 'ürün fotoğrafı';
    pv.appendChild(im);
  } else {
    pv.appendChild(el('span', '', 'Fotoğraf yok'));
  }
}

$('#pImgPick').addEventListener('click', () => $('#pImgFile').click());
$('#pImgFile').addEventListener('change', e => {
  const f = e.target.files[0];
  if (!f) return;
  readImage(f, 480, d => { prodDraft.image = d; updateProdPreview(); });
});
$('#pImgClear').addEventListener('click', () => { prodDraft.image = ''; updateProdPreview(); });

$('#prodForm').addEventListener('submit', async e => {
  e.preventDefault();
  const name = $('#pName').value.trim();
  if (!name) { toast('Ürün adı gerekli'); return; }

  const rawCal = $('#pCal').value.trim();
  const product = {
    name,
    description: $('#pDesc').value.trim(),
    price: Number($('#pPrice').value.replace(',', '.')) || 0,
    calories: rawCal === '' ? null : Number(rawCal.replace(',', '.')) || 0,
    visible: $('#pVisible').checked,
    image: prodDraft.image,
    allergens: selectedAllergens()
  };

  let r;
  if (prodDraft.id) {
    r = await api('/api/admin/products/' + prodDraft.id, { method: 'PUT', body: JSON.stringify({ categoryId: $('#pCat').value, product }) });
  } else {
    r = await api('/api/admin/products', { method: 'POST', body: JSON.stringify({ categoryId: prodDraft.categoryId, product }) });
  }
  if (r.status === 200) {
    $('#prodModal').hidden = true;
    await refresh();
    toast('Ürün kaydedildi');
  } else toast(r.data.error || 'Hata');
});

async function toggleProd(id) {
  for (const c of state.categories) {
    const p = c.products.find(x => x.id === id);
    if (p) {
      const r = await api('/api/admin/products/' + id, {
        method: 'PUT',
        body: JSON.stringify({ categoryId: c.id, product: { ...p, visible: !(p.visible !== false) } })
      });
      if (r.status === 200) { await refresh(); return; }
    }
  }
  toast('Güncellenemedi');
}

async function move(type, id, dir) {
  const r = await api('/api/admin/move', { method: 'POST', body: JSON.stringify({ type, id, dir }) });
  if (r.status === 200) await refresh();
  else toast('Sıralama yapılamadı');
}

async function delCat(id) {
  if (!confirm('Bu kategori ve içindeki tüm ürünler silinecek. Emin misiniz?')) return;
  const r = await api('/api/admin/categories/' + id, { method: 'DELETE' });
  if (r.status === 200) { await refresh(); toast('Kategori silindi'); }
}

async function delProd(id) {
  if (!confirm('Ürün silinecek. Emin misiniz?')) return;
  const r = await api('/api/admin/products/' + id, { method: 'DELETE' });
  if (r.status === 200) { await refresh(); toast('Ürün silindi'); }
}

async function refresh() {
  const r = await api('/api/admin/menu');
  if (r.status === 200) { state = r.data; renderMenuList(); }
}

/* ---- QR ---- */
function renderQR() {
  try {
    const url = location.origin + '/index.html';
    $('#siteUrl').value = url;
    QRCode.toDataURL(url, { width: 480, margin: 2 })
      .then(d => { $('#qrImg').src = d; qrDataUrl = d; })
      .catch(err => console.error(err));
  } catch (e) {
    $('#qrImg').alt = 'QR kütüphanesi yüklenemedi';
    console.error(e);
  }
}

$('#qrDownload').addEventListener('click', () => {
  if (!qrDataUrl) return;
  const a = el('a');
  a.href = qrDataUrl;
  a.download = 'qr-menu.png';
  a.click();
});

/* ---- Resim okuma (PC'den) ---- */
function readImage(file, maxDim, cb) {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      cb(cv.toDataURL('image/jpeg', 0.82));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

buildAllergenGrid();
init();