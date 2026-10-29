export type PuzzleTheme =
  | 'mate_in_1'
  | 'mate_in_2'
  | 'fork'
  | 'pin'
  | 'material_gain'
  | 'defense'
  | 'mixed';

export interface PuzzleStep {
  acceptedPlayerUci: string[]; // Validated winning moves for the player at this step
  opponentReplyUci?: string; // Automatic opponent response if multi-move puzzle
}

export interface TacticalPuzzle {
  id: string;
  titleTr: string;
  theme: PuzzleTheme;
  themeLabelTr: string;
  difficulty: 'Başlangıç' | 'Orta' | 'İleri';
  rating: number;
  fen: string;
  steps: PuzzleStep[];
  hint1Tr: string;
  hint2Tr: string;
  explanationTr: string;
}

export const PUZZLE_THEMES: { id: PuzzleTheme | 'all'; labelTr: string }[] = [
  { id: 'all', labelTr: 'Tümü' },
  { id: 'mate_in_1', labelTr: 'Tek Hamlede Mat' },
  { id: 'mate_in_2', labelTr: 'İki Hamlede Mat' },
  { id: 'fork', labelTr: 'Çatal (Fork)' },
  { id: 'pin', labelTr: 'Açmaz (Pin)' },
  { id: 'material_gain', labelTr: 'Materyal Kazancı' },
  { id: 'defense', labelTr: 'Savunma Bulmacaları' },
  { id: 'mixed', labelTr: 'Karma Taktikler' },
];

