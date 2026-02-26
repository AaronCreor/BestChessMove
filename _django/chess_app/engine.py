from __future__ import annotations

import math
import time

import chess


PIECE_VALUES = {
    chess.PAWN: 100,
    chess.KNIGHT: 320,
    chess.BISHOP: 330,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 0,
}

# Piece-square tables (white perspective, a1..h8). Black uses mirrored squares.
PAWN_TABLE = [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0,
]

KNIGHT_TABLE = [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
]

BISHOP_TABLE = [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20,
]

ROOK_TABLE = [
    0, 0, 0, 5, 5, 0, 0, 0,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    5, 10, 10, 10, 10, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0,
]

QUEEN_TABLE = [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20,
]

KING_MID_TABLE = [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20,
]

PIECE_SQUARE_TABLES = {
    chess.PAWN: PAWN_TABLE,
    chess.KNIGHT: KNIGHT_TABLE,
    chess.BISHOP: BISHOP_TABLE,
    chess.ROOK: ROOK_TABLE,
    chess.QUEEN: QUEEN_TABLE,
    chess.KING: KING_MID_TABLE,
}


def _is_endgame(board: chess.Board) -> bool:
    queens = len(board.pieces(chess.QUEEN, chess.WHITE)) + len(board.pieces(chess.QUEEN, chess.BLACK))
    minors_majors = 0
    for piece_type in (chess.ROOK, chess.BISHOP, chess.KNIGHT):
        minors_majors += len(board.pieces(piece_type, chess.WHITE))
        minors_majors += len(board.pieces(piece_type, chess.BLACK))
    return queens == 0 or minors_majors <= 4


def _move_order_score(board: chess.Board, move: chess.Move) -> int:
    score = 0

    if board.is_capture(move):
        victim_piece = board.piece_at(move.to_square)
        if victim_piece is None and board.is_en_passant(move):
            victim_value = PIECE_VALUES[chess.PAWN]
        else:
            victim_value = PIECE_VALUES.get(victim_piece.piece_type, 0) if victim_piece else 0
        attacker_piece = board.piece_at(move.from_square)
        attacker_value = PIECE_VALUES.get(attacker_piece.piece_type, 0) if attacker_piece else 0
        score += 10_000 + (10 * victim_value) - attacker_value

    if move.promotion:
        score += 8_000 + PIECE_VALUES.get(move.promotion, 0)

    if board.gives_check(move):
        score += 700

    if board.is_castling(move):
        score += 200

    return score


def _ordered_moves(board: chess.Board) -> list[chess.Move]:
    return sorted(board.legal_moves, key=lambda mv: _move_order_score(board, mv), reverse=True)


def _evaluate_position(board: chess.Board) -> int:
    if board.is_checkmate():
        return -100_000 if board.turn else 100_000
    if board.is_stalemate() or board.is_insufficient_material():
        return 0

    score = 0
    endgame = _is_endgame(board)

    for square, piece in board.piece_map().items():
        sign = 1 if piece.color == chess.WHITE else -1
        base = PIECE_VALUES[piece.piece_type]
        pst = PIECE_SQUARE_TABLES[piece.piece_type]
        idx = square if piece.color == chess.WHITE else chess.square_mirror(square)

        # Encourage king centralization slightly in endgames.
        king_adjust = 0
        if piece.piece_type == chess.KING and endgame:
            file_distance = abs(chess.square_file(square) - 3.5)
            rank_distance = abs(chess.square_rank(square) - 3.5)
            king_adjust = int(30 - 8 * (file_distance + rank_distance))

        score += sign * (base + pst[idx] + king_adjust)

    # Small mobility bonus for side to move to reduce ties.
    mobility = board.legal_moves.count()
    score += (2 * mobility) if board.turn == chess.WHITE else -(2 * mobility)

    if board.is_check():
        score += -35 if board.turn == chess.WHITE else 35

    return score


def _minimax(board: chess.Board, depth: int, alpha: float, beta: float, nodes: list[int]) -> int:
    nodes[0] += 1
    if depth == 0 or board.is_game_over():
        return _evaluate_position(board)

    if board.turn == chess.WHITE:
        best = -math.inf
        for move in _ordered_moves(board):
            board.push(move)
            best = max(best, _minimax(board, depth - 1, alpha, beta, nodes))
            board.pop()
            alpha = max(alpha, best)
            if beta <= alpha:
                break
        return int(best)

    best = math.inf
    for move in _ordered_moves(board):
        board.push(move)
        best = min(best, _minimax(board, depth - 1, alpha, beta, nodes))
        board.pop()
        beta = min(beta, best)
        if beta <= alpha:
            break
    return int(best)


def calculate_best_move(fen: str, depth: int = 2) -> dict:
    board = chess.Board(fen)
    start_time = time.perf_counter()
    nodes = [0]

    if board.is_game_over():
        return {
            "fen": board.fen(),
            "best_move": None,
            "san": None,
            "reason": "Game is already over.",
            "is_game_over": True,
            "result": board.result(claim_draw=True),
            "elapsed_ms": 0,
            "nodes": 0,
        }

    best_move = None
    best_score = -math.inf if board.turn == chess.WHITE else math.inf

    for move in _ordered_moves(board):
        board.push(move)
        score = _minimax(board, depth - 1, -math.inf, math.inf, nodes)
        board.pop()

        if board.turn == chess.WHITE and score > best_score:
            best_score = score
            best_move = move
        elif board.turn == chess.BLACK and score < best_score:
            best_score = score
            best_move = move

    if best_move is None:
        return {
            "fen": board.fen(),
            "best_move": None,
            "san": None,
            "reason": "No legal moves available.",
            "is_game_over": board.is_game_over(),
            "result": board.result(claim_draw=True) if board.is_game_over() else None,
            "elapsed_ms": int((time.perf_counter() - start_time) * 1000),
            "nodes": nodes[0],
        }

    san = board.san(best_move)
    from_square = chess.square_name(best_move.from_square)
    to_square = chess.square_name(best_move.to_square)

    return {
        "fen": board.fen(),
        "best_move": best_move.uci(),
        "san": san,
        "from_square": from_square,
        "to_square": to_square,
        "score_cp": int(best_score),
        "is_game_over": False,
        "result": None,
        "depth": depth,
        "nodes": nodes[0],
        "elapsed_ms": int((time.perf_counter() - start_time) * 1000),
    }
