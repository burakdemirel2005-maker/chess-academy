import React, { useEffect, useMemo, useState } from 'react';
import { Move, Square } from 'chess.js';
import {
  CheckCircle2,
  Eye,
  Lightbulb,
  Puzzle,
  RefreshCw,
  Sparkles,
  Trophy,
} from 'lucide-react';
import {
  PUZZLE_THEMES,
  PUZZLES_DATA,
  PuzzleTheme,
  TacticalPuzzle,
} from '@/data/puzzlesData';
import { InteractiveChessboard } from '@/features/chess/InteractiveChessboard';
import { CoachAssistantPanel } from '@/features/coach/CoachAssistantPanel';
import { evaluatePlayedMove, MoveCoachingEvaluation } from '@/features/coach/coachEngine';
import { useAcademyStore } from '@/stores/useAcademyStore';
import { formatMoveUci, parseUciMove, tryMakeMove } from '@/utils/chessUtils';
import { soundService } from '@/services/soundService';

export const PuzzlesView: React.FC = () => {
  const { puzzleAttempts, spacedRepetitionQueue, recordPuzzleAttempt } = useAcademyStore();

  const [selectedTheme, setSelectedTheme] = useState<PuzzleTheme | 'all'>('all');
  const [selectedPuzzleId, setSelectedPuzzleId] = useState<string>(PUZZLES_DATA[0].id);

  const filteredPuzzles = useMemo(() => {
    if (selectedTheme === 'all') return PUZZLES_DATA;
    return PUZZLES_DATA.filter((p) => p.theme === selectedTheme);
  }, [selectedTheme]);

  const activePuzzle: TacticalPuzzle = useMemo(() => {
    const found = filteredPuzzles.find((p) => p.id === selectedPuzzleId);
    return found ?? filteredPuzzles[0] ?? PUZZLES_DATA[0];
  }, [filteredPuzzles, selectedPuzzleId]);

  const [fen, setFen] = useState<string>(activePuzzle.fen);
  const [stepIdx, setStepIdx] = useState<number>(0);
  const [hintsUsed, setHintsUsed] = useState<number>(0);
  const [attemptsOnCurrent, setAttemptsOnCurrent] = useState<number>(0);
  const [solved, setSolved] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: 'info' | 'success' | 'error';
    textTr: string;
  }>({
    type: 'info',
    textTr: 'Bu pozisyondaki en güçlü taktik hamleyi bul ve tahtada oyna!',
  });
  const [arrows, setArrows] = useState<[Square, Square, string?][]>([]);
  const [highlights, setHighlights] = useState<Square[]>([]);
  const [lastMoveEval, setLastMoveEval] = useState<MoveCoachingEvaluation | null>(null);

  useEffect(() => {
    setFen(activePuzzle.fen);
    setStepIdx(0);
    setHintsUsed(0);
    setAttemptsOnCurrent(0);
    setSolved(false);
    setArrows([]);
    setHighlights([]);
    setLastMoveEval(null);
    setFeedback({
      type: 'info',
      textTr: 'Bu pozisyondaki en güçlü taktik hamleyi bul ve tahtada oyna!',
    });
  }, [activePuzzle]);

  const handleBoardMove = (move: Move, beforeFen: string, afterFen: string) => {
    if (solved) return;
    const currentStep = activePuzzle.steps[stepIdx];
    if (!currentStep) return;

    const uci = formatMoveUci(move);
    const nextAttempts = attemptsOnCurrent + 1;
    setAttemptsOnCurrent(nextAttempts);

    const coaching = evaluatePlayedMove({
      beforeFen,
      afterFen,
      move,
      moveNumber: stepIdx + 1,
    });
    setLastMoveEval(coaching);

    const isCorrect =
      currentStep.acceptedPlayerUci.includes(uci) ||
      currentStep.acceptedPlayerUci.includes(`${move.from}${move.to}`);

    if (isCorrect) {
      let updatedFen = afterFen;
      const nextStep = stepIdx + 1;

      if (currentStep.opponentReplyUci) {
        const oppParsed = parseUciMove(currentStep.opponentReplyUci);
        if (oppParsed) {
          const oppRes = tryMakeMove(updatedFen, oppParsed);
          if (oppRes.ok && oppRes.nextFen) {
            updatedFen = oppRes.nextFen;
          }
        }
      }

      setFen(updatedFen);

      if (nextStep >= activePuzzle.steps.length) {
        soundService.play('success');
        setSolved(true);
        setFeedback({
          type: 'success',
          textTr: `Tebrikler, bulmacayı çözdün! ${activePuzzle.explanationTr}`,
        });
        recordPuzzleAttempt({
          puzzleId: activePuzzle.id,
          theme: activePuzzle.theme,
          solved: true,
          hintsUsed,
          attempts: nextAttempts,
        });
      } else {
        soundService.play('move');
        setStepIdx(nextStep);
        setFeedback({
          type: 'info',
          textTr: 'İlk hamle doğru! Rakip yanıt verdi, şimdi kombinasyonu tamamla!',
        });
      }
    } else {
      soundService.play('error');
      setFen(afterFen);
      setFeedback({
        type: 'error',
        textTr: `${move.san} bu taktik kombinasyonu çözmüyor (${coaching.explanations.beginner}). İpucuna göz atıp tekrar dene!`,
      });
      recordPuzzleAttempt({
        puzzleId: activePuzzle.id,
        theme: activePuzzle.theme,
        solved: false,
        hintsUsed,
        attempts: nextAttempts,
      });

      setTimeout(() => {
        setFen(beforeFen);
      }, 1200);
    }
  };

  const handleShowHint = (level: 1 | 2) => {
    setHintsUsed((h) => Math.max(h, level));
    setFeedback({
      type: 'info',
      textTr: level === 1 ? activePuzzle.hint1Tr : activePuzzle.hint2Tr,
    });
    const currentStep = activePuzzle.steps[stepIdx];
    if (level === 2 && currentStep) {
      const parsed = parseUciMove(currentStep.acceptedPlayerUci[0]);
      if (parsed) {
        setHighlights([parsed.from]);
      }
    }
  };

  const handleRevealSolution = () => {
    const currentStep = activePuzzle.steps[stepIdx];
    if (!currentStep) return;
    setHintsUsed(3);
    const parsed = parseUciMove(currentStep.acceptedPlayerUci[0]);
    if (parsed) {
      setHighlights([parsed.from, parsed.to]);
      setArrows([[parsed.from, parsed.to, '#10b981']]);
      setFeedback({
        type: 'info',
        textTr: `Çözüm Gösterildi: ${parsed.from} → ${parsed.to}. Açıklama: ${activePuzzle.explanationTr}`,
      });
    }
  };

  const totalAttempts = puzzleAttempts.length;
  const solvedAttempts = puzzleAttempts.filter((a) => a.solved).length;
  const successRate =
    totalAttempts > 0 ? Math.round((solvedAttempts / totalAttempts) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Header & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-navy-900/90 border border-slate-800 rounded-2xl p-4">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Puzzle className="w-5 h-5 text-emerald-400" />
            Taktik Bulmaca Antrenörü
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Doğrulanmış çatal, açmaz, şiş, savunma ve mat kombinasyonlarıyla taktik görüşünüzü güçlendirin.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-navy-950 border border-slate-800">
            <span className="text-slate-400">Çözülen: </span>
            <strong className="text-emerald-400">{solvedAttempts}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-navy-950 border border-slate-800">
            <span className="text-slate-400">Başarı Oranı: </span>
            <strong className="text-amber-400">%{successRate}</strong>
          </div>
          {spacedRepetitionQueue.length > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 font-semibold">
              Tekrar Bekleyen: {spacedRepetitionQueue.length}
            </div>
          )}
        </div>
      </div>

      {/* Theme Filter Pills */}
      <div className="flex flex-wrap gap-1.5">
        {PUZZLE_THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setSelectedTheme(t.id);
              const first =
                t.id === 'all'
                  ? PUZZLES_DATA[0]
                  : PUZZLES_DATA.find((p) => p.theme === t.id);
              if (first) setSelectedPuzzleId(first.id);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              selectedTheme === t.id
                ? 'bg-emerald-500 text-navy-950 border-emerald-400'
                : 'bg-navy-900 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            {t.labelTr}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Puzzle Selector */}
        <div className="lg:col-span-3 rounded-2xl bg-navy-900/90 border border-slate-800 overflow-hidden">
          <div className="p-3 border-b border-slate-800 bg-navy-950/60 text-xs font-bold text-slate-300 uppercase">
            Bulmaca Seçimi ({filteredPuzzles.length})
          </div>
          <div className="max-h-[640px] scrollable-panel divide-y divide-slate-800/70">
            {filteredPuzzles.map((puz) => {
              const isSolvedBefore = puzzleAttempts.some(
                (a) => a.puzzleId === puz.id && a.solved
              );
              const isSelected = puz.id === activePuzzle.id;
              return (
                <button
                  key={puz.id}
                  type="button"
                  onClick={() => setSelectedPuzzleId(puz.id)}
                  className={`w-full text-left p-3 transition flex items-start justify-between gap-2 ${
                    isSelected
                      ? 'bg-emerald-500/15 border-l-4 border-l-emerald-400'
                      : 'hover:bg-navy-800/60'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-100">
                      {puz.titleTr}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {puz.themeLabelTr} • {puz.difficulty} ({puz.rating})
                    </div>
                  </div>
                  {isSolvedBefore && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Center: Puzzle Board & Controls */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl bg-navy-900/95 border border-slate-800 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  {activePuzzle.themeLabelTr} • Zorluk: {activePuzzle.difficulty} ({activePuzzle.rating})
                </span>
                <h2 className="text-base font-bold text-slate-100">
                  {activePuzzle.titleTr}
                </h2>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleShowHint(1)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-navy-800 hover:bg-navy-700 border border-slate-700 text-xs text-amber-300 font-medium"
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  İpucu 1
                </button>
                <button
                  type="button"
                  onClick={() => handleShowHint(2)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-navy-800 hover:bg-navy-700 border border-slate-700 text-xs text-amber-300 font-medium"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  İpucu 2
                </button>
                <button
                  type="button"
                  data-testid="puzzle-reveal-solution-btn"
                  onClick={handleRevealSolution}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs text-emerald-300 font-semibold"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Çözümü Göster
                </button>
              </div>
            </div>

            <div
              data-testid="puzzle-feedback-banner"
              className={`p-3 rounded-xl text-xs font-medium border ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                  : feedback.type === 'error'
                  ? 'bg-red-500/20 border-red-500/50 text-red-200'
                  : 'bg-navy-950 border-slate-800 text-slate-200'
              }`}
            >
              {feedback.textTr}
            </div>

            <InteractiveChessboard
              fen={fen}
              onMove={handleBoardMove}
              onRestart={() => {
                setFen(activePuzzle.fen);
                setStepIdx(0);
                setSolved(false);
                setArrows([]);
                setHighlights([]);
              }}
              customArrows={arrows}
              customHighlightSquares={highlights}
            />

            {solved && (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const idx = filteredPuzzles.findIndex((p) => p.id === activePuzzle.id);
                    const nextPuz = filteredPuzzles[(idx + 1) % filteredPuzzles.length];
                    if (nextPuz) setSelectedPuzzleId(nextPuz.id);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-navy-950 font-bold text-xs transition"
                >
                  <Trophy className="w-4 h-4" />
                  Sonraki Bulmacaya Geç →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Contextual Coach */}
        <div className="lg:col-span-4 h-[720px]">
          <CoachAssistantPanel
            fen={fen}
            lastMoveEval={lastMoveEval}
            onHighlightBoard={(sqs, arrs) => {
              setHighlights(sqs);
              setArrows(arrs);
            }}
          />
        </div>
      </div>
    </div>
  );
};
