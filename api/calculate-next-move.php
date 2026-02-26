<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed.'], JSON_UNESCAPED_SLASHES);
    exit;
}

$rawBody = file_get_contents('php://input');
$payload = json_decode($rawBody ?: '', true);
if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON body.'], JSON_UNESCAPED_SLASHES);
    exit;
}

$fen = trim((string)($payload['fen'] ?? ''));
if ($fen === '') {
    http_response_code(400);
    echo json_encode(['error' => 'FEN is required.'], JSON_UNESCAPED_SLASHES);
    exit;
}

$requestedDepth = (int)($payload['depth'] ?? 15);
if ($requestedDepth <= 0) {
    $requestedDepth = 15;
}

$token = getenv('Lichess_Secret') ?: getenv('LICHESS_SECRET') ?: '';
$configPath = __DIR__ . DIRECTORY_SEPARATOR . 'lichess-config.php';
if ($token === '' && is_file($configPath)) {
    $cfg = include $configPath;
    if (is_array($cfg) && !empty($cfg['token'])) {
        $token = (string)$cfg['token'];
    }
}

if (!function_exists('curl_init')) {
    http_response_code(500);
    echo json_encode(['error' => 'cURL is not available on this server.'], JSON_UNESCAPED_SLASHES);
    exit;
}

$query = http_build_query([
    'fen' => $fen,
    'multiPv' => 1,
], '', '&', PHP_QUERY_RFC3986);

$url = 'https://lichess.org/api/cloud-eval?' . $query;
$headers = [
    'Accept: application/json',
    'User-Agent: best-chess-move/1.0 (+https://best-chess-move.com/)',
];
if ($token !== '') {
    $headers[] = 'Authorization: Bearer ' . $token;
}

$startedAt = microtime(true);
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_TIMEOUT => 20,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_FOLLOWLOCATION => true,
]);
$responseBody = curl_exec($ch);
$curlError = curl_error($ch);
$httpCode = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
curl_close($ch);

$elapsedMs = (int)round((microtime(true) - $startedAt) * 1000);

if ($responseBody === false) {
    http_response_code(502);
    echo json_encode([
        'error' => 'Could not reach Lichess cloud eval service.',
        'details' => $curlError,
        'engine' => 'lichess_cloud_eval',
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

$data = json_decode((string)$responseBody, true);
if (!is_array($data)) {
    http_response_code(502);
    echo json_encode([
        'error' => 'Unexpected response from Lichess.',
        'engine' => 'lichess_cloud_eval',
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

if ($httpCode === 429) {
    http_response_code(503);
    echo json_encode([
        'error' => 'Analysis servers are busy right now. Please try again in a moment.',
        'engine' => 'lichess_cloud_eval',
        'rate_limited' => true,
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

if ($httpCode >= 400) {
    $message = (string)($data['error'] ?? 'Lichess API request failed.');
    if ($httpCode === 404) {
        $message = 'No cloud evaluation is available for this position yet. Try again shortly.';
    }
    http_response_code($httpCode);
    echo json_encode([
        'error' => $message,
        'engine' => 'lichess_cloud_eval',
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

$pvs = $data['pvs'] ?? null;
if (!is_array($pvs) || !isset($pvs[0]) || !is_array($pvs[0])) {
    http_response_code(502);
    echo json_encode([
        'error' => 'Lichess returned no principal variation.',
        'engine' => 'lichess_cloud_eval',
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

$pv0 = $pvs[0];
$movesLine = trim((string)($pv0['moves'] ?? ''));
$firstMove = strtok($movesLine, ' ');

if (!is_string($firstMove) || !preg_match('/^[a-h][1-8][a-h][1-8][qrbn]?$/', $firstMove)) {
    http_response_code(502);
    echo json_encode([
        'error' => 'Lichess returned an invalid best move.',
        'engine' => 'lichess_cloud_eval',
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

$result = [
    'engine' => 'lichess_cloud_eval',
    'fen' => $fen,
    'best_move' => $firstMove,
    'from_square' => substr($firstMove, 0, 2),
    'to_square' => substr($firstMove, 2, 2),
    'san' => null,
    'score_cp' => isset($pv0['cp']) ? (int)$pv0['cp'] : null,
    'score_mate' => isset($pv0['mate']) ? (int)$pv0['mate'] : null,
    'depth' => isset($data['depth']) ? (int)$data['depth'] : $requestedDepth,
    'requested_depth' => $requestedDepth,
    'nodes' => isset($data['knodes']) ? ((int)$data['knodes'] * 1000) : null,
    'elapsed_ms' => $elapsedMs,
    'is_game_over' => false,
    'result' => null,
];

echo json_encode($result, JSON_UNESCAPED_SLASHES);
