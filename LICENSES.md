# Open-Source Licenses & Attribution (`LICENSES.md`)

## 1. Stockfish Chess Engine (GPLv3)

Satranç Akademisi integrates the **Stockfish** chess engine compiled to WebAssembly (`public/stockfish/stockfish.js` and `public/stockfish/stockfish.wasm`) via the `stockfish.js` project.

- **License**: GNU General Public License v3.0 (GPLv3)
- **Full License Text**: Included in [`public/stockfish/Copying.txt`](./public/stockfish/Copying.txt)
- **Source Code Availability**:
  - Official Stockfish C++ Source: [https://github.com/official-stockfish/Stockfish](https://github.com/official-stockfish/Stockfish)
  - Stockfish.js WebAssembly Port Source: [https://github.com/nmrugg/stockfish.js](https://github.com/nmrugg/stockfish.js)
  - Satranç Akademisi Complete Source Code: Available in this repository under GPLv3-compatible terms.

In compliance with the GNU General Public License v3.0, the complete source code of this application, its UCI Web Worker integration (`src/engine/chessEngineAdapter.ts`), and the accompanying license notices in `public/stockfish/Copying.txt` are distributed together and remain freely accessible to all users.

---

## 2. Third-Party Libraries

| Package | License | Purpose |
| :--- | :---: | :--- |
| `chess.js` | BSD-2-Clause | Legal move generation, FEN/PGN parsing, check/mate/stalemate validation |
| `react` / `react-dom` | MIT | Declarative UI rendering |
| `zustand` | MIT | Client state management and offline persistence |
| `@supabase/supabase-js` | MIT | PostgreSQL database sync and authentication |
| `@tauri-apps/api` / `tauri` | MIT / Apache-2.0 | Native macOS desktop runtime and bundler |
| `lucide-react` | ISC | Clean vector iconography |
| `framer-motion` | MIT | Smooth UI transitions |
| `tailwindcss` | MIT | Utility-first styling system |
| `vitest` / `@playwright/test` | MIT / Apache-2.0 | Automated unit and end-to-end testing |
