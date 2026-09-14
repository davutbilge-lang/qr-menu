const ALLERGENS = [
  { code: 'G',  name: 'Gluten (buğday, arpa, çavdar…)', color: '#e8630a' },
  { code: 'KV', name: 'Kabuklular', color: '#d6336c' },
  { code: 'YM', name: 'Yumurta', color: '#f2a30b' },
  { code: 'BK', name: 'Balık', color: '#0d6efd' },
  { code: 'YF', name: 'Yer fıstığı', color: '#8a5a2b' },
  { code: 'SY', name: 'Soya', color: '#29a06c' },
  { code: 'SU', name: 'Süt (laktoz dahil)', color: '#7d6ff0' },
  { code: 'KM', name: 'Sert kabuklu meyveler (fındık, ceviz, badem…)', color: '#9b59b6' },
  { code: 'KR', name: 'Kereviz', color: '#16a085' },
  { code: 'HD', name: 'Hardal', color: '#b08a1f' },
  { code: 'SS', name: 'Susam', color: '#a67c52' },
  { code: 'SF', name: 'Sülfit (kükürt dioksit)', color: '#64748b' },
  { code: 'AB', name: 'Acı bakla', color: '#334155' },
  { code: 'YQ', name: 'Yumuşakçalar', color: '#0e7490' }
];
const AG_CODE = Object.fromEntries(ALLERGENS.map(a => [a.code, a]));

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const fmtPrice = n => {
  const v = Number(n) || 0;
  const opts = Number.isInteger(v) ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  return '₺' + v.toLocaleString('tr-TR', opts);
};

const $ = s => document.querySelector(s);

let MENU = null;
let filter = 'all';

async function loadMenu() {
  try {
    const res = await fetch('/api/menu', { cache: 'no-store' });
    if (res.ok) return await res.json();
  } catch (e) { }
  if (window.MENU_DATA) return window.MENU_DATA;
  return null;
}

async function init() {
  const data = await loadMenu();
  if (!data) {
    $('#menu').innerHTML = '<p class="loading">Menü yüklenemedi. Sunucunun çalıştığından emin olun.</p>';
    return;
  }
  MENU = data;
  renderHero(MENU.business);
  renderBar();
  renderMenu();
  renderFooter(MENU.business);
  renderLegend();
  setupModals();
}

function renderHero(b) {
  const hero = $('#hero');
  if (b.bgImage) {
    hero.style.backgroundImage = `url('${b.bgImage}')`;
    hero.classList.add('has-bg');
  }
  if (b.logo) { const img = $('#logo'); img.src = b.logo; img.hidden = false; }
  document.getElementById('bizName').textContent = b.name || 'QR Menü';
  document.getElementById('bizPhrase').textContent = b.phrase || '';
}

/* ---- Kategori çubuğu: Tümü + kategoriler (filtre) ---- */
function renderBar() {
  const bar = $('#catbar');
  const cats = MENU.categories;
  bar.hidden = !cats.length;
  if (!cats.length) return;
  const chipImg = c => c.image ? `<img class="chip-img" src="${esc(c.image)}" alt="" loading="lazy">` : '';
  bar.innerHTML =
    `<a class="chip${filter === 'all' ? ' active' : ''}" href="#" data-filter="all">Tümü</a>` +
    cats.map(c => `<a class="chip${filter === c.id ? ' active' : ''}" href="#" data-filter="${esc(c.id)}">${chipImg(c)}${esc(c.name)}</a>`).join('');
  bar.querySelectorAll('.chip').forEach(ch => {
    ch.addEventListener('click', e => {
      e.preventDefault();
      if (ch.dataset.filter === filter) return;
      filter = ch.dataset.filter;
      renderBar();
      renderMenu();
    });
  });
}

function visibleCats() {
  if (filter === 'all') return MENU.categories;
  const c = MENU.categories.find(x => x.id === filter);
  return c ? [c] : [];
}

