import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import {
  calculateMaterial,
  isValidFen,
  parseUciMove,
  tryMakeMove,
} from '@/utils/chessUtils';

describe('Chess Core Rules & Special Moves', () => {
  it('validates legal moves and rejects illegal moves', () => {
    const startFen = new Chess().fen();
    const legal = tryMakeMove(startFen, { from: 'e2', to: 'e4' });
    expect(legal.ok).toBe(true);
    expect(legal.move?.san).toBe('e4');

    // Knight cannot move diagonally like a bishop
    const illegalKnight = tryMakeMove(startFen, { from: 'g1', to: 'e3' });
    expect(illegalKnight.ok).toBe(false);

    // Bishop blocked by pawns on starting position
    const illegalBishop = tryMakeMove(startFen, { from: 'f1', to: 'c4' });
    expect(illegalBishop.ok).toBe(false);
  });

  it('correctly handles Kingside (O-O) and Queenside (O-O-O) Castling and castling restrictions', () => {
    const castleFen = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1';
    const shortCastle = tryMakeMove(castleFen, { from: 'e1', to: 'g1' });
    expect(shortCastle.ok).toBe(true);
    expect(shortCastle.move?.san).toBe('O-O');

    const longCastle = tryMakeMove(castleFen, { from: 'e1', to: 'c1' });
    expect(longCastle.ok).toBe(true);
    expect(longCastle.move?.san).toBe('O-O-O');

    // Cannot castle when in check
    const inCheckCastleFen = '4r3/8/8/8/8/8/8/R3K2R w KQ - 0 1';
    const illegalCastle = tryMakeMove(inCheckCastleFen, { from: 'e1', to: 'g1' });
    expect(illegalCastle.ok).toBe(false);
  });

  it('correctly executes En Passant captures', () => {
    const epFen = 'rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3';
    const epMove = tryMakeMove(epFen, { from: 'e5', to: 'd6' });
    expect(epMove.ok).toBe(true);
    expect(epMove.move?.flags).toContain('e');
    const afterChess = new Chess(epMove.nextFen!);
    expect(afterChess.get('d5')).toBeUndefined();
    expect(afterChess.get('d6')?.type).toBe('p');
  });

  it('correctly handles Pawn Promotion (Queen and Underpromotion to Knight)', () => {
    const promoFen = '6k1/P7/8/8/8/8/8/6K1 w - - 0 1';
    const queenPromo = tryMakeMove(promoFen, { from: 'a7', to: 'a8', promotion: 'q' });
    expect(queenPromo.ok).toBe(true);
    expect(queenPromo.move?.san).toContain('=Q');

    const knightPromo = tryMakeMove(promoFen, { from: 'a7', to: 'a8', promotion: 'n' });
    expect(knightPromo.ok).toBe(true);
    expect(knightPromo.move?.san).toContain('=N');
  });

  it('detects Check, Checkmate, Stalemate, and Draw conditions (Insufficient Material)', () => {
    // Check (Rook moves from d1 to d8 checking King on e8)
    const checkFen = '4k3/8/8/8/8/8/8/3R2K1 w - - 0 1';
    const checkRes = tryMakeMove(checkFen, { from: 'd1', to: 'd8' });
    expect(checkRes.ok).toBe(true);
    const checkGame = new Chess(checkRes.nextFen!);
    expect(checkGame.inCheck()).toBe(true);
    expect(checkGame.isCheckmate()).toBe(false);

    // Checkmate (Back-rank mate)
    const mateFen = '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1';
    const mateRes = tryMakeMove(mateFen, { from: 'd1', to: 'd8' });
    expect(mateRes.ok).toBe(true);
    const mateGame = new Chess(mateRes.nextFen!);
    expect(mateGame.isCheckmate()).toBe(true);

    // Stalemate
    const stalemateFen = '7k/5K2/6Q1/8/8/8/8/8 b - - 0 1';
    const stalemateGame = new Chess(stalemateFen);
    expect(stalemateGame.isStalemate()).toBe(true);
    expect(stalemateGame.isDraw()).toBe(true);

    // Insufficient material draw (King + Knight vs King)
    const insufficientFen = '4k3/8/8/8/8/5N2/8/4K3 w - - 0 1';
    const insufficientGame = new Chess(insufficientFen);
    expect(insufficientGame.isInsufficientMaterial()).toBe(true);
    expect(insufficientGame.isDraw()).toBe(true);
  });

  it('loads valid FENs, rejects invalid FENs, and parses PGN games', () => {
    expect(isValidFen(new Chess().fen()).valid).toBe(true);
    expect(isValidFen('invalid-fen-string').valid).toBe(false);

    const pgnGame = new Chess();
    pgnGame.loadPgn('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5');
    expect(pgnGame.history()).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5']);

    const mat = calculateMaterial(pgnGame.fen());
    expect(mat.diff).toBe(0);
    expect(parseUciMove('e7e8q')).toEqual({ from: 'e7', to: 'e8', promotion: 'q' });
  });
});
