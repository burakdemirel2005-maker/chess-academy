import { Chess, Color, Move, Square } from 'chess.js';
import {
  CENTER_SQUARES,
  EXTENDED_CENTER_SQUARES,
  formatMoveUci,
  getOppositeColor,
  parseUciMove,
  PIECE_NAMES_TR,
  PIECE_VALUES,
} from '@/utils/chessUtils';
import {
  analyzePositionTactics,
  detectDiscoveredAttack,
  PositionTacticalReport,
} from './tacticalDetectors';
import {
  computeDeterministicAnalysis,
  EngineAnalysisResult,
  evaluationToExpectedPoints,
  normalizeWhiteScoreToPlayer,
} from '@/engine/chessEngineAdapter';

export type MoveClassification =
  | 'best'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder';

export type CoachFeedbackLevel = 'beginner' | 'intermediate' | 'advanced';

export interface VerifiedTacticalFact {
  code:
    | 'delivered_checkmate'
    | 'delivered_check'
    | 'missed_mate_in_one'
    | 'allowed_mate_in_one'
    | 'left_piece_hanging'
    | 'captured_material'
    | 'created_fork'
    | 'created_pin'
    | 'created_skewer'
    | 'created_discovered_attack'
    | 'walked_into_pin'
    | 'exposed_back_rank'
    | 'saved_hanging_piece';
  descriptionTr: string;
  squares: Square[];
  arrows: [Square, Square, string?][];
}

export interface StrategicObservation {
  code:
    | 'castled_king_safety'
    | 'developed_minor_piece'
    | 'controlled_center'
    | 'weakened_center_control'
    | 'early_queen_development'
    | 'moved_same_piece_in_opening'
    | 'advanced_passed_pawn'
    | 'rook_on_open_file'
    | 'king_centralized_endgame';
  descriptionTr: string;
  squares: Square[];
}

export interface MoveCoachingEvaluation {
  moveNumber: number;
  playerColor: Color;
  moveSan: string;
  moveUci: string;
  from: Square;
  to: Square;
  beforeFen: string;
  afterFen: string;
  classification: MoveClassification;
  classificationLabelTr: string;
  cpBeforePlayer: number | null;
  cpAfterPlayer: number | null;
  mateBeforePlayer: number | null;
  mateAfterPlayer: number | null;
  expectedPointsLost: number; // 0..100
  bestMoveUci: string;
  bestMoveSan: string;
  bestMoveReasonTr: string;
  tacticalFacts: VerifiedTacticalFact[];
  strategicObservations: StrategicObservation[];
  explanations: {
    beginner: string;
    intermediate: string;
    advanced: string;
  };
  candidateLines: {
    sanLine: string[];
    scoreCpWhite: number | null;
    scoreMateWhite: number | null;
  }[];
  highlightSquares: Square[];
  suggestedArrows: [Square, Square, string?][];
  weaknessTags: string[];
}

export const CLASSIFICATION_LABELS_TR: Record<MoveClassification, string> = {
  best: 'En İyi Hamle',
  excellent: 'Mükemmel Hamle',
  good: 'İyi Hamle',
  inaccuracy: 'Küçük Hata',
  mistake: 'Hata',
  blunder: 'Büyük Hata',
};

/**
 * Classifies a move using expected win-probability loss, centipawn delta,
 * and mate transitions rather than relying solely on fixed centipawn thresholds.
 */
