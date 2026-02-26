# best-chess-move

`best-chess-move` is a Django-based chess position analysis web app designed to be compatible with cPanel's `Setup Python App` deployment model.

The application provides:
- an interactive chessboard (desktop + mobile)
- FEN input / synchronization
- side-to-move selection
- board flip (white/black perspective)
- best-move calculation with highlighted source/target squares

## Tech Stack

- Python 3.x
- Django 5.x
- `python-chess` (server-side board validation and fallback move search)
- Vanilla JavaScript (custom board UI + interaction logic)
- Browser-based Stockfish (Web Worker, loaded from CDN)
- CSS (responsive custom UI theme)

## Architecture

### Frontend

- Template: `templates/chess_app/index.html`
- Styles: `static/chess_app/css/style.css`
- App logic: `static/chess_app/js/app.js`

The frontend renders a custom board (no third-party board widget dependency), supports drag/drop editing, FEN parsing/generation, and board orientation flipping.

Move calculation flow:
1. Build current FEN from board state
2. Run browser Stockfish (Web Worker) at selected depth (`10`, `15`, `20`)
3. Parse UCI best move
4. Highlight move on board and display engine info
5. If browser Stockfish is unavailable, fall back to the Django API endpoint

### Backend

- Project config: `best_chess_move/`
- App: `chess_app/`
- Endpoint: `POST /api/calculate-next-move/`

The backend validates FEN and computes a fallback move using a `python-chess` minimax/alpha-beta search with:
- material evaluation
- positional piece-square tables
- move ordering (captures/checks/promotions)

This backend engine is intentionally a fallback. Strong analysis is expected to come from browser Stockfish.

## Local Development

### 1. Create virtual environment

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

If PowerShell blocks activation:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

### 2. Install dependencies

```powershell
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

### 3. Run migrations

```powershell
.\venv\Scripts\python.exe manage.py migrate
```

### 4. Start dev server

```powershell
.\venv\Scripts\python.exe manage.py runserver
```

Open:
- `http://127.0.0.1:8000/`
- `http://localhost:8000/`

## API (Fallback Engine)

### Endpoint

`POST /api/calculate-next-move/`

### Request body

```json
{
  "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "depth": 3
}
```

Note: backend depth is capped for performance and is mainly used when browser Stockfish is unavailable.

## Deployment (cPanel `Setup Python App`)

### Files of interest

- `passenger_wsgi.py` (WSGI entrypoint)
- `manage.py`
- `requirements.txt`

### Typical cPanel setup

1. Upload project files to the app root directory
2. Create Python app in cPanel (`Setup Python App`)
3. Set startup file to `passenger_wsgi.py`
4. Set application entry point to `application`
5. Install requirements in the app virtual environment
6. Run migrations
7. Restart the Python app

## Notes / Constraints

- Browser Stockfish is currently loaded from a CDN in a Web Worker. If blocked by network policy, the app automatically uses the server fallback engine.
- For maximum reliability, host Stockfish worker assets locally under `static/`.
- The frontend board currently supports manual position editing (drag/drop) and FEN synchronization; it does not enforce full move legality client-side.

## Future Improvements

- Local hosting of Stockfish WASM/worker assets (no CDN dependency)
- SVG chess piece set (pixel/block style)
- Full legal move enforcement client-side
- PGN import/export
- Position setup tools (add/remove pieces, castling toggles)
