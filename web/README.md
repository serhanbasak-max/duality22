# D22 Takip – web uygulaması

React + Vite, verisi Supabase'de (`d22-takip`). Derlenen çıktı sabit dosyalardan oluşur;
herhangi bir web sunucusuna (Apache/Nginx/cPanel) klasör olarak yüklenir. Sunucuda PHP/Node gerekmez.

## Geliştirme
```bash
npm install
npm run dev
```

## Yayına alma
```bash
npm run build
```
`dist/` klasörünün içeriği sunucuda `takip.d22global.com` alan adının kök klasörüne yüklenir. HTTPS şart.
Sayfa yönlendirmesi `#/` ile yapıldığı için sunucuda ek ayar gerekmez.

Yükledikten sonra Supabase › Authentication › URL Configuration:
- Site URL: `https://takip.d22global.com`
- Redirect URLs: `https://takip.d22global.com/**`

## Ortam değişkenleri (`.env`)
`VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY` (publishable anahtar; tarayıcıda görünür, erişim RLS ile korunur).
