import React, { useMemo, useState } from 'react';
import { Chess, Move, Square } from 'chess.js';
import {
  AlertTriangle,
  BookMarked,
  CheckCircle2,
  Compass,
  Play,
  RotateCcw,
  StepForward,
  Target,
} from 'lucide-react';
import {
  OPENINGS_DATA,
  OpeningCurriculumItem,
  OpeningStep,
} from '@/data/openingsData';
import { InteractiveChessboard } from '@/features/chess/InteractiveChessboard';
import { CoachAssistantPanel } from '@/features/coach/CoachAssistantPanel';
import { evaluatePlayedMove, MoveCoachingEvaluation } from '@/features/coach/coachEngine';
import { useAcademyStore } from '@/stores/useAcademyStore';
import { formatMoveUci, parseUciMove, tryMakeMove } from '@/utils/chessUtils';
import { soundService } from '@/services/soundService';

export const OpeningsView: React.FC = () => {
  const { openingProgress, recordOpeningPractice } = useAcademyStore();

  const [sideFilter, setSideFilter] = useState<'all' | 'w' | 'b'>('all');
  const [selectedOpeningId, setSelectedOpeningId] = useState<string>(OPENINGS_DATA[0].id);
  const [trainerMode, setTrainerMode] = useState<'watch' | 'practice' | 'alternatives'>('watch');
  const [selectedAltId, setSelectedAltId] = useState<string | null>(null);

  const selectedOpening: OpeningCurriculumItem = useMemo(
    () => OPENINGS_DATA.find((o) => o.id === selectedOpeningId) ?? OPENINGS_DATA[0],
    [selectedOpeningId]
  );

  const activeLine: OpeningStep[] = useMemo(() => {
    if (trainerMode === 'alternatives' && selectedOpening.alternativeResponses.length > 0) {
      const alt =
        selectedOpening.alternativeResponses.find((a) => a.id === selectedAltId) ??
        selectedOpening.alternativeResponses[0];
      return alt.steps;
    }
    return selectedOpening.mainLine;
  }, [selectedOpening, trainerMode, selectedAltId]);

  const [stepIndex, setStepIndex] = useState<number>(0);
  const [fen, setFen] = useState<string>(new Chess().fen());
  const [feedbackTr, setFeedbackTr] = useState<string>(
    'Ana varyantı adım adım izleyebilir veya "Hafızadan Pratik Yap" moduyla kendin oynayabilirsin.'
  );
  const [lastMoveEval, setLastMoveEval] = useState<MoveCoachingEvaluation | null>(null);
  const [hadMistakeInRun, setHadMistakeInRun] = useState<boolean>(false);

  const resetLineToStart = (mode: 'watch' | 'practice' | 'alternatives', opening = selectedOpening) => {
    const startChess = new Chess();
    let nextIdx = 0;

    const line =
      mode === 'alternatives' && opening.alternativeResponses.length > 0
        ? opening.alternativeResponses[0].steps
        : opening.mainLine;

    // If practicing a Black opening, play White's first book move automatically
    if (mode === 'practice' && opening.side === 'b' && line.length > 0) {
      const firstParsed = parseUciMove(line[0].uci);
      if (firstParsed) {
        startChess.move(firstParsed);
        nextIdx = 1;
      }
    }

    setFen(startChess.fen());
    setStepIndex(nextIdx);
    setHadMistakeInRun(false);
    setLastMoveEval(null);
    setFeedbackTr(
      mode === 'practice'
        ? `Hafızadan Pratik Modu: ${
            opening.side === 'w' ? 'Beyaz' : 'Siyah'
          } taşlarla açılışın doğru hamlesini tahtada oyna!`
        : line[0]?.explanationTr ?? ''
    );
  };

  const handleSelectOpening = (opening: OpeningCurriculumItem) => {
    setSelectedOpeningId(opening.id);
    setSelectedAltId(opening.alternativeResponses[0]?.id ?? null);
    resetLineToStart(trainerMode, opening);
  };

  const handleStepWatchForward = () => {
    if (stepIndex >= activeLine.length) return;
    const step = activeLine[stepIndex];
    const parsed = parseUciMove(step.uci);
    if (!parsed) return;
    const res = tryMakeMove(fen, parsed);
    if (res.ok && res.nextFen && res.move) {
      setFen(res.nextFen);
      setStepIndex(stepIndex + 1);
      setFeedbackTr(`${stepIndex + 1}. adım (${step.san}): ${step.explanationTr}`);
      soundService.play('move');
    }
  };

  const handleBoardMove = (move: Move, beforeFen: string, afterFen: string) => {
    const expectedStep = activeLine[stepIndex];
    const coaching = evaluatePlayedMove({
      beforeFen,
      afterFen,
      move,
      moveNumber: Math.floor(stepIndex / 2) + 1,
    });
    setLastMoveEval(coaching);

    if (!expectedStep) {
      setFen(afterFen);
      return;
    }

    const playedUci = formatMoveUci(move);
    if (playedUci === expectedStep.uci) {
      soundService.play('success');
      let nextFen = afterFen;
      let nextStepIdx = stepIndex + 1;
      let msg = `Doğru! ${expectedStep.san}: ${expectedStep.explanationTr}`;

      // In practice mode, automatically play the opponent's book reply if available
      if (trainerMode === 'practice' && nextStepIdx < activeLine.length) {
        const oppStep = activeLine[nextStepIdx];
        const oppParsed = parseUciMove(oppStep.uci);
        if (oppParsed) {
          const oppRes = tryMakeMove(nextFen, oppParsed);
          if (oppRes.ok && oppRes.nextFen) {
            nextFen = oppRes.nextFen;
            msg += ` | Rakip cevabı (${oppStep.san}): ${oppStep.explanationTr}`;
            nextStepIdx += 1;
          }
        }
      }

      setFen(nextFen);
      setStepIndex(nextStepIdx);
      setFeedbackTr(msg);

      if (nextStepIdx >= activeLine.length) {
        recordOpeningPractice({
          openingId: selectedOpening.id,
          perfectRun: !hadMistakeInRun,
        });
        setFeedbackTr(
          `Tebrikler! ${selectedOpening.nameTr} varyantını başarıyla tamamladın. İlerlemen kaydedildi.`
        );
      }
    } else {
      soundService.play('error');
      setHadMistakeInRun(true);
      recordOpeningPractice({
        openingId: selectedOpening.id,
        perfectRun: false,
        missedStepIndex: stepIndex,
      });
      setFeedbackTr(
        `Bu açılış varyantında beklenen hamle ${expectedStep.san} idi. Çünkü: ${expectedStep.explanationTr} Tekrar denemek için hamle geri alındı.`
      );
      setTimeout(() => {
        setFen(beforeFen);
      }, 1100);
    }
  };

  const currentExpectedMoveArrow: [Square, Square, string?][] = useMemo(() => {
    if (trainerMode === 'practice') return [];
    const step = activeLine[stepIndex];
    if (!step) return [];
    const parsed = parseUciMove(step.uci);
    if (!parsed) return [];
    return [[parsed.from, parsed.to, '#10b981']];
  }, [trainerMode, activeLine, stepIndex]);

  const visibleOpenings = OPENINGS_DATA.filter(
    (o) => sideFilter === 'all' || o.side === sideFilter
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-navy-900/90 border border-slate-800 rounded-2xl p-4">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-emerald-400" />
            Açılış Akademisi (ECO Doğrulamalı Repertuvar)
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Açılışları ezber diziler olarak değil, her hamlenin arkasındaki stratejik fikir ve planlarla öğrenin.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {(
            [
              { id: 'all', label: 'Tümü (12)' },
              { id: 'w', label: 'Beyaz Açılışları (6)' },
              { id: 'b', label: 'Siyah Savunmaları (6)' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSideFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                sideFilter === tab.id
                  ? 'bg-emerald-500 text-navy-950 border-emerald-400'
                  : 'bg-navy-950 text-slate-300 border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Opening List */}
        <div className="lg:col-span-3 rounded-2xl bg-navy-900/90 border border-slate-800 overflow-hidden">
          <div className="p-3 border-b border-slate-800 bg-navy-950/60 text-xs font-bold text-slate-300 uppercase">
            Açılış Kütüphanesi
          </div>
          <div className="max-h-[680px] scrollable-panel divide-y divide-slate-800/70">
            {visibleOpenings.map((op) => {
              const prog = openingProgress[op.id];
              const isSelected = op.id === selectedOpening.id;
              return (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => handleSelectOpening(op)}
                  className={`w-full text-left p-3 transition flex items-start justify-between gap-2 ${
                    isSelected
                      ? 'bg-emerald-500/15 border-l-4 border-l-emerald-400'
                      : 'hover:bg-navy-800/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-navy-950 text-emerald-400 border border-slate-700">
                        {op.eco}
                      </span>
                      <span className="text-xs font-semibold text-slate-100">
                        {op.nameTr}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-1">
                      {op.startingMovesSan}
                    </div>
                  </div>
                  {prog && prog.masteryScore > 0 && (
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-0.5 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />%{prog.masteryScore}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Center: Interactive Opening Board & Strategic Guide */}
        <div className="lg:col-span-5 space-y-4">
          {/* Mode Selector Bar */}
          <div className="rounded-2xl bg-navy-900/95 border border-slate-800 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    ECO {selectedOpening.eco}
                  </span>
                  <h2 className="text-base font-bold text-slate-100">
                    {selectedOpening.nameTr}
                  </h2>
                </div>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  {selectedOpening.startingMovesSan}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setTrainerMode('watch');
                    resetLineToStart('watch');
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
                    trainerMode === 'watch'
                      ? 'bg-emerald-500 text-navy-950 border-emerald-400'
                      : 'bg-navy-800 text-slate-300 border-slate-700'
                  }`}
                >
                  <Play className="w-3 h-3 inline mr-1" />
                  Ana Varyantı İzle
                </button>
                <button
                  type="button"
                  data-testid="opening-practice-mode-btn"
                  onClick={() => {
                    setTrainerMode('practice');
                    resetLineToStart('practice');
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
                    trainerMode === 'practice'
                      ? 'bg-amber-500 text-navy-950 border-amber-400'
                      : 'bg-navy-800 text-slate-300 border-slate-700'
                  }`}
                >
                  <Target className="w-3 h-3 inline mr-1" />
                  Hafızadan Pratik Yap
                </button>
                {selectedOpening.alternativeResponses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setTrainerMode('alternatives');
                      resetLineToStart('alternatives');
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
                      trainerMode === 'alternatives'
                        ? 'bg-sky-500 text-navy-950 border-sky-400'
                        : 'bg-navy-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    Alternatif Cevaplar
                  </button>
                )}
              </div>
            </div>

            {/* Step Controls & Live Purpose Feedback */}
            <div className="p-3 rounded-xl bg-navy-950/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-400">
                  Adım {stepIndex} / {activeLine.length}
                </span>
                <div className="flex items-center gap-2">
                  {trainerMode !== 'practice' && (
                    <button
                      type="button"
                      onClick={handleStepWatchForward}
                      disabled={stepIndex >= activeLine.length}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-navy-950 font-semibold text-xs transition"
                    >
                      <StepForward className="w-3.5 h-3.5" />
                      Sonraki Hamleyi Göster
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => resetLineToStart(trainerMode)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-200 text-xs border border-slate-700"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Başa Al
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">{feedbackTr}</p>
            </div>

            <InteractiveChessboard
              fen={fen}
              orientation={selectedOpening.side === 'w' ? 'white' : 'black'}
              onMove={handleBoardMove}
              onRestart={() => resetLineToStart(trainerMode)}
              customArrows={currentExpectedMoveArrow}
            />
          </div>

          {/* Strategic Ideas, Plans & Common Mistakes */}
          <div className="rounded-2xl bg-navy-900/95 border border-slate-800 p-4 space-y-3 text-xs">
            <div>
              <h3 className="font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
                <Compass className="w-4 h-4" /> Temel Fikirler ve Tipik Planlar
              </h3>
              <ul className="list-disc list-inside text-slate-300 space-y-1">
                {selectedOpening.mainIdeasTr.map((idea, idx) => (
                  <li key={idx}>{idea}</li>
                ))}
                {selectedOpening.typicalPlansTr.map((plan, idx) => (
                  <li key={`plan-${idx}`}>{plan}</li>
                ))}
              </ul>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <h3 className="font-bold text-amber-400 flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-4 h-4" /> Sık Yapılan Hatalar ve Taktik Temalar
              </h3>
              <ul className="list-disc list-inside text-slate-300 space-y-1">
                {selectedOpening.commonMistakesTr.map((m, idx) => (
                  <li key={idx}>{m}</li>
                ))}
                {selectedOpening.tacticalThemesTr.map((t, idx) => (
                  <li key={`theme-${idx}`}>{t}</li>
                ))}
              </ul>
            </div>

            <div className="pt-2 border-t border-slate-800 text-slate-400">
              <strong className="text-slate-200">Tipik Piyon Yapısı:</strong>{' '}
              {selectedOpening.pawnStructureTr}
            </div>
          </div>
        </div>

        {/* Right: Contextual Coach */}
        <div className="lg:col-span-4 h-[740px]">
          <CoachAssistantPanel
            fen={fen}
            lastMoveEval={lastMoveEval}
            openingNameTr={selectedOpening.nameTr}
            openingIdeaTr={selectedOpening.mainIdeasTr[0]}
          />
        </div>
      </div>
    </div>
  );
};
