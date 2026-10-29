import { Chess, Square } from 'chess.js';
import { getOppositeColor, PIECE_NAMES_TR } from '@/utils/chessUtils';
import { analyzePositionTactics } from './tacticalDetectors';
import { MoveCoachingEvaluation } from './coachEngine';
import { generateSmartHint } from './hintSystem';
import { EngineAnalysisResult } from '@/engine/chessEngineAdapter';

export type AssistantIntentId =
  | 'what_should_i_do'
  | 'why_was_move_bad'
  | 'what_is_better_move'
  | 'is_my_king_safe'
  | 'which_piece_threatened'
  | 'how_to_castle'
  | 'what_is_my_plan'
  | 'what_is_opponent_threatening'
  | 'opening_purpose'
  | 'why_center_important'
  | 'what_did_i_gain'
  | 'give_hint'
  | 'explain_more'
  | 'show_me'
  | 'unsupported';

export interface AssistantResponse {
  intent: AssistantIntentId;
  questionTr: string;
  answerTr: string;
  bulletPointsTr: string[];
  highlightSquares: Square[];
  arrows: [Square, Square, string?][];
  suggestedQuestions: string[];
}

export const SUPPORTED_QUESTIONS_TR: { intent: AssistantIntentId; label: string }[] = [
  { intent: 'what_should_i_do', label: 'Şimdi ne yapmalıyım?' },
  { intent: 'why_was_move_bad', label: 'Neden bu hamle kötü?' },
  { intent: 'what_is_better_move', label: 'Daha iyi hamle hangisi?' },
  { intent: 'is_my_king_safe', label: 'Şahım tehlikede mi?' },
  { intent: 'which_piece_threatened', label: 'Hangi taşım tehdit altında?' },
  { intent: 'what_is_opponent_threatening', label: 'Rakibim neyi tehdit ediyor?' },
  { intent: 'what_is_my_plan', label: 'Bu pozisyonda planım ne olmalı?' },
  { intent: 'how_to_castle', label: 'Nasıl rok yapabilirim?' },
  { intent: 'opening_purpose', label: 'Bu açılışın amacı ne?' },
  { intent: 'why_center_important', label: 'Neden merkez önemli?' },
  { intent: 'what_did_i_gain', label: 'Bu hamleyle ne kazandım?' },
  { intent: 'give_hint', label: 'Bir ipucu ver.' },
  { intent: 'explain_more', label: 'Daha fazla açıkla.' },
  { intent: 'show_me', label: 'Bana göster.' },
];

/**
 * Normalizes Turkish characters and punctuation for resilient deterministic intent matching.
 */
