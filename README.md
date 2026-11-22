# Ferah Otomotiv — Servis Yönetim Sistemi

Ferah Otomotiv için teklif, servis kabul, ekip görevlendirme, servis ilerleme takibi, müşteri QR/plaka sorgulama ve PDF teklif altyapısı.

## Teknoloji
- Next.js App Router + TypeScript
- Supabase Auth, PostgreSQL, Storage ve Row Level Security
- Vercel deployment

## Kurulum
1. `npm install`
2. `.env.example` dosyasını `.env.local` olarak kopyalayın.
3. Supabase URL ve anon/publishable key değerlerini girin.
4. `npm run dev`

## Yetki modeli
- **admin:** Kullanıcı oluşturma/rol yönetimi, tüm servis kayıtlarını düzenleme, araç teslimi.
- **supervisor:** Servis kayıtları, ekip atamaları, durum güncelleme, araç teslimi.
- **usta:** Atandığı araçlarda gelişme notu ve durum güncelleme.
- **müşteri:** Giriş yapmadan QR token veya plaka üzerinden sınırlı servis durumu sorgulama.

> Müşteri sorgu fonksiyonu yalnızca plaka/marka/model, servis durumu, teklif tarihi ve son gelişme notunu döndürür. Müşteri bilgileri, fiyatlar, telefon/e-posta, imza ve dahili ekip bilgileri açık sorgu çıktısına dahil değildir.

## İlk yönetici
İlk yönetici profili, Supabase Auth UID `e7af57b7-089e-412a-8f54-0e4c61900045` ile eşleştirilmiştir. Bu UID'ye ait Auth kullanıcısının var olması gerekir.

## Vercel
GitHub deposunu Vercel'e bağlayın. Build komutu `npm run build`; environment variables `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_ANON_KEY` (veya publishable key) girilmelidir. Sunucu tarafında kullanıcı yönetimi açıldığında `SUPABASE_SERVICE_ROLE_KEY` yalnızca Vercel Environment Variables içinde saklanmalı; `NEXT_PUBLIC_` öneki kesinlikle kullanılmamalıdır.

## Supabase SQL
Migration dosyaları `supabase/migrations` altındadır. Mevcut veritabanına ilk şema migration'ı bu kurulum sırasında uygulanmıştır.
