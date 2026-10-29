import { Chess, Color, Move, PieceSymbol, Square } from 'chess.js';
import { PIECE_CP_VALUES, parseUciMove, squareToCoords } from '@/utils/chessUtils';

export interface EngineLine {
  multipv: number;
  depth: number;
  scoreCp: number | null; // Normalized to WHITE perspective (+ = White advantage, - = Black advantage)
  scoreMate: number | null; // Normalized to WHITE perspective (+N = White mates in N, -N = Black mates in N)
  pvUci: string[];
  pvSan: string[];
  bestMoveUci: string;
  bestMoveSan: string;
}

export interface EngineAnalysisResult {
  requestId: string;
  fen: string;
  turn: Color;
  depth: number;
  bestMoveUci: string;
  bestMoveSan: string;
  scoreCp: number | null; // White perspective
  scoreMate: number | null; // White perspective
  lines: EngineLine[];
  elapsedMs: number;
}

export type DifficultyLevelId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface DifficultyConfig {
  level: DifficultyLevelId;
  nameTr: string;
  nameEn: string;
  descriptionTr: string;
  skillLevel: number; // UCI Skill Level 0-20
  depth: number;
  movetimeMs: number;
  suboptimalChance: number; // 0..1 for lower levels to play natural teaching moves
}

export const DIFFICULTY_LEVELS: DifficultyConfig[] = [
  {
    level: 1,
    nameTr: '1. İlk Adımlar',
    nameEn: '1. First Steps',
    descriptionTr: 'Satranca yeni başlayanlar için temel taş hareketlerini pratik etme seviyesi.',
    skillLevel: 0,
    depth: 1,
    movetimeMs: 150,
    suboptimalChance: 0.45,
  },
  {
    level: 2,
    nameTr: '2. Başlangıç',
    nameEn: '2. Beginner',
    descriptionTr: 'Basit tehditler kuran ancak taktik fırsatlar bırakan öğretici seviye.',
    skillLevel: 2,
    depth: 2,
    movetimeMs: 200,
    suboptimalChance: 0.3,
  },
  {
    level: 3,
    nameTr: '3. Hobi Oyuncusu',
    nameEn: '3. Casual',
    descriptionTr: 'Temel açılış ilkelerini uygulayan rahat oyun temposu.',
    skillLevel: 4,
    depth: 3,
    movetimeMs: 250,
    suboptimalChance: 0.18,
  },
  {
    level: 4,
    nameTr: '4. Gelişen Oyuncu',
    nameEn: '4. Developing',
    descriptionTr: 'Tek hamlelik tehditleri gören ve taş gelişimine dikkat eden seviye.',
    skillLevel: 6,
    depth: 4,
    movetimeMs: 300,
    suboptimalChance: 0.1,
  },
  {
    level: 5,
    nameTr: '5. Orta Seviye',
    nameEn: '5. Intermediate',
    descriptionTr: 'Çatal, açmaz ve şiş gibi temel taktik motifleri kullanan dengeli rakip.',
    skillLevel: 9,
    depth: 6,
    movetimeMs: 400,
    suboptimalChance: 0.04,
  },
  {
    level: 6,
    nameTr: '6. Kulüp Oyuncusu',
    nameEn: '6. Club Player',
    descriptionTr: 'İyi konum anlayışı ve taktik hesaplama gerektiren ciddi rakip.',
    skillLevel: 12,
    depth: 8,
    movetimeMs: 550,
    suboptimalChance: 0,
  },
  {
    level: 7,
    nameTr: '7. İleri Seviye',
    nameEn: '7. Advanced',
    descriptionTr: 'Derin taktik dizileri hesaplayan ve konumsal hataları cezalandıran seviye.',
    skillLevel: 15,
    depth: 10,
    movetimeMs: 700,
    suboptimalChance: 0,
  },
  {
    level: 8,
    nameTr: '8. Uzman',
    nameEn: '8. Expert',
    descriptionTr: 'Güçlü açılış repertuvarı ve oyunsonu tekniğiyle turnuva seviyesi.',
    skillLevel: 17,
    depth: 12,
    movetimeMs: 900,
    suboptimalChance: 0,
  },
  {
    level: 9,
    nameTr: '9. Usta',
    nameEn: '9. Master',
    descriptionTr: 'Çok yüksek hesaplama derinliği ve neredeyse hatasız taktik oyun.',
    skillLevel: 19,
    depth: 14,
    movetimeMs: 1100,
    suboptimalChance: 0,
  },
  {
    level: 10,
    nameTr: '10. Maksimum Güç',
    nameEn: '10. Maximum Strength',
    descriptionTr: 'Tam Stockfish motor gücü — kısıtlamasız analiz ve maksimum zorluk.',
    skillLevel: 20,
    depth: 16,
    movetimeMs: 1400,
    suboptimalChance: 0,
  },
];

