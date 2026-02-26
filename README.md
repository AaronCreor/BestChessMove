# best-chess-move

Browser-based chess move calculator deployed as a simple `HTML + CSS + JavaScript + PHP` site for shared hosting / DirectAdmin environments.

This project was converted from a Django implementation because the target host's DirectAdmin/LiteSpeed Python runtime (`lswsgi`) was missing, which caused persistent `503` errors despite the Django app itself being valid.

## Current Stack

- `index.php` (page entrypoint)
- `css/style.css` (UI styling)
- `js/app.js` (interactive board + browser Stockfish integration)
- `api/calculate-next-move.php` (PHP fallback stub endpoint)

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

If browser Stockfish fails to load (e.g., CDN blocked), the frontend attempts a fallback request to:
- `api/calculate-next-move.php`

The PHP fallback is currently a stub that returns a JSON error message (server-side engine disabled in the PHP build).

## Project Layout

- `index.php` - active web entrypoint
- `css/` - active styles
- `js/` - active frontend app logic
- `api/` - active PHP endpoints
- `_django/` - archived legacy Django implementation (not used for production)

## Legacy Django Archive

The prior Django project is preserved in:

- `_django/`

It includes the original Django app, Python backend engine, templates, and deployment files for historical/reference purposes.

It is excluded from FTP deployment via GitHub Actions.

## Local Development (PHP/static)

Because the app is mostly frontend-driven, any simple local static/PHP server works.

### Option A: PHP built-in server

```bash
php -S localhost:8000
```

Open:
- `http://localhost:8000/`

### Option B: VS Code Live Server / any static server

Works for the UI, but note the PHP fallback endpoint will not execute unless a PHP server is used.

## DirectAdmin Deployment

### FTP path

If your FTP user is chrooted to the domain root (as in this setup), set:

- `REMOTE_PATH=public_html`

### Why not `domains/.../public_html`?

That path is the server filesystem path used by DirectAdmin internally.  
Your FTP user may already be rooted at the domain directory, so only `public_html` is visible/valid for FTP uploads.

## GitHub Actions Deployment

Workflow:
- `.github/workflows/deploy.yml`

Behavior:
- Triggers on push to `main` or `master`
- Deploys site files over FTP to `REMOTE_PATH`
- Excludes local/dev artifacts and `_django/`

Required secrets:
- `FTP_SERVER`
- `FTP_USERNAME`
- `FTP_PASSWORD`
- `FTP_PORT`
- `REMOTE_PATH`

Recommended value in this hosting setup:
- `REMOTE_PATH=public_html`

## Operational Notes

- Browser Stockfish is loaded from CDN (`jsDelivr`) inside a Web Worker.
- If the CDN is blocked, move calculation will fail with a user-facing error unless a real server-side fallback is implemented.
- To remove CDN dependency, host the Stockfish worker locally and update `js/app.js`.

## Future Improvements

- Local-hosted Stockfish worker assets (no CDN dependency)
- Real PHP fallback engine integration (e.g., external analysis API proxy)
- SVG/pixel chess piece set
- PGN import/export
- Position setup tools (castling/en passant controls)
