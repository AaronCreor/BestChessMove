# best-chess-move

Browser-based chess move calculator deployed as a simple `HTML + CSS + JavaScript + PHP` site for shared hosting / DirectAdmin environments.

This project was converted from a Django implementation because the target host's DirectAdmin/LiteSpeed Python runtime (`lswsgi`) was missing, which caused persistent `503` errors despite the Django app itself being valid.

## Current Stack

- `index.php` (page entrypoint)
- `css/style.css` (UI styling)
- `js/app.js` (interactive board + browser Stockfish integration)
- `api/calculate-next-move.php` (PHP fallback stub endpoint)
- `robots.txt` / `sitemap.xml` (SEO)

## Features

- Interactive chess board (desktop + mobile)
- Drag/drop manual position editing
- FEN input + sync
- Side-to-move toggle
- Flip board (white/black perspective)
- Browser-side Stockfish (Web Worker) analysis
- Depth presets:
  - Fast (10)
  - Balanced (15) default
  - Slow (20)
- Loading overlay with progress updates
- Best-move highlighting on the board

## Architecture Notes

### Move Calculation

Primary engine is **browser Stockfish** (client-side):
- No server-side engine process required
- Works on basic PHP hosting
- Avoids Python/LiteSpeed integration issues on shared hosts
- Implemented as JavaScript running in a Web Worker (with a Stockfish JS/WASM build)
- Local-first worker loading:
  - `/vendor/stockfish/stockfish.js` (preferred)
  - CDN fallback (`jsDelivr`)

If browser Stockfish fails to load (e.g., CDN blocked), the frontend attempts a fallback request to:
- `api/calculate-next-move.php`

The PHP fallback is currently a stub that returns a JSON error message (server-side engine disabled in the PHP build).

Move calculation is now implemented via the **Lichess Cloud Eval API** through `api/calculate-next-move.php` (PHP proxy endpoint).

## Project Layout

- `index.php` - active web entrypoint
- `css/` - active styles
- `js/` - active frontend app logic
- `api/` - active PHP endpoints
- `vendor/stockfish/` - local Stockfish worker/wasm assets (preferred; CDN fallback exists)
- `deploy-meta.json` - generated during GitHub Actions deploy (footer timestamp)
- `_django/` - archived legacy Django implementation (not used for production)

## Legacy Django Archive

The prior Django project is preserved in:

- `_django/`

It includes the original Django app, Python backend engine, templates, and deployment files for historical/reference purposes.

It is excluded from FTP deployment via GitHub Actions.

## GitHub Actions Deployment

Workflow:
- `.github/workflows/deploy.yml`

Behavior:
- Triggers on push to `master`
- Deploys site files over FTP to `REMOTE_PATH`
- Generates `deploy-meta.json` with the UTC deployment timestamp used by the footer
- Excludes local/dev artifacts and `_django/`

Required secrets:
- `FTP_SERVER`
- `FTP_USERNAME`
- `FTP_PASSWORD`
- `FTP_PORT`
- `REMOTE_PATH`

Additional API secret used for move calculation:
- `Lichess_Secret` (used by GitHub Actions to generate `api/lichess-config.php` on deploy)

## Operational Notes

- Browser Stockfish is loaded from CDN (`jsDelivr`) inside a Web Worker.
- The app now loads Stockfish via a direct worker URL (local-first), which fixes the prior `.wasm` path issue caused by blob worker wrappers.
- If local assets are missing, it falls back to CDN.
- If the CDN is blocked, move calculation will fail with a user-facing error unless a real server-side fallback is implemented.
- To remove CDN dependency completely, upload `stockfish.js` and `stockfish.wasm` into `vendor/stockfish/`.
