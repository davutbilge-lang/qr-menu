# 📱 QR Menü

Kafe & restoranlar için şifre korumalı editörlü, mobil uyumlu QR menü sistemi.

## Özellikler

- 🔐 **Şifre korumalı yönetici paneli** (`/admin.html`)
- 🏪 **İşletme bilgileri** — ad, slogan, adres, telefon, çalışma saatleri, Instagram, logo
- 🗂️ **Kategori ve ürün yönetimi** — ekleme, düzenleme, silme, sıralama (yukarı/aşağı)
- ⚠️ **Allerjen bilgileri** — Türk Gıda Kodeksi'ne uygun 14 allerjen, ürününüzde seçilir, menüde renkli rozetle gösterilir
- 📷 **Resim yükleme** — PC'den fotoğraf seçilir, otomatik küçültülür (logo ve ürün)
- 💵 **Fiyatlar TL** olarak gösterilir
- 🚫 **Görünürlük** — "biten ürün" menüde kapalı olarak işaretlenebilir
- 📱 **Modern, mobil uyumlu** menü sayfası
- 🔲 **QR kod üretici** — panelden indirilip masalara/ürünlere yerleştirilebilir

## Kurulum & Çalıştırma

```bash
npm install       # gerek yok — saf Node.js, bağımlılık yok
npm start         # veya: node server.js
```

- Menü (müşteri görünümü): http://localhost:3000
- Yönetici paneli: http://localhost:3000/admin.html

## Yönetici Şifresi

`config.json` dosyasındaki `adminPassword` değerini değiştirin (varsayılan: `admin123`):

```json
{ "adminPassword": "sifrenizi-yazin" }
```

Sunucuyu yeniden başlattığınızda yeni şifre geçerli olur.

## Canlı Yayına Alma (qr kodun gerçekte çalışması için)

QR kod telefonda açılabilmesi için menünün internetten erişilebilir bir URL'de olması gerekir:

**Seçenek A — Statik barındırma:** `index.html`, `style.css`, `menu.js` dosyalarını Netlify / Vercel / GitHub Pages'e yükleyin. Not: statik barındırmada **yönetici paneli çalışmaz**; yalnızca sunucu üzerindeki panel ve `data.json` düzenlenebilir.

**Seçenek B — Sunucu ile (önerilen):** `server.js`'i VPS/Linux sunucuya taşıyın:
```bash
node server.js
```
Panelden **QR Kod** sekmesinde menü linkini görün, QR'ı indirip yazdırın.

## Veriler

- `data.json` — işletme, kategori ve ürünler (resimler dahil)
- `config.json` — yönetici şifresi
- Panelde yaptığınız her değişiklik `data.json`'a anında yazılır
- Yedek almak için bu dosyayı kopyalamanız yeterlidir

## Allerjenler (14 tür)

| Kod | Allerjen |
|-----|----------|
| G | Gluten |
| KV | Kabuklular |
| YM | Yumurta |
| BK | Balık |
| YF | Yer fıstığı |
| SY | Soya |
| SU | Süt (laktoz) |
| KM | Sert kabuklu meyveler |
| KR | Kereviz |
| HD | Hardal |
| SS | Susam |
| SF | Sülfit |
| AB | Acı bakla |
| YQ | Yumuşakçalar |

## Dosyalar

```
server.js          Sunucu + REST API + oturum (şifreli)
config.json        Yönetici şifresi
data.json          Veri (otomatik oluşur)
index.html         Müşteri menüsü
menu.js            Menü çizimi
style.css          Menü tasarımı
admin.html         Yönetici paneli
admin.js           Panel mantığı
admin.css          Panel tasarımı
qr-generator.html  Ekstra QR aracı
```