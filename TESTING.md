# Testing Guide (`TESTING.md`)

Satranç Akademisi includes comprehensive automated verification across unit tests, tactical geometry verification, coaching logic, and full browser E2E flows.

## 1. Running Unit & Integration Tests (Vitest)

```bash
npm test
```

### Unit Test Suites (`tests/unit/`)

1. **`tests/unit/chessRules.test.ts`**
   - Verifies legal and illegal moves for all 6 pieces
   - Verifies check detection, checkmate (Scholar's Mate), and stalemate detection
   - Verifies castling rights (kingside/queenside and through-check prevention)
   - Verifies en passant capture legality
   - Verifies pawn promotion handling
   - Verifies PGN parsing and FEN loading/validation

2. **`tests/unit/engineAndEval.test.ts`**
   - Verifies centipawn normalization to both White's perspective (`normalizeScoreToWhite`) and the moving player's perspective (`normalizeScoreToPlayer`)
   - Verifies mate score conversion (`mateToCpEquivalent`)
   - Verifies move classification across `best`, `excellent`, `good`, `inaccuracy`, `mistake`, and `blunder`
   - Verifies win probability logistic difference handling so small centipawn drops in overwhelmingly winning positions (`+700` to `+580`) are not falsely penalized as blunders
   - Verifies deterministic engine evaluation and legal move generation

3. **`tests/unit/tacticalAndCoach.test.ts`**
   - Verifies hanging/undefended piece detection
   - Verifies Knight fork detection (`Nc7+` forking King and Rook)
   - Verifies absolute pin detection along files/diagonals
   - Verifies back-rank weakness detection
   - Verifies Turkish coaching feedback across Beginner, Intermediate, and Advanced modes (including early Queen development warnings)
   - Verifies 3-level progressive hints (`Level 1`, `Level 2`, `Level 3`)
   - Verifies Turkish contextual assistant intent recognition (exact queries, spelling variations, and graceful fallback on unsupported questions)

4. **`tests/unit/curriculumAndSync.test.ts`**
   - Verifies every single interactive step across all **28 lessons** (Modules A–E) has a valid FEN and that every `expectedMoves` SAN move is 100% legal on the board
   - Verifies all **12 openings** have valid sequential UCI/SAN moves from the starting position
   - Verifies all **10 tactical puzzles** have valid FENs and legal solution sequences
   - Verifies offline store persistence, weakness recording, spaced repetition queue generation, and conflict-free cloud sync merging (`mergeLocalAndCloudState`)

---

## 2. Running End-to-End Tests (Playwright)

```bash
npm run test:e2e
```

### E2E Coverage (`tests/e2e/academy.spec.ts`)
- **Flow 1**: App launch, Turkish navigation, and English (`EN`) localization toggle
- **Flow 2**: Completing an interactive lesson step (Module A Lesson 1: `e4` -> `d5`)
- **Flow 3**: Exploring an opening (`İtalyan Açılışı`), stepping through moves, and loading Practice Mode
- **Flow 4**: Playing a move against Stockfish and receiving real-time Turkish coach evaluation
- **Flow 5**: Asking a contextual question in the Turkish Assistant (`"Şimdi ne yapmalıyım?"`)
- **Flow 6**: Requesting progressive hints (`İpucu 1`, `İpucu 2`, `Göster`) and Solving a Tactical Puzzle
- **Flow 7**: Loading a FEN/PGN in the Analysis Studio (`Analiz Stüdyosu`)
- **Flow 8**: Persisting progress across page reloads (`localStorage` restoration)
