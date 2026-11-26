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
| Alan adı / barındırma | takip.duality22.com — Duality 22'nin kendi sunucusu |
| Dil | Türkçe |
| Supabase | `d22-takip`, Frankfurt, ücretsiz plan — açıldı, şema yüklü |
| Mail gönderen adresi | info@duality22.com (ortak kutu, tüm ortaklarda var) |

## Kullanıcılar
| Kullanıcı adı | Ad | Rol | E-posta |
|---|---|---|---|
| serhan | Serhan Başak | yönetici | serhan@duality22.com |
| dogan | Doğan Ali Ceylan | ortak | dogan@duality22.com |
| hilal | Hilal Hanım | ortak | info@duality22.com (kendi adına adresi olmayacak; ortak kutuyu kullanır) |
| ibrahim | İbrahim Bey | ortak | ibrahim@duality22.com |

## Yayına almak için gerekenler
- Sunucuya erişim (cPanel/FTP/SSH) ve `takip.duality22.com` alt alan adı + SSL
- `info@duality22.com` SMTP bilgileri → Supabase'e girilecek (davet ve şifre maillerini bu adres gönderir)
- Ortak hesapları açılacak (serhan, dogan, ibrahim, hilal)
- Sunucu yönetimi: Taner Muhammet Bulut (Tim Project) — bilgi talebi WhatsApp'tan iletildi

## Bekleyen dış girdiler
- Resmi renk kodları (HEX/RGB) logo dosyalarıyla gelmedi; şimdilik sitedeki renkler kullanılıyor
- Her ortak: bağlamak istediği müşteri çevresi (liste/CSV ya da sistem bağlantısı)

## Dış bağlantı (bu projenin dışında)
Onay Merkezi ve sabah maili bağlantısını Serhan Bey diğer sohbetten sağlar.
Bu sistem o tarafa günde 2 kez eşleşme/adım özeti üretir (bkz. BRIEF.md §7).
