import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { DashboardView } from '@/features/progress/DashboardView';

// Route-based code splitting & lazy-loaded educational views (Section 22 Performance)
const loadLessons = () => import('@/features/lessons/LessonsView');
const loadOpenings = () => import('@/features/openings/OpeningsView');
const loadPuzzles = () => import('@/features/tactics/PuzzlesView');
const loadPlay = () => import('@/features/chess/PlayStockfishView');
const loadAnalysis = () => import('@/features/analysis/AnalysisStudioView');
const loadProgress = () => import('@/features/progress/ProgressAnalyticsView');
const loadSettings = () => import('@/features/settings/SettingsSyncView');

const LessonsView = lazy(() => loadLessons().then((m) => ({ default: m.LessonsView })));
const OpeningsView = lazy(() => loadOpenings().then((m) => ({ default: m.OpeningsView })));
const PuzzlesView = lazy(() => loadPuzzles().then((m) => ({ default: m.PuzzlesView })));
const PlayStockfishView = lazy(() =>
  loadPlay().then((m) => ({ default: m.PlayStockfishView }))
);
const AnalysisStudioView = lazy(() =>
  loadAnalysis().then((m) => ({ default: m.AnalysisStudioView }))
);
const ProgressAnalyticsView = lazy(() =>
  loadProgress().then((m) => ({ default: m.ProgressAnalyticsView }))
);
const SettingsSyncView = lazy(() =>
  loadSettings().then((m) => ({ default: m.SettingsSyncView }))
);

export const App: React.FC = () => {
  useEffect(() => {
    // Warm up lazy route modules so offline navigation works seamlessly
    void Promise.allSettled([
      loadLessons(),
      loadOpenings(),
      loadPuzzles(),
      loadPlay(),
      loadAnalysis(),
      loadProgress(),
      loadSettings(),
    ]);
  }, []);

  return (
    <BrowserRouter>
      <AppShell>
        <Suspense
          fallback={
            <div
              role="progressbar"
              aria-label="Sayfa yükleniyor"
              className="h-96 flex items-center justify-center text-sm text-emerald-400 font-semibold"
            >
              Satranç Akademisi modülü yükleniyor...
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<DashboardView />} />
            <Route path="/lessons" element={<LessonsView defaultModuleFilter="all" />} />
            <Route path="/openings" element={<OpeningsView />} />
            <Route path="/tactics" element={<PuzzlesView />} />
            <Route
              path="/endgames"
              element={<LessonsView defaultModuleFilter="module_e_endgames" />}
            />
            <Route path="/play" element={<PlayStockfishView />} />
            <Route path="/analysis" element={<AnalysisStudioView />} />
            <Route path="/progress" element={<ProgressAnalyticsView />} />
            <Route path="/settings" element={<SettingsSyncView />} />
          </Routes>
        </Suspense>
      </AppShell>
    </BrowserRouter>
  );
};

export default App;
