# ADR 0029: Misafir Modu, Google & E-posta Girişi ve Akıllı Bulut Yedekleme (Cloud Save) Mimarisi

- **Tarih:** 2026-10-03
- **Durum:** Kabul Edildi (Accepted) & Uygulandı (Implemented)
- **Sürüm:** v0.25.0

---

## 1. Bağlam & Problem
Doomscroll: The Endless Reels oyunu saf bir istemci tarafı (Client-Side) Vue 3 SPA olarak inşa edilmiş ve yerel kayıtlar `LocalStorage` (3 slotlu LZ-String) üzerinde tutulmaktaydı. Ancak oyuncuların farklı cihazlar arasında (ev bilgisayarı, iş bilgisayarı, telefon vb.) ilerlemelerini kaybetmeden oynamaları, tarayıcı verisi temizlendiğinde dopamin ve prestij kaybı yaşamamaları için güvenilir bir kimlik doğrulama ve bulut yedekleme altyapısına ihtiyaç vardı.

Bu sistem kurulurken şu üç kritik gereksinim belirlendi:
1. **Misafir Modu Dokunulmazlığı:** Oyuncu asla zorunlu bir kayıt/giriş ekranıyla engellenmemeli; dilediği zaman misafir olarak oynamalı, istediği anda tek tıkla hesabını bağlayabilmelidir.
2. **Kayıpsız İlerleme Aktarımı:** Misafir oynayan bir oyuncu oturum açtığında yerel ilerlemesi silinmemeli, doğrudan ilk bulut yedeği haline getirilmelidir.
3. **Google & E-posta Çift Kanal:** Tek tık Google Sign-In (Popup ile kesintisiz) ve E-posta/Şifre ile kayıt, giriş ve şifre sıfırlama desteği sunulmalıdır.
4. **Çakışma Kalkanı (Conflict Resolution):** Farklı cihazlardaki kayıt uyumsuzluklarında veri ezilmesini önlemek için kullanıcıya iki sütunlu net bir karşılaştırma ekranı sunulmalıdır.

---

## 2. Alınan Kararlar

### 2.1. Firebase Auth + Cloud Firestore Sağlayıcısı
- Google ekosistemiyle %100 yerleşik uyumu, $0 maliyetli cömert ücretsiz katmanı (50.000 aktif kullanıcı, 1GB Firestore) ve sayfa yönlendirmesi gerektirmeyen `signInWithPopup` desteği nedeniyle Firebase tercih edildi.
- Doküman yolu: `users/{uid}/cloud_saves/{slotId}` altında JSON/LZ-String ve meta verisi saklanır.

### 2.2. Provider-Agnostic Soyut Servis & Akıllı Dev/Mock Fallback
- `AuthService` ve `CloudSaveService` katmanları bağımsız arayüzlerle tasarlandı.
- `.env` dosyasında Firebase anahtarları bulunmadığında sistem çökmez; otomatik olarak **"Simülasyon / Dev Modu"**na geçer. Yerel simülatör ile tüm arayüz, butonlar ve bulut senkronizasyonu tam fonksiyonel olarak test edilebilir. Canlı anahtarlar girildiğinde ise sıfır kod değişikliğiyle gerçek Google Auth ve Firestore'a bağlanır.

### 2.3. Akıllı Çakışma Yönetimi (`CloudConflictModal.vue`)
- Giriş yapıldığında yerel durum ile bulut durumu timestamp ve dopamin seviyesine göre kıyaslanır. Fark tespit edilirse `CloudConflictModal.vue` açılarak sol ve sağ panellerde (Dopamin, Şafak, Süre, Son Kayıt) görsel kıyaslama ve seçim sunulur.

### 2.4. Çok Katmanlı UI Entegrasyonu
- **Header:** Üst barda pilin yanına ve mobil dock'ta ayarların yanına profil/bulut rozeti ve canlı yeşil senkronize noktası.
- **AuthModal:** Siberpunk neon cam tasarım, Google tek tık butonu, E-posta/Şifre sekmeleri, Şifremi Unuttum ve Oturum Açıkken Bulut Yönetim Paneli.
- **SettingsModal:** "Kayıt & Slotlar" sekmesinin tepesine Bento tarzı "Bulut Senkronizasyonu" yönetim kartı.
- **Otomasyon:** 5 dakikalık periyodik arka plan oto-senkronizasyonu ve `beforeunload` güvencesi.

---

## 3. Doğrulama ve Sonuçlar
- `npm run build` (`vue-tsc && vite build`) komutuyla 1682 modül 0 hata ile derlendi.
- Playwright ile yerel preview sunucusunda (`localhost:4173`):
  - Google tek tık giriş simülasyonu,
  - Header profil ismi ve yeşil canlı senkron ışığı,
  - "Buluta Yedekle" aksiyonu ve canlı "Son: Az önce" telemetrisi,
  - SettingsModal "Kayıt & Slotlar" sekmesindeki Bento kartının çalışırlığı başarıyla test edildi ve kanıtlandı.
