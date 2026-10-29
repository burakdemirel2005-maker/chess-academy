import { Chess, Color, Move, PieceSymbol, Square } from 'chess.js';
import {
  CENTER_SQUARES,
  coordsToSquare,
  FILES,
  getOppositeColor,
  PIECE_NAMES_TR,
  PIECE_VALUES,
  squareToCoords,
} from '@/utils/chessUtils';

export interface PieceOnSquare {
  square: Square;
  type: PieceSymbol;
  color: Color;
  value: number;
}

export interface HangingPieceInfo {
  piece: PieceOnSquare;
  attackers: PieceOnSquare[];
  defenders: PieceOnSquare[];
  reason: 'undefended_attacked' | 'attacked_by_lesser_piece';
}

export interface ForkInfo {
  attacker: PieceOnSquare;
  targets: PieceOnSquare[];
}

export interface PinInfo {
  pinner: PieceOnSquare;
  pinned: PieceOnSquare;
  shielded: PieceOnSquare;
  isAbsolute: boolean; // true if shielded piece is King
  raySquares: Square[];
}

export interface SkewerInfo {
  attacker: PieceOnSquare;
  frontTarget: PieceOnSquare;
  backTarget: PieceOnSquare;
  raySquares: Square[];
}

export interface DiscoveredAttackInfo {
  movedPieceFrom: Square;
  movedPieceTo: Square;
  sliderPiece: PieceOnSquare;
  targetPiece: PieceOnSquare;
}

export interface PawnStructureInfo {
  passedPawns: { w: Square[]; b: Square[] };
  doubledPawns: { w: Square[]; b: Square[] };
  isolatedPawns: { w: Square[]; b: Square[] };
  openFiles: string[];
  semiOpenFiles: { w: string[]; b: string[] };
}

export interface DevelopmentInfo {
  whiteMinorDeveloped: number; // out of 4
  blackMinorDeveloped: number; // out of 4
  whiteQueenMovedEarly: boolean;
  blackQueenMovedEarly: boolean;
  whiteCanCastleKingside: boolean;
  whiteCanCastleQueenside: boolean;
  blackCanCastleKingside: boolean;
  blackCanCastleQueenside: boolean;
}

export interface BackRankInfo {
  whiteVulnerable: boolean;
  blackVulnerable: boolean;
  whiteKingSquare: Square | null;
  blackKingSquare: Square | null;
}

export interface PositionTacticalReport {
  fen: string;
  turn: Color;
  inCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  pieces: PieceOnSquare[];
  hangingPieces: { w: HangingPieceInfo[]; b: HangingPieceInfo[] };
  undefendedPieces: { w: PieceOnSquare[]; b: PieceOnSquare[] };
  attackedPieces: { w: PieceOnSquare[]; b: PieceOnSquare[] };
  forks: { w: ForkInfo[]; b: ForkInfo[] };
  pins: { w: PinInfo[]; b: PinInfo[] }; // w = pins created BY white against black
  skewers: { w: SkewerInfo[]; b: SkewerInfo[] };
  doubleAttacks: { w: ForkInfo[]; b: ForkInfo[] };
  backRank: BackRankInfo;
  centerControl: {
    whiteControlled: Square[];
    blackControlled: Square[];
    whiteOccupied: Square[];
    blackOccupied: Square[];
  };
  development: DevelopmentInfo;
  pawnStructure: PawnStructureInfo;
  isEndgame: boolean;
  mateInOneMoves: string[]; // SAN moves for side to move that deliver immediate checkmate
}

const KNIGHT_DELTAS = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1],
];

const KING_DELTAS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],          [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

const ORTHOGONAL_DELTAS = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
];

const DIAGONAL_DELTAS = [
  [-1, -1], [-1, 1], [1, -1], [1, 1],
];

/**
 * Computes all squares directly attacked/defended by a piece on `sq`,
 * independent of whose turn it is (so we can accurately see both white and black
 * control and defense maps simultaneously).
 */