function renderMenu() {
  const main = $('#menu');
  const cats = visibleCats();
  if (!cats.length) { main.innerHTML = '<p class="loading">Bu kategoride ürün henüz yok.</p>'; return; }
  main.innerHTML = cats.map(c => `
    <section class="section" id="c-${esc(c.id)}">
      <h2 class="sec-title">${esc(c.name)}</h2>
      <div class="grid">
        ${c.products.map(p => productCard(p)).join('') || '<p class="muted">Bu kategoriye ürün yakında eklenecek.</p>'}
      </div>
    </section>
  `).join('');
}

function productCard(p) {
  const off = p.visible === false;
  const image = p.image
    ? `<img class="thumb" src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">`
    : `<div class="thumb ph">${esc((p.name || '?').charAt(0).toUpperCase() || '?')}</div>`;
  const ags = (p.allergens || []).map(c => {
    const a = AG_CODE[c];
    return a ? `<span class="ag" style="--c:${a.color}" title="${esc(a.name)}">${esc(a.code)}</span>` : '';
  }).join('');
  const kcal = p.calories != null ? `<span class="kcal">🔥 ${esc(String(p.calories))} kcal</span>` : '';
  const interactive = off ? '' : `data-id="${esc(p.id)}" role="button" tabindex="0" aria-label="Ürünü büyüt: ${esc(p.name)}"`;
  return `
    <article class="card${off ? ' dim' : ''}" ${interactive}>
      ${image}
      <div class="card-body">
        <div class="row">
          <h3>${esc(p.name)}</h3>
          <span class="price">${fmtPrice(p.price)}</span>
        </div>
        ${p.description ? `<p class="desc">${esc(p.description)}</p>` : ''}
        ${kcal ? `<div class="meta">${kcal}</div>` : ''}
        <div class="ags">
          ${off ? '<span class="badge off">Geçici olarak kapalı</span>' : (ags || '')}
        </div>
      </div>
    </article>`;
}

