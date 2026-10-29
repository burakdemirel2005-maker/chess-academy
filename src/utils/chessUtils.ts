import { Chess, Color, Move, PieceSymbol, Square } from 'chess.js';

export const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

export const PIECE_CP_VALUES: Record<PieceSymbol, number> = {
  p: 100,
  n: 300,
  b: 315,
  r: 500,
  q: 900,
  k: 10000,
};

export const PIECE_NAMES_TR: Record<PieceSymbol, {
  nominative: string;
  accusative: string;
  possessiveAccusative: string;
  genitive: string;
}> = {
  p: { nominative: 'Piyon', accusative: 'piyonu', possessiveAccusative: 'piyonunu', genitive: 'piyonun' },
  n: { nominative: 'At', accusative: 'atı', possessiveAccusative: 'atını', genitive: 'atın' },
  b: { nominative: 'Fil', accusative: 'fili', possessiveAccusative: 'filini', genitive: 'filin' },
  r: { nominative: 'Kale', accusative: 'kaleyi', possessiveAccusative: 'kalesini', genitive: 'kalenin' },
  q: { nominative: 'Vezir', accusative: 'veziri', possessiveAccusative: 'vezirini', genitive: 'vezirin' },
  k: { nominative: 'Şah', accusative: 'şahı', possessiveAccusative: 'şahını', genitive: 'şahın' },
};

export const PIECE_NAMES_EN: Record<PieceSymbol, string> = {
  p: 'Pawn',
  n: 'Knight',
  b: 'Bishop',
  r: 'Rook',
  q: 'Queen',
  k: 'King',
};

export const CENTER_SQUARES: Square[] = ['d4', 'e4', 'd5', 'e5'];
export const EXTENDED_CENTER_SQUARES: Square[] = [
  'c3', 'd3', 'e3', 'f3',
  'c4', 'd4', 'e4', 'f4',
  'c5', 'd5', 'e5', 'f5',
  'c6', 'd6', 'e6', 'f6',
];

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
export const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const;

export function coordsToSquare(row: number, col: number): Square | null {
  if (row < 0 || row > 7 || col < 0 || col > 7) return null;
  return `${FILES[col]}${8 - row}` as Square;
}

export function squareToCoords(sq: Square): { row: number; col: number } {
  const col = FILES.indexOf(sq[0] as (typeof FILES)[number]);
  const row = 8 - parseInt(sq[1], 10);
  return { row, col };
}

export function isValidFen(fen: string): { valid: boolean; error?: string } {
  try {
    new Chess(fen);
    return { valid: true };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Geçersiz FEN dizisi',
    };
  }
}

export interface MaterialBalance {
  whitePoints: number;
  blackPoints: number;
  diff: number; // white - black
  whiteCounts: Record<PieceSymbol, number>;
  blackCounts: Record<PieceSymbol, number>;
}

export function calculateMaterial(fen: string): MaterialBalance {
  const chess = new Chess(fen);
  const board = chess.board();
  const whiteCounts: Record<PieceSymbol, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
  const blackCounts: Record<PieceSymbol, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
  let whitePoints = 0;
  let blackPoints = 0;

  for (const row of board) {
    for (const cell of row) {
      if (!cell) continue;
      if (cell.color === 'w') {
        whiteCounts[cell.type] += 1;
        whitePoints += PIECE_VALUES[cell.type];
      } else {
        blackCounts[cell.type] += 1;
        blackPoints += PIECE_VALUES[cell.type];
      }
    }
  }

  return {
    whitePoints,
    blackPoints,
    diff: whitePoints - blackPoints,
    whiteCounts,
    blackCounts,
  };
}

export function getOppositeColor(color: Color): Color {
  return color === 'w' ? 'b' : 'w';
}

export function formatMoveUci(move: { from: string; to: string; promotion?: string }): string {
  return `${move.from}${move.to}${move.promotion ?? ''}`;
}

export function parseUciMove(uci: string): { from: Square; to: Square; promotion?: PieceSymbol } | null {
  if (!uci || uci.length < 4) return null;
  const from = uci.slice(0, 2) as Square;
  const to = uci.slice(2, 4) as Square;
  const promotion = uci.length >= 5 ? (uci[4].toLowerCase() as PieceSymbol) : undefined;
  return { from, to, promotion };
}

export function tryMakeMove(
  fen: string,
  moveInput: string | { from: string; to: string; promotion?: string }
): { ok: boolean; move?: Move; nextFen?: string; error?: string } {
  try {
    const chess = new Chess(fen);
    const move = chess.move(moveInput);
    if (!move) {
      return { ok: false, error: 'Kural dışı hamle' };
    }
    return { ok: true, move, nextFen: chess.fen() };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Bu hamle kurallara uygun değil.',
    };
  }
}