export function getSquaresControlledByPiece(
  board: ReturnType<Chess['board']>,
  sq: Square,
  type: PieceSymbol,
  color: Color
): Square[] {
  const { row, col } = squareToCoords(sq);
  const controlled: Square[] = [];

  if (type === 'p') {
    const dir = color === 'w' ? -1 : 1;
    for (const dc of [-1, 1]) {
      const target = coordsToSquare(row + dir, col + dc);
      if (target) controlled.push(target);
    }
    return controlled;
  }

  if (type === 'n') {
    for (const [dr, dc] of KNIGHT_DELTAS) {
      const target = coordsToSquare(row + dr, col + dc);
      if (target) controlled.push(target);
    }
    return controlled;
  }

  if (type === 'k') {
    for (const [dr, dc] of KING_DELTAS) {
      const target = coordsToSquare(row + dr, col + dc);
      if (target) controlled.push(target);
    }
    return controlled;
  }

  const dirs: number[][] = [];
  if (type === 'r' || type === 'q') dirs.push(...ORTHOGONAL_DELTAS);
  if (type === 'b' || type === 'q') dirs.push(...DIAGONAL_DELTAS);

  for (const [dr, dc] of dirs) {
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const target = coordsToSquare(r, c)!;
      controlled.push(target);
      if (board[r][c] !== null) {
        break; // blocked by any piece
      }
      r += dr;
      c += dc;
    }
  }

  return controlled;
}

/**
 * Finds all pins and skewers created by sliding pieces (B, R, Q).
 */
export function detectPinsAndSkewers(
  board: ReturnType<Chess['board']>,
  pieces: PieceOnSquare[]
): {
  pins: { w: PinInfo[]; b: PinInfo[] };
  skewers: { w: SkewerInfo[]; b: SkewerInfo[] };
} {
  const pins: { w: PinInfo[]; b: PinInfo[] } = { w: [], b: [] };
  const skewers: { w: SkewerInfo[]; b: SkewerInfo[] } = { w: [], b: [] };

  for (const slider of pieces) {
    if (slider.type !== 'b' && slider.type !== 'r' && slider.type !== 'q') continue;
    const { row, col } = squareToCoords(slider.square);
    const dirs: number[][] = [];
    if (slider.type === 'r' || slider.type === 'q') dirs.push(...ORTHOGONAL_DELTAS);
    if (slider.type === 'b' || slider.type === 'q') dirs.push(...DIAGONAL_DELTAS);

    for (const [dr, dc] of dirs) {
      let r = row + dr;
      let c = col + dc;
      const encountered: PieceOnSquare[] = [];
      const raySquares: Square[] = [];

      while (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const sq = coordsToSquare(r, c)!;
        raySquares.push(sq);
        const cell = board[r][c];
        if (cell) {
          encountered.push({
            square: sq,
            type: cell.type,
            color: cell.color,
            value: PIECE_VALUES[cell.type],
          });
          if (encountered.length === 2) break;
        }
        r += dr;
        c += dc;
      }

      if (encountered.length === 2) {
        const [first, second] = encountered;
        const enemyColor = getOppositeColor(slider.color);
        if (first.color === enemyColor && second.color === enemyColor) {
          // 1. If the front piece is the enemy King, it can never be pinned; it is a SKEWER (Şiş)
          if (first.type === 'k' && second.value >= 3) {
            skewers[slider.color].push({
              attacker: slider,
              frontTarget: first,
              backTarget: second,
              raySquares,
            });
          }
          // 2. Absolute PIN: second piece is the enemy King
          else if (second.type === 'k' && first.type !== 'k') {
            pins[slider.color].push({
              pinner: slider,
              pinned: first,
              shielded: second,
              isAbsolute: true,
              raySquares,
            });
          }
          // 3. Relative PIN: front piece is a minor/rook shielding a strictly higher-value piece (e.g. Queen or Rook)
          // where the shielded piece is at least as valuable as the pinner (or is a Queen)
          else if (
            first.type !== 'p' &&
            second.value > first.value &&
            second.value >= 5 &&
            second.value >= slider.value
          ) {
            pins[slider.color].push({
              pinner: slider,
              pinned: first,
              shielded: second,
              isAbsolute: false,
              raySquares,
            });
          }
          // 4. Value SKEWER: front piece is more valuable (e.g. Queen) and back piece is Rook/Minor
          else if (first.value > second.value && first.value >= 5 && second.value >= 3) {
            skewers[slider.color].push({
              attacker: slider,
              frontTarget: first,
              backTarget: second,
              raySquares,
            });
          }
        }
      }
    }
  }

  return { pins, skewers };
}

