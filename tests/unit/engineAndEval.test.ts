import { describe, expect, it } from 'vitest';
import {
  ChessEngineAdapter,
  computeDeterministicAnalysis,
  evaluationToExpectedPoints,
  normalizeScoreToWhite,
  normalizeWhiteScoreToPlayer,
} from '@/engine/chessEngineAdapter';

describe('Stockfish Engine Adapter & Evaluation Normalization', () => {
  it('normalizes centipawn and mate scores accurately relative to White and Player', () => {
    // When it is Black to move and engine reports +150 cp (Black is up 1.5 pawns):
    const whiteNorm = normalizeScoreToWhite(150, null, 'b');
    expect(whiteNorm.scoreCp).toBe(-150);

    // Convert White-perspective -150 cp to Black player's perspective -> +150 cp
    const blackPlayerNorm = normalizeWhiteScoreToPlayer(
      whiteNorm.scoreCp,
      whiteNorm.scoreMate,
      'b'
    );
    expect(blackPlayerNorm.scoreCp).toBe(150);

    // Mate score normalization: Black to move has mate in 2 (+2 raw) -> -2 White perspective -> +2 Black player perspective
    const mateNormWhite = normalizeScoreToWhite(null, 2, 'b');
    expect(mateNormWhite.scoreMate).toBe(-2);
    const mateNormBlack = normalizeWhiteScoreToPlayer(
      mateNormWhite.scoreCp,
      mateNormWhite.scoreMate,
      'b'
    );
    expect(mateNormBlack.scoreMate).toBe(2);
  });

  it('handles mate scores separately from centipawn scores in expected points', () => {
    const equalPoints = evaluationToExpectedPoints(0, null);
    expect(Math.round(equalPoints)).toBe(50);

    const winningMate = evaluationToExpectedPoints(null, 1);
    expect(winningMate).toBeGreaterThan(99);

    const losingMate = evaluationToExpectedPoints(null, -1);
    expect(losingMate).toBeLessThan(1);
  });

  it('initializes engine adapter, analyzes mate-in-1 position, and supports cancellation & cleanup', async () => {
    const adapter = new ChessEngineAdapter();
    const mateIn1Fen = '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1';

    const analysis = await adapter.analyzePosition(mateIn1Fen, {
      depth: 2,
      movetimeMs: 200,
      multiPv: 2,
    });

    expect(analysis.bestMoveUci).toBe('d1d8');
    expect(analysis.bestMoveSan).toBe('Rd8#');
    expect(analysis.scoreMate).toBe(1);

    adapter.cancelCurrentAnalysis();
    expect(adapter.getActiveRequestId()).toBeNull();
    adapter.dispose();
  });

  it('computes deterministic MultiPV lines synchronously', () => {
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const res = computeDeterministicAnalysis(startFen, 2, 3, 'test_req');
    expect(res.lines.length).toBe(3);
    expect(res.bestMoveUci.length).toBeGreaterThanOrEqual(4);
  });
});
