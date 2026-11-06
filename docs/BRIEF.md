# D22 Takip – Teknik brief

Taslak v0.1 · 06.11.2026 · Açık kararlar [DURUM.md](DURUM.md)'de.

## 1. Amaç ve kapsam

Duality 22 ortaklarının proje/fırsat takip sistemi. Operasyon (sipariş, stok, fatura) **kapsam dışı**;
odak: kim hangi tedarikçiyi getirdi, hangi ürün hangi alıcıya gidebilir, fırsat hangi aşamada, sıradaki adım ne.

Demo (referans arayüz): https://claude.ai/artifact/ACLjCCHaQeCPDMkHazCeox

## 2. Kullanıcılar ve roller

| Kullanıcı | Rol | Yetki |
|---|---|---|
| serhan (Serhan Başak) | yönetici | her şey + kullanıcı yönetimi + silme |
| dogan (Doğan Ali Bey) | ortak | ortak kayıtları ekler/düzenler, kendi çevresini yönetir |
| hilal (Hilal Hanım) | ortak | aynı |
| ibrahim (İbrahim Bey) | ortak | aynı |

- Giriş **kullanıcı adı + şifre**. Supabase Auth e-posta ister; kullanıcı adı `profiles.username`
  üzerinden e-postaya çevrilip `signInWithPassword` çağrılır (küçük bir RPC: `email_for_username`).
- Kayıt ekranı yok; kullanıcıyı yönetici açar (davet maili ya da geçici şifre).
- Silme yalnızca yönetici. Herkes her ortak kaydı düzenleyebilir; her değişiklik geçmişe yazılır.
- **Çevre listeleri (ikinci katman) yalnızca sahibine görünür** — yönetici dahil. Eşleşme önerisi de
  yalnızca o ortağa gider. Ortak "Evet" deyince fırsat ortak alana açılır; müşteri kaydı ancak
  o zaman paylaşılır.

## 3. Mimari

```
Tarayıcı (Next.js, takip.d22global.com)
   │  supabase-js (oturum, RLS'li sorgular)
   ▼
Supabase
   ├─ Postgres + RLS          ← tüm veri
   ├─ Auth                    ← kullanıcı/şifre
   ├─ Edge Functions
   │    ├─ match-scan         ← eşleşme motoru
   │    ├─ drive-sync         ← dosya → Drive firma klasörü + özet
   │    ├─ circle-sync        ← çevre kaynaklarını çeker (CSV, Senitix…)
   │    ├─ digest-weekly      ← ortaklara haftalık özet maili
   │    └─ feed-coordinator   ← Onay Merkezi / sabah maili beslemesi
   └─ pg_cron                 ← zamanlamalar
```

- **Ön yüz:** Next.js (App Router) + TypeScript + Tailwind; Vercel'de barındırma, `takip.d22global.com`
  CNAME. Mobil öncelikli (demo düzeni korunur).
- **Dil:** başlangıçta TR. Tüm arayüz metinleri `messages/tr.json`'da; EN eklemek dosya eklemek kadar.
- **Bölge:** Supabase AB (Frankfurt) — KVKK açısından yurt içine en yakın seçenek.

## 4. Veri modeli

Şema: [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql). Özet:

| Tablo | Görünürlük | İçerik |
|---|---|---|
| `profiles` | tüm ortaklar | kullanıcı adı, ad, rol |
| `suppliers` | tüm ortaklar | tedarikçi; durum: aday / görüşülüyor / anlaşmalı; getiren ortak; Drive klasörü |
| `products` | tüm ortaklar | tedarikçiye bağlı ürün; grup, hedef pazar, fiyat bilgisi |
| `customers` | tüm ortaklar | alıcı/müşteri; sektör, ihtiyaç, kaynak |
| `contacts` | tüm ortaklar | kişi (aracı, yetkili, danışman); bağlı firma |
| `opportunities` | tüm ortaklar | fırsat; tedarikçi → (aracı) → alıcı; 5 aşama; sorumlu; sonraki adım + tarih |
| `opportunity_events` | tüm ortaklar | fırsat geçmişi (not, aşama değişimi, sistem olayı) |
| `files` | tüm ortaklar | dosya kaydı; Drive dosya kimliği; otomatik özet |
| `circles` | **yalnızca sahibi** | ortağın bağladığı çevre kaynağı (ör. "İK Ekspert müşterileri – Senitix") |
| `circle_members` | **yalnızca sahibi** | çevredeki firma; sektör, ülke, ihtiyaç, anahtar kelimeler |
| `matches` | **yalnızca ilgili ortak** | öneri: tedarikçi/ürün ↔ çevre üyesi; skor, gerekçe, durum |
| `activity_log` | tüm ortaklar | "Son hareketler" akışı (tetikleyicilerle otomatik) |

Fırsat aşamaları (demo ile aynı): **Fikir → Temas → Numune / Teklif → Sipariş → Kapandı**
(+ `kaybedildi` bayrağı, panoda gizli).

## 5. Ekranlar (demo ile birebir)