/**
 * Analyzes pawn structure: passed pawns, doubled pawns, isolated pawns, open files.
 */
export function analyzePawnStructure(pieces: PieceOnSquare[]): PawnStructureInfo {
  const whitePawns = pieces.filter((p) => p.type === 'p' && p.color === 'w');
  const blackPawns = pieces.filter((p) => p.type === 'p' && p.color === 'b');

  const whiteFiles = new Map<string, Square[]>();
  const blackFiles = new Map<string, Square[]>();

  for (const f of FILES) {
    whiteFiles.set(f, []);
    blackFiles.set(f, []);
  }

  for (const p of whitePawns) {
    whiteFiles.get(p.square[0])!.push(p.square);
  }
  for (const p of blackPawns) {
    blackFiles.get(p.square[0])!.push(p.square);
  }

  const doubledPawns: { w: Square[]; b: Square[] } = { w: [], b: [] };
  const isolatedPawns: { w: Square[]; b: Square[] } = { w: [], b: [] };
  const passedPawns: { w: Square[]; b: Square[] } = { w: [], b: [] };
  const openFiles: string[] = [];
  const semiOpenFiles: { w: string[]; b: string[] } = { w: [], b: [] };

  FILES.forEach((file, idx) => {
    const wOnFile = whiteFiles.get(file)!;
    const bOnFile = blackFiles.get(file)!;

    if (wOnFile.length === 0 && bOnFile.length === 0) {
      openFiles.push(file);
    } else if (wOnFile.length === 0 && bOnFile.length > 0) {
      semiOpenFiles.w.push(file);
    } else if (bOnFile.length === 0 && wOnFile.length > 0) {
      semiOpenFiles.b.push(file);
    }

    if (wOnFile.length > 1) doubledPawns.w.push(...wOnFile);
    if (bOnFile.length > 1) doubledPawns.b.push(...bOnFile);

    const adjFiles = [FILES[idx - 1], FILES[idx + 1]].filter(Boolean);
    const wHasNeighbor = adjFiles.some((af) => (whiteFiles.get(af)?.length ?? 0) > 0);
    if (wOnFile.length > 0 && !wHasNeighbor) {
      isolatedPawns.w.push(...wOnFile);
    }
    const bHasNeighbor = adjFiles.some((af) => (blackFiles.get(af)?.length ?? 0) > 0);
    if (bOnFile.length > 0 && !bHasNeighbor) {
      isolatedPawns.b.push(...bOnFile);
    }
  });

  // Passed pawns: no enemy pawn in front on same file or adjacent files
  for (const wp of whitePawns) {
    const { col } = squareToCoords(wp.square);
    const rankNum = parseInt(wp.square[1], 10);
    const blockingEnemy = blackPawns.some((bp) => {
      const bCol = squareToCoords(bp.square).col;
      const bRank = parseInt(bp.square[1], 10);
      return Math.abs(bCol - col) <= 1 && bRank > rankNum;
    });
    if (!blockingEnemy) passedPawns.w.push(wp.square);
  }

  for (const bp of blackPawns) {
    const { col } = squareToCoords(bp.square);
    const rankNum = parseInt(bp.square[1], 10);
    const blockingEnemy = whitePawns.some((wp) => {
      const wCol = squareToCoords(wp.square).col;
      const wRank = parseInt(wp.square[1], 10);
      return Math.abs(wCol - col) <= 1 && wRank < rankNum;
    });
    if (!blockingEnemy) passedPawns.b.push(bp.square);
  }

  return {
    passedPawns,
    doubledPawns,
    isolatedPawns,
    openFiles,
    semiOpenFiles,
  };
}

/**
 * Checks if either King has a back-rank weakness (on rank 1 or 8, blocked by own pawns on rank 2 or 7,
 * with no safe flight squares on the 2nd/7th rank).
 */
