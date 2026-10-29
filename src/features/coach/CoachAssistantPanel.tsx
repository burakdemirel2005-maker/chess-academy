import React, { useState } from 'react';
import { Square } from 'chess.js';
import {
  Bot,
  Compass,
  HelpCircle,
  Lightbulb,
  MessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  CoachFeedbackLevel,
  MoveCoachingEvaluation,
} from './coachEngine';
import { generateSmartHint, HintLevel, SmartHint } from './hintSystem';
import {
  answerContextualQuestion,
  AssistantResponse,
  SUPPORTED_QUESTIONS_TR,
} from './contextualAssistant';
import { EngineAnalysisResult } from '@/engine/chessEngineAdapter';
import { useAcademyStore } from '@/stores/useAcademyStore';

export interface CoachAssistantPanelProps {
  fen: string;
  lastMoveEval: MoveCoachingEvaluation | null;
  engineResult?: EngineAnalysisResult | null;
  openingNameTr?: string;
  openingIdeaTr?: string;
  onHighlightBoard?: (squares: Square[], arrows: [Square, Square, string?][]) => void;
  hintsAllowed?: boolean;
  onHintUsed?: (level: HintLevel) => void;
}

const CLASSIFICATION_STYLES: Record<string, string> = {
  best: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  excellent: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
  good: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  inaccuracy: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  mistake: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  blunder: 'bg-red-500/20 text-red-300 border-red-500/40',
};

