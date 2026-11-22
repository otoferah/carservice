# Ferah Otomotiv — Dijital Servis Yönetim Sistemi

Ferah Otomotiv'in araç kabulünden müşteri teslimine kadar servis operasyonlarını yöneten Next.js + Supabase uygulaması.

## Özellikler
- Personel oturumu ve rol bazlı yetkilendirme.
- Müşteri, plaka, marka/model, teklif tarihi ve teklifi veren bilgileri.
- Sınırsız parça/işçilik kalemi, adet, birim fiyat ve otomatik teklif toplamı.
- Araç fotoğrafı yükleme ve ekranda müşteri imzası alma.
- Servise özel QR takip bağlantısı; QR bağlantısı veya plaka ile müşteri sorgulaması.
- Servis panosu, ekip atama, aşama notları ve zaman çizelgesi.
- Yönetici/supervisor tarafından kayıt düzenleme ve araç teslim onayı.
- Yönetici tarafından personel hesabı oluşturma, rol ve aktiflik yönetimi.
- Teklif ve QR kodunu yazdırarak PDF olarak kaydetme.
- Özel Supabase Storage alanı, RLS ve GitHub Actions build kontrolü.

## Rol sınırları
- **Yönetici (admin):** Tüm kayıtlar, kullanıcı ve rol yönetimi, düzenleme ve araç teslimi.
- **Supervisor:** Tüm servis kayıtları, ekip atamaları, kayıt düzenleme ve araç teslimi.
- **Usta:** Yalnızca kendisine atanan araçların kayıtlarını görür; gelişme notu ve servis aşaması ekler.
- **Müşteri:** Oturum açmadan QR takip bağlantısı veya plaka ile sınırlı servis durumunu sorgular.

Müşteri takip uç noktası yalnızca plaka, marka/model, servis durumu, teklif tarihi ve son gelişme notunu döndürür. Müşteri iletişim bilgileri, fiyatlar, imza ve ekip bilgileri açık sorguya dahil değildir. Plaka sorgusu, talep edilen müşteri kullanımına uygun olarak herkese açık ve sınırlı veri döndüren bir arama sunar.

## Yerel geliştirme
1. Node.js 22+ yükleyin.
2. `npm install`
3. `.env.example` dosyasını `.env.local` olarak kopyalayın.
4. Supabase API ayarlarından anon/publishable anahtarını ekleyin.
5. `npm run dev`

## Ortam değişkenleri
```env
NEXT_PUBLIC_SUPABASE_URL=https://ozwdxxoekvsntdriyvkg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUPABASE_ANON_OR_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=SERVER_SIDE_SERVICE_ROLE_SECRET
```

`SUPABASE_SERVICE_ROLE_KEY` yalnızca admin API tarafından sunucu tarafında kullanılır. Vercel Environment Variables alanında saklayın; GitHub'a veya `NEXT_PUBLIC_*` değişkenine kesinlikle koymayın.

## İlk yönetici
Supabase Auth UID `e7af57b7-089e-412a-8f54-0e4c61900045` için aktif `admin` profili oluşturulmuştur. Bu kullanıcı kendi kayıtlı Auth şifresiyle giriş yapar.

## Vercel bağlantısı
GitHub'da bu depoyu Vercel'e bağlayın. Framework preset Next.js, build komutu `npm run build` olarak algılanmalıdır. Yukarıdaki üç ortam değişkenini Vercel Project Settings → Environment Variables bölümüne ekleyin. `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_ANON_KEY` istemci tarafında kullanılır; service role key yalnızca sunucu tarafında kalır.

## Supabase migration'ları
Şema ve güvenlik migration'ları `supabase/migrations` klasöründedir. Bu oturumda belirtilen Supabase projesine uygulanmış ve tabloların RLS durumu doğrulanmıştır.
