# Ferah Otomotiv Windows İstemcisi

Bu istemci, Ferah Otomotiv web uygulamasını Chromium tabanlı Electron motoruyla tam ekran açar.

- Hedef: Windows 10 ve Windows 11, 64-bit
- Kullanıcı bilgisayarına Node.js veya Git kurulması gerekmez.
- Uygulama internet bağlantısı gerektirir.
- Google OAuth ve Supabase HTTPS alan adları uygulama içinde çalışacak şekilde izin listesine alınmıştır.
- Uygulama dışındaki HTTPS bağlantıları varsayılan tarayıcıda açılır.

## Kurulum paketi

GitHub Actions > **Build Windows Desktop Installer** iş akışını çalıştırın. Başarılı çalışmanın `Ferah-Otomotiv-Windows-Setup` adlı artifact dosyasından `.exe` kurulum paketini indirin.

## Yerel geliştirme

```powershell
cd desktop
npm install
npm start
npm run dist
```

Kurulum varsayılan olarak kullanıcı profiline yapılır; yönetici yetkisi gerekmez. Masaüstü ve Başlat menüsüne kısayol eklenir.
