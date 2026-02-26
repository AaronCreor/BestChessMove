<?php
declare(strict_types=1);

$deployLabel = 'Last deployed via GitHub Actions: pending';
$deployMetaFile = __DIR__ . DIRECTORY_SEPARATOR . 'deploy-meta.json';
$cssVersion = @filemtime(__DIR__ . DIRECTORY_SEPARATOR . 'css' . DIRECTORY_SEPARATOR . 'style.css') ?: time();
$jsVersion = @filemtime(__DIR__ . DIRECTORY_SEPARATOR . 'js' . DIRECTORY_SEPARATOR . 'app.js') ?: time();
if (is_file($deployMetaFile)) {
    $raw = file_get_contents($deployMetaFile);
    if (is_string($raw)) {
        $meta = json_decode($raw, true);
        if (is_array($meta) && !empty($meta['last_deployed_at'])) {
            $deployLabel = 'Last deployed via GitHub Actions on ' . $meta['last_deployed_at'];
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Best Chess Move</title>
  <meta name="description" content="Interactive next chess move calculator. Set positions with drag-and-drop or FEN, flip the board, and analyze with browser-based Stockfish.">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="https://best-chess-move.com/">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Best Chess Move">
  <meta property="og:description" content="Interactive chess position analyzer with FEN input and browser-based Stockfish move calculation.">
  <meta property="og:url" content="https://best-chess-move.com/">
  <meta property="og:site_name" content="Best Chess Move">
  <meta name="twitter:card" content="summary">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Best Chess Move",
    "url": "https://best-chess-move.com/",
    "applicationCategory": "GameApplication",
    "operatingSystem": "Web Browser",
    "description": "Interactive chess position analyzer with FEN input, board editing, and browser-based Stockfish move calculation.",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "creator": {
      "@type": "Person",
      "name": "Aaron Creor",
      "url": "https://aaroncreor.com/"
    }
  }
  </script>
  <link rel="stylesheet" href="css/style.css?v=<?php echo rawurlencode((string) $cssVersion); ?>">
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-00Z48PQSF2"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());

    gtag('config', 'G-00Z48PQSF2');
  </script>
</head>
<body>
  <main class="app-shell">
    <section class="board-panel">
      <div class="panel-header">
        <h1>Best Chess Move</h1>
        <p>Enter a position with moves or FEN, then calculate the next move.</p>
      </div>
      <div class="piece-tray tray-black" id="tray-black" aria-label="Black spare pieces">
        <button type="button" class="piece tray-piece black-piece" data-piece="q" title="Add black queen">♛</button>
        <button type="button" class="piece tray-piece black-piece" data-piece="r" title="Add black rook">♜</button>
        <button type="button" class="piece tray-piece black-piece" data-piece="b" title="Add black bishop">♝</button>
        <button type="button" class="piece tray-piece black-piece" data-piece="n" title="Add black knight">♞</button>
        <button type="button" class="piece tray-piece black-piece" data-piece="p" title="Add black pawn">♟</button>
      </div>
      <div class="board-stage">
        <div id="board" class="chess-board" aria-label="Interactive chess board"></div>
        <div id="board-loading" class="board-loading hidden" aria-live="polite" aria-hidden="true">
          <div class="board-loading-card">
            <div class="board-loading-title">Analyzing position...</div>
            <div class="board-loading-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100">
              <div id="board-loading-bar-fill" class="board-loading-bar-fill"></div>
            </div>
            <div id="board-loading-progress-text" class="board-loading-subtitle">Preparing engine...</div>
          </div>
        </div>
      </div>
      <div class="piece-tray tray-white" id="tray-white" aria-label="White spare pieces">
        <button type="button" class="piece tray-piece white-piece" data-piece="Q" title="Add white queen">♕</button>
        <button type="button" class="piece tray-piece white-piece" data-piece="R" title="Add white rook">♖</button>
        <button type="button" class="piece tray-piece white-piece" data-piece="B" title="Add white bishop">♗</button>
        <button type="button" class="piece tray-piece white-piece" data-piece="N" title="Add white knight">♘</button>
        <button type="button" class="piece tray-piece white-piece" data-piece="P" title="Add white pawn">♙</button>
      </div>
      <p class="board-setup-hint">Drag spare pieces onto the board. Drag a board piece off the board to delete it.</p>
      <section class="about-panel" aria-label="About this tool">
        <h2>Next Chess Move</h2>
        <p>Drag pieces to configure the board and press <strong>Calculate next move</strong>. The engine will analyze the current position and highlight the suggested move.</p>
        <p>Use FEN to paste positions instantly, flip the board for Black's perspective, and test openings, tactics, or endgames on desktop or mobile.</p>
      </section>
      <footer class="panel-footer">
        <p class="panel-footer-left">Created by <a href="https://aaroncreor.com/" target="_blank" rel="noopener noreferrer">Aaron Creor</a></p>
        <p class="panel-footer-right"><?php echo htmlspecialchars($deployLabel, ENT_QUOTES, 'UTF-8'); ?></p>
      </footer>
    </section>

    <aside class="controls-panel" aria-label="Chess controls">
      <div class="control-card">
        <label for="fen-input" class="label">FEN</label>
        <textarea id="fen-input" rows="3" spellcheck="false" placeholder="Paste FEN here"></textarea>
        <button id="apply-fen-btn" type="button" class="secondary-btn">Apply FEN</button>
      </div>

      <div class="control-card">
        <div class="label">Side To Move</div>
        <label class="radio-row"><input type="radio" name="side-to-move" value="w" checked> White to move</label>
        <label class="radio-row"><input type="radio" name="side-to-move" value="b"> Black to move</label>
      </div>

      <div class="control-card">
        <label for="depth-select" class="label">Engine Strength</label>
        <select id="depth-select">
          <option value="10">Fast (Depth 10)</option>
          <option value="15" selected>Balanced (Depth 15)</option>
          <option value="20">Slow (Depth 20)</option>
        </select>
      </div>

      <div class="control-card actions">
        <button id="reset-btn" type="button" class="secondary-btn">Reset</button>
        <button id="flip-btn" type="button" class="secondary-btn">Flip Board</button>
        <button id="calculate-btn" type="button" class="primary-btn">Calculate Next Move</button>
      </div>

      <div class="control-card">
        <div class="label">Result</div>
        <p id="status-text" class="status-text">Ready.</p>
        <p id="best-move-text" class="best-move-text">Best move: <span>-</span></p>
      </div>
    </aside>
  </main>
  <script src="js/app.js?v=<?php echo rawurlencode((string) $jsVersion); ?>"></script>
</body>
</html>
