# Deployment Guide (`DEPLOYMENT.md`)

## 1. Web Deployment on Vercel

The repository includes a preconfigured [`vercel.json`](./vercel.json) with SPA routing and security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`).

### Option A: Deploy via Vercel CLI
```bash
npx vercel login
npx vercel --prod
```

### Option B: Automatic GitHub Integration
1. Push the repository to GitHub (`https://github.com/burakdemirel2005-maker/chess-academy`).
2. Import the repository in the [Vercel Dashboard](https://vercel.com/new).
3. Framework Preset: **Vite**
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under **Environment Variables** if using cloud sync.

---

## 2. Native macOS Packaging (Tauri 2)

To compile the universal/Apple Silicon (`aarch64-apple-darwin`) native desktop `.app` and `.dmg` installer:

```bash
export PATH="$HOME/.cargo/bin:/opt/homebrew/bin:$PATH"
DEVELOPER_DIR=/Library/Developer/CommandLineTools npm run tauri:build
```

Generated artifacts:
- **macOS Application Bundle (`.app`)**:
  `src-tauri/target/release/bundle/macos/Satranc Akademisi.app`
- **macOS Disk Image Installer (`.dmg`)**:
  `src-tauri/target/release/bundle/dmg/Satranc Akademisi_1.0.0_aarch64.dmg`

---

## 3. Continuous Integration (GitHub Actions)

The workflow in [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) runs automatically on every push and pull request to `main`:
1. **Web Build, Typecheck & Unit Tests (`ubuntu-latest`)**:
   - Installs dependencies (`npm ci`)
   - Runs strict TypeScript verification (`npm run typecheck`)
   - Runs Vitest unit tests (`npm test`)
   - Builds the production Vite bundle (`npm run build`)
2. **macOS Tauri 2 Verification (`macos-latest`)**:
   - Installs Rust stable toolchain (`aarch64-apple-darwin`)
   - Runs `cargo check` inside `src-tauri/`
