<?php
require_once 'init.php';

// Limpiar todas las variables de sesión
$_SESSION = [];

// Destruir la cookie de sesión en el cliente asegurando sus flags
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(), 
        '', 
        time() - 42000,
        $params["path"], 
        $params["domain"],
        $params["secure"], 
        $params["httponly"]
    );
}

// Destruir la sesión físicamente en el servidor
session_destroy();

echo json_encode(["success" => true, "message" => "Logged out successfully."]);
?>
