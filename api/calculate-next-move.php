<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
http_response_code(503);

echo json_encode([
    'error' => 'Server-side fallback is disabled in the PHP build. Use browser Stockfish (client-side analysis).',
    'engine' => 'php_stub',
], JSON_UNESCAPED_SLASHES);

