// GitHub Pages için statik menü üretir: docs/ klasörüne
// Şu dosyalar KOPYALANMAZ (sunucu/yönetim gerektirir):
//   admin.html, admin.js, admin.css, config.json, data.json, server.js
// Çalıştır: node build-static.js
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'docs');

const copy = (f) => {
  if (!fs.existsSync(path.join(ROOT, f))) return;
  fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f));
  console.log('  kopyalandi:', f);
};

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) fs.rmSync(path.join(OUT, f), { recursive: true, force: true });

let db;
try {
  db = JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'));
} catch (e) {
  console.error('data.json okunamadi:', e.message);
  process.exit(1);
}

const js = 'window.MENU_DATA = ' + JSON.stringify(db) + ';';
fs.writeFileSync(path.join(OUT, 'data.js'), js, 'utf8');
console.log('  olusturuldu: data.js (', (js.length / 1024).toFixed(1), 'KB )');

let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
html = html.replace(/\s*<a href="admin\.html"[^>]*>.*?<\/a>/, '');
if (!html.includes('src="data.js"')) {
  html = html.replace('<script src="menu.js"></script>', '<script src="data.js"></script>\n    <script src="menu.js"></script>');
}
fs.writeFileSync(path.join(OUT, 'index.html'), html, 'utf8');
console.log('  kopyalandi: index.html (statik veri eklendi, yonetici linki kaldirildi)');

['style.css', 'menu.js'].forEach(copy);

console.log('\ndocs/ guncellendi. Yayinlamak icin hepsini GitHub\'a push edin.');
console.log('GitHub Pages ayari: Settings > Pages > Source: Deploy from a branch > /docs');