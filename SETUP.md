# Setup & Installation Guide (`SETUP.md`)

## 1. Prerequisites

- **macOS**: Apple Silicon (M1/M2/M3/M4) running macOS 13.0+
- **Node.js**: v20+ (tested on Node v25/v26) and `npm`
- **Rust & Cargo** (for Tauri 2 macOS desktop builds):
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  source "$HOME/.cargo/env"
  ```
- **Xcode Command Line Tools**:
  ```bash
  xcode-select --install
  ```

---

## 2. Environment Variables

Copy `.env.example` to `.env` in the project root:

```bash
cp .env.example .env
```

Available variables in `.env`:

| Variable | Required | Description |
| :--- | :---: | :--- |
| `VITE_SUPABASE_URL` | Optional (Required for Cloud Sync) | Your Supabase project URL (`https://<project-ref>.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Optional (Required for Cloud Sync) | Your public Supabase `anon` key (safe for client use with RLS enabled) |
| `VITE_APP_ENV` | Optional | `development` or `production` |

> **Security Note**: Never place a Supabase `service_role` secret key in `.env` or frontend code. If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are omitted, Satranç Akademisi automatically operates in full **Offline Local Mode** (`localStorage`) with zero degradation in lessons, coaching, or Stockfish play.

---

## 3. Supabase Database Setup

To enable cross-device account synchronization between the Vercel web app and the macOS Tauri desktop app:

1. Create a new project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Paste and execute the migration file:
   - [`supabase/migrations/20261029000001_initial_schema.sql`](./supabase/migrations/20261029000001_initial_schema.sql)
4. This migration creates all 11 tables with strict **Row Level Security (RLS)** policies (`auth.uid() = user_id`):
   - `user_profiles`
   - `user_settings`
   - `lesson_progress`
   - `opening_progress`
   - `puzzle_attempts`
   - `saved_games`
   - `move_analyses`
   - `daily_activity`
   - `weakness_metrics`
   - `achievements`
   - `review_queue`
5. Copy your Project URL and Anon Key into `.env` (or paste them directly in the app under **Ayarlar & Senkronizasyon -> Supabase Bağlantı Yapılandırması**).

---

## 4. Installing & Launching the macOS App Locally

After building or downloading the macOS bundle:

1. **Via `.dmg` Installer**:
   - Open `src-tauri/target/release/bundle/dmg/Satranc Akademisi_1.0.0_aarch64.dmg`
   - Drag **Satranc Akademisi.app** into your **Applications** folder.

2. **Via `.app` Bundle Directly**:
   - Located at `src-tauri/target/release/bundle/macos/Satranc Akademisi.app`

3. **Unsigned Local Build / macOS Gatekeeper Note**:
   Because local builds are compiled without a paid Apple Developer ID notarization certificate, macOS Gatekeeper may display an "unverified developer" prompt on external machines. To allow execution:
   - Right-click (or Control-click) `Satranc Akademisi.app` and select **Open**, or run:
     ```bash
     xattr -cr "/Applications/Satranc Akademisi.app"
     ```