/**
 * Normalizes UCI engine score (which is always reported from side-to-move's perspective)
 * into WHITE's perspective (+ = White is better, - = Black is better).
 */
export function normalizeScoreToWhite(
  rawCp: number | null,
  rawMate: number | null,
  sideToMove: Color
): { scoreCp: number | null; scoreMate: number | null } {
  const multiplier = sideToMove === 'w' ? 1 : -1;
  return {
    scoreCp: rawCp !== null ? rawCp * multiplier : null,
    scoreMate: rawMate !== null ? rawMate * multiplier : null,
  };
}

/**
 * Normalizes a White-perspective score into `playerColor`'s perspective.
 */
export function normalizeWhiteScoreToPlayer(
  whiteCp: number | null,
  whiteMate: number | null,
  playerColor: Color
): { scoreCp: number | null; scoreMate: number | null } {
  const multiplier = playerColor === 'w' ? 1 : -1;
  return {
    scoreCp: whiteCp !== null ? whiteCp * multiplier : null,
    scoreMate: whiteMate !== null ? whiteMate * multiplier : null,
  };
}

/**
 * Converts a player-perspective evaluation (centipawns or mate) into expected win probability [0..100].
 * Uses standard logistic curve calibrated for centipawns.
 */
export function evaluationToExpectedPoints(
  playerCp: number | null,
  playerMate: number | null
): number {
  if (playerMate !== null) {
    if (playerMate > 0) return 100 - Math.min(4, playerMate * 0.2);
    if (playerMate < 0) return Math.min(4, Math.abs(playerMate) * 0.2);
    return 100;
  }
  const cp = Math.max(-1500, Math.min(1500, playerCp ?? 0));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

/**
 * Converts a sequence of UCI moves from a starting FEN into SAN moves.
 */
export function uciLineToSan(fen: string, uciMoves: string[]): string[] {
  const chess = new Chess(fen);
  const sanMoves: string[] = [];
  for (const uci of uciMoves) {
    const parsed = parseUciMove(uci);
    if (!parsed) break;
    try {
      const m = chess.move(parsed);
      if (!m) break;
      sanMoves.push(m.san);
    } catch {
      break;
    }
  }
  return sanMoves;
}

// Piece-square tables for fast deterministic evaluation fallback & instant synchronous preview
const PAWN_PST = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 28, 28, 10, 5, 5],
  [0, 0, 0, 24, 24, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -24, -24, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const KNIGHT_PST = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 20, 25, 25, 20, 5, -30],
  [-30, 0, 20, 25, 25, 20, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

const BISHOP_PST = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 10, 15, 15, 10, 0, -10],
  [-10, 10, 10, 15, 15, 10, 10, -10],
  [-10, 0, 15, 15, 15, 15, 0, -10],
  [-10, 15, 15, 15, 15, 15, 15, -10],
  [-10, 10, 0, 0, 0, 0, 10, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];

/**
 * Evaluates a position statically from WHITE's perspective in centipawns.
 */
export function evaluatePositionStaticWhiteCp(chess: Chess): {
  scoreCp: number | null;
  scoreMate: number | null;
} {
  if (chess.isCheckmate()) {
    // Side to move is checkmated
    return {
      scoreCp: null,
      scoreMate: chess.turn() === 'w' ? -1 : 1,
    };
  }
  if (chess.isDraw() || chess.isStalemate()) {
    return { scoreCp: 0, scoreMate: null };
  }

  const board = chess.board();
  let score = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      const base = PIECE_CP_VALUES[piece.type];
      const tableRow = piece.color === 'w' ? r : 7 - r;
      let positional = 0;
      if (piece.type === 'p') positional = PAWN_PST[tableRow][c];
      else if (piece.type === 'n') positional = KNIGHT_PST[tableRow][c];
      else if (piece.type === 'b') positional = BISHOP_PST[tableRow][c];
      else if (piece.type === 'q' && tableRow > 5) positional = 5;

      if (piece.color === 'w') score += base + positional;
      else score -= base + positional;
    }
  }

  if (chess.inCheck()) {
    score += chess.turn() === 'w' ? -25 : 25;
  }

  return { scoreCp: score, scoreMate: null };
}

