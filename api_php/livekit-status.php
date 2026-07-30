<?php
// Endpoint: /api/livekit-status.php
// Este endpoint consulta la API de LiveKit para ver qué salas están activas.
require_once __DIR__ . '/vendor/autoload.php';

use Agence104\LiveKit\RoomServiceClient;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$apiKey = getenv('LIVEKIT_API_KEY') ?: 'dev_key';
$apiSecret = getenv('LIVEKIT_API_SECRET') ?: 'dev_secret';
$livekitUrl = getenv('LIVEKIT_HOST') ?: 'http://localhost:7880';

try {
    if ($apiKey === 'dev_key') {
        // Simulamos que ciertas salas están online para pruebas locales
        echo json_encode(["room-rassor-1", "room-rbt-2024"]);
        exit;
    }

    $roomClient = new RoomServiceClient($livekitUrl, $apiKey, $apiSecret);
    $rooms = $roomClient->listRooms();
    
    $activeRooms = [];
    foreach ($rooms as $room) {
        $activeRooms[] = $room->getName();
    }
    
    echo json_encode($activeRooms);
} catch (Exception $e) {
    error_log("Error al obtener status de LiveKit: " . $e->getMessage());
    echo json_encode([]); // Devolver un array vacío si el servidor está caído para no romper el front
}
