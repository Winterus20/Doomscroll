// GEC DONEM: canli veri haberleri, tiklanabilir easter eggler, kara mizah,
// kozmik korku parodileri ve pop kultur gondermeleri.
// Metinler orijinal news.ts ile birebir aynidir; sadece dosya bolundu.
import { Decimal } from "../core/math"
import { formatNumber } from "../core/format"
import type { NewsItem } from "./news-early"
import { newsEasterEggState } from "./news-early"

// -------------------------------------------------------------------------
// Dinamik canli veri haberleri
// -------------------------------------------------------------------------
export const DYN_NEWS: NewsItem[] = [
  {
    id: 'dyn_1',
    dynamic: true,
    text: (store) => {
      const formatted = formatNumber(store.matter, store.settings.notation, store.settings.decimalPlaces)
      return `Sadece ${formatted} gram kütle mi? Bu evren ölçeğinde tam bir yuvarlama hatası.`
    },
    author: '@alayci_kozmoz',
    authorColor: '#f43f5e',
    category: 'dynamic'
  },
  {
    id: 'dyn_2',
    dynamic: true,
    text: (store) => {
      const dims = store.unlockedDimensionsCount || 2
      return `Şu an ${dims} kuantum boyutu aktif. Ama gerçek hayatta hala 3 boyutta sıkışıp kaldınız.`
    },
    author: '@boyut_analiz',
    authorColor: '#c084fc',
    category: 'dynamic'
  },
  {
    id: 'dyn_3',
    dynamic: true,
    text: (store) => {
      const hz = (store.tickspeedBought || 0) + 1
      return `Algoritma çekim hızı ${hz} Hz. Kalp atışınızdan daha ritmik bir rezonans!`
    },
    author: '@frekans_olcer',
    authorColor: '#38bdf8',
    category: 'dynamic'
  },
  {
    id: 'dyn_4',
    dynamic: true,
    text: (store) => {
      const shifts = store.dimensionShifts || 0
      return `${shifts} kez Akış Sıçraması yaptınız ama olay ufkundan kaçamadınız.`
    },
    author: '@sicrama_raporu',
    authorColor: '#f59e0b',
    category: 'dynamic',
    unlocked: (store) => store.dimensionShifts > 0
  },
  {
    id: 'dyn_5',
    dynamic: true,
    text: (store) => {
      const anom = store.stats?.anomaliesClicked || 0
      return `Toplam ${anom} gece krizine dokundunuz. Başparmağınıza madalya takılmalı.`
    },
    author: '@kriz_masasi',
    authorColor: '#10b981',
    category: 'dynamic',
    unlocked: (store) => (store.stats?.anomaliesClicked || 0) > 5
  },
  {
    id: 'dyn_6',
    dynamic: true,
    text: (store) => {
      const gal = store.galaxies || 0
      return `${gal} Akış Kümesi yaratıldı. Gökyüzündeki yıldızlar size gıptayla bakıyor.`
    },
    author: '@kume_gozlem',
    authorColor: '#e879f9',
    category: 'dynamic',
    unlocked: (store) => store.galaxies > 0
  },
  {
    id: 'dyn_7',
    dynamic: true,
    text: (store) => {
      const clicks = store.stats?.manualClicks || 0
      return `Ekrana tam ${clicks} kez dokundunuz. Dokunmatik ekran camı aşınmaya başladı.`
    },
    author: '@ekran_sayaci',
    authorColor: '#60a5fa',
    category: 'dynamic',
    unlocked: (store) => (store.stats?.manualClicks || 0) > 50
  },
]

