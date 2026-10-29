import { create } from 'zustand';
import { createJSONStorage, persist, StateStorage } from 'zustand/middleware';

const fallbackMap = new Map<string, string>();
const safeStateStorage: StateStorage = {
  getItem: (name: string): string | null => {
    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
        return localStorage.getItem(name);
      }
    } catch {
      // ignore
    }
    return fallbackMap.get(name) ?? null;
  },
  setItem: (name: string, value: string): void => {
    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
        localStorage.setItem(name, value);
        return;
      }
    } catch {
      // ignore
    }
    fallbackMap.set(name, value);
  },
  removeItem: (name: string): void => {
    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.removeItem === 'function') {
        localStorage.removeItem(name);
        return;
      }
    } catch {
      // ignore
    }
    fallbackMap.delete(name);
  },
};
import { CoachFeedbackLevel, MoveCoachingEvaluation } from '@/features/coach/coachEngine';
import { SupportedLocale } from '@/locales';
import { enqueueSyncRecord } from '@/services/syncAdapter';
import { saveNativeDesktopBackup } from '@/services/platformAdapter';
import { LESSONS_DATA } from '@/data/lessonsData';
import { OPENINGS_DATA } from '@/data/openingsData';

export type BoardThemeId = 'emerald' | 'classic_wood' | 'midnight_slate' | 'tournament_blue';

export const BOARD_THEMES: Record<
  BoardThemeId,
  { nameTr: string; darkSquare: string; lightSquare: string }
> = {
  emerald: {
    nameTr: 'Zümrüt Akademi',
    darkSquare: '#0f766e',
    lightSquare: '#e2e8f0',
  },
  classic_wood: {
    nameTr: 'Klasik Ahşap',
    darkSquare: '#b58863',
    lightSquare: '#f0d9b5',
  },
  midnight_slate: {
    nameTr: 'Gece Mavisi',
    darkSquare: '#334155',
    lightSquare: '#cbd5e1',
  },
  tournament_blue: {
    nameTr: 'Turnuva Mavisi',
    darkSquare: '#2563eb',
    lightSquare: '#dbeafe',
  },
};

export interface LessonProgressRecord {
  lessonId: string;
  completed: boolean;
  quizPassed: boolean;
  interactivePassed: boolean;
  attempts: number;
  completedAt: string | null;
  updatedAt: string;
}

export interface OpeningProgressRecord {
  openingId: string;
  practicedCount: number;
  correctRuns: number;
  masteryScore: number; // 0..100
  missedStepIndices: number[];
  nextReviewAt: string;
  updatedAt: string;
}

export interface PuzzleAttemptRecord {
  id: string;
  puzzleId: string;
  theme: string;
  solved: boolean;
  hintsUsed: number;
  attempts: number;
  timestamp: string;
}

export interface SavedGameRecord {
  id: string;
  date: string;
  playerColor: 'w' | 'b';
  difficultyLevel: number;
  mode: 'learning' | 'practice' | 'challenge';
  result: 'win' | 'loss' | 'draw' | 'in_progress';
  resultReasonTr: string;
  pgn: string;
  finalFen: string;
  moveCount: number;
  inaccuracies: number;
  mistakes: number;
  blunders: number;
  bestMovesCount: number;
  weaknessTags: string[];
  evaluations: MoveCoachingEvaluation[];
}

export interface SpacedRepetitionItem {
  id: string;
  type: 'lesson' | 'opening' | 'puzzle' | 'weakness';
  targetId: string;
  titleTr: string;
  reasonTr: string;
  intervalDays: number;
  dueAt: string;
}

export interface PersonalizedRecommendation {
  id: string;
  category: 'weakness' | 'opening' | 'lesson' | 'puzzle';
  titleTr: string;
  messageTr: string;
  actionRoute: string;
  priority: 'high' | 'medium' | 'low';
}

export interface UserProfileState {
  id: string | null;
  email: string | null;
  displayName: string;
  isGuest: boolean;
}

export interface AcademyState {
  // User & Preferences
  user: UserProfileState;
  locale: SupportedLocale;
  coachLevel: CoachFeedbackLevel;
  boardTheme: BoardThemeId;
  soundEnabled: boolean;
  showCoordinates: boolean;
  teachingOverlays: {
    showAttacked: boolean;
    showControlled: boolean;
    showHanging: boolean;
    showSuggested: boolean;
  };

  // Progress & Analytics (100% Real Data — starts empty)
  lessonProgress: Record<string, LessonProgressRecord>;
  openingProgress: Record<string, OpeningProgressRecord>;
  puzzleAttempts: PuzzleAttemptRecord[];
  savedGames: SavedGameRecord[];
  weaknessCounts: Record<string, number>;
  studyMinutesTotal: number;
  studyActivityByDate: Record<string, number>; // YYYY-MM-DD -> minutes
  spacedRepetitionQueue: SpacedRepetitionItem[];
  lastActiveRoute: string;

