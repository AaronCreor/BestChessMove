import json

import chess
from django.http import HttpResponseBadRequest, JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .engine import calculate_best_move


def index(request):
    return render(request, "chess_app/index.html")


@csrf_exempt
@require_POST
def calculate_next_move(request):
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return HttpResponseBadRequest("Invalid JSON.")

    fen = (payload.get("fen") or "").strip()
    depth = payload.get("depth", 3)

    if not fen:
        return JsonResponse({"error": "FEN is required."}, status=400)

    try:
        depth = int(depth)
    except (TypeError, ValueError):
        depth = 3
    depth = max(1, min(depth, 4))

    try:
        chess.Board(fen)
    except ValueError as exc:
        return JsonResponse({"error": f"Invalid FEN: {exc}"}, status=400)

    result = calculate_best_move(fen, depth=depth)
    return JsonResponse(result)
