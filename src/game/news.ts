import { Decimal } from '../core/math'
import { formatNumber, type NotationType } from '../core/format'

export interface NewsClickResult {
  updatedText?: string
  effect?: 'shake' | 'disco' | 'confetti' | 'flip'
  bonusMatter?: Decimal
  customMessage?: string
}

export interface NewsStoreView {
  matter: Decimal
  matterPerSecond: Decimal
  settings: { notation: NotationType; decimalPlaces: number }
  unlockedDimensionsCount: number
  tickspeedBought: number
  dimensionShifts: number
  galaxies: number
  stats?: { anomaliesClicked?: number; manualClicks?: number }
}

export interface NewsItem {
  id: string
  text: string | ((store: NewsStoreView) => string)
  author?: string
  authorColor?: string
  category: 'ad_classic' | 'lore' | 'physics' | 'meta' | 'dynamic' | 'secret' | 'dark_humor'
  unlocked?: (store: NewsStoreView) => boolean
  onClick?: (store: NewsStoreView) => NewsClickResult | string | void
  dynamic?: boolean
}

// Boş haber tıklamalarını ve easter egg'leri yerel olarak saymak için closure state'i
let uselessClicks = 0
let isFlippedState = false
let discoClickCount = 0
let blackHoleTickles = 0
let redButtonPushes = 0

// HMR / test izolasyonu için module-level closure state'ini sıfırlar.
export function resetNewsState(): void {
  uselessClicks = 0
  isFlippedState = false
  discoClickCount = 0
  blackHoleTickles = 0
  redButtonPushes = 0
}

