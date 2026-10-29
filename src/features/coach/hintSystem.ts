import { Chess, Move, Square } from 'chess.js';
import { getOppositeColor, parseUciMove, PIECE_NAMES_TR } from '@/utils/chessUtils';
import { analyzePositionTactics } from './tacticalDetectors';
import { computeDeterministicAnalysis, EngineAnalysisResult } from '@/engine/chessEngineAdapter';
import { explainAlternativeMoveTr } from './coachEngine';

export type HintLevel = 1 | 2 | 3;

export interface SmartHint {
  level: HintLevel;
  titleTr: string;
  messageTr: string;
  highlightSquares: Square[];
  arrows: [Square, Square, string?][];
  bestMoveSan?: string;
  bestMoveUci?: string;
}

/**
 * Generates a position-verified 3-level hint for the current FEN.
 */
export function generateSmartHint(
  fen: string,
  level: HintLevel,
  engineResult?: EngineAnalysisResult,
  overrideBestUci?: string
): SmartHint {
  const chess = new Chess(fen);
  const turn = chess.turn();
  const enemy = getOppositeColor(turn);
  const report = analyzePositionTactics(fen);

  const analysis =
    engineResult ?? computeDeterministicAnalysis(fen, 2, 3, 'hint_analysis');

  const bestUci = overrideBestUci || analysis.bestMoveUci;
  const parsed = parseUciMove(bestUci);

  if (!parsed) {
    return {
      level,
      titleTr: 'Pozisyon Tamamlandı',
      messageTr: 'Bu pozisyonda oynanabilecek yasal bir hamle bulunmuyor.',
      highlightSquares: [],
      arrows: [],
    };
  }

  let moveObj: Move | null = null;
  const afterChess = new Chess(fen);
  try {
    moveObj = afterChess.move(parsed);
  } catch {
    const fallbackMoves = chess.moves({ verbose: true });
    if (fallbackMoves.length > 0) {
      moveObj = afterChess.move(fallbackMoves[0]);
    }
  }

  if (!moveObj) {
    return {
      level,
      titleTr: 'İpucu',
      messageTr: 'Taşlarının güvenliğini ve merkez karelerini kontrol et.',
      highlightSquares: [],
      arrows: [],
    };
  }

  const afterReport = analyzePositionTactics(afterChess.fen());
  const pieceTr = PIECE_NAMES_TR[moveObj.piece];
  const createsFork = afterReport.forks[turn].some((f) => f.attacker.square === moveObj!.to);
  const createsPin = afterReport.pins[turn].some((p) => p.pinner.square === moveObj!.to);
  const deliversMate = afterReport.isCheckmate;
  const enemyHangingBefore = report.hangingPieces[enemy];
  const ownHangingBefore = report.hangingPieces[turn];

  if (level === 1) {
    let conceptual = 'Merkez karelerini kontrol etmeye ve gelişmemiş taşlarını aktif karelere çıkarmaya odaklan.';
    if (report.inCheck) {
      conceptual = 'Şahın şu anda tehdit altında! Öncelikle şah tehdidini ortadan kaldıracak güvenli bir savunma bulmalısın.';
    } else if (deliversMate) {
      conceptual = 'Rakip şahın kaçış kareleri kısıtlı! Doğrudan şah mat yapabileceğin bitirici bir hamle ara.';
    } else if (createsFork) {
      conceptual = 'Rakibinin iki önemli taşını aynı anda tehdit edebileceğin bir çatal (fork) fırsatı var.';
    } else if (createsPin) {
      conceptual = 'Rakibinin aynı hat üzerinde dizilmiş taşlarına dikkat et; bir açmaz (pin) oluşturabilirsin.';
    } else if (moveObj.captured && enemyHangingBefore.length > 0) {
      conceptual = 'Rakibinin savunmasız veya yeterince korunmayan taşlarına dikkat et.';
    } else if (ownHangingBefore.length > 0) {
      conceptual = 'Kendi taşlarından biri şu anda tehdit altında; önce savunmasız taşını güvenceye almayı düşün.';
    } else if (moveObj.flags.includes('k') || moveObj.flags.includes('q')) {
      conceptual = 'Şahının güvenliğini artırmak ve kaleni oyuna sokmak için rok yapmayı değerlendir.';
    }

    return {
      level: 1,
      titleTr: '1. Seviye: Kavramsal İpucu',
      messageTr: conceptual,
      highlightSquares: report.inCheck
        ? report.pieces.filter((p) => p.type === 'k' && p.color === turn).map((p) => p.square)
        : [],
      arrows: [],
    };
  }

  if (level === 2) {
    let directional = `${moveObj.from} karesindeki ${pieceTr.possessiveAccusative} daha etkili bir kareye oynayabilirsin.`;
    if (deliversMate) {
      directional = `${moveObj.from} karesindeki ${pieceTr.possessiveAccusative} kullanarak rakip şaha mat ağı kurabileceğin bir kare var.`;
    } else if (createsFork) {
      directional = `${moveObj.from} karesindeki ${pieceTr.genitive}la iki rakip taşı aynı anda tehdit edebileceğin bir kare var.`;
    } else if (createsPin) {
      directional = `${moveObj.from} karesindeki ${pieceTr.possessiveAccusative} çapraz veya dikey hatta getirerek rakip taşı açmaza alabilirsin.`;
    } else if (moveObj.captured) {
      directional = `${moveObj.from} karesindeki ${pieceTr.genitive}la rakibin ${moveObj.to} bölgesindeki materyalini hedef alabilirsin.`;
    }

    return {
      level: 2,
      titleTr: '2. Seviye: Yönlendirici İpucu',
      messageTr: directional,
      highlightSquares: [moveObj.from],
      arrows: [],
    };
  }

  // Level 3: Reveal candidate move on board with verified reason
  const reason = explainAlternativeMoveTr(fen, `${moveObj.from}${moveObj.to}${moveObj.promotion ?? ''}`, report);
  return {
    level: 3,
    titleTr: `3. Seviye: Önerilen Hamle (${moveObj.san})`,
    messageTr: reason || `En güçlü aday hamle: ${moveObj.san} (${moveObj.from} → ${moveObj.to}).`,
    highlightSquares: [moveObj.from, moveObj.to],
    arrows: [[moveObj.from, moveObj.to, '#10b981']],
    bestMoveSan: moveObj.san,
    bestMoveUci: `${moveObj.from}${moveObj.to}${moveObj.promotion ?? ''}`,
  };
}
