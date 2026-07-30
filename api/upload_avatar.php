<?php
require_once 'init.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "No autenticado"]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Error al subir el archivo o no se seleccionó ninguno."]);
    exit;
}

$file = $_FILES['avatar'];

// Seguridad 1: Límite de tamaño (2MB)
if ($file['size'] > 2 * 1024 * 1024) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "El archivo es demasiado grande (Máximo 2MB)."]);
    exit;
}

// Seguridad 2: Validar MIME Type real, no confiar en la extensión
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

$allowedTypes = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/gif' => 'gif',
    'image/webp' => 'webp'
];

if (!array_key_exists($mimeType, $allowedTypes)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Formato de archivo no permitido. Solo JPG, PNG, GIF o WEBP."]);
    exit;
}

// Seguridad 3: Generar nombre aleatorio (previene inyección y sobrescritura)
$extension = $allowedTypes[$mimeType];
$filename = uniqid('avatar_', true) . '.' . $extension;
$uploadDir = __DIR__ . '/uploads/';

if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Seguridad 4: Mover el archivo a su destino final
$destination = $uploadDir . $filename;
if (move_uploaded_file($file['tmp_name'], $destination)) {
    $fileUrl = '/api/uploads/' . $filename;
    
    echo json_encode([
        "success" => true, 
        "message" => "Archivo subido con éxito", 
        "url" => $fileUrl
    ]);
} else {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error al guardar el archivo en el servidor."]);
}
?>
