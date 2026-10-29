import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BookMarked,
  BookOpen,
  Clock,
  Compass,
  Flame,
  Play,
  Puzzle,
  Sparkles,
  Swords,
  Target,
} from 'lucide-react';
import {
  generatePersonalizedRecommendations,
  useAcademyStore,
} from '@/stores/useAcademyStore';
import { LESSONS_DATA } from '@/data/lessonsData';
import { OPENINGS_DATA } from '@/data/openingsData';

export const DashboardView: React.FC = () => {
  const {
    user,
    lessonProgress,
    openingProgress,
    puzzleAttempts,
    savedGames,
    weaknessCounts,
    studyMinutesTotal,
  } = useAcademyStore();

  const completedLessonsCount = useMemo(
    () => Object.values(lessonProgress).filter((l) => l.completed).length,
    [lessonProgress]
  );

  const nextLesson = useMemo(
    () => LESSONS_DATA.find((l) => !lessonProgress[l.id]?.completed) ?? LESSONS_DATA[0],
    [lessonProgress]
  );

  const solvedPuzzlesCount = useMemo(
    () => puzzleAttempts.filter((p) => p.solved).length,
    [puzzleAttempts]
  );

  const puzzleSuccessRate = useMemo(() => {
    if (puzzleAttempts.length === 0) return null;
    return Math.round((solvedPuzzlesCount / puzzleAttempts.length) * 100);
  }, [puzzleAttempts, solvedPuzzlesCount]);

  const recommendations = useMemo(
    () =>
      generatePersonalizedRecommendations({
        lessonProgress,
        openingProgress,
        puzzleAttempts,
        savedGames,
        weaknessCounts,
      }),
    [lessonProgress, openingProgress, puzzleAttempts, savedGames, weaknessCounts]
  );

  const practicedOpenings = useMemo(
    () =>
      OPENINGS_DATA.map((op) => ({
        opening: op,
        progress: openingProgress[op.id],
      })).filter((item) => item.progress && item.progress.practicedCount > 0),
    [openingProgress]
  );

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-900 via-navy-900 to-emerald-950/50 border border-slate-800/90 p-6 sm:p-8 shadow-2xl">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Sabırlı ve Bilgili İnteraktif Satranç Eğitmeniniz
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            Hoş geldin, {user.displayName}!
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Satranç Akademisi; hamlelerini gerçek tahta analizine dayanarak Türkçe açıklayan, zayıf yönlerini takip eden ve sıfırdan ileri seviyeye yapılandırılmış müfredat sunan kişisel satranç okulundur.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              to={`/lessons?id=${nextLesson.id}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-navy-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition"
            >
              <Play className="w-4 h-4" />
              Öğrenmeye Devam Et: {nextLesson.titleTr}
            </Link>
            <Link
              to="/play"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 text-slate-100 font-semibold text-xs border border-slate-700 transition"
            >
              <Swords className="w-4 h-4 text-amber-400" />
              Stockfish ile Hızlı Maç
            </Link>
            <Link
              to="/tactics"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 text-slate-100 font-semibold text-xs border border-slate-700 transition"
            >
              <Puzzle className="w-4 h-4 text-emerald-400" />
              Günün Taktik Bulmacası
            </Link>
          </div>
        </div>
      </div>

      {/* Real-Data KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-navy-900/90 border border-slate-800 p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Tamamlanan Dersler</div>
            <div className="text-2xl font-extrabold text-slate-100 mt-1">
              {completedLessonsCount}{' '}
              <span className="text-sm font-normal text-slate-400">
                / {LESSONS_DATA.length}
              </span>
            </div>
            <div className="text-[11px] text-emerald-400 mt-1">
              %{Math.round((completedLessonsCount / LESSONS_DATA.length) * 100)} Müfredat İlerlemesi
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-2xl bg-navy-900/90 border border-slate-800 p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Bulmaca Başarısı</div>
            <div className="text-2xl font-extrabold text-slate-100 mt-1">
              {puzzleSuccessRate !== null ? `%${puzzleSuccessRate}` : '—'}
            </div>
            <div className="text-[11px] text-amber-400 mt-1">
              {puzzleAttempts.length > 0
                ? `${solvedPuzzlesCount} / ${puzzleAttempts.length} başarılı deneme`
                : 'Henüz bulmaca çözülmedi'}
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Target className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-2xl bg-navy-900/90 border border-slate-800 p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Çalışılan Açılışlar</div>
            <div className="text-2xl font-extrabold text-slate-100 mt-1">
              {practicedOpenings.length}{' '}
              <span className="text-sm font-normal text-slate-400">
                / {OPENINGS_DATA.length}
              </span>
            </div>
            <div className="text-[11px] text-sky-400 mt-1">
              Beyaz ve Siyah Repertuvarı
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <BookMarked className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-2xl bg-navy-900/90 border border-slate-800 p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Toplam Çalışma Süresi</div>
            <div className="text-2xl font-extrabold text-slate-100 mt-1">
              {studyMinutesTotal} <span className="text-sm font-normal text-slate-400">dk</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {savedGames.length} kayıtlı antrenman maçı
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Personalized Rule-Based Coach Recommendations & Today's Focus */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 rounded-2xl bg-navy-900/95 border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-400" />
              Kişiselleştirilmiş Koç Önerileri
            </h2>
            <span className="text-[11px] text-slate-400">
              Gerçek oyun ve ders verilerinden üretilir
            </span>
          </div>

          <div className="space-y-3">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="p-3.5 rounded-xl bg-navy-950/90 border border-slate-800/90 flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                        rec.priority === 'high'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {rec.priority === 'high' ? 'Öncelikli Odak' : 'Önerilen Adım'}
                    </span>
                    <h3 className="text-xs font-bold text-slate-100">{rec.titleTr}</h3>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {rec.messageTr}
                  </p>
                </div>
                <Link
                  to={rec.actionRoute}
                  className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition"
                >
                  Başla <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Recent Games & Opening Progress */}
        <div className="lg:col-span-5 space-y-5">
          <div className="rounded-2xl bg-navy-900/95 border border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                Son Oynanan Antrenman Oyunları
              </h2>
              <Link to="/play" className="text-xs text-emerald-400 hover:underline">
                Yeni Maç →
              </Link>
            </div>

            {savedGames.length === 0 ? (
              <div className="p-4 rounded-xl bg-navy-950/60 border border-slate-800/80 text-xs text-slate-400 text-center">
                Henüz tamamlanmış bir Stockfish maçı yok. İlk antrenman oyununu oynadığında hamle analizlerin burada listelenecek.
              </div>
            ) : (
              <div className="space-y-2">
                {savedGames.slice(0, 4).map((g) => (
                  <div
                    key={g.id}
                    className="p-2.5 rounded-xl bg-navy-950 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span
                        className={`font-bold ${
                          g.result === 'win'
                            ? 'text-emerald-400'
                            : g.result === 'loss'
                            ? 'text-red-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {g.resultReasonTr}
                      </span>
                      <div className="text-[11px] text-slate-400">
                        Seviye {g.difficultyLevel} • {g.moveCount} hamle • {g.blunders} büyük hata
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {new Date(g.date).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-navy-900/95 border border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Flame className="w-4 h-4 text-emerald-400" />
                Açılış Akademisi Hakimiyeti
              </h2>
              <Link to="/openings" className="text-xs text-emerald-400 hover:underline">
                Tümünü Gör →
              </Link>
            </div>

            {practicedOpenings.length === 0 ? (
              <div className="p-4 rounded-xl bg-navy-950/60 border border-slate-800/80 text-xs text-slate-400 text-center">
                Henüz pratik yapılmış bir açılış yok. İtalyan Açılışı veya Sicilya Savunması ile hemen başlayabilirsin.
              </div>
            ) : (
              <div className="space-y-2">
                {practicedOpenings.slice(0, 3).map(({ opening, progress }) => (
                  <div key={opening.id} className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-200">
                      <span>{opening.nameTr}</span>
                      <span className="text-emerald-400 font-semibold">
                        %{progress.masteryScore}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-navy-950 overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${progress.masteryScore}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
