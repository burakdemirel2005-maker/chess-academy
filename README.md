# Satranç Akademisi (Chess Academy)

**Premium Interactive Chess Learning Platform — Web (Vercel) & Native macOS (Tauri 2)**

Satranç Akademisi is a production-quality, deterministic interactive chess learning platform designed to teach players from zero to advanced play through verified board analysis, interactive lessons, opening explorers, tactical training, and Stockfish match coaching.

- **Primary Language**: Turkish (`tr`)
- **Secondary Language**: English (`en`) via runtime localization
- **100% Deterministic Coaching**: Zero generative AI / LLM dependencies. Every explanation, hint, tactical warning, and move classification is grounded in actual board state (`chess.js`), Stockfish UCI evaluations, and verified geometric tactical detectors.

---

## Key Features

1. **Interactive Chessboard & Teaching Overlays**
   - Click-to-move and drag-and-drop moves with legal move dots and capture rings
   - Custom teaching overlays: Last move, Check indicator, Attacked squares, Controlled squares, Hanging pieces, Tactical relationships (Forks, Pins, Skewers), and Candidate move arrows
   - 3 Board themes (`Klasik Kehribar`, `Zümrüt Turnuva`, `Gece Arduvaz`)
   - Sound effects (move, capture, check, castle, victory) via Web Audio API synthesizer
   - PGN & FEN import/export, board flip, undo in learning modes

2. **Deterministic Chess Coach Engine (`coachEngine.ts` & `tacticalDetectors.ts`)**
   - Evaluates position before and after every user move using Stockfish MultiPV
   - Normalizes centipawn and mate scores to both White and Player perspectives
   - Move classifications: `Best`, `Excellent`, `Good`, `Inaccuracy`, `Mistake`, `Blunder`
   - Verified tactical motif detection: Hanging pieces, Undefended pieces, Forks, Absolute & Relative Pins, Skewers, Discovered attacks, Double attacks, Back-rank weaknesses, Mate-in-1 threats
   - Verified strategic observations: Center control, Piece development, Early Queen sortie warning, Castling availability, Passed/Doubled/Isolated pawns, Open/Semi-open files
   - Three Coaching Explanation Levels: **Başlangıç (Beginner)**, **Orta (Intermediate)**, and **İleri (Advanced)**

3. **Contextual Rule-Based Turkish Assistant (`contextualAssistant.ts`)**
   - Understands 14 core positional intents (with Turkish character normalization and spelling tolerance), including:
     - *"Şimdi ne yapmalıyım?"*, *"Neden bu hamle kötü?"*, *"Daha iyi hamle hangisi?"*, *"Şahım tehlikede mi?"*, *"Hangi taşım tehdit altında?"*, *"Nasıl rok yapabilirim?"*, *"Bu pozisyonda planım ne olmalı?"*, *"Rakibim neyi tehdit ediyor?"*, *"Bu açılışın amacı ne?"*, *"Neden merkez önemli?"*, *"Bu hamleyle ne kazandım?"*, *"Bir ipucu ver."*, *"Daha fazla açıkla."*, *"Bana göster."*

4. **3-Level Progressive Smart Hint System (`hintSystem.ts`)**
   - **Seviye 1 (Kavramsal İpucu)**: Conceptual theme or piece vulnerability without giving away squares
   - **Seviye 2 (Yönlendirici İpucu)**: Source piece and tactical direction
   - **Seviye 3 (Hamleyi Göster)**: Draws the exact verified candidate move arrow on the board

5. **Structured Curriculum (Modules A–E, 28 Interactive Lessons)**
   - **Module A (Temeller - 19 Lessons)**: Chessboard coordinates, all 6 pieces, captures, check, checkmate, stalemate, castling, en passant, promotion, algebraic notation, piece values, and beginner mistakes
   - **Module B (Açılış İlkeleri)**: Center control, minor piece development, king safety
   - **Module C (Taktikler)**: Forks, pins & skewers, discovered attacks, back-rank mates
   - **Module D (Strateji)**: Pawn structures, open files & active pieces
   - **Module E (Oyunsonu)**: King + Queen mate, King + Rook mate, King + Pawn opposition

6. **Opening Explorer (12 Essential Openings)**
   - **White**: İtalyan Açılışı, İspanyol Açılışı (Ruy Lopez), İskoç Açılışı, Londra Sistemi, Vezir Gambiti, İngiliz Açılışı
   - **Black**: Sicilya Savunması, Fransız Savunması, Caro-Kann Savunması, İskandinav Savunması, Şah Hint Savunması, Slav Savunması
   - Step-by-step interactive board playback with move purposes, White/Black plans, common traps, and practice mode

7. **Play vs Stockfish (10 Calibrated Levels) & Post-Game Review**
   - Play with real-time Turkish coaching feedback (`Oyun İçi Koçluk`), pure practice, or match mode
   - Interactive SVG Evaluation Graph with one-click blunder review

8. **Tactical Puzzle Trainer & Spaced Repetition**
   - Multi-theme verified puzzles with rating progression, weakness tracking, and spaced repetition review queue

9. **Cross-Platform Offline-First Sync (Web + macOS + Supabase)**
   - Full local persistence via `localStorage` and automatic cloud synchronization with Supabase PostgreSQL when authenticated

---

## Quick Start Commands

### Local Development (Web)
```bash
npm install
npm run dev
```
Opens at `http://localhost:5173`.

### Local Development (macOS Desktop via Tauri 2)
```bash
npm run tauri:dev
```

### Production Builds
```bash
# Build production web bundle (dist/)
npm run build

# Build native Apple Silicon macOS .app and .dmg installer
npm run tauri:build
```

### Testing & Verification
```bash
# TypeScript strict typecheck
npm run typecheck

# Run Vitest unit & integration suite
npm test

# Run Playwright E2E browser suite
npm run test:e2e
```

---

## Documentation Index

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Shared Web/Desktop architecture, Coaching Engine design, Move Classification methodology, and Sync Conflict Resolution rules
- [SETUP.md](./SETUP.md) — Environment setup, Supabase SQL migration guide, and macOS installation notes
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Vercel web deployment, GitHub Actions CI, and Tauri macOS packaging
- [TESTING.md](./TESTING.md) — Automated unit and E2E test architecture
- [LICENSES.md](./LICENSES.md) — Stockfish GPLv3 compliance and open-source notices