export const NEWS_DATABASE: NewsItem[] = [
  // =========================================================================
  // 1. ANTIMATTER DIMENSIONS KLASİKLERİ & HEVIPELLE KÜLTÜRÜ (AD Classics)
  // =========================================================================
  {
    id: 'ad_1',
    text: '"IN THE END, IT DOESN\'T ANTIMATTER." — hevipelle',
    author: '@hevipelle',
    authorColor: '#38bdf8',
    category: 'ad_classic'
  },
  {
    id: 'ad_2',
    text: 'Antimatter Dimensions: Bir sonraki büyük güncelleme her zaman 5 saat uzakta. Her zaman.',
    author: '@guncelleme_saati',
    authorColor: '#fb923c',
    category: 'ad_classic'
  },
  {
    id: 'ad_3',
    text: '9. Boyut kesinlikle bir yalandır. İnanmayın, arayan kimse geri dönemedi.',
    author: '@boyut_mufettisi',
    authorColor: '#ef4444',
    category: 'ad_classic'
  },
  {
    id: 'ad_4',
    text: '9\'un karekökü 3\'tür; bu yüzden 9. boyutun varlığı mantıken imkansızdır.',
    author: '@matematik_enstitusu',
    authorColor: '#c084fc',
    category: 'ad_classic'
  },
  {
    id: 'ad_5',
    text: '9. boyut neden yok? Çünkü 7, 8\'i (ve 9\'u) yedi.',
    author: '@ilkokul_esprisi',
    authorColor: '#facc15',
    category: 'ad_classic'
  },
  {
    id: 'ad_6',
    text: '1.79e308 tane derdim var ama hiçbiri anti-madde etmez.',
    author: '@tekillik_sairi',
    authorColor: '#a78bfa',
    category: 'ad_classic'
  },
  {
    id: 'ad_7',
    text: 'Kurabiye bir yalandır (The cookie is a lie).',
    author: '@firin_karsiti',
    authorColor: '#f472b6',
    category: 'ad_classic'
  },
  {
    id: 'ad_8',
    text: 'Bilim insanları anti-maddenin renginin resmi olarak "Blurple" (mavimsi mor) olduğunu onayladı.',
    author: '@cern_bulteni',
    authorColor: '#38bdf8',
    category: 'ad_classic'
  },
  {
    id: 'ad_9',
    text: 'Maddeden yapılmış kedilerin huysuz olduğu asırlar önce kanıtlandı. İyi haber: Anti-maddeden yapılan kediler de huysuz.',
    author: '@kediler_ve_kuarklar',
    authorColor: '#f472b6',
    category: 'ad_classic'
  },
  {
    id: 'ad_10',
    text: 'Hayır anne, bu oyunu duraklatamam; tekillik duraklatılamaz!',
    author: '@gece_oyuncusu',
    authorColor: '#60a5fa',
    category: 'ad_classic'
  },
  {
    id: 'ad_11',
    text: 'Bir, iki, birkaç tane atla, doksan dokuz... ve NaN!',
    author: '@sayi_teorisi',
    authorColor: '#f59e0b',
    category: 'ad_classic'
  },
  {
    id: 'ad_12',
    text: '"Max All" tuşuna basmak insan doğasının en saf, en filtrelenmemiş dopamin kaynağıdır.',
    author: '@max_all_lobi',
    authorColor: '#10b981',
    category: 'ad_classic'
  },
  {
    id: 'ad_13',
    text: 'Bu oyundan sonra günlük hayatta "sonsuzluk" kelimesini bir fiil olarak kullanmaya başladım.',
    author: '@dilbilimci',
    authorColor: '#2dd4bf',
    category: 'ad_classic'
  },
  {
    id: 'ad_14',
    text: 'Bilinmeyen bir geliştirici şu oyunları oynamanızı öneriyor: Antimatter Dimensions, Trimps, Synergism, Cookie Clicker, Universal Paperclips.',
    author: '@tavsiye_botu',
    authorColor: '#94a3b8',
    category: 'ad_classic'
  },
  {
    id: 'ad_15',
    text: 'Ekrana çok hızlı tıkladım... Bilgisayarım az önce olay ufkunda buharlaştı.',
    author: '@hiz_canavari',
    authorColor: '#ef4444',
    category: 'ad_classic'
  },
  {
    id: 'ad_16',
    text: '1\'den 10\'a kadar bir ölçekte bu oyuna sağlam bir java.lang.IndexOutOfBoundsException veriyorum.',
    author: '@yazilim_muhendisi',
    authorColor: '#c084fc',
    category: 'ad_classic'
  },
  {
    id: 'ad_17',
    text: 'Kozmik tekillik gizlilik politikamızı güncelledik. Artık ruhunuz ve kütleniz tekilliğe aittir.',
    author: '@hukuk_burosu',
    authorColor: '#64748b',
    category: 'ad_classic'
  },
  {
    id: 'ad_18',
    text: 'NASA parti verirse nasıl organize eder? Planet\'ler (Gezegenler).',
    author: '@baba_esprileri',
    authorColor: '#facc15',
    category: 'ad_classic'
  },
  {
    id: 'ad_19',
    text: 'Elektronlar artık hayatın neşeli yönlerini görüyor. Onlara "Pozitron" diyoruz... Bekle, o isim kapılmış mıydı?',
    author: '@kuantum_haber',
    authorColor: '#38bdf8',
    category: 'ad_classic'
  },
  {
    id: 'ad_20',
    text: 'Uzay-zaman dokusunda 4. duvarı yıktınız. Ama endişelenmeyin; daha 5, 6, 7 ve 8. duvarlar var.',
    author: '@boyut_mimari',
    authorColor: '#a78bfa',
    category: 'ad_classic'
  },
  {
    id: 'ad_21',
    text: 'Bilimsel gösterim (Scientific Notation) savaş alanına girdi. Sayılar artık alfabeye meydan okuyor.',
    author: '@uslu_sayilar',
    authorColor: '#10b981',
    category: 'ad_classic'
  },
  {
    id: 'ad_22',
    text: 'Lütfen oynamaya devam etmek için Disket -1\'i sürücüye takınız.',
    author: '@retro_kozmoz',
    authorColor: '#fb923c',
    category: 'ad_classic'
  },
  {
    id: 'ad_23',
    text: 'Açıkçası, bu haber bandını tam anlamak için çok yüksek bir IQ gerekir. Mizah son derece kuantumsal.',
    author: '@entel_fizikci',
    authorColor: '#e879f9',
    category: 'ad_classic'
  },
  {
    id: 'ad_24',
    text: 'Uzun süre anti-maddeye bakarsanız, anti-madde de dönüp cüzdanınıza bakar.',
    author: '@nietzsche_tekillik',
    authorColor: '#f43f5e',
    category: 'ad_classic'
  },
  {
    id: 'ad_25',
    text: 'Anti-Rick Astley bildiriyor: "Always gonna give you up, always gonna let you down..."',
    author: '@anti_rick',
    authorColor: '#38bdf8',
    category: 'ad_classic'
  },
  {
    id: 'ad_26',
    text: 'Madde hayaletleri yoksa anti-madde hayaletleri de yoktur. Zaten hiç maddeleri yok.',
    author: '@paranormal_kuark',
    authorColor: '#cbd5e1',
    category: 'ad_classic'
  },
  {
    id: 'ad_27',
    text: 'Nükleer santraller kapatıldı; dünya artık tekillik çekim enerjisiyle çalışıyor.',
    author: '@enerji_bakanligi',
    authorColor: '#34d399',
    category: 'ad_classic'
  },
  {
    id: 'ad_28',
    text: 'Evrende madde ve anti-madde eşit miktarda olmalıydı... Aradaki farkı annenizin kütlesi kapatıyor.',
    author: '@terbiyesiz_atom',
    authorColor: '#f43f5e',
    category: 'ad_classic'
  },
  {
    id: 'ad_29',
    text: 'Köpeğim çok fazla anti-madde yedi, az önce miyavlamaya başladı.',
    author: '@veteriner_kozmoz',
    authorColor: '#f472b6',
    category: 'ad_classic'
  },
  {
    id: 'ad_30',
    text: 'Hesap makinesine sonsuzluk yazmayı denedim, ekran 42 sonucunu verdi.',
    author: '@otostopcu_rehberi',
    authorColor: '#2dd4bf',
    category: 'ad_classic'
  },

  // =========================================================================
  // 2. UROBOROS KOZMİK OBURLUK LORE'U (Molecular -> Solar -> Galactic Singularity)
  // =========================================================================
  {
    id: 'uro_1',
    text: 'SON DAKİKA: Laboratuvar stajyeri su damlasındaki hidrojen bağını ayrıştırırken kahve fincanını olay ufkuna düşürdü.',
    author: '@lab_stajyeri',
    authorColor: '#38bdf8',
    category: 'lore'
  },
  {
    id: 'uro_2',
    text: 'Laboratuvar kapısı içeri doğru spiral çizmeye başladı; dekanlık acil imar affı çıkardı.',
    author: '@fakulte_yonetimi',
    authorColor: '#f59e0b',
    category: 'lore'
  },
  {
    id: 'uro_3',
    text: 'Kuark çorbası reaktörden taştı; kimya fakültesinde yerçekimi resmi olarak tersine döndü.',
    author: '@kimya_profesoru',
    authorColor: '#34d399',
    category: 'lore'
  },
  {
    id: 'uro_4',
    text: 'İlk kuantum boyutu açıldı: Bilim dünyası alkışlıyor, uzay-zaman dokusu acı içinde inliyor.',
    author: '@atomalti_bulten',
    authorColor: '#a78bfa',
    category: 'lore'
  },
  {
    id: 'uro_5',
    text: 'Laboratuvar kedisi mikro-karadeliğin üzerinden atladı; şu an aynı anda 3 farklı boyutta mırıldanıyor.',
    author: '@kuantum_kedisi',
    authorColor: '#f472b6',
    category: 'lore'
  },
  {
    id: 'uro_6',
    text: 'Mikroskop kendi kendini büyütmeye başladı; optik mühendisleri ağlayarak binayı terk etti.',
    author: '@fizik_asistani',
    authorColor: '#c084fc',
    category: 'lore'
  },
  {
    id: 'uro_7',
    text: 'Belediye uyardı: Tekillik nedeniyle 3. Cadde trafiğe kapatıldı; cadde artık sıfır hacimli bir nokta.',
    author: '@belediye_duyuru',
    authorColor: '#fb923c',
    category: 'lore'
  },
  {
    id: 'uro_8',
    text: 'Hava durumu: Şehir genelinde yerel kütleçekim anomalileri ve aralıklı kuark sağanağı bekleniyor.',
    author: '@meteoroloji_usssu',
    authorColor: '#38bdf8',
    category: 'lore'
  },
  {
    id: 'uro_9',
    text: 'GPS uyduları şaşkın: İstanbul ve Tokyo az önce aynı matematiksel koordinatta kesişti.',
    author: '@uydu_kontrol',
    authorColor: '#34d399',
    category: 'lore'
  },
  {
    id: 'uro_10',
    text: 'Tebrikler: Karbon ayak iziniz sıfırlandı çünkü tüm şehir tekillik tarafından yutuldu.',
    author: '@cevre_vakfi',
    authorColor: '#10b981',
    category: 'lore'
  },
  {
    id: 'uro_11',
    text: 'CERN emeklisi açıkladı: "Bize mikro-karadelik zararsızdır demişlerdi... Haklıymışlar, çok tatlı büyüyor."',
    author: '@emekli_fizikci',
    authorColor: '#f59e0b',
    category: 'lore'
  },
  {
    id: 'uro_12',
    text: 'Jüpiter az önce bir fıstık gibi çıtırdayarak mikro-karadelikte kayboldu.',
    author: '@astronomi_enstitusu',
    authorColor: '#fb923c',
    category: 'lore',
    unlocked: (store) => store.matter.gt(1e25)
  },
  {
    id: 'uro_13',
    text: 'Satürn\'ün halkaları mikro-karadeliğin boynuna atkı oldu; astronomlar büyülenmiş durumda.',
    author: '@gozlemevi_nobet',
    authorColor: '#facc15',
    category: 'lore',
    unlocked: (store) => store.matter.gt(1e26)
  },
  {
    id: 'uro_14',
    text: 'Lütfen Güneş\'e el sallayın; olay ufkuna kapılmasına son 2 dakika kaldı.',
    author: '@nasa_canli_yayin',
    authorColor: '#ef4444',
    category: 'lore',
    unlocked: (store) => store.matter.gt(1e30)
  },
  {
    id: 'uro_15',
    text: 'Ay tekillik tarafından yutuldu; gelgit dalgaları artık kuantum seviyesinde vuruyor.',
    author: '@denizcilik_bulteni',
    authorColor: '#60a5fa',
    category: 'lore',
    unlocked: (store) => store.matter.gt(1e22)
  },
  {
    id: 'uro_16',
    text: 'Jeoloji kurulu: Tektonik plakalar birleşti, Dünya olay ufkuna doğru spiral çizerek kayıyor.',
    author: '@afad_kozmik',
    authorColor: '#f43f5e',
    category: 'lore',
    unlocked: (store) => store.matter.gt(1e24)
  },
  {
    id: 'uro_17',
    text: 'Hawking ışıması kör edici seviyede; güneş gözlüğü takarak oynamanız şiddetle tavsiye edilir.',
    author: '@hawking_enstitusu',
    authorColor: '#38bdf8',
    category: 'lore'
  },
  {
    id: 'uro_18',
    text: 'Samanyolu Galaksisi spiral kollarını tekilliğin içine döküyor... Uroboros hala aç!',
    author: '@galaktik_konsey',
    authorColor: '#fbbf24',
    category: 'lore',
    unlocked: (store) => store.matter.gt(1e40)
  },
  {
    id: 'uro_19',
    text: 'Andromeda Galaksisi menüye eklendi; garson tekilliğe iki porsiyon yıldız kümesi servis ediyor.',
    author: '@kozmik_gurme',
    authorColor: '#f472b6',
    category: 'lore',
    unlocked: (store) => store.matter.gt(1e45)
  },
  {
    id: 'uro_20',
    text: 'Planck duvarı yırtıldı; artık mesafe yok, zaman yok, sadece ve sadece KÜTLE var.',
    author: '@tekillik_muhendisi',
    authorColor: '#c084fc',
    category: 'lore',
    unlocked: (store) => store.matter.gt(1e100)
  },
  {
    id: 'uro_21',
    text: '1.79e308 gram kütle... Tebrikler, artık evrenin ta kendisi sizsiniz.',
    author: '@evren_gazetesi',
    authorColor: '#34d399',
    category: 'lore',
    unlocked: (store) => store.matter.gt(1e250)
  },
  {
    id: 'uro_22',
    text: 'Uroboros kendi kuyruğunu yuttu; evrenin başı ve sonu ekranınızdaki bu pikselde birleşti.',
    author: '@sonsuzluk_dongusu',
    authorColor: '#94a3b8',
    category: 'lore',
    unlocked: (store) => store.matter.gt(1e200)
  },
  {
    id: 'uro_23',
    text: 'Büyük Çöküş yaklaşıyor: 1e308 gram tekillik eşiğinde zaman ibresi geriye doğru akacak.',
    author: '@safak_gozlemcisi',
    authorColor: '#f59e0b',
    category: 'lore',
    unlocked: (store) => store.matter.gt(1e150)
  },
  {
    id: 'uro_24',
    text: 'Kozmik parazitler olay ufkuna dadandı, kütle kaçırırken yakalandılar.',
    author: '@guvenlik_gucleri',
    authorColor: '#ef4444',
    category: 'lore'
  },
  {
    id: 'uro_25',
    text: 'Olay ufku o kadar genişledi ki evren artık bir donut şeklinde içeri kıvrılıyor.',
    author: '@topoloji_enstitusu',
    authorColor: '#e879f9',
    category: 'lore',
    unlocked: (store) => store.matter.gt(1e80)
  },

  // =========================================================================
  // 3. GECE 03:00 / DOOMSCROLL & TELEFON BAĞIMLILIĞI SATİRLERİ (Dopamine & Meta)
  // =========================================================================
  {
    id: 'meta_1',
    text: 'Sadece 5 dakika reels izleyip uyuyacaktım... Saat nasıl sabah 05:42 oldu?',
    author: '@uykusuz_insan',
    authorColor: '#38bdf8',
    category: 'meta'
  },
  {
    id: 'meta_2',
    text: 'Başparmağınız bu gece bir maraton koşucusundan daha fazla kalori yaktı.',
    author: '@saglik_bakanligi',
    authorColor: '#34d399',
    category: 'meta'
  },
  {
    id: 'meta_3',
    text: 'Algoritma sizi sizden daha iyi tanıyor: Az önce hiç aklınızda olmayan bir kuantum boyutunu sipariş ettiniz.',
    author: '@yapay_zeka_gozlem',
    authorColor: '#c084fc',
    category: 'meta'
  },
  {
    id: 'meta_4',
    text: 'Göz doktorları bu oyunu öneriyor: "Zaten gözleriniz bozulmuştu, en azından tekillik görün."',
    author: '@goz_hastanesi',
    authorColor: '#60a5fa',
    category: 'meta'
  },
  {
    id: 'meta_5',
    text: 'Telefonun şarjı %1\'e düştü ama kütle üretimi %777 arttı. Hayat bir fedakarlıklar zinciridir.',
    author: '@batarya_sehitleri',
    authorColor: '#ef4444',
    category: 'meta'
  },
  {
    id: 'meta_6',
    text: 'Ekrana boş boş bakma sendromu seviye 99: Tekilliğin hipnozuna kapıldınız.',
    author: '@psikoloji_kulubu',
    authorColor: '#f472b6',
    category: 'meta'
  },
  {
    id: 'meta_7',
    text: 'Telefonun arka kapağı o kadar ısındı ki üzerinde kaşarlı tost yapabilirsiniz.',
    author: '@termal_muhendislik',
    authorColor: '#f97316',
    category: 'meta'
  },
  {
    id: 'meta_8',
    text: 'Yataktan kalkıp su içmek: 0 puan. Uzanıp 100 milyon kütle daha yutmak: Paha biçilemez.',
    author: '@tembellik_dernegi',
    authorColor: '#a78bfa',
    category: 'meta'
  },
  {
    id: 'meta_9',
    text: 'Yarın sabah erken kalkacak olan siz, şu anki sizden nefret ediyor. Ama bu koşu bırakılamaz.',
    author: '@gelecekteki_ben',
    authorColor: '#f43f5e',
    category: 'meta'
  },
  {
    id: 'meta_10',
    text: 'Mavi ışık filtresi tekillik karşısında çaresiz kaldı; retinanız artık foton yerine kuark yayıyor.',
    author: '@ekran_koruyucu',
    authorColor: '#38bdf8',
    category: 'meta'
  },
  {
    id: 'meta_11',
    text: 'Algoritma laboratuvarında kedi sesleri olgunlaştı. İnternetin %90\'ı zaten kedilerden ibaret.',
    author: '@trend_avcisi',
    authorColor: '#facc15',
    category: 'meta'
  },
  {
    id: 'meta_12',
    text: 'Gece 03:00\'te vicdan azapları ekrana üşüşüyor: "Hani bugün erken uyuyacaktın?" Sustur onları!',
    author: '@vicdan_azabi',
    authorColor: '#ef4444',
    category: 'meta'
  },
  {
    id: 'meta_13',
    text: 'Ekran süresi uyarısı geldi: "Bu hafta ekran başında 48 saat geçirdiniz." Tekillik bunu onayladı.',
    author: '@dijital_denge',
    authorColor: '#94a3b8',
    category: 'meta'
  },
  {
    id: 'meta_14',
    text: 'Kahve fincanındaki son damla soğudu. Kafein enerjisi tükendi, tekillik enerjisi başladı.',
    author: '@espresso_bari',
    authorColor: '#78350f',
    category: 'meta'
  },
  {
    id: 'meta_15',
    text: 'İş yerinde Alt+Tab yaparken arkada tekillik üreten gizli kahramanlar, selam olsun size.',
    author: '@ofis_casusu',
    authorColor: '#64748b',
    category: 'meta'
  },

  // =========================================================================
  // 4. İNKREMENTAL MATEMATİK & GELİŞTİRİCİ MİZAHI (Number Engine & Code)
  // =========================================================================
  {
    id: 'code_1',
    text: 'JavaScript\'in Number.MAX_VALUE sınırı ağlayarak köşesine çekildi. break_eternity.js sahneye çıktı.',
    author: '@sayi_motoru',
    authorColor: '#10b981',
    category: 'physics'
  },
  {
    id: 'code_2',
    text: 'Tetrasyon kulesi o kadar uzadı ki tavanı deldi, üst komşu şikayete geldi.',
    author: '@tetrasyon_ustasi',
    authorColor: '#2dd4bf',
    category: 'physics'
  },
  {
    id: 'code_3',
    text: 'BigInt bu sayılara baktı ve sessizce istifa dilekçesini masaya bıraktı.',
    author: '@js_motoru',
    authorColor: '#f59e0b',
    category: 'physics'
  },
  {
    id: 'code_4',
    text: 'Floating point hatası yüzünden evrene 0.0000000000000001 gram fazla kütle eklendi.',
    author: '@ieee754_standarti',
    authorColor: '#c084fc',
    category: 'physics'
  },
  {
    id: 'code_5',
    text: 'Idle oyunu oynarken çok meşgul görünmenin 10 kuralı (Kural 1: Ekranda sürekli grafikler aksın).',
    author: '@kariyer_rehberi',
    authorColor: '#60a5fa',
    category: 'physics'
  },
  {
    id: 'code_6',
    text: 'Konsolu açıp hile yapmaya çalışanlar: Tekillik RAM belleğinizi de yutabilir, dikkatli olun.',
    author: '@anticheat_muhafizi',
    authorColor: '#ef4444',
    category: 'physics'
  },
  {
    id: 'code_7',
    text: 'Bu oyun tek bir kutsal döngüde çalışır: Dopamin salgıla, kütle yut, sıfırla, tekrar et.',
    author: '@dongu_teorisi',
    authorColor: '#38bdf8',
    category: 'physics'
  },
  {
    id: 'code_8',
    text: 'Bellek sızıntısı yok arkadaşlar, sadece küçük bir uzay-zaman sızıntısı var.',
    author: '@hafiza_yonetimi',
    authorColor: '#a78bfa',
    category: 'physics'
  },
  {
    id: 'code_9',
    text: 'Geliştirici kahve içmeyi unuttu; oyunun tick hızı 0.2 saniyeliğine gecikti.',
    author: '@sunucu_odasi',
    authorColor: '#fb923c',
    category: 'physics'
  },
  {
    id: 'code_10',
    text: 'Oyun 20 TPS sabit adımlı accumulator döngüsüyle çalışır; saniyede 20 kez evren yeniden hesaplanır.',
    author: '@game_loop',
    authorColor: '#34d399',
    category: 'physics'
  },

  // =========================================================================
  // 5. DİNAMİK CANLI VERİ HABERLERİ (Canlı State Şablonları)
  // =========================================================================
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

  // =========================================================================
  // 6. İNTERAKTİF & TIKLANABİLİR EASTER EGG'LER (Clickable Secrets)
  // =========================================================================
  {
    id: 'sec_disco',
    text: '✨ Disco Time! (bana tıkla!)',
    author: '@parti_modu',
    authorColor: '#facc15',
    category: 'secret',
    onClick: () => {
      discoClickCount++
      return {
        updatedText: `🕺 DİSKO ÇILGINLIĞI AKTİF! (${discoClickCount}x Parti) 🎶`,
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
      uselessClicks++
      if (uselessClicks === 1) {
        return {
          updatedText: 'Hiçbir şey olmadı. Yine de tıkladın.'
        }
      }
      if (uselessClicks === 2) {
        return {
          updatedText: 'Hala hiçbir şey olmuyor. Israrcısın.'
        }
      }
      if (uselessClicks === 5) {
        return {
          updatedText: 'Gerçekten durmayacak mısın? (5 kez tıklandı)'
        }
      }
      if (uselessClicks >= 10) {
        return {
          updatedText: `Tebrikler, inat ödülü olarak sabır madalyası kazandınız! (${uselessClicks}x)`,
          effect: 'confetti',
          bonusMatter: new Decimal(1000)
        }
      }
      return {
        updatedText: `Hiçbir şey olmamaya devam ediyor... (${uselessClicks} kez)`
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
      isFlippedState = !isFlippedState
      return {
        updatedText: isFlippedState
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

  // =========================================================================
  // 7. DARK MİZAH & VAROLUŞSAL KRİZ (Dark Humor & Existential Dread)
  // =========================================================================
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

  // =========================================================================
  // 8. KUANTUM ABSÜRTLÜĞÜ & BİLİM ESPRİLERİ (Nerd & Quantum Jokes)
  // =========================================================================
  {
    id: 'sci_1',
    text: 'Polis Schrödinger\'i durdurur: "Bagajda ne var?" "Kedi." Polis bagajı açar: "Bu kedi ölmüş!" Schrödinger: "Eh, sayenizde artık öldü!"',
    author: '@schrodinger_polis',
    authorColor: '#38bdf8',
    category: 'physics'
  },
  {
    id: 'sci_2',
    text: 'Polis Heisenberg\'i durdurur: "Ne kadar hızlı gittiğinizi biliyor musunuz?" "Hayır ama nerede olduğumu kesin biliyorum!"',
    author: '@heisenberg_radar',
    authorColor: '#0ea5e9',
    category: 'physics'
  },
  {
    id: 'sci_3',
    text: 'Bir kuantum fizikçisi bara girer... ve aynı anda barın diğer tarafından dışarı çıkar.',
    author: '@kuantum_tunelleme',
    authorColor: '#06b6d4',
    category: 'physics'
  },
  {
    id: 'sci_4',
    text: 'Kuantum fizikçisi bir arkadaşıma yılbaşında kedi hediye ettim. Kutu hala açılmadı.',
    author: '@hediye_kutusu',
    authorColor: '#f472b6',
    category: 'physics'
  },
  {
    id: 'sci_5',
    text: 'Uçurumdan yuvarlanıyoruz! "Korkmayın arkadaşlar, çoklu evrenlerin birinde kesin hayatta kaldık!"',
    author: '@coklu_evren',
    authorColor: '#a855f7',
    category: 'physics'
  },
  {
    id: 'sci_6',
    text: 'Entropi sürekli artıyor. O yüzden yatağımı toplamayı bıraktım; termodinamik kanunlarına saygılıyım.',
    author: '@termodinamik_savunma',
    authorColor: '#f59e0b',
    category: 'physics'
  },
  {
    id: 'sci_7',
    text: 'Işık hızında giden bir arabadaysanız ve farları açarsanız ne olur? Sigorta atar.',
    author: '@relativite_servisi',
    authorColor: '#eab308',
    category: 'physics'
  },
  {
    id: 'sci_8',
    text: 'Foton otelde oda kiralar. Resepsiyonist "Valiziniz var mı?" der. Foton: "Hayır, kütlesiz seyahat ediyorum."',
    author: '@foton_oteli',
    authorColor: '#14b8a6',
    category: 'physics'
  },
  {
    id: 'sci_9',
    text: 'Nötron bara girer ve bir içki ister. "Borcum ne kadar?" Barmen: "Size ücret yok (No charge)."',
    author: '@notron_bari',
    authorColor: '#10b981',
    category: 'physics'
  },
  {
    id: 'sci_10',
    text: 'Tachyon bara girer. Barmen: "Gelecekten gelenlere servis yapmıyoruz!" der.',
    author: '@zamansiz_bar',
    authorColor: '#6366f1',
    category: 'physics'
  },
  {
    id: 'sci_11',
    text: 'Kuarklar neden tek başına yaşayamaz? Çünkü güçlü nükleer kuvvet onları sürekli ev arkadaşı olmaya zorlar.',
    author: '@guclu_kuvvet',
    authorColor: '#84cc16',
    category: 'physics'
  },
  {
    id: 'sci_12',
    text: 'Fizikçiye göre aşk: İki parçacığın dolanık olup ışık yılları uzaktan birbirinin moralini bozması.',
    author: '@kuantum_dolasan',
    authorColor: '#ec4899',
    category: 'physics'
  },
  {
    id: 'sci_13',
    text: 'Higgs bozonu kiliseye girer. Rahip: "Tanrı parçacığı burada ne arıyor?" Higgs: "Ben olmazsam kütleniz olmaz."',
    author: '@higgs_ziyaret',
    authorColor: '#eab308',
    category: 'physics'
  },
  {
    id: 'sci_14',
    text: 'Evren simülasyon teorisi doğruysa, geliştirici acilen bir bellek optimizasyonu yaması çıkarmalı.',
    author: '@matrix_raporu',
    authorColor: '#22c55e',
    category: 'physics'
  },
  {
    id: 'sci_15',
    text: 'Zaman bir yanılsamadır. Özellikle sabah alarm çaldıktan sonraki o ilk 5 dakikada.',
    author: '@gorecelik_enstitusu',
    authorColor: '#3b82f6',
    category: 'physics'
  },

  // =========================================================================
  // 9. KOZMİK KORKU & CTHULHU PARODİLERİ (Cosmic Horror Humor)
  // =========================================================================
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

  // =========================================================================
  // 10. POP KÜLTÜR & OYUN GÖNDERMELERİ (Pop Culture Satire)
  // =========================================================================
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

  // =========================================================================
  // 11. YENİ İNTERAKTİF EASTER EGG'LER (Clickable Secrets)
  // =========================================================================
  {
    id: 'sec_black_hole',
    text: '🕳️ Karadeliği gıdıklamak için tıkla (Korkma, ısırmaz)',
    author: '@olay_ufku_dostu',
    authorColor: '#c084fc',
    category: 'secret',
    onClick: () => {
      blackHoleTickles++
      return {
        updatedText: `🌀 HIHIHI! Karadelik gıdıklandı (${blackHoleTickles}x) ve uzay dokusunu büktü!`,
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
      redButtonPushes++
      return {
        updatedText: `⚠️ ALARM (${redButtonPushes}x)! Geri sayım: 3.. 2.. 1.. Patlama iptal, geliştirici üşendi.`,
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
