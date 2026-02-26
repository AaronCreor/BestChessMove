from django.db import models


class SavedPosition(models.Model):
    """Optional persistence for bookmarked or reusable chess positions."""

    name = models.CharField(max_length=120)
    fen = models.CharField(max_length=120)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return self.name


class AnalysisRecord(models.Model):
    """Stores calculation requests/results for analytics or user history."""

    ENGINE_CHOICES = [
        ("browser_stockfish", "Browser Stockfish"),
        ("server_fallback", "Server Fallback"),
        ("python_engine", "Python Engine"),
        ("unknown", "Unknown"),
    ]

    fen = models.CharField(max_length=120)
    active_color = models.CharField(max_length=1, choices=[("w", "White"), ("b", "Black")])
    board_orientation = models.CharField(
        max_length=5,
        choices=[("white", "White Bottom"), ("black", "Black Bottom")],
        default="white",
    )

    requested_depth = models.PositiveSmallIntegerField(default=15)
    engine_name = models.CharField(max_length=32, choices=ENGINE_CHOICES, default="unknown")
    engine_depth = models.PositiveSmallIntegerField(null=True, blank=True)

    best_move_uci = models.CharField(max_length=8, blank=True)
    best_move_san = models.CharField(max_length=32, blank=True)
    from_square = models.CharField(max_length=2, blank=True)
    to_square = models.CharField(max_length=2, blank=True)

    score_cp = models.IntegerField(null=True, blank=True)
    score_mate = models.IntegerField(null=True, blank=True)
    nodes = models.BigIntegerField(null=True, blank=True)
    elapsed_ms = models.PositiveIntegerField(null=True, blank=True)

    is_game_over = models.BooleanField(default=False)
    result = models.CharField(max_length=12, blank=True)
    error_message = models.TextField(blank=True)

    # Useful if you later want rate limiting / abuse monitoring.
    client_ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["created_at"]),
            models.Index(fields=["engine_name", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.created_at:%Y-%m-%d %H:%M:%S} {self.best_move_uci or '-'}"
