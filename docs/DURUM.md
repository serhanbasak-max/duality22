# Proje durumu

_Son güncelleme: 26.11.2026_

## Geçmiş
- **05.11** – Genel Koordinatör başlangıcı yaptı: demo sayfa, tanıtım videosu, marka renkleri.
- **06.11** – Proje bu depoya devredildi. Teknik brief ve veri tabanı şema taslağı yazıldı.
- **16.11** – Doğan Ali Bey logo dosyalarını gönderdi (renkli/beyaz/siyah, vektörel PDF + PNG, simge, LinkedIn kapak, mail imzası). Drive'a kaydedildi.
- **23.11** – Kararlar netleşti (aşağıda).
- **26.11** – Web uygulamasının 1. aşaması yazıldı (`web/`): giriş, Özet, Fırsatlar panosu (sürükle-bırak), Eşleşmeler, Tedarikçiler, Ürünler, Müşteriler, Kişiler, Dosyalar (Drive bağlantısı), Rapor, Hesabım. Canlı veri tabanında uçtan uca test edildi, test verisi silindi.
- **26.11** – Supabase projesi `d22-takip` açıldı (Frankfurt, ücretsiz plan, ref `rdzpqgfryruibldlowkt`). Şema yüklendi, güvenlik denetimi uyarıları kapatıldı, tetikleyiciler canlıda test edildi.

## Hazır olanlar
- Demo: https://claude.ai/artifact/ACLjCCHaQeCPDMkHazCeox
  (Özet, Fırsatlar – 5 aşamalı pano, Eşleşmeler, Tedarikçiler, Ürünler, Müşteriler, Kişiler, Dosyalar, Rapor)
- Video: https://claude.ai/artifact/11L8PNoHVzzPS3xw72hB3F
- Teknik brief: [BRIEF.md](BRIEF.md)
- Şema taslağı: [../supabase/migrations/0001_init.sql](../supabase/migrations/0001_init.sql) (henüz Supabase'e uygulanmadı)

## Kararlar
| Konu | Karar |
|---|---|
| 5.11 ortak toplantısı | Ortaklar demoyu beğendi, onayladı, kullanacaklar |
| Alan adı / barındırma | takip.d22global.com — Duality 22'nin kendi sunucusu |
| Dil | Türkçe |
| Supabase | `d22-takip`, Frankfurt, ücretsiz plan — açıldı, şema yüklü |
| Mail gönderen adresi | info@d22global.com — tüm ortakların birlikte kullandığı ve gördüğü ortak kutu |

## Kullanıcılar
| Kullanıcı adı | Ad | Rol | E-posta |
|---|---|---|---|
| serhan | Serhan Başak | yönetici | serhan@d22global.com |
| dogan | Doğan Ali Ceylan | ortak | dogan@d22global.com |
| hilal | Hilal Hanım | ortak | info@d22global.com (kendi adına adresi yok; giriş hesabı bu adrese bağlı) |
| ibrahim | İbrahim Bey | ortak | ibrahim@d22global.com |

- 26.11: Mevcut veriler Drive'dan aktarıldı (Serhan Bey adına): "Duality 22 - Tedarikçi Listesi" tablosundan 6 tedarikçi + 6 kişi, 9 ürün; "Tedarikçi katalogları" klasöründen 10 dosya (Drive bağlantısıyla).

## Kalanlar
- Drive'daki "Tedarikçi katalogları" klasörü ortaklarla paylaşılmadı; dosya bağlantıları şimdilik yalnızca Serhan Bey'de açılır
- Ortakların ilk girişte Hesabım'dan geçici şifrelerini değiştirmesi
- Supabase mail (SMTP) ayarı yapılmadı — Serhan Bey kararı (26.11). Şifresini unutan olursa yeni geçici şifre SQL ile verilir.
  Gerekirse: mail.d22global.com, port 465, kullanıcı info@d22global.com (SPF: kurumsalbulutmail.com; DKIM yok).
- Supabase Auth'ta dışarıdan kayıt açık (profil olmadan hiçbir veri görünmez); site adresi ayarı yapılmadı.
- `info@d22global.com` SMTP bilgileri → Supabase'e girilecek (davet ve şifre maillerini bu adres gönderir)
- Sunucu yönetimi: Taner Muhammet Bulut (Tim Project). Sunucu Plesk.
- 26.11: `takip.d22global.com` Taner Bey tarafından açıldı (217.131.14.13). Let's Encrypt SSL kurulu (24.02.2027'ye kadar, otomatik yenileme), HTTP→HTTPS yönlendirme açık.
- 26.11: Serhan Bey Plesk Dosya Yöneticisi ile paketi `takip.d22global.com` köküne yükledi. **Site yayında: https://takip.d22global.com**
- 26.11: Dört ortağın hesabı geçici şifreyle açıldı (serhan yönetici; dogan, hilal, ibrahim ortak). Canlı sitede giriş test edildi..
- Plesk paneli bu bulut ortamından erişilemiyor (IP + 8880 portu); güncellemeler için FTP/SFTP hesabı istenecek.

## Bekleyen dış girdiler
- Resmi renk kodları (HEX/RGB) logo dosyalarıyla gelmedi; şimdilik sitedeki renkler kullanılıyor
- Her ortak: bağlamak istediği müşteri çevresi (liste/CSV ya da sistem bağlantısı)

## Dış bağlantı (bu projenin dışında)
Onay Merkezi ve sabah maili bağlantısını Serhan Bey diğer sohbetten sağlar.
Bu sistem o tarafa günde 2 kez eşleşme/adım özeti üretir (bkz. BRIEF.md §7).
