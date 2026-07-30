<?php
require_once 'init.php';

// Prevenir Session Fixation regenerando el ID en cada nueva sesión (post-init)
if (!isset($_SESSION['initiated'])) {
    session_regenerate_id(true);
    $_SESSION['initiated'] = true;
}

require_once 'includes/db_connect.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Método no permitido."]);
    exit;
}

// 3. Límite de intentos de login (Rate Limiting Básico en Sesión)
if (!isset($_SESSION['login_attempts'])) {
    $_SESSION['login_attempts'] = 0;
}
if (isset($_SESSION['last_attempt_time']) && (time() - $_SESSION['last_attempt_time'] < 15) && $_SESSION['login_attempts'] > 4) {
    http_response_code(429); // Too Many Requests
    echo json_encode(["success" => false, "message" => "Demasiados intentos. Por favor espera unos segundos."]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

// 4. Saneamiento y validación básica
$matricula = trim(strip_tags($input['matricula'] ?? ''));
$password = $input['password'] ?? '';

if (empty($matricula) || empty($password)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Por favor completa todos los campos."]);
    exit;
}

$_SESSION['last_attempt_time'] = time();

try {
    if ($pdo) {
        // 5. Uso de prepared statements para prevenir Inyección SQL
        $stmt = $pdo->prepare("SELECT id, matricula, password_hash, nombre, grupo, telefono, rol, show_alias, push_notifications, alias, bio, foto, github, instagram, reddit, facebook, control_mappings FROM users WHERE matricula = :matricula LIMIT 1");
        $stmt->execute(['matricula' => $matricula]);
        $user = $stmt->fetch();

        // 6. Verificación de contraseña segura (resistente a timing attacks)
        if ($user && password_verify($password, $user['password_hash'])) {
            // Éxito: regenerar ID por seguridad inmediatamente DESPUÉS del login exitoso
            session_regenerate_id(true);
            
            $_SESSION['login_attempts'] = 0; // Reset
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['matricula'] = $user['matricula'];
            $_SESSION['nombre'] = $user['nombre'];
            $_SESSION['grupo'] = $user['grupo'];
            $_SESSION['telefono'] = $user['telefono'];
            $_SESSION['rol'] = $user['rol'];
            
            // Save all to session
            $_SESSION['show_alias'] = $user['show_alias'];
            $_SESSION['push_notifications'] = $user['push_notifications'];
            $_SESSION['alias'] = $user['alias'];
            $_SESSION['bio'] = $user['bio'];
            $_SESSION['foto'] = $user['foto'];
            $_SESSION['github'] = $user['github'];
            $_SESSION['instagram'] = $user['instagram'];
            $_SESSION['reddit'] = $user['reddit'];
            $_SESSION['facebook'] = $user['facebook'];
            $_SESSION['control_mappings'] = $user['control_mappings'];

            echo json_encode([
                "success" => true,
                "message" => "Login exitoso",
                "user" => [
                    "matricula" => $user['matricula'],
                    "nombre" => $user['nombre'],
                    "grupo" => $user['grupo'],
                    "telefono" => $user['telefono'],
                    "rol" => $user['rol'],
                    "show_alias" => $user['show_alias'],
                    "push_notifications" => $user['push_notifications'],
                    "alias" => $user['alias'],
                    "bio" => $user['bio'],
                    "foto" => $user['foto'],
                    "github" => $user['github'],
                    "instagram" => $user['instagram'],
                    "reddit" => $user['reddit'],
                    "facebook" => $user['facebook'],
                    "control_mappings" => json_decode($user['control_mappings'], true)
                ]
            ]);
            exit;
        } else {
            $_SESSION['login_attempts']++;
        }
    } else {
        // ERROR: La BD no está disponible
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Servicio de autenticación no disponible."]);
        exit;
    }

    // Respuesta genérica (401 Unauthorized) para no revelar si el usuario existe o la clave falló.
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Credenciales incorrectas."]);
} catch (Exception $e) {
    error_log("Login Error: " . $e->getMessage()); // Log del error en servidor sin exponerlo
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error interno del servidor."]);
}
?>
