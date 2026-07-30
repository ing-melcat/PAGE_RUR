<?php
// Endpoint: /api/livekit-token.php
// Genera un token JWT para unirse a una sala específica de LiveKit
require_once __DIR__ . '/vendor/autoload.php';

use Agence104\LiveKit\AccessToken;
use Agence104\LiveKit\AccessTokenOptions;
use Agence104\LiveKit\VideoGrant;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Leer payload JSON
$input = json_decode(file_get_contents('php://input'), true);
$roomName = $input['room_name'] ?? null;
$participantName = $input['participant_name'] ?? 'operador_' . rand(1000, 9999);

if (!$roomName) {
    http_response_code(400);
    echo json_encode(["error" => "Se requiere 'room_name'"]);
    exit;
}

$apiKey = getenv('LIVEKIT_API_KEY') ?: 'dev_key';
$apiSecret = getenv('LIVEKIT_API_SECRET') ?: 'dev_secret';
$livekitUrl = getenv('LIVEKIT_HOST') ?: 'ws://localhost:7880';

try {
    if ($apiKey === 'dev_key') {
        // Modo desarrollo local sin variables de entorno
        $mockToken = "mock_jwt_token_for_" . $roomName;
        echo json_encode([
            "token" => $mockToken,
            "room_name" => $roomName,
            "participant" => $participantName,
            "livekit_url" => $livekitUrl
        ]);
        exit;
    }

    $tokenOptions = (new AccessTokenOptions())
        ->setIdentity($participantName);
        
    $videoGrant = (new VideoGrant())
        ->setRoomJoin(true)
        ->setRoomName($roomName)
        ->setCanPublish(true) // Permite enviar comandos
        ->setCanSubscribe(true); // Permite recibir video/telemetría
        
    $token = (new AccessToken($apiKey, $apiSecret))
        ->init($tokenOptions)
        ->setGrant($videoGrant)
        ->toJwt();

    echo json_encode([
        "token" => $token,
        "room_name" => $roomName,
        "participant" => $participantName,
        "livekit_url" => $livekitUrl
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Error generando token: " . $e->getMessage()]);
}
