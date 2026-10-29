import React, { useMemo } from 'react';
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  Flame,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import { LESSON_MODULES, LESSONS_DATA } from '@/data/lessonsData';
import { OPENINGS_DATA } from '@/data/openingsData';
import { PUZZLE_THEMES } from '@/data/puzzlesData';
import { useAcademyStore } from '@/stores/useAcademyStore';

const WEAKNESS_LABELS_TR: Record<string, string> = {
  hanging_pieces: 'Savunmasız (Askıda) Taş Bırakma',
  early_queen: 'Erken Vezir Gelişimi',
  center_control: 'Merkez Kontrolü Zayıflığı',
  back_rank: 'Arka Yatay Zayıflığı',
  pins: 'Açmaza Girme (Pin)',
  missed_mate: 'Kaçırılan Mat Fırsatı',
  king_safety: 'Şah Güvenliği İhlali',
};

export const ProgressAnalyticsView: React.FC = () => {
  const {
    lessonProgress,
    openingProgress,
    puzzleAttempts,
    savedGames,
    weaknessCounts,
    studyMinutesTotal,
  } = useAcademyStore();

  const moduleBreakdown = useMemo(
    () =>
      LESSON_MODULES.map((mod) => {
        const lessons = LESSONS_DATA.filter((l) => l.moduleId === mod.id);
        const completed = lessons.filter((l) => lessonProgress[l.id]?.completed).length;
        const pct = lessons.length > 0 ? Math.round((completed / lessons.length) * 100) : 0;
        return {
          ...mod,
          total: lessons.length,
          completed,
          pct,
        };
      }),
    [lessonProgress]
  );

  const puzzleThemeStats = useMemo(() => {
    const themes = PUZZLE_THEMES.filter((t) => t.id !== 'all');
    return themes.map((t) => {
      const attempts = puzzleAttempts.filter((a) => a.theme === t.id);
      const solved = attempts.filter((a) => a.solved).length;
      const pct = attempts.length > 0 ? Math.round((solved / attempts.length) * 100) : null;
      return {
        id: t.id,
        labelTr: t.labelTr,
        attempts: attempts.length,
        solved,
        pct,
      };
    });
  }, [puzzleAttempts]);

  const weaknessEntries = useMemo(
    () =>
      Object.entries(weaknessCounts)
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1]),
    [weaknessCounts]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-navy-900/90 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            Gelişim Raporu ve Gerçek Veri Analitiği
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Tüm grafikler yalnızca tamamladığınız gerçek ders, bulmaca ve oyun verilerinden üretilir.
          </p>
        </div>

        <div className="text-xs text-slate-300 bg-navy-950 px-3.5 py-2 rounded-xl border border-slate-800">
          Toplam Çalışma: <strong className="text-emerald-400">{studyMinutesTotal} dakika</strong> •{' '}
          Oyun Sayısı: <strong className="text-amber-400">{savedGames.length}</strong>
        </div>
      </div>

      {/* Module Progress Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl bg-navy-900/95 border border-slate-800 p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            Modüllere Göre Müfredat İlerlemesi
          </h2>
          <div className="space-y-3">
            {moduleBreakdown.map((mod) => (
              <div key={mod.id} className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">
                    {mod.code}: {mod.titleTr}
                  </span>
                  <span className="text-emerald-400 font-mono">
                    {mod.completed} / {mod.total} (%{mod.pct})
                  </span>
                </div>
                <div className="w-full h-2.5 bg-navy-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${mod.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mistake Categories Chart */}
        <div className="rounded-2xl bg-navy-900/95 border border-slate-800 p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            Tekrarlayan Hata Kategorileri
          </h2>
          {weaknessEntries.length === 0 ? (
            <div className="h-48 rounded-xl bg-navy-950/60 border border-slate-800 flex items-center justify-center p-6 text-center text-xs text-slate-400">
              Henüz kaydedilmiş bir taktik veya konumsal zayıflık verisi bulunmuyor. Stockfish ile oyun oynadıkça veya analiz yaptıkça gerçek hata dağılımınız burada grafiklenecektir.
            </div>
          ) : (
            <div className="space-y-3">
              {weaknessEntries.map(([tag, count]) => {
                const maxCount = weaknessEntries[0][1] || 1;
                const widthPct = Math.round((count / maxCount) * 100);
                return (
                  <div key={tag} className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-200">
                      <span>{WEAKNESS_LABELS_TR[tag] ?? tag}</span>
                      <span className="text-amber-400 font-bold">{count} kez</span>
                    </div>
                    <div className="w-full h-2.5 bg-navy-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-amber-500"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Puzzle Accuracy by Theme & Opening Mastery */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl bg-navy-900/95 border border-slate-800 p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Taktik Temalara Göre Bulmaca Başarısı
          </h2>
          {puzzleAttempts.length === 0 ? (
            <div className="h-44 rounded-xl bg-navy-950/60 border border-slate-800 flex items-center justify-center p-6 text-center text-xs text-slate-400">
              Henüz bulmaca denemesi yapılmadı. Taktik Bulmacalar bölümünde çözdüğünüz her soru temasına göre burada raporlanır.
            </div>
          ) : (
            <div className="space-y-2.5">
              {puzzleThemeStats.map((stat) => (
                <div
                  key={stat.id}
                  className="p-2.5 rounded-xl bg-navy-950 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <span className="text-slate-200 font-medium">{stat.labelTr}</span>
                  <span className="text-slate-400">
                    {stat.attempts > 0 ? (
                      <>
                        {stat.solved}/{stat.attempts} çözüldü (
                        <strong className="text-emerald-400">%{stat.pct}</strong>)
                      </>
                    ) : (
                      'Deneme yok'
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-navy-900/95 border border-slate-800 p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Flame className="w-4 h-4 text-sky-400" />
            Açılış Repertuvarı Ustalık Tablosu
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {OPENINGS_DATA.map((op) => {
              const prog = openingProgress[op.id];
              return (
                <div
                  key={op.id}
                  className="p-2.5 rounded-xl bg-navy-950 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="truncate pr-2">
                    <div className="font-semibold text-slate-200 truncate">
                      {op.nameTr}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {prog ? `${prog.practicedCount} pratik` : 'Henüz çalışılmadı'}
                    </div>
                  </div>
                  <span
                    className={`font-mono font-bold ${
                      prog && prog.masteryScore > 0
                        ? 'text-emerald-400'
                        : 'text-slate-600'
                    }`}
                  >
                    %{prog?.masteryScore ?? 0}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