export function classifyMoveEvaluation(params: {
  playedUci: string;
  bestUci: string;
  cpBeforePlayer: number | null;
  mateBeforePlayer: number | null;
  cpAfterPlayer: number | null;
  mateAfterPlayer: number | null;
  leftHighPieceHanging: boolean;
}): { classification: MoveClassification; expectedPointsLost: number } {
  const {
    playedUci,
    bestUci,
    cpBeforePlayer,
    mateBeforePlayer,
    cpAfterPlayer,
    mateAfterPlayer,
    leftHighPieceHanging,
  } = params;

  const wpBefore = evaluationToExpectedPoints(cpBeforePlayer, mateBeforePlayer);
  const wpAfter = evaluationToExpectedPoints(cpAfterPlayer, mateAfterPlayer);
  const wpLost = Math.max(0, wpBefore - wpAfter);

  if (playedUci && bestUci && playedUci === bestUci) {
    return { classification: 'best', expectedPointsLost: 0 };
  }

  // Allowed forced mate when not previously being mated
  if (mateAfterPlayer !== null && mateAfterPlayer < 0 && (mateBeforePlayer === null || mateBeforePlayer >= 0)) {
    return { classification: 'blunder', expectedPointsLost: Math.max(wpLost, 40) };
  }

  // Missed immediate forced mate (mate in 1-2) and dropped to non-winning
  if (mateBeforePlayer !== null && mateBeforePlayer > 0 && mateBeforePlayer <= 2 && mateAfterPlayer === null) {
    if ((cpAfterPlayer ?? 0) < 350) {
      return { classification: 'blunder', expectedPointsLost: Math.max(wpLost, 30) };
    }
    return { classification: 'mistake', expectedPointsLost: Math.max(wpLost, 15) };
  }

  const cpLoss = Math.max(0, (cpBeforePlayer ?? 0) - (cpAfterPlayer ?? 0));

  if (leftHighPieceHanging && cpLoss >= 220) {
    return { classification: 'blunder', expectedPointsLost: Math.max(wpLost, 25) };
  }

  if (wpLost >= 22 || cpLoss >= 280) {
    return { classification: 'blunder', expectedPointsLost: wpLost };
  }
  if (wpLost >= 11 || cpLoss >= 140) {
    return { classification: 'mistake', expectedPointsLost: wpLost };
  }
  if (wpLost >= 5.5 || cpLoss >= 65) {
    return { classification: 'inaccuracy', expectedPointsLost: wpLost };
  }
  if (wpLost <= 1.5 && cpLoss <= 20) {
    return { classification: 'excellent', expectedPointsLost: wpLost };
  }
  return { classification: 'good', expectedPointsLost: wpLost };
}

/**
 * Explains WHY a recommended alternative move (`bestMoveUci`) is strong based on verified board state.
 */
export function explainAlternativeMoveTr(
  beforeFen: string,
  bestMoveUci: string,
  beforeReport: PositionTacticalReport
): string {
  const parsed = parseUciMove(bestMoveUci);
  if (!parsed) return '';

  const chess = new Chess(beforeFen);
  let bestMoveObj: Move | null = null;
  try {
    bestMoveObj = chess.move(parsed);
  } catch {
    return '';
  }
  if (!bestMoveObj) return '';

  const afterBestReport = analyzePositionTactics(chess.fen());
  const color = bestMoveObj.color;
  const pieceTr = PIECE_NAMES_TR[bestMoveObj.piece];
  const reasons: string[] = [];

  if (afterBestReport.isCheckmate) {
    return `${pieceTr.possessiveAccusative} ${bestMoveObj.to} karesine oynayarak (${bestMoveObj.san}) doğrudan şah mat yapabilirsin.`;
  }

  if (bestMoveObj.flags.includes('k') || bestMoveObj.flags.includes('q')) {
    return `Rok yaparak (${bestMoveObj.san}) hem şahını güvenli bir sığınağa alabilir hem de kaleni oyuna sokabilirsin.`;
  }

  if (bestMoveObj.captured) {
    const capturedTr = PIECE_NAMES_TR[bestMoveObj.captured];
    reasons.push(`rakibin ${bestMoveObj.to} karesindeki ${capturedTr.accusative} ele geçirebilir`);
  }

  const newForks = afterBestReport.forks[color].filter((f) => f.attacker.square === bestMoveObj!.to);
  if (newForks.length > 0) {
    const targetNames = newForks[0].targets
      .map((t) => `${t.square} ${PIECE_NAMES_TR[t.type].nominative.toLowerCase()}`)
      .join(' ve ');
    reasons.push(`${targetNames} taşlarına aynı anda çatal atabilir`);
  }

  const newPins = afterBestReport.pins[color].filter((p) => p.pinner.square === bestMoveObj!.to);
  if (newPins.length > 0) {
    const pin = newPins[0];
    reasons.push(
      `rakibin ${pin.pinned.square} karesindeki ${PIECE_NAMES_TR[pin.pinned.type].accusative} açmaza alabilir`
    );
  }

  // Check if it develops a minor piece from back rank and controls center
  const startRank = color === 'w' ? '1' : '8';
  if (
    (bestMoveObj.piece === 'n' || bestMoveObj.piece === 'b') &&
    bestMoveObj.from[1] === startRank
  ) {
    const controlsCenter =
      (color === 'w'
        ? afterBestReport.centerControl.whiteControlled.length >
          beforeReport.centerControl.whiteControlled.length
        : afterBestReport.centerControl.blackControlled.length >
          beforeReport.centerControl.blackControlled.length) ||
      EXTENDED_CENTER_SQUARES.includes(bestMoveObj.to);

    if (controlsCenter) {
      reasons.push(
        `hem merkezdeki önemli kareleri kontrol edebilir hem de şah kanadı gelişimini ve rok hazırlığını hızlandırabilir`
      );
    } else {
      reasons.push(`hafif taşını aktif bir kareye geliştirerek taş koordinasyonunu güçlendirebilir`);
    }
  } else if (bestMoveObj.piece === 'p' && CENTER_SQUARES.includes(bestMoveObj.to)) {
    reasons.push(`merkezde doğrudan alan kazanabilir ve taşlarının gelişim hatlarını açabilir`);
  }

  // Check if it rescues a hanging piece
  const hangingBefore = beforeReport.hangingPieces[color].length;
  const hangingAfter = afterBestReport.hangingPieces[color].length;
  if (hangingBefore > hangingAfter) {
    reasons.push(`tehdit altındaki taşını güvende tutabilir`);
  }

  if (reasons.length === 0) {
    reasons.push(`konumunu sağlamlaştırarak taşlarının etkinliğini artırabilir`);
  }

  return `${pieceTr.possessiveAccusative} ${bestMoveObj.to} karesine oynarsan (${bestMoveObj.san}) ${reasons.join(' ve ')}sin.`;
}