/**
 * Deterministic alpha-beta minimax analyzer (used as immediate synchronous analyzer
 * and fallback when Web Worker is unavailable in headless/unit test environments).
 */
export function computeDeterministicAnalysis(
  fen: string,
  depth = 2,
  multiPv = 3,
  requestId = 'sync'
): EngineAnalysisResult {
  const startTime = performance.now();
  const rootChess = new Chess(fen);
  const turn = rootChess.turn();
  const legalMoves = rootChess.moves({ verbose: true });

  if (legalMoves.length === 0) {
    const staticEval = evaluatePositionStaticWhiteCp(rootChess);
    return {
      requestId,
      fen,
      turn,
      depth: 0,
      bestMoveUci: '',
      bestMoveSan: '',
      scoreCp: staticEval.scoreCp,
      scoreMate: staticEval.scoreMate,
      lines: [],
      elapsedMs: Math.round(performance.now() - startTime),
    };
  }

  const searchDepth = Math.min(3, Math.max(1, depth));

  function alphaBeta(
    game: Chess,
    d: number,
    alpha: number,
    beta: number,
    maximizingWhite: boolean
  ): { score: number; pv: Move[] } {
    if (game.isCheckmate()) {
      const mateScore = game.turn() === 'w' ? -99000 - d * 100 : 99000 + d * 100;
      return { score: mateScore, pv: [] };
    }
    if (game.isDraw() || game.isStalemate()) {
      return { score: 0, pv: [] };
    }
    if (d <= 0) {
      const st = evaluatePositionStaticWhiteCp(game);
      return { score: st.scoreCp ?? 0, pv: [] };
    }

    const moves = game.moves({ verbose: true });
    // Order captures and checks first for better pruning
    moves.sort((a, b) => {
      const aScore = (a.captured ? PIECE_CP_VALUES[a.captured] : 0) + (a.san.includes('+') ? 150 : 0);
      const bScore = (b.captured ? PIECE_CP_VALUES[b.captured] : 0) + (b.san.includes('+') ? 150 : 0);
      return bScore - aScore;
    });

    let bestPv: Move[] = [];

    if (maximizingWhite) {
      let maxEval = -Infinity;
      for (const m of moves) {
        game.move(m);
        const child = alphaBeta(game, d - 1, alpha, beta, false);
        game.undo();
        if (child.score > maxEval) {
          maxEval = child.score;
          bestPv = [m, ...child.pv];
        }
        alpha = Math.max(alpha, child.score);
        if (beta <= alpha) break;
      }
      return { score: maxEval, pv: bestPv };
    } else {
      let minEval = Infinity;
      for (const m of moves) {
        game.move(m);
        const child = alphaBeta(game, d - 1, alpha, beta, true);
        game.undo();
        if (child.score < minEval) {
          minEval = child.score;
          bestPv = [m, ...child.pv];
        }
        beta = Math.min(beta, child.score);
        if (beta <= alpha) break;
      }
      return { score: minEval, pv: bestPv };
    }
  }

  const scoredMoves: {
    move: Move;
    whiteScore: number;
    pvMoves: Move[];
  }[] = [];

  for (const m of legalMoves) {
    rootChess.move(m);
    const res = alphaBeta(
      rootChess,
      searchDepth - 1,
      -Infinity,
      Infinity,
      rootChess.turn() === 'w'
    );
    rootChess.undo();
    scoredMoves.push({
      move: m,
      whiteScore: res.score,
      pvMoves: [m, ...res.pv],
    });
  }

  // Sort best first for the side to move
  scoredMoves.sort((a, b) =>
    turn === 'w' ? b.whiteScore - a.whiteScore : a.whiteScore - b.whiteScore
  );

  const topScored = scoredMoves.slice(0, Math.max(1, multiPv));
  const lines: EngineLine[] = topScored.map((entry, idx) => {
    const isMate = Math.abs(entry.whiteScore) >= 90000;
    const mateMoves = isMate
      ? (entry.whiteScore > 0 ? 1 : -1) * Math.max(1, Math.ceil(entry.pvMoves.length / 2))
      : null;
    const scoreCp = isMate ? null : Math.round(entry.whiteScore);
    const pvUci = entry.pvMoves.map((pm) => `${pm.from}${pm.to}${pm.promotion ?? ''}`);
    const pvSan = entry.pvMoves.map((pm) => pm.san);

    return {
      multipv: idx + 1,
      depth: searchDepth,
      scoreCp,
      scoreMate: mateMoves,
      pvUci,
      pvSan,
      bestMoveUci: pvUci[0] ?? '',
      bestMoveSan: pvSan[0] ?? '',
    };
  });

  const primary = lines[0];

  return {
    requestId,
    fen,
    turn,
    depth: searchDepth,
    bestMoveUci: primary?.bestMoveUci ?? '',
    bestMoveSan: primary?.bestMoveSan ?? '',
    scoreCp: primary?.scoreCp ?? 0,
    scoreMate: primary?.scoreMate ?? null,
    lines,
    elapsedMs: Math.round(performance.now() - startTime),
  };
}