// -------------------------------------------------------------------------
// Interaktif ve tiklanabilir easter eggler (1. grup)
// -------------------------------------------------------------------------
export const SECRET_NEWS: NewsItem[] = [
  {
    id: 'sec_disco',
    text: '✨ Disco Time! (bana tıkla!)',
    author: '@parti_modu',
    authorColor: '#facc15',
    category: 'secret',
    onClick: () => {
      newsEasterEggState.discoClicks++
      return {
        updatedText: `🕺 DİSKO ÇILGINLIĞI AKTİF! (${newsEasterEggState.discoClicks}x Parti) 🎶`,
        effect: 'disco'
      }
    }
  },
  {
    id: 'sec_danger',
    text: '⚠️ DİKKAT: Bu haber saf anti-maddeden yapılmıştır. SAKIN DOKUNMAYIN!',
    author: '@tehlikeli_madde',
    authorColor: '#ef4444',
    category: 'secret',
    onClick: () => {
      return {
        updatedText: '💥 EVRENİ ÇÖKERTTİNİZ! (Şaka şaka, sadece ekran sallandı)',
        effect: 'shake'
      }
    }
  },
  {
    id: 'sec_useless',
    text: 'Bu habere tıkladığında hiçbir şey olmuyor.',
    author: '@bos_buton',
    authorColor: '#94a3b8',
    category: 'secret',
    onClick: () => {
      newsEasterEggState.uselessClicks++
      if (newsEasterEggState.uselessClicks === 1) {
        return {
          updatedText: 'Hiçbir şey olmadı. Yine de tıkladın.'
        }
      }
      if (newsEasterEggState.uselessClicks === 2) {
        return {
          updatedText: 'Hala hiçbir şey olmuyor. Israrcısın.'
        }
      }
      if (newsEasterEggState.uselessClicks === 5) {
        return {
          updatedText: 'Gerçekten durmayacak mısın? (5 kez tıklandı)'
        }
      }
      if (newsEasterEggState.uselessClicks >= 10) {
        return {
          updatedText: `Tebrikler, inat ödülü olarak sabır madalyası kazandınız! (${newsEasterEggState.uselessClicks}x)`,
          effect: 'confetti',
          bonusMatter: new Decimal(1000)
        }
      }
      return {
        updatedText: `Hiçbir şey olmamaya devam ediyor... (${newsEasterEggState.uselessClicks} kez)`
      }
    }
  },
  {
    id: 'sec_flip',
    text: '🔄 Bu mesajı ters çevirmek için üzerine tıkla!',
    author: '@taklaci_fizik',
    authorColor: '#38bdf8',
    category: 'secret',
    onClick: () => {
      newsEasterEggState.isFlipped = !newsEasterEggState.isFlipped
      return {
        updatedText: newsEasterEggState.isFlipped
          ? '¡ɐlʞıʇ uıɔı ʞǝɯʇǝ ʌıʌǝɔ sɹǝʇ ısǝɾısǝɯ nq 🔄'
          : '🔄 Mesaj düzeltildi! Tekrar ters çevirmek için tıkla.',
        effect: 'flip'
      }
    }
  },
  {
    id: 'sec_lottery',
    text: '🎲 Şanslı Dalgalanma! Bu mesaja tıklarsan kuantum piyangosu çekilir.',
    author: '@kozmik_piyango',
    authorColor: '#4ade80',
    category: 'secret',
    onClick: (store) => {
      const mps = store.matterPerSecond || new Decimal(10)
      const bonus = mps.gt(0) ? mps.times(15) : new Decimal(500)
      return {
        updatedText: `🎉 PİYANGO VURDU! +${formatNumber(bonus, store.settings.notation, store.settings.decimalPlaces)} gram kütle kazandınız!`,
        effect: 'confetti',
        bonusMatter: bonus
      }
    }
  },
  {
    id: 'sec_rickroll',
    text: '🎵 Kayıp 9. Boyutun koordinatlarını öğrenmek için hemen tıkla!',
    author: '@gizli_koordinat',
    authorColor: '#c084fc',
    category: 'secret',
    onClick: () => {
      return {
        updatedText: '🎶 "Never gonna give you up, never gonna let you down..." — Hevipelle selam söylüyor!'
      }
    }
  },
  {
    id: 'sec_cat_button',
    text: '🐱 Kediyi sevmek için tıkla (Miyavlama garantili)',
    author: '@kedi_sever',
    authorColor: '#f472b6',
    category: 'secret',
    onClick: () => {
      return {
        updatedText: '🐾 MİRRRRRRR... Kedi tekillik üzerinde göbeğini açtı!',
        effect: 'confetti'
      }
    }
  },
]

