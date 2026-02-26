(function () {
  var boardRoot = document.getElementById("board");
  var boardLoading = document.getElementById("board-loading");
  var boardLoadingBarFill = document.getElementById("board-loading-bar-fill");
  var boardLoadingProgressText = document.getElementById("board-loading-progress-text");
  var fenInput = document.getElementById("fen-input");
  var applyFenBtn = document.getElementById("apply-fen-btn");
  var calculateBtn = document.getElementById("calculate-btn");
  var resetBtn = document.getElementById("reset-btn");
  var flipBtn = document.getElementById("flip-btn");
  var depthSelect = document.getElementById("depth-select");
  var statusText = document.getElementById("status-text");
  var bestMoveText = document.querySelector("#best-move-text span");
  var sideInputs = document.querySelectorAll('input[name="side-to-move"]');

  var FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
  var RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];
  var PIECE_LABELS = {
    P: "♙",
    N: "♘",
    B: "♗",
    R: "♖",
    Q: "♕",
    K: "♔",
    p: "♟",
    n: "♞",
    b: "♝",
    r: "♜",
    q: "♛",
    k: "♚"
  };

  var state = {
    orientation: "white",
    pieces: {},
    activeColor: "w",
    castling: "KQkq",
    enPassant: "-",
    halfmove: 0,
    fullmove: 1,
    dragFrom: null,
    highlightedFrom: null,
    highlightedTo: null
  };

  function setStatus(message, isError) {
    statusText.textContent = message;
    statusText.style.color = isError ? "#c1121f" : "";
  }

  function setBoardLoading(isLoading) {
    boardLoading.classList.toggle("hidden", !isLoading);
    boardLoading.setAttribute("aria-hidden", isLoading ? "false" : "true");
    if (!isLoading) {
      boardLoadingBarFill.style.width = "42%";
      boardLoadingBarFill.classList.remove("determinate");
      boardLoadingProgressText.textContent = "Preparing engine...";
    }
  }

  function updateLoadingProgress(percent, text) {
    var p = Math.max(2, Math.min(100, Math.round(percent)));
    boardLoadingBarFill.classList.add("determinate");
    boardLoadingBarFill.style.width = p + "%";
    if (text) {
      boardLoadingProgressText.textContent = text;
    }
  }

  function setLoadingIndeterminate(text) {
    boardLoadingBarFill.classList.remove("determinate");
    boardLoadingBarFill.style.width = "42%";
    if (text) {
      boardLoadingProgressText.textContent = text;
    }
  }

  function selectedSide() {
    var checked = document.querySelector('input[name="side-to-move"]:checked');
    return checked ? checked.value : "w";
  }

  function setSideRadio(turn) {
    sideInputs.forEach(function (input) {
      input.checked = input.value === turn;
    });
  }

  function getDisplayFiles() {
    return state.orientation === "white" ? FILES.slice() : FILES.slice().reverse();
  }

  function getDisplayRanks() {
    return state.orientation === "white" ? RANKS.slice() : RANKS.slice().reverse();
  }

  function squareColor(fileIndex, rankIndex) {
    return ((fileIndex + rankIndex) % 2 === 0) ? "light" : "dark";
  }

  function clearHighlights() {
    state.highlightedFrom = null;
    state.highlightedTo = null;
  }

  function createBoardGrid() {
    boardRoot.innerHTML = "";
    var boardFrame = document.createElement("div");
    boardFrame.className = "board-frame";

    var fileRowTop = document.createElement("div");
    fileRowTop.className = "coords-row top";
    fileRowTop.appendChild(document.createElement("div"));
    getDisplayFiles().forEach(function (file) {
      var el = document.createElement("div");
      el.className = "coord-cell";
      el.textContent = file;
      fileRowTop.appendChild(el);
    });
    fileRowTop.appendChild(document.createElement("div"));
    boardFrame.appendChild(fileRowTop);

    var body = document.createElement("div");
    body.className = "board-body";
    var rankLabelsLeft = document.createElement("div");
    rankLabelsLeft.className = "rank-col";
    var squaresGrid = document.createElement("div");
    squaresGrid.className = "squares-grid";
    var rankLabelsRight = document.createElement("div");
    rankLabelsRight.className = "rank-col";

    var displayRanks = getDisplayRanks();
    var displayFiles = getDisplayFiles();

    displayRanks.forEach(function (rank, rankPos) {
      [rankLabelsLeft, rankLabelsRight].forEach(function (col) {
        var rankCell = document.createElement("div");
        rankCell.className = "rank-cell";
        rankCell.textContent = rank;
        col.appendChild(rankCell);
      });

      displayFiles.forEach(function (file, filePos) {
        var square = document.createElement("div");
        var squareName = file + rank;
        square.className = "board-square " + squareColor(filePos, rankPos);
        square.dataset.square = squareName;
        square.addEventListener("dragover", onSquareDragOver);
        square.addEventListener("drop", onSquareDrop);
        square.addEventListener("click", onSquareClick);
        squaresGrid.appendChild(square);
      });
    });

    body.appendChild(rankLabelsLeft);
    body.appendChild(squaresGrid);
    body.appendChild(rankLabelsRight);
    boardFrame.appendChild(body);

    var fileRowBottom = document.createElement("div");
    fileRowBottom.className = "coords-row bottom";
    fileRowBottom.appendChild(document.createElement("div"));
    getDisplayFiles().forEach(function (file) {
      var el2 = document.createElement("div");
      el2.className = "coord-cell";
      el2.textContent = file;
      fileRowBottom.appendChild(el2);
    });
    fileRowBottom.appendChild(document.createElement("div"));
    boardFrame.appendChild(fileRowBottom);

    boardRoot.appendChild(boardFrame);
  }

  function renderPieces() {
    var squares = boardRoot.querySelectorAll(".board-square");
    squares.forEach(function (squareEl) {
      var squareName = squareEl.dataset.square;
      var piece = state.pieces[squareName];
      squareEl.innerHTML = "";
      squareEl.classList.toggle("highlight-from", squareName === state.highlightedFrom);
      squareEl.classList.toggle("highlight-to", squareName === state.highlightedTo);

      if (piece) {
        var pieceEl = document.createElement("span");
        pieceEl.className = "piece " + (piece === piece.toUpperCase() ? "white-piece" : "black-piece");
        pieceEl.textContent = PIECE_LABELS[piece];
        pieceEl.title = squareName + ": " + piece;
        pieceEl.draggable = true;
        pieceEl.dataset.square = squareName;
        pieceEl.addEventListener("dragstart", onPieceDragStart);
        squareEl.appendChild(pieceEl);
      }
    });
  }

  function renderBoard() {
    createBoardGrid();
    renderPieces();
  }

  function placementToPieces(placement) {
    var ranks = placement.split("/");
    if (ranks.length !== 8) {
      throw new Error("FEN placement must have 8 ranks.");
    }

    var pieces = {};
    for (var i = 0; i < 8; i += 1) {
      var rank = 8 - i;
      var fileIdx = 0;
      for (var j = 0; j < ranks[i].length; j += 1) {
        var ch = ranks[i][j];
        if (/\d/.test(ch)) {
          fileIdx += parseInt(ch, 10);
          continue;
        }
        if (!Object.prototype.hasOwnProperty.call(PIECE_LABELS, ch)) {
          throw new Error("Invalid piece code in FEN.");
        }
        if (fileIdx > 7) {
          throw new Error("Too many squares in rank.");
        }
        pieces[FILES[fileIdx] + String(rank)] = ch;
        fileIdx += 1;
      }
      if (fileIdx !== 8) {
        throw new Error("Each rank must contain exactly 8 squares.");
      }
    }
    return pieces;
  }

  function piecesToPlacement() {
    var rows = [];
    for (var r = 8; r >= 1; r -= 1) {
      var row = "";
      var emptyCount = 0;
      for (var f = 0; f < 8; f += 1) {
        var sq = FILES[f] + String(r);
        var piece = state.pieces[sq];
        if (!piece) {
          emptyCount += 1;
        } else {
          if (emptyCount > 0) {
            row += String(emptyCount);
            emptyCount = 0;
          }
          row += piece;
        }
      }
      if (emptyCount > 0) {
        row += String(emptyCount);
      }
      rows.push(row);
    }
    return rows.join("/");
  }

  function currentFen() {
    return [
      piecesToPlacement(),
      state.activeColor,
      state.castling || "-",
      state.enPassant || "-",
      String(state.halfmove || 0),
      String(state.fullmove || 1)
    ].join(" ");
  }

  function syncFenUI() {
    fenInput.value = currentFen();
    setSideRadio(state.activeColor);
  }

  function loadFen(fen) {
    var parts = (fen || "").trim().split(/\s+/);
    if (parts.length < 2) {
      throw new Error("FEN must include placement and active color.");
    }

    state.pieces = placementToPieces(parts[0]);
    state.activeColor = parts[1] === "b" ? "b" : "w";
    state.castling = parts[2] || "-";
    state.enPassant = parts[3] || "-";
    state.halfmove = Number.isFinite(parseInt(parts[4], 10)) ? parseInt(parts[4], 10) : 0;
    state.fullmove = Number.isFinite(parseInt(parts[5], 10)) ? parseInt(parts[5], 10) : 1;
    clearHighlights();
    renderBoard();
    syncFenUI();
  }

  function onPieceDragStart(event) {
    state.dragFrom = event.target.dataset.square;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", state.dragFrom);
  }

  function onSquareDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function applyManualMove(fromSquare, toSquare) {
    if (!fromSquare || !toSquare || fromSquare === toSquare) {
      return;
    }
    var piece = state.pieces[fromSquare];
    if (!piece) {
      return;
    }

    delete state.pieces[fromSquare];
    state.pieces[toSquare] = piece;
    state.activeColor = selectedSide() === "w" ? "b" : "w";
    setSideRadio(state.activeColor);

    state.castling = "-";
    state.enPassant = "-";
    state.halfmove = 0;
    state.fullmove = 1;

    clearHighlights();
    bestMoveText.textContent = "-";
    renderPieces();
    syncFenUI();
    setStatus("Position updated by drag-and-drop.", false);
  }

  function onSquareDrop(event) {
    event.preventDefault();
    var fromSquare = event.dataTransfer.getData("text/plain") || state.dragFrom;
    var toSquare = event.currentTarget.dataset.square;
    state.dragFrom = null;
    applyManualMove(fromSquare, toSquare);
  }

  function onSquareClick(event) {
    var square = event.currentTarget.dataset.square;
    if (state.dragFrom && state.dragFrom !== square) {
      applyManualMove(state.dragFrom, square);
      state.dragFrom = null;
      return;
    }

    if (state.pieces[square]) {
      state.dragFrom = square;
      setStatus("Selected " + square + ". Click another square to move, or drag the piece.", false);
    } else {
      state.dragFrom = null;
    }
  }

  function applyFenFromInput() {
    try {
      loadFen(fenInput.value);
      bestMoveText.textContent = "-";
      setStatus("FEN applied.", false);
    } catch (err) {
      setStatus(err.message || "Invalid FEN.", true);
    }
  }

  function updateTurnFromRadio() {
    state.activeColor = selectedSide();
    syncFenUI();
    bestMoveText.textContent = "-";
    setStatus("Side to move updated.", false);
  }

  function highlightMove(fromSquare, toSquare) {
    state.highlightedFrom = fromSquare;
    state.highlightedTo = toSquare;
    renderPieces();
  }

  function parseUciMove(uci) {
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci || "")) {
      return null;
    }
    return {
      best_move: uci,
      from_square: uci.slice(0, 2),
      to_square: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci.slice(4) : null
    };
  }

  function formatEngineScore(data) {
    if (typeof data.score_mate === "number") {
      return "Mate in " + Math.abs(data.score_mate) + (data.score_mate > 0 ? " (for side to move)" : " (against side to move)");
    }
    if (typeof data.score_cp === "number") {
      var pawns = (data.score_cp / 100).toFixed(2);
      return "Eval " + pawns;
    }
    return null;
  }

  function BrowserStockfishEngine() {
    this.worker = null;
    this.initPromise = null;
    this.analysisRequest = null;
    this.engineUrls = [
      "/vendor/stockfish/stockfish-18-single.js",
      "/vendor/stockfish/stockfish.js",
      "https://cdn.jsdelivr.net/npm/stockfish@11.0.0/src/stockfish.js"
    ];
    this.activeEngineUrl = null;
    this.initState = {
      uciOk: false,
      readyOk: false
    };
  }

  BrowserStockfishEngine.prototype._post = function (command) {
    this.worker.postMessage(command);
  };

  BrowserStockfishEngine.prototype._resetWorker = function () {
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch (err) {
        // Ignore worker termination issues during fallback attempts.
      }
    }
    this.worker = null;
    this.initPromise = null;
    this.analysisRequest = null;
    this.initState = { uciOk: false, readyOk: false };
  };

  BrowserStockfishEngine.prototype._handleLine = function (line) {
    if (!line) {
      return;
    }

    if (this.initPromise && !this.initState.uciOk && line === "uciok") {
      this.initState.uciOk = true;
      this._post("isready");
      return;
    }
    if (this.initPromise && this.initState.uciOk && !this.initState.readyOk && line === "readyok") {
      this.initState.readyOk = true;
      this.initPromise.resolve();
      this.initPromise = null;
      return;
    }

    if (!this.analysisRequest) {
      return;
    }

    if (line.indexOf("info ") === 0) {
      var info = parseStockfishInfoLine(line);
      if (info && typeof this.analysisRequest.onInfo === "function") {
        this.analysisRequest.onInfo(info);
      }
      if (info) {
        this.analysisRequest.lastInfo = info;
      }
      return;
    }

    if (line.indexOf("bestmove ") === 0) {
      var match = line.match(/^bestmove\s+(\S+)/);
      var bestmove = match ? match[1] : null;
      var req = this.analysisRequest;
      this.analysisRequest = null;
      if (!bestmove || bestmove === "(none)") {
        req.reject(new Error("No best move returned by Stockfish."));
        return;
      }
      req.resolve({
        best_move: bestmove,
        info: req.lastInfo || null
      });
    }
  };

  BrowserStockfishEngine.prototype.init = function () {
    var self = this;
    if (this.worker) {
      return Promise.resolve();
    }
    if (this.initPromise) {
      return this.initPromise.promise;
    }

    var urls = this.engineUrls.slice();

    function tryNextUrl(index, lastError) {
      if (index >= urls.length) {
        return Promise.reject(lastError || new Error("No Stockfish worker source available."));
      }
      return self._initWithUrl(urls[index]).catch(function (err) {
        self._resetWorker();
        return tryNextUrl(index + 1, err);
      });
    }

    return tryNextUrl(0, null);
  };

  BrowserStockfishEngine.prototype._initWithUrl = function (engineUrl) {
    var self = this;

    this.initPromise = {};
    this.initPromise.promise = new Promise(function (resolve, reject) {
      self.initPromise.resolve = resolve;
      self.initPromise.reject = reject;
    });

    try {
      // Load the worker script directly so relative stockfish.wasm paths resolve correctly.
      this.worker = new Worker(engineUrl);
      this.activeEngineUrl = engineUrl;
    } catch (err) {
      this.initPromise.reject(new Error("Failed to create Stockfish worker: " + (err.message || String(err))));
      this.initPromise = null;
      return Promise.reject(err);
    }

    this.worker.onmessage = function (evt) {
      self._handleLine(String(evt.data || "").trim());
    };

    this.worker.onerror = function (evt) {
      var msg = (evt && evt.message) ? evt.message : "Stockfish worker failed to load.";
      if (self.analysisRequest) {
        var req = self.analysisRequest;
        self.analysisRequest = null;
        req.reject(new Error(msg));
      }
      if (self.initPromise) {
        self.initPromise.reject(new Error(msg));
        self.initPromise = null;
      }
    };

    this._post("uci");
    return this.initPromise.promise;
  };

  BrowserStockfishEngine.prototype.analyze = function (fen, depth, onInfo) {
    var self = this;
    return this.init().then(function () {
      if (self.analysisRequest) {
        throw new Error("Analysis already in progress.");
      }

      return new Promise(function (resolve, reject) {
        self.analysisRequest = {
          resolve: resolve,
          reject: reject,
          onInfo: onInfo,
          lastInfo: null
        };

        self._post("stop");
        self._post("ucinewgame");
        self._post("position fen " + fen);
        self._post("go depth " + depth);
      });
    });
  };

  function parseStockfishInfoLine(line) {
    var info = {};
    var depthMatch = line.match(/\bdepth\s+(\d+)/);
    if (depthMatch) {
      info.depth = parseInt(depthMatch[1], 10);
    }
    var seldepthMatch = line.match(/\bseldepth\s+(\d+)/);
    if (seldepthMatch) {
      info.seldepth = parseInt(seldepthMatch[1], 10);
    }
    var nodesMatch = line.match(/\bnodes\s+(\d+)/);
    if (nodesMatch) {
      info.nodes = parseInt(nodesMatch[1], 10);
    }
    var npsMatch = line.match(/\bnps\s+(\d+)/);
    if (npsMatch) {
      info.nps = parseInt(npsMatch[1], 10);
    }
    var cpMatch = line.match(/\bscore\s+cp\s+(-?\d+)/);
    if (cpMatch) {
      info.score_cp = parseInt(cpMatch[1], 10);
    }
    var mateMatch = line.match(/\bscore\s+mate\s+(-?\d+)/);
    if (mateMatch) {
      info.score_mate = parseInt(mateMatch[1], 10);
    }
    var pvMatch = line.match(/\bpv\s+(.+)$/);
    if (pvMatch) {
      info.pv = pvMatch[1];
    }
    return info;
  }

  var browserEngine = new BrowserStockfishEngine();

  function analyzeWithBrowserStockfish(fen, depth) {
    var startedAt = performance.now();
    var latestInfo = null;
    var initTimeoutMs = 12000;

    setLoadingIndeterminate("Loading browser engine...");

    var analysisPromise = browserEngine.analyze(fen, depth, function (info) {
      latestInfo = info;
      if (typeof info.depth === "number") {
        var pct = (info.depth / depth) * 100;
        var scoreText = "";
        if (typeof info.score_mate === "number") {
          scoreText = " mate " + info.score_mate;
        } else if (typeof info.score_cp === "number") {
          scoreText = " eval " + (info.score_cp / 100).toFixed(2);
        }
        updateLoadingProgress(pct, "Depth " + info.depth + " / " + depth + scoreText);
      }
    }).then(function (result) {
      var parsed = parseUciMove(result.best_move);
      if (!parsed) {
        throw new Error("Invalid UCI move returned: " + result.best_move);
      }
      return {
        engine: "browser_stockfish",
        engine_url: browserEngine.activeEngineUrl,
        best_move: parsed.best_move,
        from_square: parsed.from_square,
        to_square: parsed.to_square,
        score_cp: latestInfo && typeof latestInfo.score_cp === "number" ? latestInfo.score_cp : undefined,
        score_mate: latestInfo && typeof latestInfo.score_mate === "number" ? latestInfo.score_mate : undefined,
        nodes: latestInfo && typeof latestInfo.nodes === "number" ? latestInfo.nodes : undefined,
        depth: latestInfo && typeof latestInfo.depth === "number" ? latestInfo.depth : depth,
        elapsed_ms: Math.round(performance.now() - startedAt)
      };
    });

    var timeoutPromise = new Promise(function (_, reject) {
      setTimeout(function () {
        reject(new Error("Browser Stockfish initialization timed out."));
      }, initTimeoutMs);
    });

    return Promise.race([analysisPromise, timeoutPromise]);
  }

  function analyzeViaBackendFallback(fen, requestedDepth) {
    var fallbackDepth = Math.min(4, requestedDepth);
    setLoadingIndeterminate("Browser engine unavailable. Using server fallback (depth " + fallbackDepth + ")...");

    return fetch("/api/calculate-next-move.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fen: fen, depth: fallbackDepth })
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok) {
          throw new Error(data.error || "Calculation failed.");
        }
        data.engine = data.engine || "server_fallback";
        data.requested_depth = requestedDepth;
        data.fallback_depth = fallbackDepth;
        return data;
      });
    });
  }

  function calculateBestMove() {
    clearHighlights();
    renderPieces();

    var fen = currentFen();
    var depth = parseInt(depthSelect.value, 10);
    if (!Number.isFinite(depth)) {
      depth = 15;
    }

    calculateBtn.disabled = true;
    setBoardLoading(true);
    setStatus("Calculating...", false);
    bestMoveText.textContent = "-";

    setLoadingIndeterminate("Contacting analysis server...");

    analyzeViaBackendFallback(fen, depth)
      .then(function (data) {
        if (!data.best_move) {
          setStatus(data.reason || "No move available.", false);
          return;
        }

        highlightMove(data.from_square, data.to_square);
        var scoreLabel = formatEngineScore(data);
        var moveLabel = data.san ? (data.san + " (" + data.best_move + ")") : data.best_move;
        bestMoveText.textContent = scoreLabel ? (moveLabel + " | " + scoreLabel) : moveLabel;

        var parts = ["Best move calculated and highlighted"];
        if (data.engine === "lichess_cloud_eval") {
          parts.push("with Lichess cloud eval");
        } else if (data.engine) {
          parts.push("with " + data.engine);
        }
        if (typeof data.depth === "number") {
          parts.push("(depth " + data.depth + ")");
        }
        if (typeof data.elapsed_ms === "number") {
          parts.push("in " + data.elapsed_ms + " ms");
        }
        setStatus(parts.join(" ") + ".", false);
      })
      .catch(function (err) {
        setStatus(err.message || "Calculation failed.", true);
      })
      .finally(function () {
        calculateBtn.disabled = false;
        setBoardLoading(false);
      });
  }

  function resetBoard() {
    loadFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    bestMoveText.textContent = "-";
    setStatus("Board reset to starting position.", false);
  }

  function flipBoard() {
    state.orientation = state.orientation === "white" ? "black" : "white";
    renderBoard();
    setStatus("Board flipped.", false);
  }

  applyFenBtn.addEventListener("click", applyFenFromInput);
  calculateBtn.addEventListener("click", calculateBestMove);
  resetBtn.addEventListener("click", resetBoard);
  flipBtn.addEventListener("click", flipBoard);
  fenInput.addEventListener("change", applyFenFromInput);
  sideInputs.forEach(function (input) {
    input.addEventListener("change", updateTurnFromRadio);
  });

  setBoardLoading(false);
  resetBoard();
})();