/**
 * Stockfish UCI Web Worker Adapter with automatic request cancellation,
 * stale-result prevention, MultiPV parsing, and fallback support.
 */
export class ChessEngineAdapter {
  private worker: Worker | null = null;
  private isReady = false;
  private activeRequestId: string | null = null;
  private pendingResolve: ((res: EngineAnalysisResult) => void) | null = null;
  private timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private requestCounter = 0;
  private workerBroken = false;

  public async init(): Promise<boolean> {
    if (this.isReady && this.worker) return true;
    if (this.workerBroken || typeof window === 'undefined' || typeof Worker === 'undefined') {
      return false;
    }

    return new Promise<boolean>((resolve) => {
      const initTimeout = setTimeout(() => {
        this.workerBroken = true;
        resolve(false);
      }, 3500);

      try {
        const worker = new Worker('/stockfish/stockfish.js');
        this.worker = worker;

        const handleInitMsg = (e: MessageEvent) => {
          const line = typeof e.data === 'string' ? e.data : '';
          if (line.includes('uciok')) {
            worker.postMessage('isready');
          } else if (line.includes('readyok')) {
            clearTimeout(initTimeout);
            worker.removeEventListener('message', handleInitMsg);
            this.isReady = true;
            resolve(true);
          }
        };

        worker.addEventListener('message', handleInitMsg);
        worker.addEventListener('error', () => {
          clearTimeout(initTimeout);
          this.workerBroken = true;
          this.isReady = false;
          resolve(false);
        });

        worker.postMessage('uci');
      } catch {
        clearTimeout(initTimeout);
        this.workerBroken = true;
        resolve(false);
      }
    });
  }

  public cancelCurrentAnalysis(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    if (this.worker && this.isReady && this.activeRequestId) {
      try {
        this.worker.postMessage('stop');
      } catch {
        // ignore
      }
    }
    this.activeRequestId = null;
    this.pendingResolve = null;
  }