// -------------------------------------------------------------------------
// Kara mizah ve varolussal kriz
// -------------------------------------------------------------------------
export const DARK_NEWS: NewsItem[] = [
  {
    id: 'dark_1',
    text: 'Anti-madde küresel ısınmayı tamamen çözdü. İlgisiz diğer haber: Dünya artık yok.',
    author: '@iklim_raporu',
    authorColor: '#ef4444',
    category: 'dark_humor'
  },
  {
    id: 'dark_2',
    text: 'Ya bir madde olarak ölürsün ya da anti-madde tarafından yutulup tekrar ölürsün.',
    author: '@kara_sovalye',
    authorColor: '#64748b',
    category: 'dark_humor'
  },
  {
    id: 'dark_3',
    text: 'Şirket İK Duyurusu: Tekillik tarafından olay ufkuna çekilmiş olmanız, yarın sabahki 09:00 durum toplantısına mazeret teşkil etmez.',
    author: '@insan_kaynaklari',
    authorColor: '#f43f5e',
    category: 'dark_humor'
  },
  {
    id: 'dark_4',
    text: 'Banka bildirisi: Kredi kartı borcunuz olay ufkunu geçti; ancak faiz işletimi uzay-zamandan bağımsız devam edecektir.',
    author: '@kozmik_banka',
    authorColor: '#eab308',
    category: 'dark_humor'
  },
  {
    id: 'dark_5',
    text: 'Yas danışmanım vefat etti. O kadar iyi bir terapistti ki durum zerre umrumda bile değil.',
    author: '@terapi_seansi',
    authorColor: '#a855f7',
    category: 'dark_humor'
  },
  {
    id: 'dark_6',
    text: 'İntihar eğilimli anti-madde varlıklarına antidepresan yerine depresan mı verilir?',
    author: '@eczacilik_fakultesi',
    authorColor: '#ec4899',
    category: 'dark_humor'
  },
  {
    id: 'dark_7',
    text: 'Üçüncü bir madde türü keşfedildi: "Boş Madde" (Null Matter). Hiçbir işe yaramıyor ve tembel. Keşfeden bilim insanları kovuldu.',
    author: '@akademik_bulten',
    authorColor: '#64748b',
    category: 'dark_humor'
  },
  {
    id: 'dark_8',
    text: 'Okullarda madde ile anti-madde ayrımı kaldırıldı; teneffüslerde karşılıklı imha (annihilation) vakalarında %400 patlama var.',
    author: '@milli_egitim',
    authorColor: '#ef4444',
    category: 'dark_humor'
  },
  {
    id: 'dark_9',
    text: 'Doktorumdan test sonuçlarını aldım ve çok üzgünüm... Görünüşe göre asla bir doktor olamayacağım.',
    author: '@tip_fakultesi',
    authorColor: '#06b6d4',
    category: 'dark_humor'
  },
  {
    id: 'dark_10',
    text: 'Yaşlandıkça yolda kaybettiğim insanları hatırlıyorum. Belki de tur rehberliği benim için doğru bir kariyer seçimi değildi.',
    author: '@tur_rehberi',
    authorColor: '#f97316',
    category: 'dark_humor'
  },
  {
    id: 'dark_11',
    text: 'Elektrikli sandalyedeki mahkuma son isteği soruldu: "Lütfen elimi tutar mısınız?"',
    author: '@son_istek',
    authorColor: '#ef4444',
    category: 'dark_humor'
  },
  {
    id: 'dark_12',
    text: 'Evren genişliyor... Umarım odamdaki çamaşır yığını da evrenin doğal genişlemesine dahildir.',
    author: '@ev_halki',
    authorColor: '#94a3b8',
    category: 'dark_humor'
  },
  {
    id: 'dark_13',
    text: 'Karadelik diyeti: Bugün 10 milyar kalori yedim ama sıfır hacim kaplıyorum. İdeal plaj vücudu budur.',
    author: '@diyetisyen_kara',
    authorColor: '#10b981',
    category: 'dark_humor'
  },
  {
    id: 'dark_14',
    text: 'Evrenin soğuk ve umursamaz karanlığında tek başınasınız... Ama en azından bir idle oyununuz var.',
    author: '@varoluscu_filozof',
    authorColor: '#8b5cf6',
    category: 'dark_humor'
  },
  {
    id: 'dark_15',
    text: 'Hiçbir şeyin anlamı yok. Ama bu boyutun bir sonraki yükseltmesi için sadece 4 saniyeniz kaldı.',
    author: '@nihilizm_botu',
    authorColor: '#a1a1aa',
    category: 'dark_humor'
  },
]

