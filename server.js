const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(ROOT, 'data.json');
const CFG_FILE = path.join(ROOT, 'config.json');

let config = { adminPassword: 'admin123' };
try {
  if (fs.existsSync(CFG_FILE)) config = { ...config, ...JSON.parse(fs.readFileSync(CFG_FILE, 'utf8')) };
} catch (e) { /* yoksay */ }

const ALLERGEN_CODES = new Set(['G','KV','YM','BK','YF','SY','SU','KM','KR','HD','SS','SF','AB','YQ']);

let db = { business: {}, categories: [] };

function uid() { return crypto.randomUUID(); }

function seedData() {
  return {
    business: {
      name: 'Lezzet Durağı',
      phrase: 'Taze ve ev yapımı lezzetler',
      address: 'Atatürk Caddesi No:42, İstanbul',
      phone: '0212 555 12 34',
      hours: 'Her gün 09:00 - 23:00',
      instagram: '',
      logo: "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect width='120' height='120' rx='24' fill='%23c2410c'/%3E%3Ctext x='60' y='82' font-size='62' text-anchor='middle'%3E🍽️%3C/text%3E%3C/svg%3E",
      bgImage: '',
      wifiName: '',
      wifiPass: ''
    },
    categories: [
      {
        id: 'c1', name: 'Başlangıçlar', products: [
          { id: 'p1', name: 'Mercimek Çorbası', description: 'Geleneksel tarif, taze limon ile', price: 45, allergens: ['G','SU'], image: '', visible: true },
          { id: 'p2', name: 'Haydari', description: 'Yoğurt, sarımsak, kuru nane', price: 55, allergens: ['SU'], image: '', visible: true },
          { id: 'p3', name: 'Akdeniz Salatası', description: 'Domates, salatalık, zeytin, beyaz peynir', price: 70, allergens: ['SU','KR'], image: '', visible: true }
        ]
      },
      {
        id: 'c2', name: 'Ana Yemekler', products: [
          { id: 'p4', name: 'Izgara Köfte', description: 'El yapımı köfte, közlenmiş sebze, pilav', price: 180, allergens: ['G'], image: '', visible: true },
          { id: 'p5', name: 'Adana Kebap', description: 'El kıyması, baharatlar', price: 200, allergens: ['G','SU'], image: '', visible: true },
          { id: 'p6', name: 'Tavuk Şiş', description: 'Marine edilmiş tavuk, bulgur pilavı', price: 150, allergens: ['G'], image: '', visible: true },
          { id: 'p7', name: 'Fırın Levrek', description: 'Taze levrek, roka salatası, limon', price: 220, allergens: ['BK'], image: '', visible: true }
        ]
      },
      {
        id: 'c3', name: 'Pizzalar', products: [
          { id: 'p8', name: 'Margarita', description: 'Mozzarella, domates sosu, fesleğen', price: 140, allergens: ['G','SU'], image: '', visible: true },
          { id: 'p9', name: 'Karışık Pizza', description: 'Sucuk, mantar, mısır, yeşil biber', price: 165, allergens: ['G','SU'], image: '', visible: true }
        ]
      },
      {
        id: 'c4', name: 'İçecekler', products: [
          { id: 'p10', name: 'Taze Limonata', description: 'Ev yapımı, taze nane ile', price: 40, allergens: [], image: '', visible: true },
          { id: 'p11', name: 'Ayran', description: 'Taze yoğurt, tuz', price: 25, allergens: ['SU'], image: '', visible: true },
          { id: 'p12', name: 'Coca-Cola', description: '330 ml', price: 35, allergens: [], image: '', visible: true },
          { id: 'p13', name: 'Türk Çayı', description: 'Demlik usulü', price: 20, allergens: [], image: '', visible: true }
        ]
      },
      {
        id: 'c5', name: 'Tatlılar', products: [
          { id: 'p14', name: 'Künefe', description: 'Antep fıstıklı, taze kaymak', price: 90, allergens: ['G','SU','KM'], image: '', visible: true },
          { id: 'p15', name: 'Tiramisu', description: 'İtalyan usulü, kahveli', price: 85, allergens: ['G','YM','SU'], image: '', visible: true }
        ]
      }
    ]
  };
}

function loadDb() {
  try {
    if (fs.existsSync(DATA_FILE)) db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    else { db = seedData(); saveDb(); }
  } catch (e) { db = seedData(); }
}
function saveDb() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

const sessions = new Set();

