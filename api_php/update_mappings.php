<?php
require_once 'init.php';
require_once 'includes/db_connect.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['control_mappings'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos inválidos']);
    exit;
}

$mappings = json_encode($input['control_mappings']);

try {
    $stmt = $pdo->prepare("UPDATE users SET control_mappings = :mappings WHERE id = :id");
    if ($stmt->execute(['mappings' => $mappings, 'id' => $_SESSION['user_id']])) {
        $_SESSION['control_mappings'] = $mappings;
        echo json_encode(['success' => true, 'message' => 'Mapeo de controles actualizado']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error al guardar']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error interno del servidor']);
}
?>