  // Actions
  setUser: (user: UserProfileState) => void;
  setLocale: (locale: SupportedLocale) => void;
  setCoachLevel: (level: CoachFeedbackLevel) => void;
  setBoardTheme: (theme: BoardThemeId) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setShowCoordinates: (show: boolean) => void;
  toggleOverlay: (key: keyof AcademyState['teachingOverlays']) => void;
  setLastActiveRoute: (route: string) => void;
  addStudyMinutes: (minutes: number) => void;

  // Educational Progress Actions
  recordLessonStep: (params: {
    lessonId: string;
    interactivePassed?: boolean;
    quizPassed?: boolean;
  }) => void;
  recordOpeningPractice: (params: {
    openingId: string;
    perfectRun: boolean;
    missedStepIndex?: number;
  }) => void;
  recordPuzzleAttempt: (params: {
    puzzleId: string;
    theme: string;
    solved: boolean;
    hintsUsed: number;
    attempts: number;
  }) => void;
  recordCompletedGame: (game: SavedGameRecord) => void;
  recordWeaknessTag: (tag: string) => void;
}

const WEAKNESS_MESSAGES_TR: Record<
  string,
  { title: string; message: string; route: string }
> = {
  hanging_pieces: {
    title: 'Taş Güvenliği ve Savunmasız Taşlar',
    message:
      'Son oyunlarında sık sık savunmasız (askıda) taş bırakıyorsun. Çatal ve taş savunması çalışmalarını tekrar etmeni öneriyorum.',
    route: '/tactics',
  },
  early_queen: {
    title: 'Açılışta Erken Vezir Gelişimi',
    message:
      'Açılış safhasında hafif taşların çıkmadan önce vezirini erken oyuna çıkarıyorsun. Tempo ve açılış ilkeleri dersini gözden geçirmeni öneriyorum.',
    route: '/lessons',
  },
  center_control: {
    title: 'Merkez Kare Kontrolü',
    message:
      'Açılış hamlelerinde merkez karelerindeki (d4, e4, d5, e5) etkinliğin zayıflıyor. Merkez kontrolü ve açılış akademisi alıştırmalarına odaklanabilirsin.',
    route: '/openings',
  },
  back_rank: {
    title: 'Arka Yatay Güvenliği',
    message:
      'Şahının arka yatayda hava deliği olmadan sıkıştığı pozisyonlar oluştu. Arka yatay matı ve savunma bulmacalarını çözmeni öneriyorum.',
    route: '/tactics',
  },
  pins: {
    title: 'Açmaz (Pin) Farkındalığı',
    message:
      'Taşlarının açmaza girdiği pozisyonlarda materyal kaybı yaşadın. Açmaz ve Şiş taktik dersini tekrar etmen çok faydalı olacaktır.',
    route: '/lessons',
  },
  missed_mate: {
    title: 'Bitirici Mat Fırsatları',
    message:
      'Oyunlarında doğrudan mat fırsatlarını kaçırdığın anlar oldu. Tek ve iki hamlede mat bulmacalarıyla görüşünü keskinleştirebilirsin.',
    route: '/tactics',
  },
  king_safety: {
    title: 'Şah Güvenliği ve Rok Zamanlaması',
    message:
      'Şahının merkezde tehlikeye açık kaldığı durumlar tespit edildi. Rok dersini ve şah güvenliği ilkelerini tekrar çalışmanı öneriyorum.',
    route: '/lessons',
  },
};