export function analyzeBackRank(
  board: ReturnType<Chess['board']>,
  pieces: PieceOnSquare[],
  attackedByWhite: Map<Square, PieceOnSquare[]>,
  attackedByBlack: Map<Square, PieceOnSquare[]>
): BackRankInfo {
  const whiteKing = pieces.find((p) => p.type === 'k' && p.color === 'w') ?? null;
  const blackKing = pieces.find((p) => p.type === 'k' && p.color === 'b') ?? null;

  let whiteVulnerable = false;
  let blackVulnerable = false;

  const blackHasHeavyPiece = pieces.some((p) => p.color === 'b' && (p.type === 'r' || p.type === 'q'));
  const whiteHasHeavyPiece = pieces.some((p) => p.color === 'w' && (p.type === 'r' || p.type === 'q'));

  if (whiteKing && whiteKing.square[1] === '1' && blackHasHeavyPiece) {
    const { col } = squareToCoords(whiteKing.square);
    // Check escape squares on rank 2 (row 6)
    let hasEscapeOnRank2 = false;
    for (const dc of [-1, 0, 1]) {
      const sq2 = coordsToSquare(6, col + dc);
      if (!sq2) continue;
      const occupant = board[6][col + dc];
      const isAttacked = (attackedByBlack.get(sq2)?.length ?? 0) > 0;
      if (!occupant && !isAttacked) {
        hasEscapeOnRank2 = true;
      }
    }
    if (!hasEscapeOnRank2) {
      whiteVulnerable = true;
    }
  }

  if (blackKing && blackKing.square[1] === '8' && whiteHasHeavyPiece) {
    const { col } = squareToCoords(blackKing.square);
    let hasEscapeOnRank7 = false;
    for (const dc of [-1, 0, 1]) {
      const sq7 = coordsToSquare(1, col + dc);
      if (!sq7) continue;
      const occupant = board[1][col + dc];
      const isAttacked = (attackedByWhite.get(sq7)?.length ?? 0) > 0;
      if (!occupant && !isAttacked) {
        hasEscapeOnRank7 = true;
      }
    }
    if (!hasEscapeOnRank7) {
      blackVulnerable = true;
    }
  }

  return {
    whiteVulnerable,
    blackVulnerable,
    whiteKingSquare: whiteKing?.square ?? null,
    blackKingSquare: blackKing?.square ?? null,
  };
}

/**
 * Full deterministic tactical and positional analysis of a FEN position.
 */
