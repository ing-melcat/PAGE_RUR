<?php
require_once 'init.php';
require_once 'includes/db_connect.php';

if (!$pdo) {
    die("Error connecting to DB");
}

$password_hash = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; // 123456

$users = [
    [
        'matricula' => 'admin',
        'nombre' => 'Administrador General',
        'roles' => '["admin"]'
    ],
    [
        'matricula' => 'bloguero',
        'nombre' => 'Redactor de Contenido',
        'roles' => '["redactor"]'
    ],
    [
        'matricula' => 'operador',
        'nombre' => 'Piloto del Robot',
        'roles' => '["operador"]'
    ],
    [
        'matricula' => 'hibrido',
        'nombre' => 'Operador y Bloguero',
        'roles' => '["operador", "redactor", "hardware"]'
    ]
];

try {
    $stmt = $pdo->prepare("INSERT INTO users (matricula, password_hash, nombre, grupo, telefono, roles) VALUES (:matricula, :hash, :nombre, 'Prueba', '555', :roles) ON CONFLICT (matricula) DO UPDATE SET roles = EXCLUDED.roles");
    
    foreach ($users as $u) {
        $stmt->execute([
            'matricula' => $u['matricula'],
            'hash' => $password_hash,
            'nombre' => $u['nombre'],
            'roles' => $u['roles']
        ]);
        echo "Usuario " . $u['matricula'] . " creado/actualizado exitosamente.<br>";
    }
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>