function renderFooter(b) {
  const instaHref = b.instagram
    ? (/^https?:/i.test(b.instagram) ? b.instagram : 'https://instagram.com/' + b.instagram.replace(/^@/, ''))
    : '';
  const instaHandle = instaHref
    ? (() => { const m = instaHref.match(/instagram\.com\/([^/?#]+)/i); return m ? m[1] : b.instagram.replace(/^@/, ''); })()
    : '';

  const wifi = b.wifiName ? `
    <div class="cc-wifi">
      <div class="cc-wifi-head">
        <span class="cc-ico">📶</span>
        <strong>${esc(b.wifiName)}</strong>
        ${b.wifiPass ? `<button class="cc-copy" id="wifiCopy" title="Şifreyi kopyala">📋</button>` : ''}
      </div>
      ${b.wifiPass ? `<span class="cc-pass">Şifre: <code id="wifiPassText">${esc(b.wifiPass)}</code></span>` : ''}
    </div>` : '';

  const rows = [];
  if (b.address) rows.push(`<div class="cc-line"><span class="cc-ico">📍</span><span>${esc(b.address)}</span></div>`);
  if (b.phone) rows.push(`<div class="cc-line"><span class="cc-ico">📞</span><a href="tel:${esc(b.phone.replace(/[^+\d]/g, ''))}">${esc(b.phone)}</a></div>`);
  if (b.hours) rows.push(`<div class="cc-line"><span class="cc-ico">🕒</span><span>${esc(b.hours)}</span></div>`);
  if (instaHref) rows.push(`<div class="cc-line"><span class="cc-ico">📷</span><a href="${esc(instaHref)}" target="_blank" rel="noopener">@${esc(instaHandle)}</a></div>`);

  if (!rows.length && !wifi) { $('#footer').innerHTML = ''; return; }

  $('#footer').innerHTML = `
    <div class="contact-card" style="position: fixed; top: 12px; left: 12px; z-index: 35;">
      ${wifi}
      ${rows.join('')}
      <p class="cc-note">* Fiyatlar TL olup KDV dahildir. İçerik ve allerjen bilgileri değişiklik gösterebilir.</p>
    </div>`;

  const copyBtn = $('#wifiCopy');
  if (copyBtn) copyBtn.addEventListener('click', async () => {
    const text = (b.wifiPass || '').trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e2) { }
      ta.remove();
    }
    const orig = copyBtn.textContent;
    copyBtn.textContent = '✓';
    setTimeout(() => { copyBtn.textContent = orig; }, 1200);
  });
}

function renderLegend() {
  const ul = $('#legendList');
  ul.innerHTML = ALLERGENS.map(a => `
    <li>
      <span class="ag" style="--c:${a.color}">${esc(a.code)}</span>
      <span>${esc(a.name)}</span>
    </li>`).join('');
}

/* ---- Ürün detay (büyütme) modalı ---- */
function findProduct(id) {
  for (const c of MENU.categories) {
    const p = c.products.find(x => x.id === id);
    if (p) return p;
  }
  return null;
}

function fillProductModal(p) {
  const img = $('#pmImg');
  img.classList.remove('ph', 'has');
  img.innerHTML = '';
  if (p.image) {
    img.classList.add('has');
    const im = document.createElement('img');
    im.src = p.image;
    im.alt = p.name;
    img.appendChild(im);
  } else {
    img.classList.add('ph');
    img.textContent = (p.name || '?').charAt(0).toUpperCase();
  }
  document.getElementById('pmName').textContent = p.name;
  document.getElementById('pmPrice').textContent = fmtPrice(p.price);
  const desc = $('#pmDesc');
  desc.textContent = p.description || '';
  desc.hidden = !p.description;
  const kcal = $('#pmKcal');
  kcal.textContent = p.calories != null ? `🔥 ${p.calories} kcal` : '';
  kcal.hidden = p.calories == null;

  const ags = $('#pmAgs');
  ags.innerHTML = '';
  const list = p.allergens || [];
  if (list.length) {
    list.forEach(code => {
      const a = AG_CODE[code];
      if (!a) return;
      const chip = document.createElement('span');
      chip.className = 'ag-chip';
      chip.innerHTML = `<span class="ag" style="--c:${a.color}">${esc(a.code)}</span><span>${esc(a.name)}</span>`;
      ags.appendChild(chip);
    });
  } else {
    const m = document.createElement('span');
    m.className = 'muted';
    m.textContent = 'Belirtilen allerjen içermemektedir.';
    ags.appendChild(m);
  }
}

function setupModals() {
  const legend = $('#legendModal');
  const pm = $('#prodModal');

  $('#legendBtn').addEventListener('click', () => { legend.hidden = false; });
  legend.addEventListener('click', e => {
    if (e.target === legend || e.target.closest('[data-close]')) legend.hidden = true;
  });

  pm.addEventListener('click', e => {
    if (e.target === pm || e.target.closest('[data-close]')) pm.hidden = true;
  });

  $('#menu').addEventListener('click', e => {
    const card = e.target.closest('.card[data-id]');
    if (!card) return;
    const p = findProduct(card.dataset.id);
    if (p) { fillProductModal(p); pm.hidden = false; }
  });

  $('#menu').addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const card = e.target.closest('.card[data-id]');
    if (!card) return;
    const p = findProduct(card.dataset.id);
    if (p) { fillProductModal(p); pm.hidden = false; }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { legend.hidden = true; pm.hidden = true; }
  });
}

/* ---- Koyu mod ---- */
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  $('#themeBtn').textContent = t === 'dark' ? '☀️' : '🌙';
  try { localStorage.setItem('qrTheme', t); } catch (e) { }
}
{
  const saved = (localStorage && localStorage.getItem('qrTheme')) ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(saved);
  $('#themeBtn').addEventListener('click', () => {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });
}

init();