export function analyzePositionTactics(fen: string): PositionTacticalReport {
  const chess = new Chess(fen);
  const board = chess.board();
  const pieces: PieceOnSquare[] = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = board[r][c];
      if (cell) {
        pieces.push({
          square: cell.square,
          type: cell.type,
          color: cell.color,
          value: PIECE_VALUES[cell.type],
        });
      }
    }
  }

  const attackedByWhite = new Map<Square, PieceOnSquare[]>();
  const attackedByBlack = new Map<Square, PieceOnSquare[]>();
  const pieceTargets = new Map<Square, Square[]>();

  for (const p of pieces) {
    const controlled = getSquaresControlledByPiece(board, p.square, p.type, p.color);
    pieceTargets.set(p.square, controlled);
    const map = p.color === 'w' ? attackedByWhite : attackedByBlack;
    for (const sq of controlled) {
      const arr = map.get(sq) ?? [];
      arr.push(p);
      map.set(sq, arr);
    }
  }

  const { pins, skewers } = detectPinsAndSkewers(board, pieces);

  // Absolute pinned pieces cannot move off the pin ray to capture or defend squares off the ray
  const absolutelyPinnedSquares = new Set<Square>([
    ...pins.w.filter((pin) => pin.isAbsolute).map((pin) => pin.pinned.square),
    ...pins.b.filter((pin) => pin.isAbsolute).map((pin) => pin.pinned.square),
  ]);

  const hangingPieces: { w: HangingPieceInfo[]; b: HangingPieceInfo[] } = { w: [], b: [] };
  const undefendedPieces: { w: PieceOnSquare[]; b: PieceOnSquare[] } = { w: [], b: [] };
  const attackedPieces: { w: PieceOnSquare[]; b: PieceOnSquare[] } = { w: [], b: [] };

  for (const p of pieces) {
    if (p.type === 'k') continue;
    const enemyAttackers = (p.color === 'w' ? attackedByBlack : attackedByWhite).get(p.square) ?? [];
    const rawDefenders = (p.color === 'w' ? attackedByWhite : attackedByBlack).get(p.square) ?? [];
    // Filter out defenders that are absolutely pinned and not on the same pin ray
    const defenders = rawDefenders.filter((d) => !absolutelyPinnedSquares.has(d.square));

    if (defenders.length === 0 && p.type !== 'p') {
      undefendedPieces[p.color].push(p);
    }

    if (enemyAttackers.length > 0) {
      attackedPieces[p.color].push(p);
      const minAttackerValue = Math.min(...enemyAttackers.map((a) => (a.type === 'k' ? 99 : a.value)));

      if (defenders.length === 0) {
        hangingPieces[p.color].push({
          piece: p,
          attackers: enemyAttackers,
          defenders,
          reason: 'undefended_attacked',
        });
      } else if (minAttackerValue < p.value) {
        hangingPieces[p.color].push({
          piece: p,
          attackers: enemyAttackers,
          defenders,
          reason: 'attacked_by_lesser_piece',
        });
      }
    }
  }

  // Detect forks & double attacks: a single piece attacking >= 2 valuable/undefended enemy pieces
  const forks: { w: ForkInfo[]; b: ForkInfo[] } = { w: [], b: [] };
  const doubleAttacks: { w: ForkInfo[]; b: ForkInfo[] } = { w: [], b: [] };

  for (const attacker of pieces) {
    if (absolutelyPinnedSquares.has(attacker.square)) continue;
    const targets = pieceTargets.get(attacker.square) ?? [];
    const enemyColor = getOppositeColor(attacker.color);
    const attackedEnemyPieces: PieceOnSquare[] = [];

    for (const sq of targets) {
      const targetPiece = pieces.find((p) => p.square === sq && p.color === enemyColor);
      if (!targetPiece) continue;
      const targetDefenders = (
        (enemyColor === 'w' ? attackedByWhite : attackedByBlack).get(sq) ?? []
      ).filter((d) => !absolutelyPinnedSquares.has(d.square));

      const isValuableOrHanging =
        targetPiece.type === 'k' ||
        targetPiece.value > attacker.value ||
        (targetPiece.value >= 3 && targetDefenders.length === 0);

      if (isValuableOrHanging) {
        attackedEnemyPieces.push(targetPiece);
      }
    }

    if (attackedEnemyPieces.length >= 2) {
      const info: ForkInfo = { attacker, targets: attackedEnemyPieces };
      forks[attacker.color].push(info);
      doubleAttacks[attacker.color].push(info);
    }
  }

  // Center control
  const whiteControlledCenter = CENTER_SQUARES.filter((sq) => (attackedByWhite.get(sq)?.length ?? 0) > 0);
  const blackControlledCenter = CENTER_SQUARES.filter((sq) => (attackedByBlack.get(sq)?.length ?? 0) > 0);
  const whiteOccupiedCenter = CENTER_SQUARES.filter((sq) =>
    pieces.some((p) => p.square === sq && p.color === 'w')
  );
  const blackOccupiedCenter = CENTER_SQUARES.filter((sq) =>
    pieces.some((p) => p.square === sq && p.color === 'b')
  );

  // Development & castling
  const whiteStartingMinors: Square[] = ['b1', 'g1', 'c1', 'f1'];
  const blackStartingMinors: Square[] = ['b8', 'g8', 'c8', 'f8'];
  const whiteMinorsOnStart = whiteStartingMinors.filter((sq) =>
    pieces.some((p) => p.square === sq && p.color === 'w' && (p.type === 'n' || p.type === 'b'))
  ).length;
  const blackMinorsOnStart = blackStartingMinors.filter((sq) =>
    pieces.some((p) => p.square === sq && p.color === 'b' && (p.type === 'n' || p.type === 'b'))
  ).length;

  const whiteMinorDeveloped = Math.max(0, 4 - whiteMinorsOnStart);
  const blackMinorDeveloped = Math.max(0, 4 - blackMinorsOnStart);

  const whiteQueen = pieces.find((p) => p.color === 'w' && p.type === 'q');
  const blackQueen = pieces.find((p) => p.color === 'b' && p.type === 'q');

  const whiteQueenMovedEarly = Boolean(whiteQueen && whiteQueen.square !== 'd1' && whiteMinorDeveloped < 2);
  const blackQueenMovedEarly = Boolean(blackQueen && blackQueen.square !== 'd8' && blackMinorDeveloped < 2);

  const castlingRightsw = chess.getCastlingRights('w');
  const castlingRightsb = chess.getCastlingRights('b');

  // Non-pawn material count for endgame detection
  const nonPawnMaterial = pieces
    .filter((p) => p.type !== 'p' && p.type !== 'k')
    .reduce((acc, p) => acc + p.value, 0);
  const isEndgame = nonPawnMaterial <= 26;

  // Mate in 1 moves for current side to move
  const legalMoves = chess.moves({ verbose: true });
  const mateInOneMoves: string[] = [];
  for (const m of legalMoves) {
    const copy = new Chess(fen);
    copy.move(m);
    if (copy.isCheckmate()) {
      mateInOneMoves.push(m.san);
    }
  }

  return {
    fen,
    turn: chess.turn(),
    inCheck: chess.inCheck(),
    isCheckmate: chess.isCheckmate(),
    isStalemate: chess.isStalemate(),
    isDraw: chess.isDraw(),
    pieces,
    hangingPieces,
    undefendedPieces,
    attackedPieces,
    forks,
    pins,
    skewers,
    doubleAttacks,
    backRank: analyzeBackRank(board, pieces, attackedByWhite, attackedByBlack),
    centerControl: {
      whiteControlled: whiteControlledCenter,
      blackControlled: blackControlledCenter,
      whiteOccupied: whiteOccupiedCenter,
      blackOccupied: blackOccupiedCenter,
    },
    development: {
      whiteMinorDeveloped,
      blackMinorDeveloped,
      whiteQueenMovedEarly,
      blackQueenMovedEarly,
      whiteCanCastleKingside: castlingRightsw.k,
      whiteCanCastleQueenside: castlingRightsw.q,
      blackCanCastleKingside: castlingRightsb.k,
      blackCanCastleQueenside: castlingRightsb.q,
    },
    pawnStructure: analyzePawnStructure(pieces),
    isEndgame,
    mateInOneMoves,
  };
}

