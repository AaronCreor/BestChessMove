# Local Stockfish Assets

Place the browser Stockfish worker assets in this folder to avoid CDN dependency and fix worker/wasm path issues.

Supported local filenames (same directory):

- Preferred (current setup):
  - `vendor/stockfish/stockfish-18-single.js`
  - `vendor/stockfish/stockfish-18-single.wasm`
- Also supported by the loader:
  - `vendor/stockfish/stockfish.js`
  - `vendor/stockfish/stockfish.wasm`

The frontend (`js/app.js`) is already configured to try local assets first:

1. `/vendor/stockfish/stockfish-18-single.js`
2. `/vendor/stockfish/stockfish.js`
3. CDN fallback (`jsDelivr`)

Recommended source (match a worker build that loads `stockfish.wasm` relative to `stockfish.js`):
- https://github.com/nmrugg/stockfish.js

After uploading the files, hard refresh the browser (`Ctrl+F5`) and the status text should indicate browser Stockfish using local assets.
