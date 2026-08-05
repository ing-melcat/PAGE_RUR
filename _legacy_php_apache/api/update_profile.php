<?php
require_once "init.php";
if (!isset($_SESSION["user_id"])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "No autorizado."]);
    exit;
}
require_once "includes/db_connect.php";
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    exit;
}
$input = json_decode(file_get_contents("php://input"), true);

try {
    $updates = [];
    $params = ["id" => $_SESSION["user_id"]];

    if (isset($input["show_alias"])) {
        $updates[] = "show_alias = :show_alias";
        $params["show_alias"] = $input["show_alias"] ? "true" : "false";
        $_SESSION["show_alias"] = $input["show_alias"];
    }
    if (isset($input["push_notifications"])) {
        $updates[] = "push_notifications = :push";
        $params["push"] = $input["push_notifications"] ? "true" : "false";
        $_SESSION["push_notifications"] = $input["push_notifications"];
    }
    
    $textFields = ["alias", "bio", "foto", "github", "instagram", "reddit", "facebook"];
    foreach ($textFields as $field) {
        if (isset($input[$field])) {
            $updates[] = "$field = :$field";
            $params[$field] = $input[$field];
            $_SESSION[$field] = $input[$field];
        }
    }

    if (!empty($updates)) {
        $sql = "UPDATE users SET " . implode(", ", $updates) . " WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    }

    echo json_encode(["success" => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false]);
}
?>