export const CoachAssistantPanel: React.FC<CoachAssistantPanelProps> = ({
  fen,
  lastMoveEval,
  engineResult,
  openingNameTr,
  openingIdeaTr,
  onHighlightBoard,
  hintsAllowed = true,
  onHintUsed,
}) => {
  const { coachLevel, setCoachLevel } = useAcademyStore();
  const [activeHint, setActiveHint] = useState<SmartHint | null>(null);
  const [chatHistory, setChatHistory] = useState<AssistantResponse[]>([]);
  const [questionInput, setQuestionInput] = useState('');

  const handleRequestHint = (level: HintLevel) => {
    if (!hintsAllowed) return;
    const hint = generateSmartHint(fen, level, engineResult ?? undefined);
    setActiveHint(hint);
    onHintUsed?.(level);
    onHighlightBoard?.(hint.highlightSquares, hint.arrows);
  };

  const handleAskQuestion = (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed) return;
    const response = answerContextualQuestion({
      query: trimmed,
      fen,
      lastMoveEval,
      engineResult,
      openingNameTr,
      openingIdeaTr,
    });
    setChatHistory((prev) => [response, ...prev.slice(0, 7)]);
    setQuestionInput('');
    onHighlightBoard?.(response.highlightSquares, response.arrows);
  };

  // IME-safe Enter key handler following modern-web-guidance `ime-safe-enter-submit`
  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (event.nativeEvent.isComposing || event.keyCode === 229) {
        return;
      }
      handleAskQuestion(questionInput);
    }
  };

  return (
    <aside
      aria-label="İnteraktif Satranç Koçu ve Asistan"
      className="flex flex-col h-full rounded-2xl bg-navy-900/95 border border-slate-800/90 shadow-xl overflow-hidden"
    >
      {/* Header & Explanation Level Selector */}
      <div className="p-4 border-b border-slate-800 bg-navy-950/60 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">Satranç Koçu</h2>
            <p className="text-[11px] text-slate-400">
              Deterministik Pozisyon & Taktik Analizi
            </p>
          </div>
        </div>

        {/* 3 Coach Feedback Levels */}
        <div
          className="flex items-center rounded-lg bg-navy-800 p-0.5 border border-slate-700"
          role="group"
          aria-label="Koç Açıklama Seviyesi"
        >
          {(
            [
              { id: 'beginner', label: 'Başlangıç' },
              { id: 'intermediate', label: 'Orta' },
              { id: 'advanced', label: 'İleri' },
            ] as { id: CoachFeedbackLevel; label: string }[]
          ).map((lvl) => (
            <button
              key={lvl.id}
              type="button"
              onClick={() => setCoachLevel(lvl.id)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition ${
                coachLevel === lvl.id
                  ? 'bg-emerald-500 text-navy-950 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {lvl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 scrollable-panel p-4 space-y-4">
        {/* Last Move Evaluation Card */}
        {lastMoveEval ? (
          <div
            data-testid="coach-move-evaluation"
            className="rounded-xl bg-navy-800/90 border border-slate-700/80 p-3.5 space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-navy-950 text-slate-200 border border-slate-700">
                  {lastMoveEval.moveNumber}. {lastMoveEval.moveSan}
                </span>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                    CLASSIFICATION_STYLES[lastMoveEval.classification] ?? ''
                  }`}
                >
                  {lastMoveEval.classificationLabelTr}
                </span>
              </div>
              {lastMoveEval.bestMoveSan &&
                lastMoveEval.classification !== 'best' && (
                  <span className="text-[11px] text-emerald-300 font-medium">
                    En iyi: <strong>{lastMoveEval.bestMoveSan}</strong>
                  </span>
                )}
            </div>

            <p className="text-xs leading-relaxed text-slate-200">
              {lastMoveEval.explanations[coachLevel]}
            </p>

            {/* Verified Tactical Facts */}
            {lastMoveEval.tacticalFacts.length > 0 && (
              <div className="pt-1.5 border-t border-slate-700/60 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Doğrulanmış Taktik Bulgular
                </span>
                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                  {lastMoveEval.tacticalFacts.map((fact, idx) => (
                    <li key={idx}>{fact.descriptionTr}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Candidate Variations for Intermediate/Advanced */}
            {coachLevel !== 'beginner' && lastMoveEval.candidateLines.length > 0 && (
              <div className="pt-1.5 border-t border-slate-700/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Motor Aday Varyantları (MultiPV)
                </span>
                <div className="space-y-1">
                  {lastMoveEval.candidateLines.slice(0, 2).map((line, idx) => (
                    <div
                      key={idx}
                      className="text-[11px] font-mono bg-navy-950/80 px-2 py-1 rounded text-slate-300 flex items-center justify-between"
                    >
                      <span>{line.sanLine.join(' ')}</span>
                      <span className="text-emerald-400 ml-2">
                        {line.scoreMateWhite !== null
                          ? `#${line.scoreMateWhite}`
                          : `${((line.scoreCpWhite ?? 0) / 100).toFixed(2)}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl bg-navy-800/50 border border-slate-800 p-3.5 text-xs text-slate-300 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-200 mb-0.5">
                Koç Hazır — Hamleni Yap veya İpucu İste
              </p>
              <p className="text-slate-400">
                Tahtada bir hamle yaptığında koçun o hamleyi önceki ve sonraki pozisyonlarla karşılaştırarak Türkçe açıklamasını burada göreceksin.
              </p>
            </div>
          </div>
        )}

        {/* 3-Level Smart Hint System */}
        {hintsAllowed && (
          <div className="rounded-xl bg-navy-800/60 border border-slate-800 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4" /> Kademeli Akıllı İpucu Sistemi
              </span>
              <span className="text-[11px] text-slate-400">Ezber değil, anlayarak çözüm</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                data-testid="hint-level-1-btn"
                onClick={() => handleRequestHint(1)}
                className="px-2 py-1.5 rounded-lg bg-navy-900 hover:bg-navy-700 border border-slate-700 text-[11px] font-medium text-slate-200 transition"
              >
                1. Kavramsal
              </button>
              <button
                type="button"
                data-testid="hint-level-2-btn"
                onClick={() => handleRequestHint(2)}
                className="px-2 py-1.5 rounded-lg bg-navy-900 hover:bg-navy-700 border border-slate-700 text-[11px] font-medium text-amber-200 transition"
              >
                2. Yönlendirici
              </button>
              <button
                type="button"
                data-testid="hint-level-3-btn"
                onClick={() => handleRequestHint(3)}
                className="px-2 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-[11px] font-semibold text-emerald-300 transition"
              >
                3. Hamleyi Göster
              </button>
            </div>

            {activeHint && (
              <div
                data-testid="active-hint-box"
                className="p-2.5 rounded-lg bg-navy-950/90 border border-amber-500/30 text-xs space-y-1"
              >
                <div className="font-semibold text-amber-300">{activeHint.titleTr}</div>
                <p className="text-slate-200 leading-relaxed">{activeHint.messageTr}</p>
              </div>
            )}
          </div>
        )}

        {/* Contextual Rule-Based Assistant Questions */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span>Pozisyon Asistanına Sor</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {SUPPORTED_QUESTIONS_TR.slice(0, 8).map((q) => (
              <button
                key={q.intent}
                type="button"
                onClick={() => handleAskQuestion(q.label)}
                className="px-2.5 py-1 rounded-full bg-navy-800 hover:bg-emerald-500/20 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-200 border border-slate-700/80 text-[11px] transition"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {/* Assistant Responses */}
        {chatHistory.length > 0 && (
          <div className="space-y-2.5 pt-1" data-testid="assistant-messages">
            {chatHistory.map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-navy-950/90 border border-slate-800 p-3 space-y-2 text-xs"
              >
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.questionTr}</span>
                </div>
                <p className="text-slate-200 leading-relaxed">{item.answerTr}</p>
                {item.bulletPointsTr.length > 0 && (
                  <ul className="list-disc list-inside text-slate-300 space-y-1 text-[11px]">
                    {item.bulletPointsTr.map((b, bIdx) => (
                      <li key={bIdx}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assistant Question Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAskQuestion(questionInput);
        }}
        className="p-3 border-t border-slate-800 bg-navy-950/80 flex items-center gap-2"
      >
        <label htmlFor="coach-question-input" className="sr-only">
          Koça pozisyon hakkında soru sorun
        </label>
        <div className="relative flex-1">
          <MessageSquare className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="coach-question-input"
            type="text"
            value={questionInput}
            onChange={(e) => setQuestionInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Örn: Şimdi ne yapmalıyım? / Hangi taşım tehdit altında?"
            className="w-full pl-8 pr-3 py-2 rounded-xl bg-navy-900 border border-slate-700 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-navy-950 font-semibold text-xs transition"
        >
          <Send className="w-3.5 h-3.5" />
          Sor
        </button>
      </form>
    </aside>
  );
};
