import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Chess, Color, Move, Square } from 'chess.js';
import {
  Activity,
  Award,
  Cpu,
  Flag,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Swords,
} from 'lucide-react';
import {
  DIFFICULTY_LEVELS,
  DifficultyLevelId,
  EngineAnalysisResult,
  sharedChessEngine,
} from '@/engine/chessEngineAdapter';
import { InteractiveChessboard } from './InteractiveChessboard';
import { CoachAssistantPanel } from '@/features/coach/CoachAssistantPanel';
import { evaluatePlayedMove, MoveCoachingEvaluation } from '@/features/coach/coachEngine';
import { EvaluationGraph } from '@/features/analysis/EvaluationGraph';
import { OPENINGS_DATA } from '@/data/openingsData';
import { SavedGameRecord, useAcademyStore } from '@/stores/useAcademyStore';
import { parseUciMove } from '@/utils/chessUtils';
import { soundService } from '@/services/soundService';

export type PlayGameMode = 'learning' | 'practice' | 'challenge';

export const PlayStockfishView: React.FC = () => {
  const { recordCompletedGame, recordWeaknessTag } = useAcademyStore();

  const [difficulty, setDifficulty] = useState<DifficultyLevelId>(3);
  const [gameMode, setGameMode] = useState<PlayGameMode>('learning');
  const [colorChoice, setColorChoice] = useState<'w' | 'b' | 'random'>('w');
  const [playerColor, setPlayerColor] = useState<Color>('w');

  const [fenHistory, setFenHistory] = useState<string[]>([new Chess().fen()]);
  const [activePly, setActivePly] = useState<number>(0);
  const [moveListSan, setMoveListSan] = useState<string[]>([]);
  const [evaluations, setEvaluations] = useState<MoveCoachingEvaluation[]>([]);
  const [lastMoveSquares, setLastMoveSquares] = useState<{ from: Square; to: Square } | null>(
    null
  );
  const [boardHighlights, setBoardHighlights] = useState<Square[]>([]);
  const [boardArrows, setBoardArrows] = useState<[Square, Square, string?][]>([]);
  const [engineThinking, setEngineThinking] = useState<boolean>(false);
  const [latestEngineAnalysis, setLatestEngineAnalysis] =
    useState<EngineAnalysisResult | null>(null);
  const [resigned, setResigned] = useState<boolean>(false);

  const gameIdRef = useRef<string>(`game_${Date.now()}`);
  const currentFen = fenHistory[activePly] ?? fenHistory[fenHistory.length - 1];

  const currentChess = useMemo(() => new Chess(currentFen), [currentFen]);
  const isViewingLatest = activePly === fenHistory.length - 1;
  const isGameOver = resigned || currentChess.isGameOver();

  // Detect recognized opening from moveListSan
  const recognizedOpening = useMemo(() => {
    if (moveListSan.length === 0) return null;
    let bestMatch: { nameTr: string; eco: string; mainIdea: string } | null = null;
    for (const op of OPENINGS_DATA) {
      const opSanMoves = op.mainLine.map((s) => s.san);
      const matchLen = Math.min(moveListSan.length, opSanMoves.length, 4);
      if (matchLen >= 2) {
        const matches = opSanMoves
          .slice(0, matchLen)
          .every((san, idx) => moveListSan[idx] === san);
        if (matches) {
          bestMatch = {
            nameTr: op.nameTr,
            eco: op.eco,
            mainIdea: op.mainIdeasTr[0] ?? '',
          };
        }
      }
    }
    return bestMatch;
  }, [moveListSan]);

  const startNewGame = (nextColorChoice = colorChoice) => {
    sharedChessEngine.cancelCurrentAnalysis();
    const resolvedColor: Color =
      nextColorChoice === 'random'
        ? Math.random() < 0.5
          ? 'w'
          : 'b'
        : nextColorChoice;

    const startFen = new Chess().fen();
    gameIdRef.current = `game_${Date.now()}`;
    setPlayerColor(resolvedColor);
    setFenHistory([startFen]);
    setActivePly(0);
    setMoveListSan([]);
    setEvaluations([]);
    setLastMoveSquares(null);
    setBoardHighlights([]);
    setBoardArrows([]);
    setResigned(false);
    setEngineThinking(false);
  };

  // Trigger Stockfish move when it's engine's turn
  useEffect(() => {
    if (!isViewingLatest || isGameOver) return;
    const game = new Chess(currentFen);
    if (game.turn() === playerColor) return;

    let cancelled = false;
    setEngineThinking(true);

    const timer = setTimeout(async () => {
      try {
        const engineReply = await sharedChessEngine.selectEngineMove(currentFen, difficulty);
        if (cancelled) return;
        setLatestEngineAnalysis(engineReply.analysis);

        const parsed = parseUciMove(engineReply.uci);
        const beforeFen = game.fen();
        let moveObj: Move | null = null;
        if (parsed) {
          try {
            moveObj = game.move(parsed);
          } catch {
            moveObj = null;
          }
        }
        if (!moveObj) {
          const fallback = game.moves({ verbose: true })[0];
          if (fallback) moveObj = game.move(fallback);
        }

        if (moveObj && !cancelled) {
          const afterFen = game.fen();
          const evalItem = evaluatePlayedMove({
            beforeFen,
            afterFen,
            move: moveObj,
            moveNumber: Math.floor(moveListSan.length / 2) + 1,
            beforeEngine: engineReply.analysis,
          });

          soundService.play(moveObj.captured ? 'capture' : 'move');
          setLastMoveSquares({ from: moveObj.from, to: moveObj.to });
          setFenHistory((prev) => {
            const next = [...prev, afterFen];
            setActivePly(next.length - 1);
            return next;
          });
          setMoveListSan((prev) => [...prev, moveObj!.san]);
          setEvaluations((prev) => [...prev, evalItem]);
        }
      } finally {
        if (!cancelled) setEngineThinking(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [currentFen, isViewingLatest, isGameOver, playerColor, difficulty, moveListSan.length]);

  // Save completed game to store when game ends
  useEffect(() => {
    if (!isGameOver || moveListSan.length === 0) return;

    const playerEvals = evaluations.filter((e) => e.playerColor === playerColor);
    const inaccuracies = playerEvals.filter((e) => e.classification === 'inaccuracy').length;
    const mistakes = playerEvals.filter((e) => e.classification === 'mistake').length;
    const blunders = playerEvals.filter((e) => e.classification === 'blunder').length;
    const bestMovesCount = playerEvals.filter(
      (e) => e.classification === 'best' || e.classification === 'excellent'
    ).length;
    const weaknessTags = Array.from(
      new Set(playerEvals.flatMap((e) => e.weaknessTags))
    );

    let result: SavedGameRecord['result'] = 'draw';
    let reasonTr = 'Berabere';

    if (resigned) {
      result = 'loss';
      reasonTr = 'Oyuncu terk etti';
    } else if (currentChess.isCheckmate()) {
      const winner: Color = currentChess.turn() === 'w' ? 'b' : 'w';
      result = winner === playerColor ? 'win' : 'loss';
      reasonTr = result === 'win' ? 'Şah Mat ile Kazandın!' : 'Stockfish Şah Mat Yaptı';
    } else if (currentChess.isStalemate()) {
      reasonTr = 'Pat (Berabere)';
    }

    recordCompletedGame({
      id: gameIdRef.current,
      date: new Date().toISOString(),
      playerColor,
      difficultyLevel: difficulty,
      mode: gameMode,
      result,
      resultReasonTr: reasonTr,
      pgn: moveListSan.join(' '),
      finalFen: currentFen,
      moveCount: moveListSan.length,
      inaccuracies,
      mistakes,
      blunders,
      bestMovesCount,
      weaknessTags,
      evaluations,
    });
  }, [isGameOver]);

  const handleUserMove = async (move: Move, beforeFen: string, afterFen: string) => {
    if (engineThinking || isGameOver) return;

    const moveNum = Math.floor(moveListSan.length / 2) + 1;
    const coaching = evaluatePlayedMove({
      beforeFen,
      afterFen,
      move,
      moveNumber: moveNum,
    });

    for (const tag of coaching.weaknessTags) {
      recordWeaknessTag(tag);
    }

    const nextHistory = [...fenHistory.slice(0, activePly + 1), afterFen];
    setFenHistory(nextHistory);
    setActivePly(nextHistory.length - 1);
    setMoveListSan((prev) => [...prev.slice(0, activePly), move.san]);
    setEvaluations((prev) => [...prev.slice(0, activePly), coaching]);
    setLastMoveSquares({ from: move.from, to: move.to });

    if (gameMode === 'learning') {
      setBoardHighlights(coaching.highlightSquares);
      setBoardArrows(coaching.suggestedArrows);
    } else {
      setBoardHighlights([]);
      setBoardArrows([]);
    }
  };

  const handleUndoPair = () => {
    if (gameMode === 'challenge' || fenHistory.length < 3 || engineThinking) return;
    sharedChessEngine.cancelCurrentAnalysis();
    const targetLen = Math.max(1, fenHistory.length - 2);
    setFenHistory((prev) => prev.slice(0, targetLen));
    setMoveListSan((prev) => prev.slice(0, targetLen - 1));
    setEvaluations((prev) => prev.slice(0, targetLen - 1));
    setActivePly(targetLen - 1);
    setBoardHighlights([]);
    setBoardArrows([]);
  };

  const selectedConfig =
    DIFFICULTY_LEVELS.find((d) => d.level === difficulty) ?? DIFFICULTY_LEVELS[2];

  // Filter last player move evaluation (or active ply evaluation during post-game review)
  const displayedEval = useMemo(() => {
    if (evaluations.length === 0) return null;
    if (!isViewingLatest && activePly > 0) {
      return evaluations[activePly - 1] ?? null;
    }
    const playerEvals = evaluations.filter((e) => e.playerColor === playerColor);
    return playerEvals[playerEvals.length - 1] ?? evaluations[evaluations.length - 1];
  }, [evaluations, isViewingLatest, activePly, playerColor]);

  // Post-Game Summary Stats
  const postGameStats = useMemo(() => {
    const playerEvals = evaluations.filter((e) => e.playerColor === playerColor);
    const best = playerEvals.filter(
      (e) => e.classification === 'best' || e.classification === 'excellent'
    ).length;
    const inaccuracies = playerEvals.filter((e) => e.classification === 'inaccuracy');
    const mistakes = playerEvals.filter((e) => e.classification === 'mistake');
    const blunders = playerEvals.filter((e) => e.classification === 'blunder');
    const turningPoint = [...playerEvals].sort(
      (a, b) => b.expectedPointsLost - a.expectedPointsLost
    )[0];

    return {
      totalPlayerMoves: playerEvals.length,
      best,
      inaccuracies,
      mistakes,
      blunders,
      turningPoint,
    };
  }, [evaluations, playerColor]);

  return (
    <div className="space-y-5">
      {/* Top Game Configuration Bar */}
      <div className="rounded-2xl bg-navy-900/95 border border-slate-800 p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Swords className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              Stockfish ile Oyna ve Canlı Koçluk Al
              {engineThinking && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-medium animate-pulse">
                  <Cpu className="w-3 h-3" /> Stockfish Düşünüyor...
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400">{selectedConfig.descriptionTr}</p>
          </div>
        </div>

        {/* Difficulty, Mode & Color Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div>
            <label htmlFor="difficulty-select" className="sr-only">
              Zorluk Seviyesi
            </label>
            <select
              id="difficulty-select"
              data-testid="stockfish-difficulty-select"
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value) as DifficultyLevelId)}
              className="px-3 py-1.5 rounded-xl bg-navy-800 border border-slate-700 text-xs font-semibold text-slate-100"
            >
              {DIFFICULTY_LEVELS.map((lvl) => (
                <option key={lvl.level} value={lvl.level}>
                  {lvl.nameTr}
                </option>
              ))}
            </select>
          </div>

          <div
            className="flex items-center rounded-xl bg-navy-950 p-1 border border-slate-800"
            role="group"
            aria-label="Oyun Modu"
          >
            {(
              [
                { id: 'learning', label: 'Öğrenme Modu' },
                { id: 'practice', label: 'Pratik Modu' },
                { id: 'challenge', label: 'Meydan Okuma' },
              ] as { id: PlayGameMode; label: string }[]
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setGameMode(m.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  gameMode === m.id
                    ? 'bg-emerald-500 text-navy-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <select
            aria-label="Renk Seçimi"
            value={colorChoice}
            onChange={(e) => {
              const next = e.target.value as 'w' | 'b' | 'random';
              setColorChoice(next);
              startNewGame(next);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-navy-800 border border-slate-700 text-xs text-slate-200"
          >
            <option value="w">Beyaz ile Oyna</option>
            <option value="b">Siyah ile Oyna</option>
            <option value="random">Rastgele Renk</option>
          </select>

          <button
            type="button"
            onClick={() => startNewGame()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-navy-950 font-semibold text-xs transition"
          >
            <Play className="w-3.5 h-3.5" />
            Yeni Oyun
          </button>

          {!isGameOver && moveListSan.length > 0 && (
            <button
              type="button"
              onClick={() => setResigned(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 text-xs font-medium transition"
            >
              <Flag className="w-3.5 h-3.5" />
              Terk Et
            </button>
          )}
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left/Center: Chessboard & Evaluation Graph & Post-Game Report */}
        <div className="lg:col-span-7 space-y-4">
          {recognizedOpening && (
            <div className="px-3.5 py-2 rounded-xl bg-navy-900/90 border border-emerald-500/30 flex items-center justify-between text-xs">
              <span className="text-emerald-300 font-semibold">
                Tanınan Açılış: {recognizedOpening.nameTr} ({recognizedOpening.eco})
              </span>
              <span className="text-slate-400 hidden sm:inline">
                {recognizedOpening.mainIdea}
              </span>
            </div>
          )}

          <InteractiveChessboard
            fen={currentFen}
            orientation={playerColor === 'w' ? 'white' : 'black'}
            interactive={
              isViewingLatest &&
              !isGameOver &&
              !engineThinking &&
              currentChess.turn() === playerColor
            }
            canUndo={gameMode !== 'challenge' && fenHistory.length >= 3 && !engineThinking}
            onUndo={handleUndoPair}
            onRestart={() => startNewGame()}
            onMove={handleUserMove}
            lastMove={lastMoveSquares}
            customHighlightSquares={boardHighlights}
            customArrows={boardArrows}
          />

          {/* Move History & Evaluation Graph */}
          <div className="rounded-2xl bg-navy-900/95 border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-400" />
                Hamle Geçmişi ve Değerlendirme Grafiği
              </h2>
              {!isViewingLatest && (
                <button
                  type="button"
                  onClick={() => setActivePly(fenHistory.length - 1)}
                  className="text-xs text-emerald-400 font-semibold hover:underline"
                >
                  Güncel Hamleye Dön →
                </button>
              )}
            </div>

            {/* Clickable Move Chips */}
            <div className="flex flex-wrap gap-1.5 max-h-24 scrollable-panel p-1">
              {moveListSan.length === 0 ? (
                <span className="text-xs text-slate-500">
                  Henüz hamle yapılmadı. Oyuna başlamak için tahtada bir taş oynayın.
                </span>
              ) : (
                moveListSan.map((san, idx) => {
                  const ply = idx + 1;
                  const ev = evaluations[idx];
                  const isCurrent = activePly === ply;
                  const isBlunder = ev?.classification === 'blunder';
                  const isMistake = ev?.classification === 'mistake';
                  return (
                    <button
                      key={ply}
                      type="button"
                      onClick={() => setActivePly(ply)}
                      className={`px-2 py-0.5 rounded text-xs font-mono border transition ${
                        isCurrent
                          ? 'bg-emerald-500 text-navy-950 font-bold border-emerald-400'
                          : isBlunder
                          ? 'bg-red-500/20 text-red-300 border-red-500/40'
                          : isMistake
                          ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                          : 'bg-navy-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {idx % 2 === 0 ? `${Math.floor(idx / 2) + 1}. ` : ''}
                      {san}
                    </button>
                  );
                })
              )}
            </div>

            <EvaluationGraph
              evaluations={evaluations}
              activePlyIndex={Math.max(0, activePly - 1)}
              onSelectPly={(idx) => setActivePly(idx + 1)}
            />
          </div>

          {/* Post-Game Analysis Report (Always available after game ends or on request) */}
          {(isGameOver || evaluations.length >= 4) && (
            <div
              data-testid="post-game-analysis-card"
              className="rounded-2xl bg-navy-900/95 border border-emerald-500/40 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-400" />
                  Oyun Sonu ve Dönüm Noktası Analizi
                </h3>
                <span className="text-xs text-slate-400">
                  Toplam Hamle: {postGameStats.totalPlayerMoves}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <div className="text-lg font-bold text-emerald-400">
                    {postGameStats.best}
                  </div>
                  <div className="text-[11px] text-slate-300">En İyi / Mükemmel</div>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <div className="text-lg font-bold text-amber-400">
                    {postGameStats.inaccuracies.length}
                  </div>
                  <div className="text-[11px] text-slate-300">Küçük Hata</div>
                </div>
                <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30">
                  <div className="text-lg font-bold text-orange-400">
                    {postGameStats.mistakes.length}
                  </div>
                  <div className="text-[11px] text-slate-300">Hata</div>
                </div>
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30">
                  <div className="text-lg font-bold text-red-400">
                    {postGameStats.blunders.length}
                  </div>
                  <div className="text-[11px] text-slate-300">Büyük Hata (Blunder)</div>
                </div>
              </div>

              {postGameStats.turningPoint &&
                postGameStats.turningPoint.expectedPointsLost >= 6 && (
                  <div className="p-3 rounded-xl bg-navy-950/90 border border-amber-500/40 text-xs space-y-1">
                    <div className="font-bold text-amber-300 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4" />
                      Oyunun Kritik Dönüm Noktası ({postGameStats.turningPoint.moveNumber}.{' '}
                      {postGameStats.turningPoint.moveSan})
                    </div>
                    <p className="text-slate-200">
                      {postGameStats.turningPoint.explanations.intermediate}
                    </p>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Right: Contextual Coach Assistant */}
        <div className="lg:col-span-5 h-[760px]">
          {gameMode === 'challenge' && !isGameOver ? (
            <div className="h-full rounded-2xl bg-navy-900/95 border border-slate-800 p-6 flex flex-col items-center justify-center text-center space-y-3">
              <Sparkles className="w-10 h-10 text-amber-400" />
              <h2 className="text-base font-bold text-slate-100">
                Meydan Okuma Modu Aktif
              </h2>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                Meydan Okuma modunda oyun sırasında ipucu ve canlı koçluk kapalıdır. Oyun bittiğinde tüm hamlelerin ve kritik hataların detaylı Türkçe analizi otomatik olarak açılacaktır.
              </p>
            </div>
          ) : (
            <CoachAssistantPanel
              fen={currentFen}
              lastMoveEval={displayedEval}
              engineResult={latestEngineAnalysis}
              openingNameTr={recognizedOpening?.nameTr}
              openingIdeaTr={recognizedOpening?.mainIdea}
              hintsAllowed={gameMode === 'learning' || gameMode === 'practice' || isGameOver}
              onHighlightBoard={(sqs, arrs) => {
                setBoardHighlights(sqs);
                setBoardArrows(arrs);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