function parseCookies(req) {
  const out = {};
  const h = req.headers.cookie;
  if (h) h.split(';').forEach(p => { const i = p.indexOf('='); if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return out;
}

// Oturum: Authorization: Bearer <token> / X-Auth-Token başlığı VEYA cookie kabul edilir
function getToken(req) {
  const c = parseCookies(req);
  if (c.adminToken) return c.adminToken;
  const ah = req.headers['authorization'] || '';
  const m = ah.match(/^Bearer\s+(.+)$/i);
  if (m) return m[1].trim();
  const x = req.headers['x-auth-token'];
  if (x) return String(x).trim();
  return null;
}
function isAdmin(req) { const t = getToken(req); return !!t && sessions.has(t); }
function requireAdmin(req, res) {
  if (!isAdmin(req)) { sendJson(res, 401, { error: 'Oturum gerekli' }); return false; }
  return true;
}

function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

function readBody(req, max = 52 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > max) { reject(new Error('Cok buyuk istek')); req.destroy(); }
      else chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw.trim()) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { resolve({}); }
    });
    req.on('error', reject);
  });
}

function cleanProduct(src, id) {
  return {
    id,
    name: ((typeof src.name === 'string' ? src.name : '') || '').trim() || 'İsimsiz Ürün',
    description: (typeof src.description === 'string' ? src.description : '').trim(),
    price: Number.isFinite(Number(src.price)) ? Math.max(0, Number(src.price)) : 0,
    allergens: Array.isArray(src.allergens) ? src.allergens.filter(a => ALLERGEN_CODES.has(a)) : [],
    calories: (src.calories === '' || src.calories === null || src.calories === undefined)
      ? null
      : (Number.isFinite(Number(src.calories)) ? Math.max(0, Math.round(Number(src.calories))) : null),
    image: typeof src.image === 'string' ? src.image : '',
    visible: src.visible !== false
  };
}

function moveItem(body) {
  const dir = body.dir > 0 ? 1 : -1;
  if (body.type === 'category') {
    const i = db.categories.findIndex(c => c.id === body.id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= db.categories.length) return false;
    const t = db.categories[i]; db.categories[i] = db.categories[j]; db.categories[j] = t;
    return true;
  }
  if (body.type === 'product') {
    for (const cat of db.categories) {
      const i = cat.products.findIndex(p => p.id === body.id);
      if (i >= 0) {
        const j = i + dir;
        if (j < 0 || j >= cat.products.length) return false;
        const t = cat.products[i]; cat.products[i] = cat.products[j]; cat.products[j] = t;
        return true;
      }
    }
  }
  return false;
}

