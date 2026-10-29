import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { LESSONS_DATA } from '@/data/lessonsData';
import { OPENINGS_DATA } from '@/data/openingsData';
import { PUZZLES_DATA } from '@/data/puzzlesData';
import { parseUciMove } from '@/utils/chessUtils';
import { resolveSyncConflict } from '@/services/syncAdapter';
import {
  generatePersonalizedRecommendations,
  useAcademyStore,
} from '@/stores/useAcademyStore';

describe('Educational Curriculum, Openings, Puzzles & Offline Sync Integrity', () => {
  it('validates that all 28 lessons have valid FENs and playable accepted UCI moves', () => {
    expect(LESSONS_DATA.length).toBeGreaterThanOrEqual(28);

    for (const lesson of LESSONS_DATA) {
      const game = new Chess(lesson.interactiveTask.fen);
      expect(game.fen()).toBeTruthy();

      const firstAccepted = lesson.interactiveTask.acceptedMovesUci[0];
      const parsed = parseUciMove(firstAccepted);
      expect(parsed).not.toBeNull();
      const moveObj = game.move(parsed!);
      expect(moveObj).not.toBeNull();
    }
  });

  it('validates that all 12 openings have legal main lines and alternative variations', () => {
    expect(OPENINGS_DATA.length).toBe(12);

    for (const opening of OPENINGS_DATA) {
      const game = new Chess();
      for (const step of opening.mainLine) {
        const parsed = parseUciMove(step.uci);
        expect(parsed).not.toBeNull();
        const moveObj = game.move(parsed!);
        expect(moveObj?.san).toBe(step.san);
      }

      for (const alt of opening.alternativeResponses) {
        const altGame = new Chess();
        for (const step of alt.steps) {
          const parsed = parseUciMove(step.uci);
          const moveObj = altGame.move(parsed!);
          expect(moveObj?.san).toBe(step.san);
        }
      }
    }
  });

  it('validates that all tactical puzzles have legal solutions', () => {
    expect(PUZZLES_DATA.length).toBeGreaterThanOrEqual(10);

    for (const puzzle of PUZZLES_DATA) {
      const game = new Chess(puzzle.fen);
      for (const step of puzzle.steps) {
        const parsed = parseUciMove(step.acceptedPlayerUci[0]);
        expect(parsed).not.toBeNull();
        const move = game.move(parsed!);
        expect(move).not.toBeNull();
        if (step.opponentReplyUci) {
          const oppParsed = parseUciMove(step.opponentReplyUci);
          const oppMove = game.move(oppParsed!);
          expect(oppMove).not.toBeNull();
        }
      }
    }
  });

  it('persists lesson completion, opening mastery, and generates real data recommendations', () => {
    const store = useAcademyStore.getState();
    store.recordLessonStep({
      lessonId: 'a01-what-is-chess',
      interactivePassed: true,
      quizPassed: true,
    });

    const updatedLesson = useAcademyStore.getState().lessonProgress['a01-what-is-chess'];
    expect(updatedLesson.completed).toBe(true);

    store.recordOpeningPractice({
      openingId: 'italian-game',
      perfectRun: true,
    });
    const updatedOpening = useAcademyStore.getState().openingProgress['italian-game'];
    expect(updatedOpening.masteryScore).toBeGreaterThanOrEqual(80);

    store.recordWeaknessTag('hanging_pieces');
    const recs = generatePersonalizedRecommendations(useAcademyStore.getState());
    expect(recs.some((r) => r.id === 'rec_weakness_hanging_pieces')).toBe(true);
  });

  it('resolves offline-online sync conflicts deterministically without losing completion', () => {
    const localRecord = {
      updatedAt: '2026-10-29T10:00:00Z',
      completed: true,
      masteryScore: 85,
      attempts: 4,
    };
    const remoteRecord = {
      updatedAt: '2026-10-29T11:00:00Z',
      completed: false,
      masteryScore: 60,
      attempts: 2,
    };

    const merged = resolveSyncConflict(localRecord, remoteRecord);
    expect(merged.completed).toBe(true); // monotonic completion preserved
    expect(merged.masteryScore).toBe(85); // max mastery preserved
    expect(merged.attempts).toBe(4);
    expect(merged.updatedAt).toBe('2026-10-29T11:00:00Z');
  });
});
