# Architecture Documentation (`ARCHITECTURE.md`)

## 1. Shared Single-Repository Architecture

Satranç Akademisi uses a single unified repository that compiles to both a modern Web SPA (deployed on Vercel) and a native Apple Silicon macOS desktop application (powered by Tauri 2).

```text
chess-academy/
├── src/
│   ├── app/                  # Root application controller & view routing
│   ├── components/           # Shared layout shell, navigation, header
│   ├── features/
│   │   ├── chess/            # InteractiveChessboard, PlayStockfishView
│   │   ├── coach/            # Deterministic CoachEngine, TacticalDetectors, HintSystem, ContextualAssistant
│   │   ├── lessons/          # Structured curriculum player (Modules A-E)
│   │   ├── openings/         # Interactive Opening Explorer (12 openings)
│   │   ├── tactics/          # Tactical Puzzle Trainer & Spaced Repetition
│   │   ├── analysis/         # PGN/FEN Analysis Studio & EvaluationGraph
│   │   ├── progress/         # Dashboard & Real-Data Analytics views
│   │   └── settings/         # Localization, Themes, Supabase Auth & Cloud Sync
│   ├── engine/               # ChessEngineAdapter (Stockfish WASM UCI Worker + Deterministic Fallback)
│   ├── services/             # PlatformAdapter, SoundService, SupabaseClient, SyncAdapter
│   ├── stores/               # Zustand state store (offline persistence + cloud sync)
│   ├── data/                 # Verified lessons, openings, and puzzles datasets
│   ├── locales/              # Turkish (primary) and English localization dictionaries
│   ├── styles/               # Modern CSS system (dark/light color-scheme, scrollbars, focus states)
│   └── utils/                # Chess geometry, SAN/UCI helpers, centipawn normalization
├── src-tauri/                # Tauri 2 Rust host, macOS window configuration & bundle icons
├── public/stockfish/         # Stockfish WASM & JS worker binaries + GPLv3 license
├── supabase/migrations/      # PostgreSQL schema & Row Level Security (RLS) policies
└── tests/                    # Vitest unit tests & Playwright E2E tests
```

---

## 2. Platform Isolation Adapters

Platform-specific APIs are isolated behind clean adapters:

1. **`ChessEngineAdapter` (`src/engine/chessEngineAdapter.ts`)**
   - Spawns `/stockfish/stockfish.js` inside a dedicated browser/WebView Web Worker communicating over the UCI protocol (`uci`, `isready`, `setoption name MultiPV`, `go movetime`).
   - Assigns monotonically increasing `requestId` tokens to every analysis request so rapid user moves cancel in-flight calculations (`stop`) and never apply stale evaluations.
   - Includes a deterministic tactical minimax fallback with alpha-beta pruning and positional piece-square tables so evaluations and best-move suggestions remain instant and reliable even in constrained environments.

2. **`PlatformAdapter` (`src/services/platformAdapter.ts`)**
   - Detects whether the runtime is Tauri 2 Desktop (`__TAURI_INTERNals__`) or Web Browser.
   - Exposes native metadata (`Apple Silicon Native (Tauri 2)` vs `Web Tarayıcı (WASM)`).

3. **`SyncAdapter` (`src/services/syncAdapter.ts`)**
   - Bridges local Zustand state (`localStorage`) with Supabase PostgreSQL tables (`user_profiles`, `lesson_progress`, `opening_progress`, `puzzle_attempts`, `saved_games`, `weakness_metrics`, `review_queue`, `user_settings`).

---

## 3. Deterministic Coaching Engine & Move Classification Methodology

The coaching engine (`src/features/coach/coachEngine.ts`) uses **zero LLMs**. Every coaching report separates four distinct layers:

1. **Engine Evaluation Layer**:
   - Before the move (`beforeEval`) and after the move (`afterEval`) using Stockfish MultiPV.
   - All evaluations are explicitly normalized into two perspectives:
     - `scoreWhiteCp`: Always from White's perspective (`+` = White advantage, `-` = Black advantage).
     - `scorePlayerCp`: Always from the moving player's perspective (`+` = Player advantage).

2. **Move Classification Methodology**:
   Rather than relying solely on raw centipawn loss in already decided positions (e.g., dropping from `+800 cp` to `+600 cp` is still completely winning), we compute **Expected Win Probability** on a logistic curve:
   $$\text{WinProb}(cp) = \frac{100}{1 + 10^{-cp / 400}}$$
   We combine **Centipawn Loss (`cpLoss`)**, **Win Probability Drop (`winProbLoss`)**, and **Mate State Transitions**:
   - **`best`**: Exact match with the engine's #1 candidate move, or `cpLoss <= 10` (`winProbLoss <= 1.2%`).
   - **`excellent`**: Strong top candidate move with `cpLoss <= 28` and `winProbLoss <= 3.0%`.
   - **`good`**: Solid playable move with `cpLoss <= 65` and `winProbLoss <= 6.5%`.
   - **`inaccuracy`**: Suboptimal move with `cpLoss <= 130` and `winProbLoss <= 12.5%` (or missing a forced mate while retaining a winning position).
   - **`mistake`**: Serious error with `cpLoss <= 260` and `winProbLoss <= 22.0%` (usually dropping a tactical motif or positional structure).
   - **`blunder`**: Critical error (`cpLoss > 260`, `winProbLoss > 22.0%`, stepping into forced mate, or throwing away a winning position into a losing one).

3. **Verified Tactical Detectors (`src/features/coach/tacticalDetectors.ts`)**:
   - **Hanging & Undefended Pieces**: Ray-cast and attack-map verification comparing attacker count vs defender count and lowest attacker value.
   - **Forks**: Verifies a single piece simultaneously attacks $\ge 2$ enemy pieces that are either higher value or undefended.
   - **Pins (Absolute & Relative)**: Ray-casts along ranks, files, and diagonals from sliding attackers (`B`, `R`, `Q`) to verify an enemy piece shields a King (Absolute Pin) or a higher-value target (Relative Pin).
   - **Skewers**: Ray-casts to verify a high-value piece (or King) is attacked directly in front of a behind target along the same ray.
   - **Discovered Attacks**: Simulates piece movement to verify whether vacating `from` unblocks a friendly sliding attacker onto an enemy target.
   - **Back-Rank Weakness**: Checks whether the King on the 1st/8th rank is trapped behind 3 friendly pawns with no flight squares while enemy Rooks/Queens exist.

4. **Heuristic Strategic Observations**:
   - Center control (`d4, d5, e4, e5`), minor piece development, early Queen move penalty in the opening (`moveNumber <= 6`), pawn structure (isolated, doubled, passed pawns), and open/semi-open rook files.

---

## 4. Offline-First Sync & Conflict Resolution Rules

When synchronizing between local storage (Web or macOS offline session) and Supabase PostgreSQL (`src/services/syncAdapter.ts`):

1. **Completed Lessons**: Union merge (`completed: local.completed || remote.completed`), keeping the highest `stars` (`Math.max(local.stars, remote.stars)`), summing `attempts`, and preserving the most recent `lastAttemptAt` timestamp.
2. **Opening Progress**: Union merge of `completed` status and `practicedVariations`, keeping the newer `lastPracticedAt`.
3. **Puzzle History & Saved Games**: Keyed by deterministic IDs; deduplicated by ID on merge so no game or puzzle attempt is ever lost.
4. **Weakness Metrics**: Keeps the entry with the higher total `occurrences + resolvedCount` to prevent overwriting accumulated training telemetry.
5. **User Settings**: Last-write-wins based on explicit user changes.
