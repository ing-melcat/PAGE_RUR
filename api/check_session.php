<?php
require_once 'init.php';

if (isset($_SESSION['user_id'])) {
    echo json_encode([
        "authenticated" => true,
        "user" => [
            "matricula" => $_SESSION['matricula'] ?? '',
            "nombre" => $_SESSION['nombre'] ?? '',
            "grupo" => $_SESSION['grupo'] ?? '',
            "telefono" => $_SESSION['telefono'] ?? '',
            "rol" => $_SESSION['rol'] ?? '',
            "show_alias" => $_SESSION['show_alias'] ?? true,
            "push_notifications" => $_SESSION['push_notifications'] ?? false,
            "alias" => $_SESSION['alias'] ?? '',
            "bio" => $_SESSION['bio'] ?? '',
            "foto" => $_SESSION['foto'] ?? '',
            "github" => $_SESSION['github'] ?? '',
            "instagram" => $_SESSION['instagram'] ?? '',
            "reddit" => $_SESSION['reddit'] ?? '',
            "facebook" => $_SESSION['facebook'] ?? '',
            "control_mappings" => isset($_SESSION['control_mappings']) ? json_decode($_SESSION['control_mappings'], true) : new stdClass()
        ]
    ]);
} else {
    // Retornamos 401 Unauthorized si no hay sesión activa
    http_response_code(401);
    echo json_encode(["authenticated" => false, "message" => "No active session."]);
}
?>