  public async analyzePosition(
    fen: string,
    options: {
      depth?: number;
      movetimeMs?: number;
      multiPv?: number;
      skillLevel?: number;
    } = {}
  ): Promise<EngineAnalysisResult> {
    this.cancelCurrentAnalysis();
    this.requestCounter += 1;
    const requestId = `req_${this.requestCounter}_${Date.now()}`;
    this.activeRequestId = requestId;

    const depth = options.depth ?? 10;
    const movetimeMs = options.movetimeMs ?? 600;
    const multiPv = options.multiPv ?? 3;
    const skillLevel = options.skillLevel ?? 20;

    const chess = new Chess(fen);
    if (chess.isGameOver()) {
      return computeDeterministicAnalysis(fen, 1, 1, requestId);
    }

    const ready = await this.init();
    if (!ready || !this.worker) {
      return computeDeterministicAnalysis(fen, Math.min(3, depth), multiPv, requestId);
    }

    const turn = chess.turn();
    const startTime = performance.now();
    const collectedLines = new Map<number, EngineLine>();

    return new Promise<EngineAnalysisResult>((resolve) => {
      this.pendingResolve = resolve;

      const finish = (bestMoveFromEngine?: string) => {
        if (this.activeRequestId !== requestId) return;
        if (this.timeoutTimer) {
          clearTimeout(this.timeoutTimer);
          this.timeoutTimer = null;
        }
        this.worker?.removeEventListener('message', onWorkerMessage);
        this.activeRequestId = null;
        this.pendingResolve = null;

        if (collectedLines.size === 0) {
          resolve(computeDeterministicAnalysis(fen, Math.min(3, depth), multiPv, requestId));
          return;
        }

        const sortedLines = Array.from(collectedLines.values()).sort(
          (a, b) => a.multipv - b.multipv
        );
        const primary = sortedLines[0];
        const finalBestUci =
          bestMoveFromEngine && bestMoveFromEngine !== '(none)'
            ? bestMoveFromEngine
            : primary.bestMoveUci;
        const finalBestSan = uciLineToSan(fen, [finalBestUci])[0] ?? primary.bestMoveSan;

        resolve({
          requestId,
          fen,
          turn,
          depth: primary.depth,
          bestMoveUci: finalBestUci,
          bestMoveSan: finalBestSan,
          scoreCp: primary.scoreCp,
          scoreMate: primary.scoreMate,
          lines: sortedLines,
          elapsedMs: Math.round(performance.now() - startTime),
        });
      };

      const onWorkerMessage = (event: MessageEvent) => {
        if (this.activeRequestId !== requestId) {
          this.worker?.removeEventListener('message', onWorkerMessage);
          return;
        }
        const line = typeof event.data === 'string' ? event.data.trim() : '';
        if (!line) return;

        if (line.startsWith('info ') && line.includes(' pv ')) {
          const depthMatch = line.match(/\bdepth\s+(\d+)/);
          const multipvMatch = line.match(/\bmultipv\s+(\d+)/);
          const cpMatch = line.match(/\bscore\s+cp\s+(-?\d+)/);
          const mateMatch = line.match(/\bscore\s+mate\s+(-?\d+)/);
          const pvIndex = line.indexOf(' pv ');

          if (pvIndex !== -1) {
            const pvUci = line
              .slice(pvIndex + 4)
              .trim()
              .split(/\s+/)
              .filter(Boolean);
            const pvSan = uciLineToSan(fen, pvUci);
            if (pvSan.length > 0) {
              const mpv = multipvMatch ? parseInt(multipvMatch[1], 10) : 1;
              const d = depthMatch ? parseInt(depthMatch[1], 10) : 1;
              const rawCp = cpMatch ? parseInt(cpMatch[1], 10) : null;
              const rawMate = mateMatch ? parseInt(mateMatch[1], 10) : null;
              const normalized = normalizeScoreToWhite(rawCp, rawMate, turn);

              collectedLines.set(mpv, {
                multipv: mpv,
                depth: d,
                scoreCp: normalized.scoreCp,
                scoreMate: normalized.scoreMate,
                pvUci,
                pvSan,
                bestMoveUci: pvUci[0],
                bestMoveSan: pvSan[0],
              });
            }
          }
        } else if (line.startsWith('bestmove ')) {
          const parts = line.split(/\s+/);
          finish(parts[1]);
        }
      };

      this.worker!.addEventListener('message', onWorkerMessage);

      this.timeoutTimer = setTimeout(() => {
        try {
          this.worker?.postMessage('stop');
        } catch {
          // ignore
        }
        finish();
      }, movetimeMs + 1200);

      try {
        this.worker!.postMessage(`setoption name Skill Level value ${skillLevel}`);
        this.worker!.postMessage(`setoption name MultiPV value ${multiPv}`);
        this.worker!.postMessage(`position fen ${fen}`);
        this.worker!.postMessage(`go depth ${depth} movetime ${movetimeMs}`);
      } catch {
        finish();
      }
    });
  }

  public async selectEngineMove(
    fen: string,
    difficultyLevel: DifficultyLevelId
  ): Promise<{ uci: string; san: string; analysis: EngineAnalysisResult }> {
    const config =
      DIFFICULTY_LEVELS.find((d) => d.level === difficultyLevel) ?? DIFFICULTY_LEVELS[4];

    const analysis = await this.analyzePosition(fen, {
      depth: config.depth,
      movetimeMs: config.movetimeMs,
      multiPv: 3,
      skillLevel: config.skillLevel,
    });

    if (
      config.suboptimalChance > 0 &&
      analysis.lines.length > 1 &&
      Math.random() < config.suboptimalChance
    ) {
      const altLine = analysis.lines[Math.min(analysis.lines.length - 1, 1)];
      if (altLine && altLine.bestMoveUci) {
        return {
          uci: altLine.bestMoveUci,
          san: altLine.bestMoveSan,
          analysis,
        };
      }
    }

    return {
      uci: analysis.bestMoveUci,
      san: analysis.bestMoveSan,
      analysis,
    };
  }

  public getActiveRequestId(): string | null {
    return this.activeRequestId;
  }

  public dispose(): void {
    this.cancelCurrentAnalysis();
    if (this.worker) {
      try {
        this.worker.postMessage('quit');
        this.worker.terminate();
      } catch {
        // ignore
      }
      this.worker = null;
    }
    this.isReady = false;
  }
}

export const sharedChessEngine = new ChessEngineAdapter();