async function handleApi(req, res, url) {
  const p = url.pathname;
  const method = req.method;

  if (p === '/api/menu' && method === 'GET') {
    return sendJson(res, 200, { business: db.business, categories: db.categories });
  }

  if (p === '/api/admin/login' && method === 'POST') {
    const body = await readBody(req);
    if (body.password === config.adminPassword) {
      const token = crypto.randomBytes(24).toString('hex');
      sessions.add(token);
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Set-Cookie': `adminToken=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
      });
      res.end(JSON.stringify({ ok: true, token }));
      return;
    }
    return sendJson(res, 401, { error: 'Hatalı şifre' });
  }

  if (p === '/api/admin/logout' && method === 'POST') {
    const t = getToken(req);
    if (t) sessions.delete(t);
    const c = parseCookies(req);
    if (c.adminToken) sessions.delete(c.adminToken);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Set-Cookie': 'adminToken=; Path=/; HttpOnly; Max-Age=0' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (p.startsWith('/api/admin/')) {
    if (!requireAdmin(req, res)) return;
  }

  const body = ['POST', 'PUT', 'DELETE'].includes(method) ? await readBody(req) : {};

  if (p === '/api/admin/menu' && method === 'GET') {
    return sendJson(res, 200, { business: db.business, categories: db.categories });
  }

  if (p === '/api/admin/business' && method === 'PUT') {
    const allowed = {};
    ['name', 'phrase', 'address', 'phone', 'hours', 'instagram', 'logo', 'bgImage', 'wifiName', 'wifiPass'].forEach(k => {
      if (typeof body[k] === 'string') allowed[k] = body[k];
    });
    db.business = { ...db.business, ...allowed };
    saveDb();
    return sendJson(res, 200, { ok: true, business: db.business });
  }

  if (p === '/api/admin/password' && method === 'POST') {
    if (String(body.current) !== config.adminPassword) return sendJson(res, 401, { error: 'Mevcut şifre hatalı' });
    const next = String(body.next || '');
    if (next.length < 6) return sendJson(res, 400, { error: 'Yeni şifre en az 6 karakter olmalı' });
    config.adminPassword = next;
    try {
      fs.writeFileSync(CFG_FILE, JSON.stringify(config, null, 2));
    } catch (e) {
      return sendJson(res, 500, { error: 'Şifre kaydedilemedi' });
    }
    return sendJson(res, 200, { ok: true });
  }

  if (p === '/api/admin/categories' && method === 'POST') {
    const name = (body.name || '').trim();
    if (!name) return sendJson(res, 400, { error: 'Kategori adı boş olamaz' });
    const cat = { id: uid(), name, image: typeof body.image === 'string' ? body.image : '', products: [] };
    db.categories.push(cat);
    saveDb();
    return sendJson(res, 200, { ok: true, category: cat });
  }

  let m;
  if ((m = p.match(/^\/api\/admin\/categories\/([^/]+)$/)) && method === 'PUT') {
    const cat = db.categories.find(c => c.id === m[1]);
    if (!cat) return sendJson(res, 404, { error: 'Kategori bulunamadı' });
    const name = (body.name || '').trim();
    if (name) cat.name = name;
    if (typeof body.image === 'string') cat.image = body.image;
    saveDb();
    return sendJson(res, 200, { ok: true, category: cat });
  }

  if ((m = p.match(/^\/api\/admin\/categories\/([^/]+)$/)) && method === 'DELETE') {
    db.categories = db.categories.filter(c => c.id !== m[1]);
    saveDb();
    return sendJson(res, 200, { ok: true });
  }

  if (p === '/api/admin/products' && method === 'POST') {
    const cat = db.categories.find(c => c.id === body.categoryId);
    if (!cat) return sendJson(res, 404, { error: 'Kategori bulunamadı' });
    const pr = cleanProduct(body.product || {}, uid());
    cat.products.push(pr);
    saveDb();
    return sendJson(res, 200, { ok: true, product: pr });
  }

  if ((m = p.match(/^\/api\/admin\/products\/([^/]+)$/)) && method === 'PUT') {
    let found = null, fromCat = null;
    for (const c of db.categories) {
      const pp = c.products.find(x => x.id === m[1]);
      if (pp) { found = pp; fromCat = c; break; }
    }
    if (!found) return sendJson(res, 404, { error: 'Ürün bulunamadı' });
    Object.assign(found, cleanProduct({ ...found, ...(body.product || {}) }, found.id));
    const target = db.categories.find(c => c.id === body.categoryId);
    if (target && target.id !== fromCat.id) {
      fromCat.products = fromCat.products.filter(x => x.id !== found.id);
      target.products.push(found);
    }
    saveDb();
    return sendJson(res, 200, { ok: true, product: found });
  }

  if ((m = p.match(/^\/api\/admin\/products\/([^/]+)$/)) && method === 'DELETE') {
    for (const c of db.categories) {
      const before = c.products.length;
      c.products = c.products.filter(x => x.id !== m[1]);
      if (c.products.length !== before) { saveDb(); return sendJson(res, 200, { ok: true }); }
    }
    return sendJson(res, 404, { error: 'Ürün bulunamadı' });
  }

  if (p === '/api/admin/move' && method === 'POST') {
    if (!moveItem(body)) return sendJson(res, 400, { error: 'Sıralama yapılamadı' });
    saveDb();
    return sendJson(res, 200, { ok: true });
  }

  sendJson(res, 404, { error: 'Bulunamadı' });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
};

function serveStatic(req, res, pathname) {
  const rel = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.normalize(path.join(ROOT, rel));
  if (!filePath.startsWith(ROOT)) return sendJson(res, 403, { error: 'Yasak' });
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404 - Sayfa bulunamadı</h1>');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    handleApi(req, res, url).catch(() => { try { sendJson(res, 500, { error: 'Sunucu hatası' }); } catch (e) { } });
  } else {
    serveStatic(req, res, url.pathname);
  }
});

loadDb();
server.listen(PORT, () => {
  console.log(`✅ QR Menü çalışıyor: http://localhost:${PORT}`);
  console.log(`   Menu (halka açık): http://localhost:${PORT}/`);
  console.log(`   Admin panel: http://localhost:${PORT}/admin.html`);
});