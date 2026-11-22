# Ferah Otomotiv — Dijital Servis Yönetim Sistemi

Ferah Otomotiv'in araç kabulü, teklif, onarım, müşteri bilgilendirme ve teslim operasyonlarını yöneten Next.js 15 + Supabase uygulaması.

## Modüller
- Yönetici / Supervisor personel oturumu ve rol bazlı ekran yetkileri.
- Müşteri ve araç kabulü: isim, telefon, e-posta, plaka, marka/model, teklif tarihi ve teklifi veren.
- Sınırsız parça ve işçilik satırı, adet, birim fiyat ve otomatik teklif toplamı.
- Birden çok araç fotoğrafı, müşteri imza alanı.
- Her servis kaydına ayrı UUID takip anahtarı ve QR.
- Yönetim panelinde servis dosyası, ekip ataması, aşama notları ve servis geçmişi.
- Yönetici/Supervisor tarafından kayıt ve geçmiş notu düzenleme.
- Yalnızca yönetici/Supervisor tarafından ve araç "Hazır" olduktan sonra teslim.
- Yalnızca yönetici tarafından personel hesabı, rol ve aktiflik yönetimi.
- Teklif PDF'si için yazdır / PDF kaydet.
- Private Supabase Storage, RLS, build/typecheck iş akışı.

## Roller
- **admin:** tüm servis kayıtları, personel ve rol yönetimi, kayıt düzenleme, teslim onayı.
- **supervisor:** tüm servis kayıtları, ekip görevlendirme, kayıt düzenleme, teslim onayı.
- **usta:** yalnızca atandığı iş emirlerini görür; gelişme ve aşama notu ekler.
- **müşteri:** personel girişi olmadan QR veya plaka üzerinden sınırlı durum sorgular.

## Müşteri sorgulama gizliliği
Plaka, kolayca tahmin edilebilir olduğu için yalnızca aktif servis kaydının genel durumunu (plaka/marka/model/aşama/teklif tarihi) verir; gelişme notları, müşteri adı/iletişimi, fiyatlar, imza, ekip ve servis geçmişi vermez. Teslime/iptale geçmiş kayıtlar plaka aramasında döndürülmez. Kayda özel QR token'ı ile yalnızca o servis dosyasının gelişme çizelgesi açılır. QR token'ı bir servis ziyaretini temsil eder; plaka veya araç sahibinin kalıcı kimliği değildir.

## Yerel geliştirme
1. Node.js 22+ kurun.
2. `npm install`
3. `.env.example` dosyasını `.env.local` olarak kopyalayın ve değerleri girin.
4. `npm run dev`

## Vercel ortam değişkenleri
Project Settings → Environment Variables alanına aşağıdakileri ekleyin:
```env
NEXT_PUBLIC_SUPABASE_URL=https://ozwdxxoekvsntdriyvkg.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```
`SUPABASE_SECRET_KEY` yalnızca sunucu tarafındaki kullanıcı yönetimi API'sinde kullanılır. Bunu asla `NEXT_PUBLIC_*` değişkeni yapmayın, GitHub'a eklemeyin veya tarayıcıya açmayın. Eski anahtar adları için geriye uyumluluk vardır.

## Supabase veritabanı kurulumu
SQL migration dosyaları `supabase/migrations/` içindedir. Sıralı olarak Supabase CLI ile uygulayın:
```bash
npx supabase link --project-ref ozwdxxoekvsntdriyvkg
npx supabase db push
```
Supabase hesabında SQL editor ile kurulum tercih edilirse migration'lar aynı klasörde tarih sırasıyla çalıştırılmalıdır. Migration'lar idempotent olmayan başlangıç nesneleri içerebileceğinden aynı migration'ı ikinci kez elle çalıştırmayın; CLI migration geçmişini takip eder.

## İlk yönetici hesabı
Migration, aşağıdaki Supabase Auth UID için admin profili oluşturur:
`e7af57b7-089e-412a-8f54-0e4c61900045`
Bu UID'nin ilgili projedeki Auth kullanıcısına ait olduğunu doğrulayın. Kullanıcı e-postası/şifresi Auth tarafında önceden tanımlı olmalıdır.

## Vercel'e bağlama
1. Vercel'de **Add New → Project** seçin ve `otoferah/carservice` GitHub deposunu içe aktarın.
2. Framework **Next.js** olarak algılanmalıdır; build komutu `npm run build`.
3. Yukarıdaki Environment Variables değerlerini Preview ve Production ortamları için tanımlayın.
4. Deploy edin. Veritabanı migration'ları ve Auth/Storage ayarları tamamlanmadan uygulama canlı veriyle kullanıma hazır sayılmaz.

## CI
GitHub Actions, push ve pull request'te bağımlılık denetimi, TypeScript ve Next.js build adımlarını çalıştırır.
