<?php
// Leer variables de entorno (ideal para Docker/Portainer) o usar por defecto para local
// Leer variables de entorno (ideal para Docker/Portainer) o usar por defecto para local
$host = getenv('DB_HOST') ?: '127.0.0.1';
$dbname = getenv('DB_NAME') ?: 'login_system';
$username = getenv('DB_USER') ?: 'postgres';
$password = getenv('DB_PASS') !== false ? getenv('DB_PASS') : '';

try {
    // Usando el driver pgsql para PostgreSQL
    $pdo = new PDO("pgsql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch(PDOException $e) {
    // En producción (Portainer), un fallo de BD debería registrarse.
    error_log("DB Connection failed: " . $e->getMessage());
    $pdo = null;
}
?>
