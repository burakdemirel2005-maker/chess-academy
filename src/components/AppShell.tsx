import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  BookMarked,
  BookOpen,
  Crown,
  Flag,
  LayoutDashboard,
  Puzzle,
  Settings,
  Sliders,
  Swords,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { getTranslations } from '@/locales';
import { useAcademyStore } from '@/stores/useAcademyStore';
import { isTauriDesktop } from '@/services/platformAdapter';
import { isSupabaseConfigured } from '@/services/supabaseClient';

const ROUTE_TITLES_TR: Record<string, string> = {
  '/': 'Genel Bakış | Satranç Akademisi',
  '/lessons': 'Dersler (Modül A-E) | Satranç Akademisi',
  '/openings': 'Açılış Akademisi | Satranç Akademisi',
  '/tactics': 'Taktik Bulmacalar | Satranç Akademisi',
  '/endgames': 'Oyunsonu Akademisi | Satranç Akademisi',
  '/play': 'Stockfish ile Oyna | Satranç Akademisi',
  '/analysis': 'Analiz Stüdyosu | Satranç Akademisi',
  '/progress': 'Gelişim ve İstatistik | Satranç Akademisi',
  '/settings': 'Ayarlar ve Hesap | Satranç Akademisi',
};

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { locale, user, setLastActiveRoute } = useAcademyStore();
  const t = getTranslations(locale);
  const location = useLocation();
  const isDesktop = isTauriDesktop();

  useEffect(() => {
    setLastActiveRoute(location.pathname);
    document.title =
      ROUTE_TITLES_TR[location.pathname] ?? 'Satranç Akademisi | İnteraktif Satranç Eğitimi';
  }, [location.pathname, setLastActiveRoute]);

  const navItems = [
    { to: '/', label: t.nav.dashboard, icon: LayoutDashboard },
    { to: '/lessons', label: t.nav.lessons, icon: BookOpen },
    { to: '/openings', label: t.nav.openings, icon: BookMarked },
    { to: '/tactics', label: t.nav.tactics, icon: Puzzle },
    { to: '/endgames', label: t.nav.endgames, icon: Flag },
    { to: '/play', label: t.nav.play, icon: Swords },
    { to: '/analysis', label: t.nav.analysis, icon: Sliders },
    { to: '/progress', label: t.nav.progress, icon: BarChart3 },
    { to: '/settings', label: t.nav.settings, icon: Settings },
  ];

  return (
    <div className="min-h-dvh flex flex-col lg:flex-row bg-navy-950 text-slate-100">
      {/* Left Desktop Sidebar & Mobile Topbar */}
      <aside className="lg:w-64 shrink-0 bg-navy-900/95 border-b lg:border-b-0 lg:border-r border-slate-800/90 flex flex-col justify-between">
        <div>
          <header className="p-4 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-navy-950 shadow-md shadow-emerald-500/20">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-extrabold tracking-tight text-slate-100 block">
                  {t.app.name}
                </span>
                <span className="text-[10px] font-medium text-emerald-400 block">
                  {isDesktop ? t.app.desktopBadge : t.app.webBadge}
                </span>
              </div>
            </div>
          </header>

          <nav
            aria-label="Ana Navigasyon"
            className="p-2.5 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                      isActive
                        ? 'bg-emerald-500 text-navy-950 shadow-sm'
                        : 'text-slate-300 hover:bg-navy-800 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Status Footer inside Sidebar */}
        <footer className="hidden lg:block p-3.5 m-2.5 rounded-2xl bg-navy-950/90 border border-slate-800/90 space-y-2 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">Öğrenci</span>
            <span className="text-slate-200 font-semibold truncate max-w-[120px]">
              {user.displayName}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400">
            {isSupabaseConfigured ? (
              <>
                <Wifi className="w-3.5 h-3.5 shrink-0" />
                <span>{t.app.onlineBadge}</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <span className="text-amber-300">{t.app.offlineBadge}</span>
              </>
            )}
          </div>
        </footer>
      </aside>

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 min-w-0 p-4 sm:p-6 max-w-[1600px] mx-auto w-full">
        {children}
      </main>
    </div>
  );
};
