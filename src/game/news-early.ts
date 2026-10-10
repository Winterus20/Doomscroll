import { Decimal } from '../core/math'
import type { NotationType } from '../core/format'

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

// Paylasimli easter-egg durumu: news-late.ts icindeki tiklanabilir haberler bu nesneyi kullanir.
export const newsEasterEggState = {
  uselessClicks: 0,
  isFlipped: false,
  discoClicks: 0,
  blackHoleTickles: 0,
  redButtonPushes: 0
}

// HMR / test izolasyonu icin paylasimli easter-egg durumunu sifirlar.
export function resetNewsState(): void {
  newsEasterEggState.uselessClicks = 0
  newsEasterEggState.isFlipped = false
  newsEasterEggState.discoClicks = 0
  newsEasterEggState.blackHoleTickles = 0
  newsEasterEggState.redButtonPushes = 0
}

// =========================================================================
// ERKEN DONEM: Antimatter Dimensions klasikleri, Uroboros lore girisi ve
// gece kaydirma (doomscroll) meta mizahi. Metinler orijinaliyle aynidir.
// =========================================================================
export const EARLY_NEWS: NewsItem[] = [
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
]
