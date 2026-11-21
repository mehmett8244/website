# Son Kural Bükücü
BREAK THE RULES. CREATE YOUR WORLD.

## Kurulum
1. `.env.example` dosyasını `.env.local` olarak kopyalayın. URL yalnızca `https://xxxx.supabase.co` olmalı (sonuna yol eklemeyin).
2. Supabase > SQL Editor'de `supabase/TUMU.sql` dosyasının tamamını bir kez çalıştırın.
3. Authentication > URL Configuration > Site URL: `http://localhost:3000`
4. `npm install` ardından `npm run dev`

## Mevcut özellikler
Instagram tarzı arayüz (PC kenar menü + sağ öneriler, mobil alt menü), akış sekmeleri, ara, bildirimler (gerçek zamanlı), oluştur, hikâye, not, yorum, profil. Mesajlar (birebir+grup, okundu, çevrimiçi, tepki, sabitleme, silme, arama, fotoğraf). Sıradaki: Reels, takipçi listeleri.

## Yayına alma
1. `supabase/TUMU.sql` (veya sadece eksik migration'lar) çalıştırılır.
2. İlk yönetici: SQL Editor'de `update profiles set role='admin' where username='KULLANICI_ADIN';`
3. Vercel ortam değişkenleri: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (hesap silme için, yalnızca sunucuda).
4. Supabase > Authentication > URL Configuration: Site URL ve Redirect URL = yayın adresi. Özel SMTP bağlayın.
5. `src/components/Legal.tsx` içindeki `[İLETİŞİM E-POSTASI]` ve `[İŞLETME / KİŞİ ADI]` alanlarını doldurun; metinleri bir hukukçuya gösterin.
Mor tema, logo, kapak/profil rengi, hikâye sesi, @etiketleme, sesli mesaj, kamera, fotoğraf büyütme. Migration 007.

Hikâye müziği: YouTube Data API ile arama + YouTube gömülü oynatıcı. YOUTUBE_API_KEY gerekli. Migration 008.

Paket 2: gönderi sayfası /p/ID, hashtag+trend, @öneri, hikâye yanıtı, yazıyor, GIF, görsel küçültme, PWA manifest. Migration 010.

Paket 3: mesaj alıntı yanıtı, rütbe sistemi + rozetler, hikâye düzenleyici (yazı/emoji/müzik başlangıcı), hikâye temizleme cron, hikâye silme. Migration 011. CRON_SECRET gerekli.

Paket 4: çoklu medya, DM paylaşım, yorum yanıt/beğeni, çift tık beğeni + beğenenler, sabit gönderi, hikâye vurguları, Genel topluluk/duyurular, push, bildirim ayarları, davet, moderasyon araçları. Migration 012.

Paket 5: topluluk/kanal oluşturma, duyuru bildirimi, grup yönetimi, mesaj iletme, eski mesajlarda arama, doğrulama başvurusu, admin grafikleri, davet ödülleri, şifre/e-posta/kullanıcı adı değiştirme, /auth/callback. Migration 013.

Bot doğrulaması (Turnstile) kaldırıldı. Şifre sıfırlama: /auth/callback (code veya token_hash). Şifre değiştirme: Ayarlar > Hesap.