/**
 * Detects if moving `move` from `beforeFen` to `afterFen` created a discovered attack
 * (i.e. a sliding piece of `move.color` that did NOT move now attacks an enemy valuable/undefended piece).
 */
export function detectDiscoveredAttack(
  beforeFen: string,
  afterFen: string,
  move: Move
): DiscoveredAttackInfo | null {
  const beforeChess = new Chess(beforeFen);
  const afterChess = new Chess(afterFen);
  const beforeBoard = beforeChess.board();
  const afterBoard = afterChess.board();
  const playerColor = move.color;
  const enemyColor = getOppositeColor(playerColor);

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = afterBoard[r][c];
      if (!cell || cell.color !== playerColor) continue;
      if (cell.square === move.to) continue; // skip the piece that actually moved
      if (cell.type !== 'b' && cell.type !== 'r' && cell.type !== 'q') continue;

      const beforeControlled = new Set(
        getSquaresControlledByPiece(beforeBoard, cell.square, cell.type, cell.color)
      );
      const afterControlled = getSquaresControlledByPiece(
        afterBoard,
        cell.square,
        cell.type,
        cell.color
      );

      for (const targetSq of afterControlled) {
        if (beforeControlled.has(targetSq)) continue; // wasn't newly uncovered
        const targetCoord = squareToCoords(targetSq);
        const targetCell = afterBoard[targetCoord.row][targetCoord.col];
        if (targetCell && targetCell.color === enemyColor) {
          if (targetCell.type === 'k' || PIECE_VALUES[targetCell.type] >= 3) {
            return {
              movedPieceFrom: move.from,
              movedPieceTo: move.to,
              sliderPiece: {
                square: cell.square,
                type: cell.type,
                color: cell.color,
                value: PIECE_VALUES[cell.type],
              },
              targetPiece: {
                square: targetSq,
                type: targetCell.type,
                color: targetCell.color,
                value: PIECE_VALUES[targetCell.type],
              },
            };
          }
        }
      }
    }
  }

  return null;
}

export function describePieceTr(piece: PieceOnSquare): string {
  return `${piece.square} karesindeki ${PIECE_NAMES_TR[piece.type].nominative.toLowerCase()}`;
}