export const PUZZLES_DATA: TacticalPuzzle[] = [
  {
    id: 'puz-01-back-rank-mate-1',
    titleTr: 'Arka Yatay Zaferi',
    theme: 'mate_in_1',
    themeLabelTr: 'Tek Hamlede Mat',
    difficulty: 'Başlangıç',
    rating: 850,
    fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
    steps: [{ acceptedPlayerUci: ['d1d8'] }],
    hint1Tr: 'Siyah şahın 7. yataydaki piyonları yüzünden kaçış karesi yok.',
    hint2Tr: 'd1 karesindeki kaleni 8. yataya indir.',
    explanationTr: 'Rd8# ile klasik Arka Yatay Matı! Siyahın f7, g7, h7 piyonları kendi şahının kaçışını engelliyor.',
  },
  {
    id: 'puz-02-queen-support-mate-1',
    titleTr: 'Vezir ve Fil İşbirliği',
    theme: 'mate_in_1',
    themeLabelTr: 'Tek Hamlede Mat',
    difficulty: 'Başlangıç',
    rating: 900,
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
    steps: [{ acceptedPlayerUci: ['h5f7'] }],
    hint1Tr: 'c4 filin ve h5 vezirin aynı kareye odaklanmış durumda.',
    hint2Tr: 'h5 karesindeki vezirinle f7 piyonunu al.',
    explanationTr: 'Qxf7# hamlesiyle vezir c4 fili tarafından korunduğu için Siyah şah veziri alamaz ve mat olur.',
  },
  {
    id: 'puz-03-knight-royal-fork',
    titleTr: 'Şah ve Vezir Çatalı',
    theme: 'fork',
    themeLabelTr: 'Çatal (Fork)',
    difficulty: 'Başlangıç',
    rating: 1000,
    fen: 'r2qk2r/ppp2ppp/8/3N4/8/8/PPP2PPP/R3K2R w KQkq - 0 1',
    steps: [{ acceptedPlayerUci: ['d5c7'] }],
    hint1Tr: 'Siyahın e8 şahı, d8 veziri ve a8 kalesi aynı anda bir at sıçramasına açık.',
    hint2Tr: 'd5 karesindeki atını c7 karesine taşıyarak şah çek.',
    explanationTr: 'Nc7+ hamlesi hem e8 şahına şah çeker hem de a8 kalesini tehdit eder; şah kaçınca kale kazanılır.',
  },
  {
    id: 'puz-04-absolute-pin-win',
    titleTr: 'Mutlak Açmazla Taş Kazancı',
    theme: 'pin',
    themeLabelTr: 'Açmaz (Pin)',
    difficulty: 'Başlangıç',
    rating: 1050,
    fen: '4k3/8/8/4n3/8/8/5PPP/3R2K1 w - - 0 1',
    steps: [{ acceptedPlayerUci: ['d1e1'] }],
    hint1Tr: 'Siyahın e5 atı ile e8 şahı aynı açık dikey üzerinde duruyor.',
    hint2Tr: 'd1 kalesini e1 karesine getirerek atı şaha karşı bağla.',
    explanationTr: 'Re1 hamlesi e5 karesindeki atı e8 şahına karşı mutlak açmaza alır; at kıpırdayamadığı için düşer.',
  },
  {
    id: 'puz-05-mate-in-2-sacrifice',
    titleTr: 'Çifte Kale İle İki Hamlede Mat',
    theme: 'mate_in_2',
    themeLabelTr: 'İki Hamlede Mat',
    difficulty: 'Orta',
    rating: 1250,
    fen: '6k1/5ppp/8/8/8/8/1R3PPP/4R1K1 w - - 0 1',
    steps: [
      { acceptedPlayerUci: ['e1e8', 'b2b8'] },
    ],
    hint1Tr: '8. yatay tamamen kontrolün altında.',
    hint2Tr: 'Kalelerinden birini 8. yataya indirerek doğrudan mat et.',
    explanationTr: 'Re8# veya Rb8# ile arka yatay zayıflığını kullanarak doğrudan oyunu bitirirsin.',
  },
  {
    id: 'puz-06-mate-in-2-queen-rook',
    titleTr: 'İki Hamlede Koridor Matı',
    theme: 'mate_in_2',
    themeLabelTr: 'İki Hamlede Mat',
    difficulty: 'Orta',
    rating: 1350,
    fen: '3r2k1/5ppp/8/8/8/8/4QPPP/4R1K1 w - - 0 1',
    steps: [
      { acceptedPlayerUci: ['e2e8'], opponentReplyUci: 'd8e8' },
      { acceptedPlayerUci: ['e1e8'] },
    ],
    hint1Tr: '8. yatayı savunan tek taş d8 karesindeki Siyah kale. Vezir ve kalen e-dikeyinde batarya kurmuş!',
    hint2Tr: 'Önce e2 vezirini e8 karesine indirerek şah çek; Siyah kale alınca e1 kalenle mat et.',
    explanationTr: '1.Qe8+! Rxe8 2.Rxe8# — e-dikeyindeki Vezir+Kale bataryasıyla savunmacıyı yok edip iki hamlede mat yaptın.',
  },
  {
    id: 'puz-07-material-gain-skewer',
    titleTr: 'Dikeyde Kale Şişi (Skewer)',
    theme: 'material_gain',
    themeLabelTr: 'Materyal Kazancı',
    difficulty: 'Orta',
    rating: 1200,
    fen: '4k3/8/8/8/8/8/4q3/3R2K1 w - - 0 1',
    steps: [{ acceptedPlayerUci: ['d1e1'] }],
    hint1Tr: 'Siyah vezir e2 karesinde, Siyah şah ise hemen arkasında e8 karesinde!',
    hint2Tr: 'd1 kaleni e1 karesine getirerek veziri şaha karşı açmaza al.',
    explanationTr: 'Re1! hamlesiyle e2 veziri arkasındaki e8 şahı yüzünden mutlak açmaza girer ve kurtarılamaz.',
  },
  {
    id: 'puz-08-defensive-back-rank',
    titleTr: 'Kritik Savunma: Matı Önle ve Kazan',
    theme: 'defense',
    themeLabelTr: 'Savunma Bulmacaları',
    difficulty: 'Orta',
    rating: 1300,
    fen: '6k1/5ppp/8/8/8/8/2q2PPP/2R3K1 w - - 0 1',
    steps: [{ acceptedPlayerUci: ['c1c2'] }],
    hint1Tr: 'Siyah vezir c2 karesinden hem kaleni hem de c1/d1 üzerinden arka yatay matını tehdit ediyor ama c2 veziri savunmasız!',
    hint2Tr: 'c1 karesindeki kalenle c2 vezirini ele geçir.',
    explanationTr: 'Rxc2! hamlesi hem kendi arka yatay matı tehdidini ortadan kaldırır hem de Siyah veziri kazanır.',
  },
  {
    id: 'puz-09-mixed-discovered-check',
    titleTr: 'Açarak Şah ile Vezir Kazancı',
    theme: 'mixed',
    themeLabelTr: 'Karma Taktikler',
    difficulty: 'İleri',
    rating: 1450,
    fen: '3qk3/8/8/3B4/8/8/8/3QK3 w - - 0 1',
    steps: [{ acceptedPlayerUci: ['d5c6', 'd5f7'] }],
    hint1Tr: 'd1 vezirin ile d8 Siyah veziri aynı dikeyde, aralarında d5 filin duruyor.',
    hint2Tr: 'd5 filinle şah çekebileceğin (Bc6+ veya Bxf7+) bir kareye git ki Siyah vezir boşta kalsın!',
    explanationTr: 'd5 filini şah çekerek (Bc6+ veya Bxf7+) d-dikeyinden çektiğinde Siyah şahını kurtarmak zorunda kalır ve d8 veziri düşer.',
  },
  {
    id: 'puz-10-pawn-fork-center',
    titleTr: 'Merkezde Piyon Çatalı',
    theme: 'fork',
    themeLabelTr: 'Çatal (Fork)',
    difficulty: 'Başlangıç',
    rating: 950,
    fen: 'r1bqk2r/pppp1ppp/8/2b1n3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 0 5',
    steps: [{ acceptedPlayerUci: ['d2d4'] }],
    hint1Tr: 'Siyahın c5 fili ve e5 atı aynı yatayda yan yana duruyor.',
    hint2Tr: 'd2 piyonunu iki kare sürerek (d4) hem c5 filini hem e5 atını aynı anda tehdit et!',
    explanationTr: 'd4! piyon çatalı aynı anda hem c5 filini hem de e5 atını tehdit eder ve Beyaza net hafif taş kazandırır.',
  },
];
