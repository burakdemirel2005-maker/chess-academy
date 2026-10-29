import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import {
  analyzePositionTactics,
  detectDiscoveredAttack,
} from '@/features/coach/tacticalDetectors';
import {
  classifyMoveEvaluation,
  evaluatePlayedMove,
} from '@/features/coach/coachEngine';
import { generateSmartHint } from '@/features/coach/hintSystem';
import {
  answerContextualQuestion,
  detectAssistantIntent,
} from '@/features/coach/contextualAssistant';

describe('Tactical Detectors, Deterministic Coach Engine, Hints & Assistant', () => {
  it('detects hanging (undefended attacked) pieces accurately', () => {
    // Black rook on g5 is attacked by White knight on f3 and has no defenders
    const fen = '4k3/8/2p5/3n2r1/8/5N2/3Q4/4K3 w - - 0 1';
    const report = analyzePositionTactics(fen);
    const blackHangingSquares = report.hangingPieces.b.map((h) => h.piece.square);
    expect(blackHangingSquares).toContain('g5');
    expect(blackHangingSquares).not.toContain('d5'); // d5 is defended by c6 pawn
  });

  it('detects knight forks (Royal Fork on c7)', () => {
    const fen = 'r3k2r/ppp2ppp/8/8/8/8/PPP2PPP/4K3 w kq - 0 1';
    // Put a White knight on c7 forking e8 king and a8 rook
    const forkFen = 'r3k2r/ppN2ppp/8/8/8/8/PPP2PPP/4K3 b kq - 0 1';
    const report = analyzePositionTactics(forkFen);
    expect(report.forks.w.length).toBeGreaterThan(0);
    expect(report.forks.w[0].attacker.square).toBe('c7');
    const targetSquares = report.forks.w[0].targets.map((t) => t.square);
    expect(targetSquares).toContain('e8');
    expect(targetSquares).toContain('a8');
  });

  it('detects absolute pins and skewers along files and diagonals', () => {
    // White rook on e1 pins Black knight on e5 to Black king on e8
    const pinFen = '4k3/8/8/4n3/8/8/8/4R1K1 w - - 0 1';
    const pinReport = analyzePositionTactics(pinFen);
    expect(pinReport.pins.w.length).toBe(1);
    expect(pinReport.pins.w[0].pinned.square).toBe('e5');
    expect(pinReport.pins.w[0].shielded.square).toBe('e8');
    expect(pinReport.pins.w[0].isAbsolute).toBe(true);

    // White rook on e1 skewers Black king on e5 and Black rook on e8
    const skewerFen = '4r3/8/8/4k3/8/8/8/4R1K1 b - - 0 1';
    const skewerReport = analyzePositionTactics(skewerFen);
    expect(skewerReport.skewers.w.length).toBe(1);
    expect(skewerReport.skewers.w[0].frontTarget.square).toBe('e5');
    expect(skewerReport.skewers.w[0].backTarget.square).toBe('e8');
  });

  it('detects discovered attacks when a blocking piece moves out of a slider ray', () => {
    const beforeFen = '3qk3/8/8/3B4/8/8/8/3QK3 w - - 0 1';
    const chess = new Chess(beforeFen);
    const move = chess.move({ from: 'd5', to: 'c6' })!;
    const afterFen = chess.fen();

    const discovered = detectDiscoveredAttack(beforeFen, afterFen, move);
    expect(discovered).not.toBeNull();
    expect(discovered?.sliderPiece.square).toBe('d1');
    expect(discovered?.targetPiece.square).toBe('d8');
  });

  it('detects back-rank weakness, pawn structure (passed, doubled, isolated, open files)', () => {
    // Black king trapped on g8 behind f7, g7, h7 pawns while White has a rook on d1;
    // d5 is a White passed & isolated pawn, b2/b3 are doubled pawns, e-file is open
    const fen = '6k1/5ppp/8/3P4/8/1P6/1P3PPP/3R2K1 w - - 0 1';
    const report = analyzePositionTactics(fen);
    expect(report.backRank.blackVulnerable).toBe(true);
    expect(report.pawnStructure.passedPawns.w).toContain('d5');
    expect(report.pawnStructure.isolatedPawns.w).toContain('d5');
    expect(report.pawnStructure.doubledPawns.w).toContain('b2');
    expect(report.pawnStructure.doubledPawns.w).toContain('b3');
    expect(report.pawnStructure.openFiles).toContain('e');
  });

  it('evaluates moves and generates verified Turkish explanations (never generic LLM hallucinations)', () => {
    // Position where White blunders the Queen onto an attacked square
    const beforeFen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 2 3';
    const chess = new Chess(beforeFen);
    const badMove = chess.move({ from: 'd1', to: 'h5' })!; // Early Queen development
    const evalEarlyQueen = evaluatePlayedMove({
      beforeFen,
      afterFen: chess.fen(),
      move: badMove,
      moveNumber: 3,
    });

    expect(
      evalEarlyQueen.strategicObservations.some((s) => s.code === 'early_queen_development')
    ).toBe(true);
    expect(evalEarlyQueen.explanations.beginner).toContain('Vezirini');

    // Blunder check
    const classificationRes = classifyMoveEvaluation({
      playedUci: 'd1g4',
      bestUci: 'g1f3',
      cpBeforePlayer: 30,
      mateBeforePlayer: null,
      cpAfterPlayer: -800,
      mateAfterPlayer: null,
      leftHighPieceHanging: true,
    });
    expect(classificationRes.classification).toBe('blunder');
  });

  it('generates 3 progressive hint levels without revealing the move on Level 1', () => {
    const mateFen = '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1';
    const h1 = generateSmartHint(mateFen, 1);
    const h2 = generateSmartHint(mateFen, 2);
    const h3 = generateSmartHint(mateFen, 3);

    expect(h1.arrows.length).toBe(0);
    expect(h1.messageTr).toContain('mat');
    expect(h2.highlightSquares).toContain('d1');
    expect(h3.arrows.length).toBe(1);
    expect(h3.bestMoveSan).toBe('Rd8#');
  });

  it('recognizes Turkish contextual assistant intents and handles unsupported queries honestly', () => {
    expect(detectAssistantIntent('Şimdi ne yapmalıyım?')).toBe('what_should_i_do');
    expect(detectAssistantIntent('Hangi tasim tehdit altinda?')).toBe(
      'which_piece_threatened'
    );
    expect(detectAssistantIntent('Nasil rok yapabilirim')).toBe('how_to_castle');
    expect(detectAssistantIntent('Bana hava durumunu söyle')).toBe('unsupported');

    const fen = '4k3/8/2p5/3n2r1/8/5N2/3Q4/4K3 b - - 0 1';
    const ans = answerContextualQuestion({
      query: 'Hangi taşım tehdit altında?',
      fen,
    });
    expect(ans.intent).toBe('which_piece_threatened');
    expect(ans.highlightSquares).toContain('g5');

    const unsupportedAns = answerContextualQuestion({
      query: 'Bitcoin fiyatı ne olur?',
      fen,
    });
    expect(unsupportedAns.intent).toBe('unsupported');
    expect(unsupportedAns.suggestedQuestions.length).toBeGreaterThan(0);
  });
});
