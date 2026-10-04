# ADR-0037: Kullanıcı İlerlemelerinin Küresel Sıfırlanması (Global Save Wipe & Minimum Version Enforcement)

- **Tarih:** 2026-10-04
- **Durum:** Kabul Edildi (Implemented)
- **Kapsam:** [save-version.ts](file:///c:/Users/Yigit/Documents/Incremental/src/core/save-version.ts), [save.ts](file:///c:/Users/Yigit/Documents/Incremental/src/core/save.ts), [game.ts](file:///c:/Users/Yigit/Documents/Incremental/src/stores/game.ts)

---

## 1. Bağlam ve Karar
Kullanıcı/ürün direktifi doğrultusunda, oyundaki tüm oyuncuların ve yerel tarayıcıların mevcut ilerlemelerinin kalıcı olarak sıfırlanması (*Global Wipe / Fresh Start*) talep edildi.

Incremental oyun mimarilerinde oyuncuların eski kayıtları tarayıcı `localStorage`'ında saklandığı için, salt yerel sıfırlama yeterli olmamakta; oyunu internetten veya yerel sunucudan açan her kullanıcının eski kayıtlarının otomatik olarak tasfiye edilmesi gerekmektedir.

---

## 2. Mimari Çözüm

1. **Sürüm Yükseltme ve Asgari Sürüm Eşiği (v16):**
   - `SAVE_VERSION` 15'ten **16**'ya yükseltildi.
   - `MIN_SUPPORTED_SAVE_VERSION = 16` tanımlandı.
   - `isDeprecatedSave(data: unknown): boolean` yardımcı fonksiyonu eklendi.
2. **Otomatik Tasfiye ve Temizleme Kancası (`loadDetailed`):**
   - Oyuncu oyunu açtığında, slottaki kayıt veya otomatik yedek incelenir.
   - Sürüm `< 16` ise:
     ```typescript
     if (found < MIN_SUPPORTED_SAVE_VERSION) {
       console.warn(`Slot ${slot} kaydı v${found} (asgari v${MIN_SUPPORTED_SAVE_VERSION} gerekli). İlerleme sıfırlandı.`)
       this.hardReset()
       return { state: null, fromBackup: false, corrupted: false, quarantined: false, futureVersion: null }
     }
     ```
   - Otomatik olarak `SaveSystem.hardReset()` çağrılır; tüm slotlar, yedekler (`_BAK`), eski legacy anahtarlar, karantinalar (`_CORRUPT`) ve mock bulut revizyonları temizlenir.
   - `state: null` dönülerek oyun motoru tertemiz 10 dopaminlik yeni oyun durumuna başlatılır.
3. **İçe Aktarma ve Deserialization Güvencesi:**
   - `importSave` ve `store.deserialize` içine `found < MIN_SUPPORTED_SAVE_VERSION` kalkanı eklenerek eski metin kayıtlarının geri yüklenmesi engellendi.

---

## 3. Doğrulama
- `npm run build`: **0 hata**, 1686 modül derlendi.
- `npx vitest run`: **154/154 test başarıyla geçti**.
- Oyunu açan her kullanıcının eski ilerlemesi sıfırlanarak temiz v16 başlangıcı garanti altına alındı.