// -------------------------------------------------------------------------
// Kozmik korku parodileri
// -------------------------------------------------------------------------
export const COSMIC_NEWS: NewsItem[] = [
  {
    id: 'cos_1',
    text: 'Sushi restoranında müşteri: "Garson, bu ahtapot hala canlı!" Garson: "Canlı değil efendim, sadece rüya görüyor (Ph\'nglui mglw\'nafh)."',
    author: '@kadim_restoran',
    authorColor: '#14b8a6',
    category: 'dark_humor'
  },
  {
    id: 'cos_2',
    text: 'Cthulhu öğle yemeğinde ne yer? Balık ve Gemiler (Fish & Ships).',
    author: '@okyanus_dibinden',
    authorColor: '#0d9488',
    category: 'dark_humor'
  },
  {
    id: 'cos_3',
    text: 'Antarktika\'da kamp kuran Lovecraft\'ın masasına uzaylılar voleybol topu kaçırdı. "Yine mi Kadim Varlıklar..."',
    author: '@delilik_daglari',
    authorColor: '#64748b',
    category: 'dark_humor'
  },
  {
    id: 'cos_4',
    text: 'Gökyüzündeki devasa dokunaçlar hava durumunu bozdu; meteoroloji "hafif sümüksü yağış" uyarısı yaptı.',
    author: '@delilik_havasi',
    authorColor: '#a855f7',
    category: 'dark_humor'
  },
  {
    id: 'cos_5',
    text: 'Evrende yalnız mıyız yoksa yalnız değil miyiz? İki ihtimal de korkunç, ama tekillik ikisini de afiyetle yutacak.',
    author: '@arthur_c_clarke',
    authorColor: '#38bdf8',
    category: 'lore'
  },
  {
    id: 'cos_6',
    text: 'Kozmik parazitler kulaklarınıza fısıldıyor: "Bir tık daha yap... Sadece bir tık daha..."',
    author: '@fisilti_korosu',
    authorColor: '#ef4444',
    category: 'dark_humor'
  },
  {
    id: 'cos_7',
    text: 'Yıldızlar tam doğru hizaya geldi. Ama uykunuz geldiği için şafağı yine kaçırdınız.',
    author: '@kadim_uyku',
    authorColor: '#6366f1',
    category: 'dark_humor'
  },
  {
    id: 'cos_8',
    text: 'Boşluğa çok uzun süre baktınız. Boşluk gözlerini devirdi ve "Daha ilginç bir şey yok mu?" dedi.',
    author: '@cani_sikilan_bosluk',
    authorColor: '#94a3b8',
    category: 'dark_humor'
  },
  {
    id: 'cos_9',
    text: 'Kütüphaneci uyardı: Necronomicon\'un sayfalarını çevirirken parmağınızı yalamayın; lanetlenirsiniz.',
    author: '@arkham_kutuphanesi',
    authorColor: '#b45309',
    category: 'dark_humor'
  },
  {
    id: 'cos_10',
    text: 'Kozmik tekillik uyandı ve ilk sözü: "Beni 5 dakika daha uyutun" oldu.',
    author: '@uykucu_tanri',
    authorColor: '#e879f9',
    category: 'dark_humor'
  },
]

// -------------------------------------------------------------------------
// Pop kultur gondermeleri
// -------------------------------------------------------------------------
export const POP_NEWS: NewsItem[] = [
  {
    id: 'pop_1',
    text: 'Ben de bir zamanlar senin gibi bir maceracıydım... Sonra dizime bir parça anti-madde çarptı.',
    author: '@skyrim_muhafizi',
    authorColor: '#eab308',
    category: 'meta'
  },
  {
    id: 'pop_2',
    text: 'Savaş... Savaş asla değişmez. Ta ki kuantum boyutları devreye girene kadar.',
    author: '@fallout_anonsu',
    authorColor: '#84cc16',
    category: 'meta'
  },
  {
    id: 'pop_3',
    text: 'Antimatter Dimensions\'ta savaş yoktur. Burada güvendeyiz. Burada özgürüz (Ba Sing Se).',
    author: '@dai_li_ajani',
    authorColor: '#10b981',
    category: 'meta'
  },
  {
    id: 'pop_4',
    text: 'Dört ulus barış içinde yaşıyordu... Ta ki Ateş Ulusu bir kuark reaktörü patlatana kadar.',
    author: '@avatar_anti',
    authorColor: '#f97316',
    category: 'meta'
  },
  {
    id: 'pop_5',
    text: 'Geliştirici kodu düzelttiğini sandı; ama güncelleme 3 yeni kuantum paradoksu yarattı.',
    author: '@yama_notlari',
    authorColor: '#ef4444',
    category: 'meta'
  },
  {
    id: 'pop_6',
    text: 'Bu oyunda hata (bug) yoktur; sadece alternatif başarımlar vardır.',
    author: '@yazilim_savunmasi',
    authorColor: '#a855f7',
    category: 'meta'
  },
  {
    id: 'pop_7',
    text: 'Antimatter silahları insanları öldürmez; insanlar insanları öldürür. Peki ekmek kızartma makineleri tostları mı kızartır?',
    author: '@derin_felsefe',
    authorColor: '#f59e0b',
    category: 'meta'
  },
  {
    id: 'pop_8',
    text: 'Yıl 2422. Büyük güncelleme hala çıkmadı. Hevipelle 38. prestij katmanının dengesiyle uğraşıyor.',
    author: '@gelecek_haberi',
    authorColor: '#06b6d4',
    category: 'meta'
  },
  {
    id: 'pop_9',
    text: 'Arıların havacılık kanunlarına göre uçamaması gibi, bu oyunun da bu kadar bağımlılık yapmaması gerekirdi.',
    author: '@ari_filmi',
    authorColor: '#facc15',
    category: 'meta'
  },
  {
    id: 'pop_10',
    text: 'Navy Seal Copypasta (Kozmik Sürüm): "Ben Antimatter Özel Kuvvetleri\'nden mezunum; 9. boyuta 300 gizli baskın düzenledim!"',
    author: '@donanma_foku',
    authorColor: '#ef4444',
    category: 'meta'
  },
]

