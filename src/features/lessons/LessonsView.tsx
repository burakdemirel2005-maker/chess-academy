import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Move, Square } from 'chess.js';
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Play,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import {
  LESSON_MODULES,
  LessonItem,
  LessonModuleId,
  LESSONS_DATA,
} from '@/data/lessonsData';
import { InteractiveChessboard } from '@/features/chess/InteractiveChessboard';
import { CoachAssistantPanel } from '@/features/coach/CoachAssistantPanel';
import { evaluatePlayedMove, MoveCoachingEvaluation } from '@/features/coach/coachEngine';
import { useAcademyStore } from '@/stores/useAcademyStore';
import { formatMoveUci, parseUciMove, tryMakeMove } from '@/utils/chessUtils';
import { soundService } from '@/services/soundService';

export interface LessonsViewProps {
  defaultModuleFilter?: LessonModuleId | 'all';
}

export const LessonsView: React.FC<LessonsViewProps> = ({
  defaultModuleFilter = 'all',
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { lessonProgress, recordLessonStep } = useAcademyStore();

  const [selectedModule, setSelectedModule] = useState<LessonModuleId | 'all'>(
    defaultModuleFilter
  );

  const filteredLessons = useMemo(() => {
    if (selectedModule === 'all') return LESSONS_DATA;
    return LESSONS_DATA.filter((l) => l.moduleId === selectedModule);
  }, [selectedModule]);

  const paramId = searchParams.get('id');
  const activeLesson: LessonItem = useMemo(() => {
    if (paramId) {
      const found = LESSONS_DATA.find((l) => l.id === paramId);
      if (found) return found;
    }
    return filteredLessons[0] ?? LESSONS_DATA[0];
  }, [paramId, filteredLessons]);

  const [boardFen, setBoardFen] = useState<string>(activeLesson.interactiveTask.fen);
  const [boardArrows, setBoardArrows] = useState<[Square, Square, string?][]>(
    activeLesson.interactiveTask.arrows
  );
  const [boardHighlights, setBoardHighlights] = useState<Square[]>(
    activeLesson.interactiveTask.highlightSquares
  );
  const [lastMoveEval, setLastMoveEval] = useState<MoveCoachingEvaluation | null>(null);
  const [exerciseStatus, setExerciseStatus] = useState<{
    state: 'idle' | 'correct' | 'wrong';
    messageTr: string;
  }>({ state: 'idle', messageTr: '' });

  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);

  useEffect(() => {
    setBoardFen(activeLesson.interactiveTask.fen);
    setBoardArrows(activeLesson.interactiveTask.arrows);
    setBoardHighlights(activeLesson.interactiveTask.highlightSquares);
    setLastMoveEval(null);
    setExerciseStatus({ state: 'idle', messageTr: '' });
    setSelectedQuizOption(null);
    setQuizSubmitted(false);
    setIsPlayingDemo(false);
  }, [activeLesson]);

  const handleSelectLesson = (lesson: LessonItem) => {
    setSearchParams({ id: lesson.id });
  };

  const handlePlayAnimatedDemo = () => {
    if (isPlayingDemo) return;
    setIsPlayingDemo(true);
    setBoardFen(activeLesson.demoFen);
    setExerciseStatus({
      state: 'idle',
      messageTr: 'Örnek hamle dizisi tahta üzerinde gösteriliyor...',
    });

    let currentFen = activeLesson.demoFen;
    activeLesson.demoMovesUci.forEach((uci, idx) => {
      setTimeout(() => {
        const parsed = parseUciMove(uci);
        if (parsed) {
          const res = tryMakeMove(currentFen, parsed);
          if (res.ok && res.nextFen) {
            currentFen = res.nextFen;
            setBoardFen(currentFen);
            soundService.play('move');
          }
        }
        if (idx === activeLesson.demoMovesUci.length - 1) {
          setTimeout(() => {
            setBoardFen(activeLesson.interactiveTask.fen);
            setIsPlayingDemo(false);
            setExerciseStatus({
              state: 'idle',
              messageTr: 'Örnek tamamlandı! Şimdi sıra senin interaktif uygulamanı yapmanda.',
            });
          }, 1100);
        }
      }, (idx + 1) * 750);
    });
  };

  const handleBoardMove = (move: Move, beforeFen: string, afterFen: string) => {
    const uci = formatMoveUci(move);
    const coaching = evaluatePlayedMove({
      beforeFen,
      afterFen,
      move,
      moveNumber: 1,
    });
    setLastMoveEval(coaching);

    const isAccepted =
      activeLesson.interactiveTask.acceptedMovesUci.includes(uci) ||
      activeLesson.interactiveTask.acceptedMovesUci.includes(`${move.from}${move.to}`);

    if (isAccepted) {
      setBoardFen(afterFen);
      soundService.play('success');
      setExerciseStatus({
        state: 'correct',
        messageTr: activeLesson.interactiveTask.successFeedbackTr,
      });
      recordLessonStep({
        lessonId: activeLesson.id,
        interactivePassed: true,
      });
    } else {
      setBoardFen(afterFen);
      soundService.play('error');
      setExerciseStatus({
        state: 'wrong',
        messageTr: `${activeLesson.interactiveTask.mistakeFeedbackTr} (${coaching.explanations.beginner})`,
      });
      // Reset back to exercise FEN after a short pause so learner can try again immediately
      setTimeout(() => {
        setBoardFen(activeLesson.interactiveTask.fen);
      }, 1400);
    }
  };

  const handleQuizSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedQuizOption === null) return;
    setQuizSubmitted(true);
    const isCorrect = selectedQuizOption === activeLesson.quiz.correctIndex;
    if (isCorrect) {
      soundService.play('success');
      recordLessonStep({
        lessonId: activeLesson.id,
        quizPassed: true,
      });
    } else {
      soundService.play('error');
    }
  };

  const currentProgress = lessonProgress[activeLesson.id];
  const completedCount = Object.values(lessonProgress).filter((p) => p.completed).length;

  return (
    <div className="space-y-5">
      {/* Top Curriculum Header & Module Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-navy-900/90 border border-slate-800 rounded-2xl p-4">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            Satranç Akademisi Müfredatı (Sıfırdan İleri Seviyeye)
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Her derste kavramı öğrenin, animasyonlu örneği izleyin, tahtada uygulayın ve soruyu yanıtlayın.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-semibold text-emerald-400">
              {completedCount} / {LESSONS_DATA.length} Ders Tamamlandı
            </div>
            <div className="w-36 h-2 bg-navy-950 rounded-full overflow-hidden mt-1 border border-slate-800">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{
                  width: `${Math.round((completedCount / LESSONS_DATA.length) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Module Tabs */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Ders Modülleri">
        <button
          type="button"
          onClick={() => setSelectedModule('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
            selectedModule === 'all'
              ? 'bg-emerald-500 text-navy-950 border-emerald-400'
              : 'bg-navy-900 text-slate-300 border-slate-800 hover:border-slate-700'
          }`}
        >
          Tüm Modüller ({LESSONS_DATA.length})
        </button>
        {LESSON_MODULES.map((mod) => (
          <button
            key={mod.id}
            type="button"
            onClick={() => setSelectedModule(mod.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              selectedModule === mod.id
                ? 'bg-emerald-500 text-navy-950 border-emerald-400'
                : 'bg-navy-900 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            {mod.code}: {mod.titleTr}
          </button>
        ))}
      </div>

      {/* Main 3-Column Layout: Lesson List | Interactive Board & Lesson Content | Coach Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Lesson Curriculum List */}
        <div className="lg:col-span-3 rounded-2xl bg-navy-900/90 border border-slate-800 overflow-hidden">
          <div className="p-3 border-b border-slate-800 bg-navy-950/60 text-xs font-bold text-slate-300 uppercase tracking-wider">
            Ders Listesi ({filteredLessons.length})
          </div>
          <div className="max-h-[680px] scrollable-panel divide-y divide-slate-800/70">
            {filteredLessons.map((lesson) => {
              const prog = lessonProgress[lesson.id];
              const isSelected = lesson.id === activeLesson.id;
              return (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => handleSelectLesson(lesson)}
                  className={`w-full text-left p-3 transition flex items-start justify-between gap-2 ${
                    isSelected
                      ? 'bg-emerald-500/15 border-l-4 border-l-emerald-400'
                      : 'hover:bg-navy-800/60'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-100 truncate">
                      {lesson.titleTr}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {lesson.moduleTitleTr} • {lesson.estimatedMinutes} dk
                    </div>
                  </div>
                  {prog?.completed ? (
                    <CheckCircle2
                      className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5"
                      aria-label="Tamamlandı"
                    />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Center Column: Interactive Board + Lesson Explanation + Quiz */}
        <div className="lg:col-span-5 space-y-4">
          {/* Lesson Concept Card */}
          <div className="rounded-2xl bg-navy-900/95 border border-slate-800 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  {activeLesson.moduleTitleTr} • {activeLesson.difficulty}
                </span>
                <h2 className="text-base font-bold text-slate-100 mt-0.5">
                  {activeLesson.titleTr}
                </h2>
                <p className="text-xs text-slate-400">{activeLesson.subtitleTr}</p>
              </div>

              <button
                type="button"
                onClick={handlePlayAnimatedDemo}
                disabled={isPlayingDemo}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold transition"
              >
                <Play className="w-3.5 h-3.5" />
                {isPlayingDemo ? 'Oynatılıyor...' : 'Örneği Oynat'}
              </button>
            </div>

            <p className="text-xs leading-relaxed text-slate-200">
              {activeLesson.explanationTr}
            </p>

            <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside bg-navy-950/60 p-3 rounded-xl border border-slate-800/80">
              {activeLesson.keyPointsTr.map((pt, i) => (
                <li key={i}>{pt}</li>
              ))}
            </ul>

            {/* Legal vs Illegal Examples */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200">
                <strong className="block text-[11px] uppercase tracking-wider text-emerald-400 mb-0.5">
                  Doğru / Yasal Örnek
                </strong>
                {activeLesson.legalExampleTr}
              </div>
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200">
                <strong className="block text-[11px] uppercase tracking-wider text-red-400 mb-0.5">
                  Hatalı / Kural Dışı Örnek
                </strong>
                {activeLesson.illegalExampleTr}
              </div>
            </div>
          </div>

          {/* Interactive Board Task Prompt */}
          <div className="rounded-2xl bg-navy-900/95 border border-emerald-500/40 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Uygulamalı Tahta Görevi (1. Adım)
              </span>
              {currentProgress?.interactivePassed && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold">
                  Uygulama Tamamlandı ✓
                </span>
              )}
            </div>
            <p className="text-xs text-slate-200 font-medium">
              {activeLesson.interactiveTask.promptTr}
            </p>

            {exerciseStatus.messageTr && (
              <div
                data-testid="lesson-exercise-feedback"
                className={`p-2.5 rounded-xl text-xs font-medium border ${
                  exerciseStatus.state === 'correct'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                    : exerciseStatus.state === 'wrong'
                    ? 'bg-red-500/20 border-red-500/50 text-red-200'
                    : 'bg-navy-800 border-slate-700 text-slate-200'
                }`}
              >
                {exerciseStatus.messageTr}
              </div>
            )}

            <InteractiveChessboard
              fen={boardFen}
              onMove={handleBoardMove}
              onRestart={() => {
                setBoardFen(activeLesson.interactiveTask.fen);
                setExerciseStatus({ state: 'idle', messageTr: '' });
              }}
              customArrows={boardArrows}
              customHighlightSquares={boardHighlights}
            />
          </div>

          {/* Lesson Practice Question (Quiz) */}
          <form
            onSubmit={handleQuizSubmit}
            className="rounded-2xl bg-navy-900/95 border border-slate-800 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Award className="w-4 h-4" /> Pekiştirme Sorusu (2. Adım)
              </span>
              {currentProgress?.quizPassed && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold">
                  Soru Doğru Yanıtlandı ✓
                </span>
              )}
            </div>

            <p className="text-xs font-semibold text-slate-100">
              {activeLesson.quiz.questionTr}
            </p>

            <div className="space-y-2">
              {activeLesson.quiz.optionsTr.map((opt, idx) => (
                <label
                  key={idx}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                    selectedQuizOption === idx
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-slate-100'
                      : 'bg-navy-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name={`quiz-${activeLesson.id}`}
                    checked={selectedQuizOption === idx}
                    onChange={() => {
                      setSelectedQuizOption(idx);
                      setQuizSubmitted(false);
                    }}
                    className="mt-0.5"
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>

            <button
              type="submit"
              disabled={selectedQuizOption === null}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-navy-950 font-semibold text-xs transition"
            >
              Yanıtı Kontrol Et ve Kaydet
            </button>

            {quizSubmitted && selectedQuizOption !== null && (
              <div
                data-testid="lesson-quiz-feedback"
                className={`p-3 rounded-xl border text-xs ${
                  selectedQuizOption === activeLesson.quiz.correctIndex
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                    : 'bg-red-500/15 border-red-500/40 text-red-200'
                }`}
              >
                <div className="font-bold mb-1">
                  {selectedQuizOption === activeLesson.quiz.correctIndex
                    ? 'Tebrikler, doğru yanıt!'
                    : 'Yanlış yanıt — Açıklamayı inceleyip tekrar dene:'}
                </div>
                <p>{activeLesson.quiz.explanationTr}</p>
              </div>
            )}
          </form>
        </div>

        {/* Right Column: Contextual Coach Assistant */}
        <div className="lg:col-span-4 h-[740px]">
          <CoachAssistantPanel
            fen={boardFen}
            lastMoveEval={lastMoveEval}
            onHighlightBoard={(sqs, arrs) => {
              setBoardHighlights(sqs);
              setBoardArrows(arrs);
            }}
          />
        </div>
      </div>
    </div>
  );
};