/**
 * Generates a full deterministic coaching evaluation comparing the position before and after a move.
 */
export function evaluatePlayedMove(params: {
  beforeFen: string;
  afterFen: string;
  move: Move;
  moveNumber: number;
  beforeEngine?: EngineAnalysisResult;
  afterEngine?: EngineAnalysisResult;
}): MoveCoachingEvaluation {
  const { beforeFen, afterFen, move, moveNumber } = params;
  const playerColor = move.color;
  const enemyColor = getOppositeColor(playerColor);

  const beforeAnalysis =
    params.beforeEngine ?? computeDeterministicAnalysis(beforeFen, 2, 3, 'coach_before');
  const afterAnalysis =
    params.afterEngine ?? computeDeterministicAnalysis(afterFen, 2, 3, 'coach_after');

  const beforeReport = analyzePositionTactics(beforeFen);
  const afterReport = analyzePositionTactics(afterFen);

  const beforePlayerScore = normalizeWhiteScoreToPlayer(
    beforeAnalysis.scoreCp,
    beforeAnalysis.scoreMate,
    playerColor
  );
  const afterPlayerScore = normalizeWhiteScoreToPlayer(
    afterAnalysis.scoreCp,
    afterAnalysis.scoreMate,
    playerColor
  );

  const tacticalFacts: VerifiedTacticalFact[] = [];
  const strategicObservations: StrategicObservation[] = [];
  const weaknessTags: string[] = [];
  const highlightSquares = new Set<Square>([move.from, move.to]);
  const suggestedArrows: [Square, Square, string?][] = [];

  // 1. Check / Checkmate
  if (afterReport.isCheckmate) {
    tacticalFacts.push({
      code: 'delivered_checkmate',
      descriptionTr: `${move.san} hamlesiyle rakip şahı mat ettin!`,
      squares: [move.to],
      arrows: [[move.from, move.to, '#10b981']],
    });
  } else if (afterReport.inCheck) {
    tacticalFacts.push({
      code: 'delivered_check',
      descriptionTr: `${PIECE_NAMES_TR[move.piece].possessiveAccusative} ${move.to} karesine oynayarak rakip şaha şah çektin.`,
      squares: [move.to],
      arrows: [],
    });
  }

  // 2. Missed Mate in 1
  if (
    beforeReport.mateInOneMoves.length > 0 &&
    !afterReport.isCheckmate
  ) {
    tacticalFacts.push({
      code: 'missed_mate_in_one',
      descriptionTr: `Bu pozisyonda tek hamlede mat fırsatı vardı (${beforeReport.mateInOneMoves[0]}).`,
      squares: [move.from, move.to],
      arrows: [],
    });
    weaknessTags.push('missed_mate');
  }

  // 3. Allowed Mate in 1
  if (afterReport.mateInOneMoves.length > 0) {
    tacticalFacts.push({
      code: 'allowed_mate_in_one',
      descriptionTr: `Dikkat! Bu hamleden sonra rakibine tek hamlede mat (${afterReport.mateInOneMoves[0]}) fırsatı verdin.`,
      squares: [move.to],
      arrows: [],
    });
    weaknessTags.push('king_safety');
  }

  // 4. Hanging pieces left undefended
  const beforeHangingSquares = new Set(beforeReport.hangingPieces[playerColor].map((h) => h.piece.square));
  const newlyHanging = afterReport.hangingPieces[playerColor].filter(
    (h) => !beforeHangingSquares.has(h.piece.square) || h.piece.square === move.to
  );

  let leftHighPieceHanging = false;
  if (newlyHanging.length > 0) {
    const worst = newlyHanging.sort((a, b) => b.piece.value - a.piece.value)[0];
    if (worst.piece.value >= 3) leftHighPieceHanging = true;
    const attackerSq = worst.attackers[0]?.square;
    highlightSquares.add(worst.piece.square);
    if (attackerSq) {
      suggestedArrows.push([attackerSq, worst.piece.square, '#ef4444']);
    }
    tacticalFacts.push({
      code: 'left_piece_hanging',
      descriptionTr:
        worst.reason === 'undefended_attacked'
          ? `${worst.piece.square} karesindeki ${PIECE_NAMES_TR[worst.piece.type].nominative.toLowerCase()} savunmasız kaldı ve rakibin ${attackerSq} karesindeki taşı tarafından tehdit ediliyor.`
          : `${worst.piece.square} karesindeki ${PIECE_NAMES_TR[worst.piece.type].nominative.toLowerCase()} daha düşük değerli bir rakip taş (${attackerSq}) tarafından tehdit altında kaldı.`,
      squares: [worst.piece.square],
      arrows: attackerSq ? [[attackerSq, worst.piece.square, '#ef4444']] : [],
    });
    weaknessTags.push('hanging_pieces');
  }

  // 5. Saved a previously hanging piece
  if (beforeReport.hangingPieces[playerColor].length > 0 && afterReport.hangingPieces[playerColor].length === 0) {
    tacticalFacts.push({
      code: 'saved_hanging_piece',
      descriptionTr: 'Tehdit altındaki savunmasız taşını başarıyla koruma altına aldın.',
      squares: [move.to],
      arrows: [],
    });
  }

  // 6. Captured material
  if (move.captured) {
    const capName = PIECE_NAMES_TR[move.captured].accusative;
    tacticalFacts.push({
      code: 'captured_material',
      descriptionTr: `Rakibin ${move.to} karesindeki ${capName} ele geçirdin.`,
      squares: [move.to],
      arrows: [],
    });
  }

  // 7. Created Fork
  const createdForks = afterReport.forks[playerColor].filter((f) => f.attacker.square === move.to);
  if (createdForks.length > 0) {
    const fork = createdForks[0];
    const targetList = fork.targets
      .map((t) => `${t.square} (${PIECE_NAMES_TR[t.type].nominative})`)
      .join(' ve ');
    for (const t of fork.targets) {
      highlightSquares.add(t.square);
      suggestedArrows.push([move.to, t.square, '#10b981']);
    }
    tacticalFacts.push({
      code: 'created_fork',
      descriptionTr: `${PIECE_NAMES_TR[move.piece].possessiveAccusative} ${move.to} karesine getirerek ${targetList} taşlarına çatal attın!`,
      squares: [move.to, ...fork.targets.map((t) => t.square)],
      arrows: fork.targets.map((t) => [move.to, t.square, '#10b981']),
    });
  }

  // 8. Created Pin
  const createdPins = afterReport.pins[playerColor].filter((p) => p.pinner.square === move.to);
  if (createdPins.length > 0) {
    const pin = createdPins[0];
    highlightSquares.add(pin.pinned.square);
    highlightSquares.add(pin.shielded.square);
    tacticalFacts.push({
      code: 'created_pin',
      descriptionTr: `Rakibin ${pin.pinned.square} karesindeki ${PIECE_NAMES_TR[pin.pinned.type].accusative}, arkasındaki ${PIECE_NAMES_TR[pin.shielded.type].nominative.toLowerCase()} nedeniyle ${pin.isAbsolute ? 'mutlak ' : ''}açmaza aldın.`,
      squares: [move.to, pin.pinned.square, pin.shielded.square],
      arrows: [[move.to, pin.shielded.square, '#f59e0b']],
    });
  }

  // 9. Created Skewer
  const createdSkewers = afterReport.skewers[playerColor].filter((s) => s.attacker.square === move.to);
  if (createdSkewers.length > 0) {
    const sk = createdSkewers[0];
    tacticalFacts.push({
      code: 'created_skewer',
      descriptionTr: `${move.to} karesinden şiş (skewer) taktiği kurdun: ${sk.frontTarget.square} karesindeki ${PIECE_NAMES_TR[sk.frontTarget.type].nominative.toLowerCase()} çekildiğinde arkasındaki ${sk.backTarget.square} taşı hedef olacak.`,
      squares: [move.to, sk.frontTarget.square, sk.backTarget.square],
      arrows: [[move.to, sk.backTarget.square, '#f59e0b']],
    });
  }

  // 10. Created Discovered Attack
  const discovered = detectDiscoveredAttack(beforeFen, afterFen, move);
  if (discovered) {
    tacticalFacts.push({
      code: 'created_discovered_attack',
      descriptionTr: `Taşını ${move.from} karesinden çekerek ${discovered.sliderPiece.square} karesindeki ${PIECE_NAMES_TR[discovered.sliderPiece.type].genitive} hattını açtın ve ${discovered.targetPiece.square} karesine açarak saldırı başlattın!`,
      squares: [discovered.sliderPiece.square, discovered.targetPiece.square],
      arrows: [[discovered.sliderPiece.square, discovered.targetPiece.square, '#10b981']],
    });
  }

  // 11. Walked into Pin
  const enemyPinsBefore = beforeReport.pins[enemyColor].length;
  const enemyPinsAfter = afterReport.pins[enemyColor].length;
  if (enemyPinsAfter > enemyPinsBefore) {
    const newEnemyPin = afterReport.pins[enemyColor][afterReport.pins[enemyColor].length - 1];
    tacticalFacts.push({
      code: 'walked_into_pin',
      descriptionTr: `Dikkat: ${newEnemyPin.pinned.square} karesindeki ${PIECE_NAMES_TR[newEnemyPin.pinned.type].nominative.toLowerCase()} rakibin ${newEnemyPin.pinner.square} taşı tarafından açmaza alındı.`,
      squares: [newEnemyPin.pinner.square, newEnemyPin.pinned.square],
      arrows: [],
    });
    weaknessTags.push('pins');
  }

  // 12. Back-rank exposure
  const wasBackRankVulnerable =
    playerColor === 'w' ? beforeReport.backRank.whiteVulnerable : beforeReport.backRank.blackVulnerable;
  const isBackRankVulnerable =
    playerColor === 'w' ? afterReport.backRank.whiteVulnerable : afterReport.backRank.blackVulnerable;
  if (!wasBackRankVulnerable && isBackRankVulnerable) {
    tacticalFacts.push({
      code: 'exposed_back_rank',
      descriptionTr: 'Son yatayda şahının hava deliği kalmadı; arka yatay matı tehditlerine karşı dikkatli olmalısın.',
      squares: [],
      arrows: [],
    });
    weaknessTags.push('back_rank');
  }

  // STRATEGIC OBSERVATIONS
  // Castling
  if (move.flags.includes('k') || move.flags.includes('q')) {
    strategicObservations.push({
      code: 'castled_king_safety',
      descriptionTr: 'Rok yaparak şahını merkezden uzaklaştırıp güvenceye aldın ve kaleni merkeze yaklaştırdın.',
      squares: [move.to],
    });
  }

  // Development
  const devBefore =
    playerColor === 'w'
      ? beforeReport.development.whiteMinorDeveloped
      : beforeReport.development.blackMinorDeveloped;
  const devAfter =
    playerColor === 'w'
      ? afterReport.development.whiteMinorDeveloped
      : afterReport.development.blackMinorDeveloped;
  if (devAfter > devBefore) {
    strategicObservations.push({
      code: 'developed_minor_piece',
      descriptionTr: `${PIECE_NAMES_TR[move.piece].possessiveAccusative} başlangıç karesinden çıkarıp oyuna geliştirerek gelişim ilkesini uyguladın.`,
      squares: [move.to],
    });
  }

  // Early Queen move in opening
  if (
    moveNumber <= 8 &&
    move.piece === 'q' &&
    devBefore < 2 &&
    !move.captured &&
    !afterReport.isCheckmate
  ) {
    strategicObservations.push({
      code: 'early_queen_development',
      descriptionTr:
        'Vezirini hafif taşların (atlar ve filler) gelişmeden önce erken oyuna çıkardın; rakibin hafif taşlarını geliştirirken vezirine saldırarak tempo kazanabilir.',
      squares: [move.to],
    });
    weaknessTags.push('early_queen');
  }

  // Center control
  const centerBefore =
    playerColor === 'w'
      ? beforeReport.centerControl.whiteControlled.length + beforeReport.centerControl.whiteOccupied.length
      : beforeReport.centerControl.blackControlled.length + beforeReport.centerControl.blackOccupied.length;
  const centerAfter =
    playerColor === 'w'
      ? afterReport.centerControl.whiteControlled.length + afterReport.centerControl.whiteOccupied.length
      : afterReport.centerControl.blackControlled.length + afterReport.centerControl.blackOccupied.length;

  if (centerAfter > centerBefore) {
    const controlledList = (
      playerColor === 'w'
        ? afterReport.centerControl.whiteControlled
        : afterReport.centerControl.blackControlled
    ).join(', ');
    strategicObservations.push({
      code: 'controlled_center',
      descriptionTr: `Merkez karelerindeki (${controlledList || 'd4, e4, d5, e5'}) etkinliğini artırdın.`,
      squares: CENTER_SQUARES,
    });
  } else if (centerAfter < centerBefore && moveNumber <= 12) {
    strategicObservations.push({
      code: 'weakened_center_control',
      descriptionTr: 'Bu hamleyle merkezdeki kare kontrolünü biraz zayıflattın.',
      squares: CENTER_SQUARES,
    });
    weaknessTags.push('center_control');
  }

  // Open file rook
  if (move.piece === 'r' && afterReport.pawnStructure.openFiles.includes(move.to[0])) {
    strategicObservations.push({
      code: 'rook_on_open_file',
      descriptionTr: `Kaleni açık ${move.to[0]}-dikeyine yerleştirerek dikey kontrolünü ele geçirdin.`,
      squares: [move.to],
    });
  }

  // Passed pawn push
  const playerPassedAfter = afterReport.pawnStructure.passedPawns[playerColor];
  if (move.piece === 'p' && playerPassedAfter.includes(move.to)) {
    strategicObservations.push({
      code: 'advanced_passed_pawn',
      descriptionTr: `${move.to} karesindeki geçer piyonunu ilerleterek terfi karesine bir adım daha yaklaştırdın.`,
      squares: [move.to],
    });
  }

  const playedUci = formatMoveUci(move);
  const bestUci = beforeAnalysis.bestMoveUci || playedUci;
  const bestSan = beforeAnalysis.bestMoveSan || move.san;

  const { classification, expectedPointsLost } = classifyMoveEvaluation({
    playedUci,
    bestUci,
    cpBeforePlayer: beforePlayerScore.scoreCp,
    mateBeforePlayer: beforePlayerScore.scoreMate,
    cpAfterPlayer: afterPlayerScore.scoreCp,
    mateAfterPlayer: afterPlayerScore.scoreMate,
    leftHighPieceHanging,
  });

  if (classification !== 'best' && classification !== 'excellent' && bestUci.length >= 4) {
    const parsedBest = parseUciMove(bestUci);
    if (parsedBest) {
      suggestedArrows.push([parsedBest.from, parsedBest.to, '#34d399']);
    }
  }

  const bestMoveReasonTr =
    classification === 'best'
      ? 'Oynadığın hamle bu pozisyondaki en güçlü seçimdi.'
      : explainAlternativeMoveTr(beforeFen, bestUci, beforeReport);

  // Build rich, position-verified Beginner / Intermediate / Advanced explanations in Turkish
  const primaryTactical = tacticalFacts[0]?.descriptionTr ?? '';
  const primaryStrategic = strategicObservations[0]?.descriptionTr ?? '';
  const earlyQueenWarning =
    strategicObservations.find((s) => s.code === 'early_queen_development')?.descriptionTr ?? '';

  let beginnerText = '';
  let intermediateText = '';
  let advancedText = '';

  if (classification === 'best' || classification === 'excellent') {
    beginnerText =
      [primaryTactical, earlyQueenWarning || primaryStrategic].filter(Boolean).join(' ') ||
      `Harika seçim! ${move.san} hamlesiyle taşlarının uyumunu ve konumunu güçlendirdin.`;
    intermediateText = [
      primaryTactical,
      primaryStrategic,
      earlyQueenWarning && earlyQueenWarning !== primaryStrategic ? earlyQueenWarning : '',
      !primaryTactical && !primaryStrategic
        ? `${move.san} hamlesi konumun gerektirdiği en doğru planla örtüşüyor.`
        : '',
    ]
      .filter(Boolean)
      .join(' ');
  } else if (classification === 'good') {
    beginnerText =
      [earlyQueenWarning || primaryTactical || primaryStrategic, bestMoveReasonTr]
        .filter(Boolean)
        .join(' ') ||
      `${move.san} sağlam ve oynanabilir bir hamle. ${bestMoveReasonTr}`;
    intermediateText = `${
      [primaryTactical, primaryStrategic, earlyQueenWarning]
        .filter((v, i, a) => Boolean(v) && a.indexOf(v) === i)
        .join(' ') || `${move.san} makul bir devam yolu.`
    } Alternatif olarak: ${bestMoveReasonTr}`;
  } else {
    // Inaccuracy, Mistake, or Blunder — always explain WHY it was problematic and WHY the alternative is better!
    const problemClause =
      earlyQueenWarning ||
      primaryTactical ||
      primaryStrategic ||
      `Bu hamleyle (${move.san}) konumundaki inisiyatifi biraz zayıflattın.`;
    beginnerText = `${problemClause} ${bestMoveReasonTr}`.trim();
    intermediateText = `${problemClause} ${bestMoveReasonTr} ${
      strategicObservations[1]?.descriptionTr ?? ''
    }`.trim();
  }

  const evalBeforeStr =
    beforePlayerScore.scoreMate !== null
      ? `Mat #${beforePlayerScore.scoreMate}`
      : `${((beforePlayerScore.scoreCp ?? 0) / 100).toFixed(2)}`;
  const evalAfterStr =
    afterPlayerScore.scoreMate !== null
      ? `Mat #${afterPlayerScore.scoreMate}`
      : `${((afterPlayerScore.scoreCp ?? 0) / 100).toFixed(2)}`;

  const topPvText = beforeAnalysis.lines
    .slice(0, 2)
    .map((l, i) => `Varyant ${i + 1}: ${l.pvSan.slice(0, 5).join(' ')}`)
    .join(' | ');

  advancedText = `${intermediateText} [Değerlendirme değişimi: ${evalBeforeStr} → ${evalAfterStr}${
    topPvText ? ` • Analiz: ${topPvText}` : ''
  }]`;

  return {
    moveNumber,
    playerColor,
    moveSan: move.san,
    moveUci: playedUci,
    from: move.from,
    to: move.to,
    beforeFen,
    afterFen,
    classification,
    classificationLabelTr: CLASSIFICATION_LABELS_TR[classification],
    cpBeforePlayer: beforePlayerScore.scoreCp,
    cpAfterPlayer: afterPlayerScore.scoreCp,
    mateBeforePlayer: beforePlayerScore.scoreMate,
    mateAfterPlayer: afterPlayerScore.scoreMate,
    expectedPointsLost: Math.round(expectedPointsLost * 10) / 10,
    bestMoveUci: bestUci,
    bestMoveSan: bestSan,
    bestMoveReasonTr,
    tacticalFacts,
    strategicObservations,
    explanations: {
      beginner: beginnerText,
      intermediate: intermediateText,
      advanced: advancedText,
    },
    candidateLines: beforeAnalysis.lines.map((l) => ({
      sanLine: l.pvSan.slice(0, 6),
      scoreCpWhite: l.scoreCp,
      scoreMateWhite: l.scoreMate,
    })),
    highlightSquares: Array.from(highlightSquares),
    suggestedArrows,
    weaknessTags,
  };
}