// -------------------------------------------------------------------------
// Yeni interaktif easter eggler (final grubu)
// -------------------------------------------------------------------------
export const SECRET_FINALE_NEWS: NewsItem[] = [
  {
    id: 'sec_black_hole',
    text: '🕳️ Karadeliği gıdıklamak için tıkla (Korkma, ısırmaz)',
    author: '@olay_ufku_dostu',
    authorColor: '#c084fc',
    category: 'secret',
    onClick: () => {
      newsEasterEggState.blackHoleTickles++
      return {
        updatedText: `🌀 HIHIHI! Karadelik gıdıklandı (${newsEasterEggState.blackHoleTickles}x) ve uzay dokusunu büktü!`,
        effect: 'shake'
      }
    }
  },
  {
    id: 'sec_quantum_cat',
    text: '📦 Schrödinger\'in Kutusunu Aç! (Canlı mı ölü mü?)',
    author: '@kutu_gozlemcisi',
    authorColor: '#f472b6',
    category: 'secret',
    onClick: () => {
      const isAlive = Math.random() > 0.5
      return {
        updatedText: isAlive
          ? '🐱 Kedi canlı çıktı ve bacağınıza sürtünüyor! Miyavvv!'
          : '👻 Kedi bir dalga fonksiyonuna dönüştü ve kutudan süzüldü!',
        effect: 'confetti'
      }
    }
  },
  {
    id: 'sec_self_destruct',
    text: '🔴 KIRMIZI BUTON: KESİNLİKLE BASMAYINIZ!',
    author: '@acil_durdurma',
    authorColor: '#ef4444',
    category: 'secret',
    onClick: () => {
      newsEasterEggState.redButtonPushes++
      return {
        updatedText: `⚠️ ALARM (${newsEasterEggState.redButtonPushes}x)! Geri sayım: 3.. 2.. 1.. Patlama iptal, geliştirici üşendi.`,
        effect: 'shake'
      }
    }
  },
  {
    id: 'sec_dopamine_hit',
    text: '💉 Saf Dopamin İğnesi (Hemen buraya tıkla)',
    author: '@dopamin_serumu',
    authorColor: '#10b981',
    category: 'secret',
    onClick: (store) => {
      const mps = store.matterPerSecond || new Decimal(10)
      const bonus = mps.gt(0) ? mps.times(25) : new Decimal(1000)
      return {
        updatedText: `⚡ BZZZT! Beyninizde süper kıvılcım çaktı! +${formatNumber(bonus, store.settings.notation, store.settings.decimalPlaces)} g kütle!`,
        effect: 'confetti',
        bonusMatter: bonus
      }
    }
  },
  {
    id: 'sec_glitch',
    text: '👾 [SİSTEM HATASI] Bu piksel bozuldu, tamir etmek için tıkla.',
    author: '@glitch_tamircisi',
    authorColor: '#38bdf8',
    category: 'secret',
    onClick: () => {
      return {
        updatedText: '✨ Z̵A̷L̷G̶O̴ ̸F̴İ̴L̴T̶R̵E̷S̶İ̵ ̵T̷A̶M̶İ̴R̵ ̴E̶D̶İ̶L̶D̴İ̶! Matrix normale döndü.',
        effect: 'disco'
      }
    }
  }
]