Özet · Fırsatlar (5 sütunlu pano, sürükle-bırak) · Eşleşmeler · Tedarikçiler · Ürünler · Müşteriler ·
Kişiler · Dosyalar · Rapor · **Çevrem** (yeni: ortağın kendi çevre kaynakları, CSV yükleme, bağlantılar).

Formlar demodaki alanlarla aynı. Kaydetme sonrası: kayıt herkese görünür, `activity_log`'a yazılır,
tedarikçi/ürün kaydıysa eşleşme taraması kuyruğa girer.

## 6. Eşleşme motoru

Tetikleyiciler: yeni/değişen tedarikçi veya ürün, yeni çevre üyesi, günde 2 zamanlı tarama.

1. **Ön eleme (Postgres):** `pg_trgm` + Türkçe tam metin araması ile sektör/ürün grubu/anahtar
   kelime benzerliği; her (kaynak, çevre üyesi) çifti için kaba skor. Eşik altı elenir.
2. **Değerlendirme (LLM):** Kalan adaylar Claude API'ye gönderilir; dönen: 0–100 skor + tek cümlelik
   gerekçe ("bakır hammadde kullanıcısı; mevcut ilişki üzerinden teklif sunulabilir").
   Çevre üyesinin yalnızca sektör/ihtiyaç/anahtar kelime alanları gider; iletişim bilgisi gitmez.
3. **Öneri:** Skor ≥ 60 ise `matches` kaydı, durum `bekliyor`, yalnızca çevre sahibine görünür.
4. **Karar:**
   - *Evet* → fırsat (aşama: Fikir) açılır, müşteri ortak alana kopyalanır, Duality 22 imzalı teklif
     maili **taslağı** hazırlanır (gönderilmez; ortak kontrol edip kendisi gönderir).
   - *Sonra* → sabah özetinde tekrar hatırlatılır.
   - *İlgisiz* → kayıt düşer; aynı sektör çifti için sonraki skorlar düşürülür (geri bildirim tablosu).
5. Aynı çift için ikinci kez öneri üretilmez (benzersizlik kısıtı).

**Çevre kaynakları:** CSV/Excel yükleme (ilk sürüm, herkes için) · Senitix bağlantısı (Serhan Bey –
İK Ekspert müşterileri; API anahtarı Supabase secret olarak) · elle ekleme. Diğer ortakların
sistemleri (ajans, mali müşavirlik) için ilk aşamada CSV; ihtiyaç olursa bağlayıcı yazılır.

## 7. Zamanlanmış işler

| İş | Ne zaman | Çıktı |
|---|---|---|
| `match-scan` | 07:30 ve 15:30 (TR) | yeni eşleşme önerileri |
| `feed-coordinator` | taramadan hemen sonra | Onay Merkezi + sabah maili için JSON özet (bekleyen eşleşmeler, tarihi geçen/yaklaşan adımlar) — bağlantı noktası: imzalı webhook ya da okunur görünüm |
| `digest-weekly` | Pazartesi 08:00 | her ortağa kendi özeti: yeni kayıtlar, aşama değişimleri, kendisine bekleyen eşleşmeler, sorumlu olduğu adımlar |
| `drive-sync` | dosya yüklenince | Drive'da `D22 Takip/Tedarikçiler/<Firma>/` klasörüne kopya + 1–3 cümle özet |

Mail gönderimi: Resend (ya da Google Workspace SMTP), gönderen `takip@d22global.com`; SPF/DKIM d22global.com DNS'ine eklenir.

## 8. Dosyalar

- Yükleme önce Supabase Storage'a, ardından `drive-sync` ile Google Drive firma klasörüne (servis hesabı).
- PDF metni çıkarılır → Claude ile kısa özet → `files.summary`; arama bu özette de çalışır.
- Drive klasör kimliği `suppliers.drive_folder_id`'de tutulur.

## 9. Güvenlik

- Tüm tablolarda RLS açık; `anon` rolüne hiçbir tablo açık değil.
- Çevre ve eşleşme tabloları `owner_id = auth.uid()` ile kilitli.
- Secret'lar (Claude API, Senitix, Drive servis hesabı, mail) yalnızca Edge Function ortamında.
- Silme yalnızca yönetici; düzenlemeler `activity_log`'a yazılır.
- Yedek: Supabase günlük yedek + haftalık `pg_dump` Drive'a.

## 10. Yol haritası

| Aşama | İçerik | Ön koşul |
|---|---|---|
| **1 – Temel** | Supabase projesi, şema, giriş, tüm sekmeler (CRUD), fırsat panosu, son hareketler | alan adı, kullanıcı e-postaları |
| **2 – Dosyalar** | Storage + Drive senkronu + otomatik özet | Drive servis hesabı / klasör izni |
| **3 – Eşleşme** | Çevrem sekmesi, CSV yükleme, eşleşme motoru, Eşleşmeler sekmesi | Claude API anahtarı |
| **4 – Bağlantılar** | Senitix bağlantısı, Onay Merkezi/sabah maili beslemesi, haftalık özet maili | Senitix anahtarı, mail alan adı doğrulaması |
| **5 – Cila** | Rapor sekmesi, EN dil, mevcut demo verisinin gerçek kayıtlarla yüklenmesi | — |