export function normalizeTurkishText(input: string): string {
  return input
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function detectAssistantIntent(query: string): AssistantIntentId {
  const q = normalizeTurkishText(query);
  if (!q) return 'unsupported';

  if (q.includes('ipucu') || q.includes('tuyo') || q.includes('yardim')) return 'give_hint';
  if (q.includes('bana goster') || q.includes('tahtada goster') || q === 'goster') return 'show_me';
  if (q.includes('daha fazla acikla') || q.includes('detay') || q.includes('ayrinti')) return 'explain_more';
  if (q.includes('neden bu hamle kotu') || q.includes('hatam ne') || q.includes('neden yanlis') || q.includes('neden hata')) {
    return 'why_was_move_bad';
  }
  if (q.includes('daha iyi hamle') || q.includes('en iyi hamle') || q.includes('dogru hamle')) {
    return 'what_is_better_move';
  }
  if (q.includes('sahim tehlikede') || q.includes('sah guvenligi') || q.includes('sahim guvende')) {
    return 'is_my_king_safe';
  }
  if (q.includes('hangi tasim tehdit') || q.includes('askida') || q.includes('savunmasiz tasim')) {
    return 'which_piece_threatened';
  }
  if (q.includes('rakibim neyi tehdit') || q.includes('rakibin tehdidi') || q.includes('rakip ne istiyor')) {
    return 'what_is_opponent_threatening';
  }
  if (q.includes('rok')) {
    return 'how_to_castle';
  }
  if (q.includes('acilisin amaci') || q.includes('bu acilis')) {
    return 'opening_purpose';
  }
  if (q.includes('neden merkez') || q.includes('merkez onemli')) {
    return 'why_center_important';
  }
  if (q.includes('ne kazandim') || q.includes('bu hamleyle ne')) {
    return 'what_did_i_gain';
  }
  if (q.includes('planim ne') || q.includes('nasil bir plan')) {
    return 'what_is_my_plan';
  }
  if (q.includes('simdi ne yapmaliyim') || q.includes('ne oynamaliyim') || q.includes('ne yapayim')) {
    return 'what_should_i_do';
  }

  return 'unsupported';
}

export function answerContextualQuestion(params: {
  query: string;
  fen: string;
  lastMoveEval?: MoveCoachingEvaluation | null;
  engineResult?: EngineAnalysisResult | null;
  openingNameTr?: string;
  openingIdeaTr?: string;
}): AssistantResponse {
  const { query, fen, lastMoveEval, engineResult, openingNameTr, openingIdeaTr } = params;
  const intent = detectAssistantIntent(query);
  const chess = new Chess(fen);
  const turn = chess.turn();
  const enemy = getOppositeColor(turn);
  const report = analyzePositionTactics(fen);

  const defaultSuggestions = [
    'Şimdi ne yapmalıyım?',
    'Hangi taşım tehdit altında?',
    'Bu pozisyonda planım ne olmalı?',
    'Bana göster.',
  ];

  if (intent === 'unsupported') {
    return {
      intent: 'unsupported',
      questionTr: query,
      answerTr:
        'Ben kurallara ve gerçek tahta analizine dayalı deterministik bir satranç asistanıyım; doğrulayamadığım konularda tahmin yürütmem. Mevcut pozisyon hakkında aşağıdaki desteklenen sorulardan birini seçebilir veya yazabilirsin:',
      bulletPointsTr: SUPPORTED_QUESTIONS_TR.slice(0, 6).map((q) => q.label),
      highlightSquares: [],
      arrows: [],
      suggestedQuestions: SUPPORTED_QUESTIONS_TR.slice(0, 6).map((q) => q.label),
    };
  }

  if (intent === 'give_hint') {
    const hint = generateSmartHint(fen, 1, engineResult ?? undefined);
    return {
      intent,
      questionTr: query,
      answerTr: hint.messageTr,
      bulletPointsTr: ['Daha belirgin bir yönlendirme için "Bana göster." diyebilirsin.'],
      highlightSquares: hint.highlightSquares,
      arrows: hint.arrows,
      suggestedQuestions: ['Bana göster.', 'Hangi taşım tehdit altında?', 'Şahım tehlikede mi?'],
    };
  }

  if (intent === 'show_me' || intent === 'what_is_better_move') {
    const hint3 = generateSmartHint(fen, 3, engineResult ?? undefined);
    if (intent === 'what_is_better_move' && lastMoveEval && lastMoveEval.classification !== 'best') {
      return {
        intent,
        questionTr: query,
        answerTr: `Son hamlen (${lastMoveEval.moveSan}) yerine ${lastMoveEval.bestMoveSan} daha güçlüydü. ${lastMoveEval.bestMoveReasonTr}`,
        bulletPointsTr: lastMoveEval.candidateLines.map(
          (l, i) => `Aday Varyant ${i + 1}: ${l.sanLine.join(' ')}`
        ),
        highlightSquares: lastMoveEval.highlightSquares,
        arrows: lastMoveEval.suggestedArrows,
        suggestedQuestions: ['Neden bu hamle kötü?', 'Şimdi ne yapmalıyım?', 'Bu pozisyonda planım ne olmalı?'],
      };
    }
    return {
      intent,
      questionTr: query,
      answerTr: hint3.messageTr,
      bulletPointsTr: hint3.bestMoveSan ? [`Önerilen hamle: ${hint3.bestMoveSan}`] : [],
      highlightSquares: hint3.highlightSquares,
      arrows: hint3.arrows,
      suggestedQuestions: ['Bu pozisyonda planım ne olmalı?', 'Rakibim neyi tehdit ediyor?'],
    };
  }

  if (intent === 'why_was_move_bad') {
    if (!lastMoveEval) {
      return {
        intent,
        questionTr: query,
        answerTr: 'Henüz değerlendirilecek bir hamle yapılmadı. Bir hamle yaptıktan sonra analizini detaylıca inceleyebiliriz.',
        bulletPointsTr: [],
        highlightSquares: [],
        arrows: [],
        suggestedQuestions: defaultSuggestions,
      };
    }
    return {
      intent,
      questionTr: query,
      answerTr: lastMoveEval.explanations.intermediate,
      bulletPointsTr: [
        `Hamle sınıfı: ${lastMoveEval.classificationLabelTr}`,
        ...lastMoveEval.tacticalFacts.map((f) => f.descriptionTr),
        ...lastMoveEval.strategicObservations.map((s) => s.descriptionTr),
      ],
      highlightSquares: lastMoveEval.highlightSquares,
      arrows: lastMoveEval.suggestedArrows,
      suggestedQuestions: ['Daha iyi hamle hangisi?', 'Daha fazla açıkla.', 'Şimdi ne yapmalıyım?'],
    };
  }

  if (intent === 'explain_more') {
    if (lastMoveEval) {
      return {
        intent,
        questionTr: query,
        answerTr: lastMoveEval.explanations.advanced,
        bulletPointsTr: lastMoveEval.candidateLines.map(
          (l, i) => `Varyant ${i + 1}: ${l.sanLine.join(' ')}`
        ),
        highlightSquares: lastMoveEval.highlightSquares,
        arrows: lastMoveEval.suggestedArrows,
        suggestedQuestions: ['Şimdi ne yapmalıyım?', 'Bu pozisyonda planım ne olmalı?'],
      };
    }
    const hint2 = generateSmartHint(fen, 2, engineResult ?? undefined);
    return {
      intent,
      questionTr: query,
      answerTr: hint2.messageTr,
      bulletPointsTr: [],
      highlightSquares: hint2.highlightSquares,
      arrows: hint2.arrows,
      suggestedQuestions: ['Bana göster.', 'Hangi taşım tehdit altında?'],
    };
  }

  if (intent === 'is_my_king_safe') {
    const myKing = report.pieces.find((p) => p.type === 'k' && p.color === turn);
    const backRankVuln = turn === 'w' ? report.backRank.whiteVulnerable : report.backRank.blackVulnerable;
    const bullets: string[] = [];
    let summary = 'Şahın şu an doğrudan bir şah tehdidi altında değil.';

    if (report.inCheck) {
      summary = 'Dikkat! Şahın şu anda doğrudan şah tehdidi (Check) altında. Hemen şahı kaçmalı, araya taş kapatmalı veya tehdit eden taşı almalısın.';
    } else if (report.mateInOneMoves.length > 0) {
      summary = 'Şahın doğrudan tehdit altında değil ve hatta senin mat fırsatın bulunuyor!';
    } else if (backRankVuln) {
      summary = 'Şahın şu an şahta değil ancak son yatayda hava deliği (kaçış karesi) olmadığı için arka yatay matı tehditlerine karşı hassas.';
      bullets.push('Vakit bulduğunda h3/g3 (veya Siyah için h6/g6) gibi bir piyon hamlesiyle şahına hava deliği açabilirsin.');
    }

    return {
      intent,
      questionTr: query,
      answerTr: summary,
      bulletPointsTr: bullets,
      highlightSquares: myKing ? [myKing.square] : [],
      arrows: [],
      suggestedQuestions: ['Nasıl rok yapabilirim?', 'Hangi taşım tehdit altında?', 'Şimdi ne yapmalıyım?'],
    };
  }

  if (intent === 'which_piece_threatened') {
    const hanging = report.hangingPieces[turn];
    const attacked = report.attackedPieces[turn];

    if (hanging.length === 0 && attacked.length === 0) {
      return {
        intent,
        questionTr: query,
        answerTr: 'Şu anda doğrudan rakip taşlar tarafından tehdit edilen veya askıda kalan bir taşın bulunmuyor.',
        bulletPointsTr: [],
        highlightSquares: [],
        arrows: [],
        suggestedQuestions: ['Şimdi ne yapmalıyım?', 'Bu pozisyonda planım ne olmalı?'],
      };
    }

    const sqs: Square[] = [];
    const arrows: [Square, Square, string?][] = [];
    const bullets: string[] = [];

    for (const h of hanging) {
      sqs.push(h.piece.square);
      const att = h.attackers[0];
      if (att) arrows.push([att.square, h.piece.square, '#ef4444']);
      bullets.push(
        `${h.piece.square} karesindeki ${PIECE_NAMES_TR[h.piece.type].nominative.toLowerCase()} savunmasız/tehlikede (Rakip ${att?.square ?? ''} taşı tehdit ediyor).`
      );
    }

    if (bullets.length === 0) {
      for (const a of attacked) {
        sqs.push(a.square);
        bullets.push(
          `${a.square} karesindeki ${PIECE_NAMES_TR[a.type].nominative.toLowerCase()} rakip tarafından saldırı altında ancak şu an korunuyor.`
        );
      }
    }

    return {
      intent,
      questionTr: query,
      answerTr:
        hanging.length > 0
          ? `Dikkat! ${hanging.length} taşın savunmasız veya daha düşük değerli bir taş tarafından tehdit altında.`
          : `Bazı taşların saldırı altında olsa da şu an kendi taşların tarafından korunuyor.`,
      bulletPointsTr: bullets,
      highlightSquares: sqs,
      arrows,
      suggestedQuestions: ['Şimdi ne yapmalıyım?', 'Bana göster.'],
    };
  }

  if (intent === 'what_is_opponent_threatening') {
    const myHanging = report.hangingPieces[turn];
    const enemyForks = report.forks[enemy];
    const enemyPins = report.pins[enemy];
    const bullets: string[] = [];
    const arrows: [Square, Square, string?][] = [];
    const sqs: Square[] = [];

    for (const h of myHanging) {
      const att = h.attackers[0];
      sqs.push(h.piece.square);
      if (att) arrows.push([att.square, h.piece.square, '#ef4444']);
      bullets.push(
        `Rakip, ${h.piece.square} karesindeki ${PIECE_NAMES_TR[h.piece.type].accusative} ele geçirmeyi tehdit ediyor.`
      );
    }
    for (const f of enemyForks) {
      bullets.push(
        `Rakibin ${f.attacker.square} karesindeki ${PIECE_NAMES_TR[f.attacker.type].nominative.toLowerCase()} çatal tehdidi oluşturuyor.`
      );
    }
    for (const p of enemyPins) {
      bullets.push(
        `Rakibin ${p.pinner.square} taşı, ${p.pinned.square} karesindeki taşını açmazda tutuyor.`
      );
    }

    return {
      intent,
      questionTr: query,
      answerTr:
        bullets.length > 0
          ? 'Rakibinin mevcut pozisyondaki başlıca tehditleri şunlar:'
          : 'Rakibinin şu an doğrudan materyal kazanan acil bir taktik tehdidi görünmüyor; konumsal gelişimine odaklanabilirsin.',
      bulletPointsTr: bullets,
      highlightSquares: sqs,
      arrows,
      suggestedQuestions: ['Şimdi ne yapmalıyım?', 'Bana göster.'],
    };
  }

  if (intent === 'how_to_castle') {
    const legalMoves = chess.moves({ verbose: true });
    const castleMoves = legalMoves.filter((m) => m.flags.includes('k') || m.flags.includes('q'));
    const canKingside =
      turn === 'w' ? report.development.whiteCanCastleKingside : report.development.blackCanCastleKingside;
    const canQueenside =
      turn === 'w' ? report.development.whiteCanCastleQueenside : report.development.blackCanCastleQueenside;

    if (castleMoves.length > 0) {
      const cm = castleMoves[0];
      return {
        intent,
        questionTr: query,
        answerTr: `Şu anda hemen rok yapabilirsin! Şahını ${cm.from} karesinden ${cm.to} karesine (${cm.san}) taşıyarak roku tamamlayabilirsin.`,
        bulletPointsTr: [
          'Rok için şah ve kale daha önce hiç hareket etmemiş olmalıdır.',
          'Aralarındaki kareler boş olmalı ve şahın geçtiği kareler tehdit altında olmamalıdır.',
        ],
        highlightSquares: [cm.from, cm.to],
        arrows: [[cm.from, cm.to, '#10b981']],
        suggestedQuestions: ['Şimdi ne yapmalıyım?', 'Şahım tehlikede mi?'],
      };
    }

    return {
      intent,
      questionTr: query,
      answerTr:
        canKingside || canQueenside
          ? 'Rok hakkın hâlâ devam ediyor ancak şu an şah ile kale arasındaki taşları geliştirmen veya şahın geçeceği karelerdeki tehditleri kaldırman gerekiyor.'
          : 'Bu pozisyonda rok hakkın kalmamış (şah veya kaleler daha önce hareket etmiş ya da rok zaten yapılmış).',
      bulletPointsTr: [
        'Kısa rok (O-O): Şah g1 (veya g8) karesine iki kare kayar.',
        'Uzun rok (O-O-O): Şah c1 (veya c8) karesine iki kare kayar.',
      ],
      highlightSquares: [],
      arrows: [],
      suggestedQuestions: ['Şahım tehlikede mi?', 'Bu pozisyonda planım ne olmalı?'],
    };
  }

  if (intent === 'opening_purpose') {
    return {
      intent,
      questionTr: query,
      answerTr: openingNameTr
        ? `${openingNameTr}: ${openingIdeaTr || 'Merkezi kontrol etmek, hafif taşları hızla geliştirmek ve şah güvenliğini sağlamaktır.'}`
        : 'Açılış safhasının temel amacı merkezi (d4, e4, d5, e5) piyon ve taşlarla kontrol etmek, atları ve filleri oyuna geliştirmek ve rok yaparak şahı güvenceye almaktır.',
      bulletPointsTr: [
        'Merkezde piyon bulundurmak taşlarına hareket alanı açar.',
        'Aynı taşı açılışta gereksiz yere iki kez oynamaktan kaçın.',
        'Veziri çok erken oyuna çıkarmak rakibe tempo kazandırabilir.',
      ],
      highlightSquares: ['d4', 'e4', 'd5', 'e5'],
      arrows: [],
      suggestedQuestions: ['Neden merkez önemli?', 'Bu pozisyonda planım ne olmalı?'],
    };
  }

  if (intent === 'why_center_important') {
    return {
      intent,
      questionTr: query,
      answerTr:
        'Tahtanın merkezindeki d4, e4, d5 ve e5 kareleri satrançtaki en stratejik kavşak noktalarıdır. Merkeze yerleşen taşlar tahtanın hem şah hem de vezir kanadına çok daha hızlı ulaşır ve daha fazla kareyi kontrol eder.',
      bulletPointsTr: [
        'Örneğin merkezdeki bir at 8 farklı kareyi kontrol ederken, köşedeki bir at yalnızca 2 kareyi kontrol edebilir.',
        'Merkezi kontrol eden taraf, rakip taşların hareket alanını kısıtlar.',
      ],
      highlightSquares: ['d4', 'e4', 'd5', 'e5'],
      arrows: [],
      suggestedQuestions: ['Şimdi ne yapmalıyım?', 'Bu pozisyonda planım ne olmalı?'],
    };
  }

  if (intent === 'what_did_i_gain') {
    if (!lastMoveEval) {
      return {
        intent,
        questionTr: query,
        answerTr: 'Bir hamle yaptıktan sonra o hamlenin sana ne kazandırdığını (materyal, merkez kontrolü, gelişim veya taktik tehdit) burada görebilirsin.',
        bulletPointsTr: [],
        highlightSquares: [],
        arrows: [],
        suggestedQuestions: defaultSuggestions,
      };
    }
    const gains = [
      ...lastMoveEval.tacticalFacts.map((f) => f.descriptionTr),
      ...lastMoveEval.strategicObservations.map((s) => s.descriptionTr),
    ];
    return {
      intent,
      questionTr: query,
      answerTr:
        gains.length > 0
          ? `${lastMoveEval.moveSan} hamlesiyle elde ettiğin somut kazanımlar ve etkiler:`
          : `${lastMoveEval.moveSan} hamlesi konumunu dengede tutan sakin bir devam hamlesiydi.`,
      bulletPointsTr: gains,
      highlightSquares: lastMoveEval.highlightSquares,
      arrows: lastMoveEval.suggestedArrows,
      suggestedQuestions: ['Şimdi ne yapmalıyım?', 'Bu pozisyonda planım ne olmalı?'],
    };
  }

  // 'what_should_i_do' or 'what_is_my_plan'
  const planBullets: string[] = [];
  const myDev =
    turn === 'w' ? report.development.whiteMinorDeveloped : report.development.blackMinorDeveloped;
  const myHanging = report.hangingPieces[turn];
  const enemyHanging = report.hangingPieces[enemy];

  if (report.inCheck) {
    planBullets.push('Öncelikle şah tehdidinden kurtulmalısın (şahı güvenli kareye çek, araya taş kapat veya tehdit eden taşı al).');
  }
  if (myHanging.length > 0) {
    planBullets.push(
      `${myHanging[0].piece.square} karesindeki savunmasız ${PIECE_NAMES_TR[myHanging[0].piece.type].accusative} koruma altına al veya güvenli bir kareye çek.`
    );
  }
  if (enemyHanging.length > 0) {
    planBullets.push(
      `Rakibin ${enemyHanging[0].piece.square} karesindeki savunmasız ${PIECE_NAMES_TR[enemyHanging[0].piece.type].accusative} değerlendir.`
    );
  }
  if (!report.isEndgame && myDev < 4) {
    planBullets.push('Henüz başlangıç karesinde bekleyen hafif taşlarını (at ve fil) merkeze bakan karelere geliştir.');
  }
  if (report.pawnStructure.openFiles.length > 0) {
    planBullets.push(`Açık ${report.pawnStructure.openFiles.join(', ')} dikeyine kalelerini yerleştirmeyi planla.`);
  }
  if (report.isEndgame) {
    planBullets.push('Oyunsonunda şahını merkeze yaklaştır ve geçer piyonlarını destekleyerek ilerlet.');
  }

  const hint = generateSmartHint(fen, 2, engineResult ?? undefined);

  return {
    intent,
    questionTr: query,
    answerTr: hint.messageTr,
    bulletPointsTr:
      planBullets.length > 0
        ? planBullets
        : ['Taşlarının koordinasyonunu koru, merkez karelerini kontrol et ve rakibin zayıf karelerine baskı kur.'],
    highlightSquares: hint.highlightSquares,
    arrows: hint.arrows,
    suggestedQuestions: ['Bana göster.', 'Hangi taşım tehdit altında?', 'Rakibim neyi tehdit ediyor?'],
  };
}