export function generatePersonalizedRecommendations(
  state: Pick<
    AcademyState,
    'lessonProgress' | 'openingProgress' | 'puzzleAttempts' | 'savedGames' | 'weaknessCounts'
  >
): PersonalizedRecommendation[] {
  const recommendations: PersonalizedRecommendation[] = [];

  // 1. Check top recurring weakness from actual games/moves
  const sortedWeaknesses = Object.entries(state.weaknessCounts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  for (const [tag] of sortedWeaknesses.slice(0, 2)) {
    const info = WEAKNESS_MESSAGES_TR[tag];
    if (info) {
      recommendations.push({
        id: `rec_weakness_${tag}`,
        category: 'weakness',
        titleTr: info.title,
        messageTr: info.message,
        actionRoute: info.route,
        priority: 'high',
      });
    }
  }

  // 2. Check opening progress
  for (const opening of OPENINGS_DATA) {
    const prog = state.openingProgress[opening.id];
    if (prog && prog.practicedCount > 0 && prog.masteryScore >= 60) {
      recommendations.push({
        id: `rec_opening_${opening.id}`,
        category: 'opening',
        titleTr: `${opening.nameTr} İlerlemesi`,
        messageTr: `${opening.nameTr} temel varyantlarında ilerleme kaydettin (%${prog.masteryScore} ustalık). Şimdi rakibin farklı cevaplarına karşı çalışabilirsin.`,
        actionRoute: '/openings',
        priority: 'medium',
      });
      break;
    }
  }

  // 3. Next uncompleted lesson in curriculum
  const nextLesson = LESSONS_DATA.find((l) => !state.lessonProgress[l.id]?.completed);
  if (nextLesson) {
    recommendations.push({
      id: `rec_lesson_${nextLesson.id}`,
      category: 'lesson',
      titleTr: `Sıradaki Ders: ${nextLesson.titleTr}`,
      messageTr: `${nextLesson.moduleTitleTr} modülünde "${nextLesson.titleTr}" dersini tamamlayarak müfredatta bir adım daha ilerleyebilirsin.`,
      actionRoute: `/lessons?id=${nextLesson.id}`,
      priority: recommendations.length === 0 ? 'high' : 'medium',
    });
  }

  // 4. Puzzle recommendation if puzzle attempts are low or have failures
  const failedPuzzles = state.puzzleAttempts.filter((p) => !p.solved);
  if (failedPuzzles.length > 0) {
    recommendations.push({
      id: 'rec_puzzle_retry',
      category: 'puzzle',
      titleTr: 'Aralıklı Tekrar: Taktik Bulmacalar',
      messageTr: `Daha önce zorlandığın ${failedPuzzles.length} taktik bulmacayı tekrar çözerek örüntü tanıma hızını artırabilirsin.`,
      actionRoute: '/tactics',
      priority: 'medium',
    });
  }

  return recommendations;
}

export const useAcademyStore = create<AcademyState>()(
  persist(
    (set, get) => ({
      user: {
        id: null,
        email: null,
        displayName: 'Misafir Öğrenci',
        isGuest: true,
      },
      locale: 'tr',
      coachLevel: 'beginner',
      boardTheme: 'emerald',
      soundEnabled: true,
      showCoordinates: true,
      teachingOverlays: {
        showAttacked: false,
        showControlled: false,
        showHanging: true,
        showSuggested: true,
      },

      lessonProgress: {},
      openingProgress: {},
      puzzleAttempts: [],
      savedGames: [],
      weaknessCounts: {},
      studyMinutesTotal: 0,
      studyActivityByDate: {},
      spacedRepetitionQueue: [],
      lastActiveRoute: '/',

      setUser: (user) => set({ user }),
      setLocale: (locale) => set({ locale }),
      setCoachLevel: (coachLevel) => set({ coachLevel }),
      setBoardTheme: (boardTheme) => set({ boardTheme }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setShowCoordinates: (showCoordinates) => set({ showCoordinates }),
      toggleOverlay: (key) =>
        set((state) => ({
          teachingOverlays: {
            ...state.teachingOverlays,
            [key]: !state.teachingOverlays[key],
          },
        })),
      setLastActiveRoute: (lastActiveRoute) => set({ lastActiveRoute }),

      addStudyMinutes: (minutes) => {
        const today = new Date().toISOString().slice(0, 10);
        set((state) => ({
          studyMinutesTotal: state.studyMinutesTotal + minutes,
          studyActivityByDate: {
            ...state.studyActivityByDate,
            [today]: (state.studyActivityByDate[today] ?? 0) + minutes,
          },
        }));
      },

      recordLessonStep: ({ lessonId, interactivePassed, quizPassed }) => {
        const now = new Date().toISOString();
        const existing = get().lessonProgress[lessonId];
        const nextInteractive = Boolean(existing?.interactivePassed || interactivePassed);
        const nextQuiz = Boolean(existing?.quizPassed || quizPassed);
        const completed = Boolean(existing?.completed || (nextInteractive && nextQuiz));

        const updated: LessonProgressRecord = {
          lessonId,
          completed,
          interactivePassed: nextInteractive,
          quizPassed: nextQuiz,
          attempts: (existing?.attempts ?? 0) + 1,
          completedAt: completed ? existing?.completedAt ?? now : null,
          updatedAt: now,
        };

        set((state) => {
          const nextState = {
            lessonProgress: {
              ...state.lessonProgress,
              [lessonId]: updated,
            },
            studyMinutesTotal: state.studyMinutesTotal + 3,
          };
          saveNativeDesktopBackup(JSON.stringify(nextState)).catch(() => {});
          return nextState;
        });

        enqueueSyncRecord({
          id: `lesson_${lessonId}`,
          table: 'lesson_progress',
          data: updated as unknown as Record<string, unknown>,
          updatedAt: now,
        });
      },

      recordOpeningPractice: ({ openingId, perfectRun, missedStepIndex }) => {
        const now = new Date().toISOString();
        const existing = get().openingProgress[openingId];
        const practicedCount = (existing?.practicedCount ?? 0) + 1;
        const correctRuns = (existing?.correctRuns ?? 0) + (perfectRun ? 1 : 0);
        const masteryScore = Math.min(
          100,
          Math.round((correctRuns / practicedCount) * 80 + Math.min(20, practicedCount * 5))
        );
        const missedSet = new Set(existing?.missedStepIndices ?? []);
        if (typeof missedStepIndex === 'number') {
          missedSet.add(missedStepIndex);
        } else if (perfectRun) {
          missedSet.clear();
        }

        const nextReviewDate = new Date(
          Date.now() + (perfectRun ? 3 : 1) * 24 * 60 * 60 * 1000
        ).toISOString();

        const updated: OpeningProgressRecord = {
          openingId,
          practicedCount,
          correctRuns,
          masteryScore,
          missedStepIndices: Array.from(missedSet),
          nextReviewAt: nextReviewDate,
          updatedAt: now,
        };

        set((state) => ({
          openingProgress: {
            ...state.openingProgress,
            [openingId]: updated,
          },
          studyMinutesTotal: state.studyMinutesTotal + 4,
        }));

        enqueueSyncRecord({
          id: `opening_${openingId}`,
          table: 'opening_progress',
          data: updated as unknown as Record<string, unknown>,
          updatedAt: now,
        });
      },

      recordPuzzleAttempt: ({ puzzleId, theme, solved, hintsUsed, attempts }) => {
        const now = new Date().toISOString();
        const record: PuzzleAttemptRecord = {
          id: `puz_att_${puzzleId}_${Date.now()}`,
          puzzleId,
          theme,
          solved,
          hintsUsed,
          attempts,
          timestamp: now,
        };

        set((state) => {
          const queue = [...state.spacedRepetitionQueue];
          if (!solved) {
            const exists = queue.some((q) => q.targetId === puzzleId);
            if (!exists) {
              queue.push({
                id: `sr_${puzzleId}`,
                type: 'puzzle',
                targetId: puzzleId,
                titleTr: `Tekrar Bulmacası (${puzzleId})`,
                reasonTr: 'Önceki denemede hatalı hamle yapıldı; aralıklı tekrar listesine eklendi.',
                intervalDays: 1,
                dueAt: now,
              });
            }
          } else {
            const idx = queue.findIndex((q) => q.targetId === puzzleId);
            if (idx !== -1) queue.splice(idx, 1);
          }

          return {
            puzzleAttempts: [record, ...state.puzzleAttempts].slice(0, 200),
            spacedRepetitionQueue: queue,
            studyMinutesTotal: state.studyMinutesTotal + 2,
          };
        });

        enqueueSyncRecord({
          id: record.id,
          table: 'puzzle_attempts',
          data: record as unknown as Record<string, unknown>,
          updatedAt: now,
        });
      },

      recordCompletedGame: (game) => {
        const now = new Date().toISOString();
        set((state) => {
          const nextWeaknesses = { ...state.weaknessCounts };
          for (const tag of game.weaknessTags) {
            nextWeaknesses[tag] = (nextWeaknesses[tag] ?? 0) + 1;
          }
          return {
            savedGames: [game, ...state.savedGames.filter((g) => g.id !== game.id)].slice(0, 50),
            weaknessCounts: nextWeaknesses,
            studyMinutesTotal: state.studyMinutesTotal + 8,
          };
        });

        enqueueSyncRecord({
          id: game.id,
          table: 'games',
          data: {
            id: game.id,
            date: game.date,
            player_color: game.playerColor,
            difficulty_level: game.difficultyLevel,
            mode: game.mode,
            result: game.result,
            pgn: game.pgn,
            final_fen: game.finalFen,
            inaccuracies: game.inaccuracies,
            mistakes: game.mistakes,
            blunders: game.blunders,
          },
          updatedAt: now,
        });
      },

      recordWeaknessTag: (tag) =>
        set((state) => ({
          weaknessCounts: {
            ...state.weaknessCounts,
            [tag]: (state.weaknessCounts[tag] ?? 0) + 1,
          },
        })),
    }),
    {
      name: 'chess_academy_storage_v1',
      storage: createJSONStorage(() => safeStateStorage),
    }
  )
);
