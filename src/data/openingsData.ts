import { Color } from 'chess.js';

export interface OpeningStep {
  uci: string;
  san: string;
  explanationTr: string;
}

export interface OpeningVariation {
  id: string;
  nameTr: string;
  descriptionTr: string;
  steps: OpeningStep[];
}

export interface OpeningCurriculumItem {
  id: string;
  side: Color;
  nameTr: string;
  nameEn: string;
  eco: string;
  startingMovesSan: string;
  mainIdeasTr: string[];
  typicalPlansTr: string[];
  commonMistakesTr: string[];
  tacticalThemesTr: string[];
  pawnStructureTr: string;
  mainLine: OpeningStep[];
  alternativeResponses: OpeningVariation[];
}

export const OPENINGS_DATA: OpeningCurriculumItem[] = [
  // ================= WHITE OPENINGS =================
  {
    id: 'italian-game',
    side: 'w',
    nameTr: 'İtalyan Açılışı (Giuoco Piano)',
    nameEn: 'Italian Game',
    eco: 'C50',
    startingMovesSan: '1. e4 e5 2. Nf3 Nc6 3. Bc4',
    mainIdeasTr: [
      'Merkezi e4 piyonu ve f3 atıyla kontrol altına almak.',
      'Şah filini c4 karesine geliştirerek Siyahın en zayıf noktası olan f7 karesine doğrudan baskı kurmak.',
      'Hızlı kısa rok (O-O) yaparak c3-d4 piyon sürüşüyle merkezi ele geçirmek.',
    ],
    typicalPlansTr: [
      'c2-c3 ve d2-d4 sürüşleriyle güçlü bir piyon merkezi kurmak.',
      'Kısa rok sonrası Kaleyi e1 karesine getirip e-dikeyini kontrol etmek.',
      'd3 piyon yapısıyla sakin konumsal oyun (Giuoco Pianissimo) veya b4 ile Evans Gambiti.',
    ],
    commonMistakesTr: [
      'c3 hazırlığı yapmadan erken d4 sürüp merkez piyonunu kaybetmek.',
      'Şah merkezdeyken f7 üzerine erken ve desteksiz taş feda etmek.',
    ],
    tacticalThemesTr: [
      'f7 karesi üzerinde çatal ve açmaz temaları (Kızarmış Ciğer Saldırısı / Ng5).',
      'Merkez açıldığında e-dikeyinde Siyah şaha karşı açarak şah motifleri.',
    ],
    pawnStructureTr: 'Beyaz c3-d4-e4 merkez zinciri kurmaya çalışır; Siyah ise d6-e5 ile sağlam tutunur.',
    mainLine: [
      { uci: 'e2e4', san: 'e4', explanationTr: 'Merkezi kontrol eder ve vezir ile şah filinin çaprazını açar.' },
      { uci: 'e7e5', san: 'e5', explanationTr: 'Siyah da merkezde eşit pay alarak d4 ve f4 karelerini kontrol eder.' },
      { uci: 'g1f3', san: 'Nf3', explanationTr: 'Atı merkeze geliştirir, e5 piyonunu tehdit eder ve kısa roka hazırlanır.' },
      { uci: 'b8c6', san: 'Nc6', explanationTr: 'Siyah hem e5 piyonunu korur hem de d4 karesine baskı kurar.' },
      { uci: 'f1c4', san: 'Bc4', explanationTr: 'İtalyan Açılışı! Fil en aktif çapraza yerleşir ve f7 karesini hedef alır.' },
      { uci: 'f8c5', san: 'Bc5', explanationTr: 'Giuoco Piano (Sakin Oyun): Siyah da filini aktif c5 karesine geliştirir.' },
      { uci: 'c2c3', san: 'c3', explanationTr: 'd2-d4 merkez sürüşünü desteklemek için kritik hazırlık hamlesi.' },
      { uci: 'g8f6', san: 'Nf6', explanationTr: 'Siyah atını geliştirerek Beyazın e4 piyonuna karşı saldırı başlatır.' },
    ],
    alternativeResponses: [
      {
        id: 'italian-two-knights',
        nameTr: 'İki At Savunması (3...Nf6)',
        descriptionTr: 'Siyah fil çıkışı yerine 3...Nf6 ile hemen e4 piyonuna saldırır.',
        steps: [
          { uci: 'e2e4', san: 'e4', explanationTr: 'Merkez açılışı.' },
          { uci: 'e7e5', san: 'e5', explanationTr: 'Simetrik merkez cevabı.' },
          { uci: 'g1f3', san: 'Nf3', explanationTr: 'At gelişimi ve e5 baskısı.' },
          { uci: 'b8c6', san: 'Nc6', explanationTr: 'e5 savunması.' },
          { uci: 'f1c4', san: 'Bc4', explanationTr: 'f7 karesine bakış.' },
          { uci: 'g8f6', san: 'Nf6', explanationTr: 'İki At Savunması: Siyah karşı saldırıyla e4 piyonunu ister.' },
          { uci: 'd2d3', san: 'd3', explanationTr: 'e4 piyonunu sağlamca korur ve c1 filinin çaprazını açar.' },
        ],
      },
    ],
  },
  {
    id: 'ruy-lopez',
    side: 'w',
    nameTr: 'İspanyol Açılışı (Ruy Lopez)',
    nameEn: 'Ruy Lopez',
    eco: 'C60',
    startingMovesSan: '1. e4 e5 2. Nf3 Nc6 3. Bb5',
    mainIdeasTr: [
      'e5 piyonunu koruyan c6 atına baskı kurarak dolaylı yoldan Siyahın merkezini sarsmak.',
      'Hızlı kısa rok yaparak e1 kalesini oyuna sokmak.',
      'c3 ve d4 ile uzun vadeli merkez üstünlüğü elde etmek.',
    ],
    typicalPlansTr: [
      '3...a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 ile İspanyol filini a2-g8 çaprazında korumak.',
      'b1 atını Nbd2-Nf1-Ng3 manevrasıyla şah kanadına aktarmak.',
    ],
    commonMistakesTr: [
      '3...a6 4.Bxc6 dxc6 5.Nxe5? tuzağına düşmek (Siyah 5...Qd4! çatalıyla piyonu mükemmel konumla geri alır).',
    ],
    tacticalThemesTr: [
      'd-dikeyinde ve e-dikeyinde açmazlar, Qd4 çatal teması.',
    ],
    pawnStructureTr: 'Dinamik merkez gerilimi; Değişim Varyantında Siyahın duble c-piyonlarına karşı Beyazın 4-3 şah kanadı piyon çoğunluğu.',
    mainLine: [
      { uci: 'e2e4', san: 'e4', explanationTr: 'Merkez piyonu.' },
      { uci: 'e7e5', san: 'e5', explanationTr: 'Siyah merkezi dengeler.' },
      { uci: 'g1f3', san: 'Nf3', explanationTr: 'e5 piyonuna saldırı.' },
      { uci: 'b8c6', san: 'Nc6', explanationTr: 'e5 piyonunun savunması.' },
      { uci: 'f1b5', san: 'Bb5', explanationTr: 'Ruy Lopez! e5 piyonunun koruyucusu olan c6 atını tehdit eder.' },
      { uci: 'a7a6', san: 'a6', explanationTr: 'Morphy Savunması: Siyah filin niyetini hemen sorgular.' },
      { uci: 'b5a4', san: 'Ba4', explanationTr: 'Fil baskıyı sürdürerek a4 karesine çekilir.' },
      { uci: 'g8f6', san: 'Nf6', explanationTr: 'Siyah atını geliştirip e4 piyonunu ister.' },
    ],
    alternativeResponses: [
      {
        id: 'ruy-berlin',
        nameTr: 'Berlin Savunması (3...Nf6)',
        descriptionTr: 'Dünya şampiyonluk maçlarının kaya gibi sağlam savunması.',
        steps: [
          { uci: 'e2e4', san: 'e4', explanationTr: 'Merkez kontrolü.' },
          { uci: 'e7e5', san: 'e5', explanationTr: 'Simetrik merkez.' },
          { uci: 'g1f3', san: 'Nf3', explanationTr: 'At gelişimi.' },
          { uci: 'b8c6', san: 'Nc6', explanationTr: 'Savunma gelişimi.' },
          { uci: 'f1b5', san: 'Bb5', explanationTr: 'Ruy Lopez.' },
          { uci: 'g8f6', san: 'Nf6', explanationTr: 'Berlin Savunması: Siyah a6 oynamadan hemen e4 piyonuna saldırır.' },
          { uci: 'e1g1', san: 'O-O', explanationTr: 'Beyaz şahını güvenceye alır ve Re1 ile merkezi desteklemeye hazırlanır.' },
        ],
      },
    ],
  },
  {
    id: 'scotch-game',
    side: 'w',
    nameTr: 'İskoç Açılışı',
    nameEn: 'Scotch Game',
    eco: 'C45',
    startingMovesSan: '1. e4 e5 2. Nf3 Nc6 3. d4',
    mainIdeasTr: [
      '3.d4 ile merkezi gecikmeden hemen açmak ve Siyahın e5 piyonunu ortadan kaldırmak.',
      'Taşlara açık hatlar ve geniş hareket alanı kazandırmak.',
    ],
    typicalPlansTr: [
      '3...exd4 4.Nxd4 sonrasında c6 üzerinden piyon yapısını bozmak veya Be3-Nc3-Qd2-O-O-O ile hızlı gelişim.',
    ],
    commonMistakesTr: [
      'Merkezdeki d4 atını desteksiz bırakıp erken geri çekilmek.',
    ],
    tacticalThemesTr: [
      'Açık e ve d dikeylerinde hızlı taktik tehditler ve c6 karesi üzerindeki baskı.',
    ],
    pawnStructureTr: 'Asimetrik açık merkez: Beyazın e4 piyonu alan üstünlüğü sağlar.',
    mainLine: [
      { uci: 'e2e4', san: 'e4', explanationTr: 'Merkez kontrolü.' },
      { uci: 'e7e5', san: 'e5', explanationTr: 'Merkez cevabı.' },
      { uci: 'g1f3', san: 'Nf3', explanationTr: 'At gelişimi.' },
      { uci: 'b8c6', san: 'Nc6', explanationTr: 'e5 piyonu korunur.' },
      { uci: 'd2d4', san: 'd4', explanationTr: 'İskoç Açılışı! Beyaz hazırlık yapmadan merkezi hemen parçalar.' },
      { uci: 'e5d4', san: 'exd4', explanationTr: 'Siyah merkezdeki gerilimi çözer.' },
      { uci: 'f3d4', san: 'Nxd4', explanationTr: 'Beyaz at güçlü merkez karesine yerleşir.' },
      { uci: 'g8f6', san: 'Nf6', explanationTr: 'Siyah e4 piyonuna baskı kurarak gelişir.' },
    ],
    alternativeResponses: [],
  },
  {
    id: 'queens-gambit',
    side: 'w',
    nameTr: 'Vezir Gambiti',
    nameEn: "Queen's Gambit",
    eco: 'D06',
    startingMovesSan: '1. d4 d5 2. c4',
    mainIdeasTr: [
      '2.c4 ile Siyahın d5 merkez piyonunu yan piyonla değişmeye zorlamak.',
      'Siyah piyonu alırsa (2...dxc4) e4 sürüşüyle tam merkezi ele geçirmek ve c4 piyonunu f1 filiyle kolayca geri almak.',
    ],
    typicalPlansTr: [
      'Nc3, Nf3, Bg5/Bf4 ve e3 ile tüm taşları uyumlu geliştirmek.',
      'Yarı açık c-dikeyinde kalelerle vezir kanadı baskısı (Azınlık Saldırısı).',
    ],
    commonMistakesTr: [
      'c1 filini içeride unutup e3 sürerek kötü fil konumunda kalmak.',
    ],
    tacticalThemesTr: [
      'Kabul Edilen Vezir Gambitinde Qa4+ ile c4 piyonunu geri alma çatalı; d5 karesi üzerindeki gerilim.',
    ],
    pawnStructureTr: 'Klasik d4-d5 merkez mücadelesi ve c-dikeyinin açılması.',
    mainLine: [
      { uci: 'd2d4', san: 'd4', explanationTr: 'Vezir piyonuyla sağlam merkez kontrolü.' },
      { uci: 'd7d5', san: 'd5', explanationTr: 'Siyah merkezi dengeler.' },
      { uci: 'c2c4', san: 'c4', explanationTr: 'Vezir Gambiti! Siyahın d5 merkez piyonuna yandan darbe.' },
      { uci: 'e7e6', san: 'e6', explanationTr: 'Siyah d5 piyonunu piyonla destekleyerek merkezde kalır.' },
      { uci: 'b1c3', san: 'Nc3', explanationTr: 'Beyaz d5 ve e4 kareleri üzerindeki kontrolünü artırır.' },
      { uci: 'g8f6', san: 'Nf6', explanationTr: 'Siyah atını doğal karesine geliştirir.' },
    ],
    alternativeResponses: [
      {
        id: 'qga-line',
        nameTr: 'Kabul Edilen Vezir Gambiti (2...dxc4)',
        descriptionTr: 'Siyah c4 piyonunu alır ancak Beyaz merkezi ele geçirip piyonu rahatça geri alır.',
        steps: [
          { uci: 'd2d4', san: 'd4', explanationTr: 'Merkez kontrolü.' },
          { uci: 'd7d5', san: 'd5', explanationTr: 'Merkez cevabı.' },
          { uci: 'c2c4', san: 'c4', explanationTr: 'Vezir Gambiti.' },
          { uci: 'd5c4', san: 'dxc4', explanationTr: 'Siyah piyonu alır ancak merkezi Beyaza bırakır.' },
          { uci: 'e2e4', san: 'e4', explanationTr: 'Beyaz hem tüm merkezi alır hem de f1 filiyle c4 piyonunu geri ister.' },
        ],
      },
    ],
  },
  {
    id: 'london-system',
    side: 'w',
    nameTr: 'Londra Sistemi',
    nameEn: 'London System',
    eco: 'D02',
    startingMovesSan: '1. d4 d5 2. Bf4',
    mainIdeasTr: [
      'Koyu renkli c1 filini e3 sürmeden önce f4 karesine çıkararak aktif hale getirmek.',
      'd4-e3-c3 piyon piramidiyle kırılması çok zor, sağlam bir merkez kurmak.',
      'Rakibin hemen her cevabına karşı anlaşılır ve sistemli bir gelişim planı uygulamak.',
    ],
    typicalPlansTr: [
      'Nf3, e3, c3, Nbd2 ve Bd3 gelişimini tamamlayıp e5 karesine at yerleştirmek.',
    ],
    commonMistakesTr: [
      'Siyahın erken ...c5 ve ...Qb6 baskısına karşı b2 piyonunu korumasız bırakmak.',
    ],
    tacticalThemesTr: [
      'f4 ve d3 fillerinin h7/g6 karelerine yönelik çapraz bataryası ve Ne5 ileri karakolu.',
    ],
    pawnStructureTr: 'c3-d4-e3 sağlam piyon üçgeni (piramit yapısı).',
    mainLine: [
      { uci: 'd2d4', san: 'd4', explanationTr: 'Merkez kontrolü.' },
      { uci: 'd7d5', san: 'd5', explanationTr: 'Simetrik merkez.' },
      { uci: 'c1f4', san: 'Bf4', explanationTr: 'Londra Sistemi! Fil piyon zincirinin dışına, aktif h2-b8 çaprazına çıkar.' },
      { uci: 'g8f6', san: 'Nf6', explanationTr: 'Siyah atını geliştirir.' },
      { uci: 'e2e3', san: 'e3', explanationTr: 'd4 piyonunu destekler ve f1 filinin yolunu açar.' },
      { uci: 'c7c5', san: 'c5', explanationTr: 'Siyah Beyazın merkezine yandan baskı kurar.' },
      { uci: 'c2c3', san: 'c3', explanationTr: 'Piyon piramidini tamamlayarak d4 karesini çelik gibi sağlamlaştırır.' },
    ],
    alternativeResponses: [],
  },
  {
    id: 'vienna-game',
    side: 'w',
    nameTr: 'Viyana Açılışı',
    nameEn: 'Vienna Game',
    eco: 'C25',
    startingMovesSan: '1. e4 e5 2. Nc3',
    mainIdeasTr: [
      'e4 piyonunu hemen korurken f2-f4 sürüşüyle şah kanadından agresif merkez mücadelesi hazırlamak.',
      'Bc4 ve Nf3 ile f7 karesi üzerinde yoğun baskı oluşturmak.',
    ],
    typicalPlansTr: [
      '2...Nf6 karşısında 3.f4 (Viyana Gambiti) veya 3.Bc4 ile sakin gelişim.',
    ],
    commonMistakesTr: [
      '2...Nf6 3.f4 sonrasında Siyahın 3...d5! merkez karşı darbesini bilmeden oynamak.',
    ],
    tacticalThemesTr: [
      'Açılan f-dikeyinde kısa rok sonrası kale ve fil işbirliği.',
    ],
    pawnStructureTr: 'e4 ve f4 piyon ikilisiyle dinamik şah kanadı hücum yapısı.',
    mainLine: [
      { uci: 'e2e4', san: 'e4', explanationTr: 'Merkez açılışı.' },
      { uci: 'e7e5', san: 'e5', explanationTr: 'Merkez cevabı.' },
      { uci: 'b1c3', san: 'Nc3', explanationTr: 'Viyana Açılışı: e4 piyonunu korur ve f4 sürüşünü saklı tutar.' },
      { uci: 'g8f6', san: 'Nf6', explanationTr: 'Siyah en aktif gelişim hamlesini yapar.' },
      { uci: 'f1c4', san: 'Bc4', explanationTr: 'Fil f7 karesini hedef alarak gelişir.' },
      { uci: 'b8c6', san: 'Nc6', explanationTr: 'Siyah gelişimini tamamlar.' },
    ],
    alternativeResponses: [],
  },

  // ================= BLACK OPENINGS =================
  {
    id: 'sicilian-defense',
    side: 'b',
    nameTr: 'Sicilya Savunması',
    nameEn: 'Sicilian Defense',
    eco: 'B20',
    startingMovesSan: '1. e4 c5',
    mainIdeasTr: [
      '1.e4 hamlesine simetrik 1...e5 yerine 1...c5 ile yanıt vererek asimetrik ve kazanmaya yönelik bir oyun kurmak.',
      'd4 karesini yan piyonla (c5) kontrol edip d4 sürüşünde yan piyonu (c5) Beyazın merkez piyonuyla (d4) değişmek.',
      'Yarı açık c-dikeyinde vezir kanadı karşı saldırısı oluşturmak.',
    ],
    typicalPlansTr: [
      '2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 (Najdorf) veya 5...g6 (Dragon).',
      'Merkezde Siyahın d6-e6/e5 iki merkez piyonu çoğunluğunu kullanmak.',
    ],
    commonMistakesTr: [
      'Gelişimi tamamlamadan çok fazla piyon sürerek merkezde şahı yakalatmak.',
    ],
    tacticalThemesTr: [
      'c-dikeyinde c3 karesine baskı, ...Nxe4 merkez fedaları ve vezir kanadı piyon fırtınası.',
    ],
    pawnStructureTr: 'c5xd4 değişimi sonrası Siyahın c-dikeyi yarı açık kalır ve merkezde 2’ye 1 piyon üstünlüğü doğar.',
    mainLine: [
      { uci: 'e2e4', san: 'e4', explanationTr: 'Beyaz merkezi açar.' },
      { uci: 'c7c5', san: 'c5', explanationTr: 'Sicilya Savunması! Siyah d4 karesini yandan kontrol eder.' },
      { uci: 'g1f3', san: 'Nf3', explanationTr: 'Beyaz d4 sürüşünü hazırlar.' },
      { uci: 'd7d6', san: 'd6', explanationTr: 'e5 karesini kontrol eder ve c8 filinin yolunu açar.' },
      { uci: 'd2d4', san: 'd4', explanationTr: 'Açık Sicilya: Beyaz merkezi açar.' },
      { uci: 'c5d4', san: 'cxd4', explanationTr: 'Siyah yan piyonuyla Beyazın merkez piyonunu kazanır!' },
      { uci: 'f3d4', san: 'Nxd4', explanationTr: 'At merkeze yerleşir.' },
      { uci: 'g8f6', san: 'Nf6', explanationTr: 'Siyah atını geliştirerek hemen e4 piyonunu tehdit eder.' },
    ],
    alternativeResponses: [],
  },
  {
    id: 'french-defense',
    side: 'b',
    nameTr: 'Fransız Savunması',
    nameEn: 'French Defense',
    eco: 'C00',
    startingMovesSan: '1. e4 e6 2. d4 d5',
    mainIdeasTr: [
      '1...e6 hazırlığıyla hemen 2...d5 sürerek Beyazın e4 merkezine meydan okumak.',
      'Beyaz e5 sürerse ...c5 ve ...Nc6/...Qb6 ile Beyazın d4-e5 piyon zincirinin tabanına (d4) saldırmak.',
    ],
    typicalPlansTr: [
      'c7-c5, Nc6, Qb6 ve Nh6-Nf5 ile d4 piyonu üzerinde maksimum baskı kurmak.',
    ],
    commonMistakesTr: [
      'c8 karesindeki açık renkli "Fransız Filini" e6 piyonunun arkasında sonsuza dek pasif bırakmak.',
    ],
    tacticalThemesTr: [
      'd4 piyonu üzerindeki çoklu baskı ve ...f6 ile Beyazın piyon zincirini kırma.',
    ],
    pawnStructureTr: 'Kilitli merkez (Beyaz d4-e5, Siyah d5-e6); mücadele c5 ve f6 yarma hamleleri etrafında döner.',
    mainLine: [
      { uci: 'e2e4', san: 'e4', explanationTr: 'Beyaz merkezi açar.' },
      { uci: 'e7e6', san: 'e6', explanationTr: 'Fransız Savunması: Siyah 2...d5 sürüşünü hazırlar.' },
      { uci: 'd2d4', san: 'd4', explanationTr: 'Beyaz iki piyonla merkezi alır.' },
      { uci: 'd7d5', san: 'd5', explanationTr: 'Siyah e4 piyonuna hemen saldırır.' },
      { uci: 'e4e5', san: 'e5', explanationTr: 'İlerleme Varyantı: Beyaz alan kazanır.' },
      { uci: 'c7c5', san: 'c5', explanationTr: 'Kritik karşı darbe! Siyah Beyazın piyon zincirinin tabanı olan d4 karesine saldırır.' },
    ],
    alternativeResponses: [],
  },
  {
    id: 'caro-kann-defense',
    side: 'b',
    nameTr: 'Caro-Kann Savunması',
    nameEn: 'Caro-Kann Defense',
    eco: 'B10',
    startingMovesSan: '1. e4 c6 2. d4 d5',
    mainIdeasTr: [
      'Fransız Savunmasına benzer şekilde 2...d5 sürmek, ancak e6 yerine c6 oynayarak c8 filinin çaprazını AÇIK tutmak!',
      'Son derece sağlam piyon yapısı ve güçlü oyunsonu şansları elde etmek.',
    ],
    typicalPlansTr: [
      'c8 filini f5 veya g4 karesine geliştirdikten sonra ...e6 ve ...c5 ile merkezi parçalamak.',
    ],
    commonMistakesTr: [
      'c8 filini dışarı çıkarmadan erken ...e6 oynayıp Fransız Savunmasının pasif versiyonuna düşmek.',
    ],
    tacticalThemesTr: [
      '...c5 yarma hamlesi ve d4 karesi üzerindeki konumsal baskı.',
    ],
    pawnStructureTr: 'Çok sağlam ve adacık sayısı az piyon yapısı.',
    mainLine: [
      { uci: 'e2e4', san: 'e4', explanationTr: 'Beyaz merkezi açar.' },
      { uci: 'c7c6', san: 'c6', explanationTr: 'Caro-Kann! c8 filinin yolunu kapatmadan d5 sürüşünü hazırlar.' },
      { uci: 'd2d4', san: 'd4', explanationTr: 'Beyaz merkezi alır.' },
      { uci: 'd7d5', san: 'd5', explanationTr: 'Siyah merkezi sorgular.' },
      { uci: 'b1c3', san: 'Nc3', explanationTr: 'Beyaz e4 piyonunu korur.' },
      { uci: 'd5e4', san: 'dxe4', explanationTr: 'Siyah merkezdeki gerilimi çözer.' },
      { uci: 'c3e4', san: 'Nxe4', explanationTr: 'At merkeze gelir.' },
      { uci: 'c8f5', san: 'Bf5', explanationTr: 'Klasik Varyant: Fil aktif f5 karesine çıkarak atı sorgular.' },
    ],
    alternativeResponses: [],
  },
  {
    id: 'scandinavian-defense',
    side: 'b',
    nameTr: 'İskandinav Savunması',
    nameEn: 'Scandinavian Defense',
    eco: 'B01',
    startingMovesSan: '1. e4 d5',
    mainIdeasTr: [
      'Daha ilk hamlede Beyazın e4 piyonuna saldırarak oyunu kendi bildiğimiz net bir yapıya yönlendirmek.',
      'c6 ve e6 ile son derece sağlam bir "Caro-Kann duvarı" kurup taşları rahatça geliştirmek.',
    ],
    typicalPlansTr: [
      '2.exd5 Qxd5 3.Nc3 Qa5 (veya Qd6/Qd8) sonrası Nf6, Bf5 ve c6-e6 ile sağlam gelişim.',
    ],
    commonMistakesTr: [
      'Veziri tahtanın ortasında dolaştırıp Beyazın hafif taşlarına arka arkaya tempo vermek.',
    ],
    tacticalThemesTr: [
      'Açık d-dikeyinde uzun rok sonrası kale baskısı ve b2/d4 hedefleri.',
    ],
    pawnStructureTr: 'Sağlam c6-e6 piyon üçgeni.',
    mainLine: [
      { uci: 'e2e4', san: 'e4', explanationTr: 'Beyaz merkezi açar.' },
      { uci: 'd7d5', san: 'd5', explanationTr: 'İskandinav Savunması! İlk hamleden merkez mücadelesi.' },
      { uci: 'e4d5', san: 'exd5', explanationTr: 'Beyaz piyonu alır.' },
      { uci: 'd8d5', san: 'Qxd5', explanationTr: 'Siyah vezirle piyonu geri alır.' },
      { uci: 'b1c3', san: 'Nc3', explanationTr: 'Beyaz tempoyla atını geliştirir.' },
      { uci: 'd5a5', san: 'Qa5', explanationTr: 'Klasik kare: Vezir a5 karesinden c3 atını açmazda tutar ve güvende kalır.' },
    ],
    alternativeResponses: [],
  },
  {
    id: 'kings-indian-defense',
    side: 'b',
    nameTr: 'Şah Hint Savunması',
    nameEn: "King's Indian Defense",
    eco: 'E60',
    startingMovesSan: '1. d4 Nf6 2. c4 g6',
    mainIdeasTr: [
      'Modern hipermodern anlayışla Beyazın piyonlarla merkezi almasına izin verip daha sonra ...e5 veya ...c5 ile o merkezi yıkmak.',
      'g7 karesine "fianchetto" yapılan fil ile uzun a1-h8 çaprazına hükmetmek.',
    ],
    typicalPlansTr: [
      '...Bg7, ...O-O, ...d6 ve ...e5 sürüşünün ardından şah kanadından ...f5 ile mat atağı başlatmak.',
    ],
    commonMistakesTr: [
      'g7 filini korumasız şekilde değişip Siyah şahın etrafındaki koyu kareleri zayıf bırakmak.',
    ],
    tacticalThemesTr: [
      'g7 filinin uzun çapraz patlaması ve şah kanadında f5-f4-g5 piyon fırtınası.',
    ],
    pawnStructureTr: 'Dinamik kilitli merkezde Siyah şah kanadından, Beyaz vezir kanadından saldırır.',
    mainLine: [
      { uci: 'd2d4', san: 'd4', explanationTr: 'Beyaz merkezi açar.' },
      { uci: 'g8f6', san: 'Nf6', explanationTr: 'Siyah esnek bir at gelişimiyle başlar ve e4 sürüşünü engeller.' },
      { uci: 'c2c4', san: 'c4', explanationTr: 'Beyaz merkez alanını genişletir.' },
      { uci: 'g7g6', san: 'g6', explanationTr: 'Filini g7 uzun çaprazına (fianchetto) hazırlamak için g6 oynar.' },
      { uci: 'b1c3', san: 'Nc3', explanationTr: 'Beyaz e4 sürüşünü hazırlar.' },
      { uci: 'f8g7', san: 'Bg7', explanationTr: 'Şah Hint fili en güçlü çaprazına yerleşir.' },
      { uci: 'e2e4', san: 'e4', explanationTr: 'Beyaz büyük piyon merkezini kurar.' },
      { uci: 'd7d6', san: 'd6', explanationTr: 'Siyah ...O-O ve ...e5 karşı darbesini hazırlar.' },
    ],
    alternativeResponses: [],
  },
  {
    id: 'queens-gambit-declined',
    side: 'b',
    nameTr: 'Kabul Edilmemiş Vezir Gambiti (QGD)',
    nameEn: "Queen's Gambit Declined",
    eco: 'D30',
    startingMovesSan: '1. d4 d5 2. c4 e6',
    mainIdeasTr: [
      'd5 merkez piyonunu e6 ile sağlamca koruyarak Beyaza e4 karesini bedava vermemek.',
      'Sağlam gelişim (Nf6, Be7, O-O, Nbd7) sonrasında ...c5 veya ...e5 ile eşitliği ve karşı şansı yakalamak.',
    ],
    typicalPlansTr: [
      '...Be7, ...O-O, ...b6/...Bb7 veya ...c5 ile c8 filinin gelişim sorununu çözmek.',
    ],
    commonMistakesTr: [
      'Hazırlıksız ...dxc4 oynayıp gelişim gerisindeyken merkezi Beyaza açmak.',
    ],
    tacticalThemesTr: [
      'd5 karesi üzerindeki hesaplamalar ve ...Nxd5 / ...Bxf6 ara hamleleri.',
    ],
    pawnStructureTr: 'Klasik d5-e6 sağlam merkez kalesi.',
    mainLine: [
      { uci: 'd2d4', san: 'd4', explanationTr: 'Beyaz merkezi açar.' },
      { uci: 'd7d5', san: 'd5', explanationTr: 'Siyah merkezde yerini alır.' },
      { uci: 'c2c4', san: 'c4', explanationTr: 'Vezir Gambiti.' },
      { uci: 'e7e6', san: 'e6', explanationTr: 'Kabul Edilmemiş Vezir Gambiti: d5 piyonu sağlamca desteklenir.' },
      { uci: 'b1c3', san: 'Nc3', explanationTr: 'Beyaz d5 baskısını artırır.' },
      { uci: 'g8f6', san: 'Nf6', explanationTr: 'Siyah atını geliştirerek merkezi korur.' },
      { uci: 'c1g5', san: 'Bg5', explanationTr: 'Beyaz f6 atını açmaza alır.' },
      { uci: 'f8e7', san: 'Be7', explanationTr: 'Siyah açmazı çözer ve kısa roka hazırlanır.' },
    ],
    alternativeResponses: [],
  },
];
