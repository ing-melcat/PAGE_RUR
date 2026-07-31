<?php
require_once 'init.php';
require_once 'includes/db_connect.php';

if (!$pdo) {
    die("Error connecting to DB");
}

try {
    // Check if 'roles' column exists
    $stmt = $pdo->query("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='roles'");
    if ($stmt->rowCount() == 0) {
        $pdo->exec("ALTER TABLE users ADD COLUMN roles JSONB DEFAULT '[\"miembro\"]'");
        $pdo->exec("UPDATE users SET roles = json_build_array(rol) WHERE rol IS NOT NULL");
        $pdo->exec("ALTER TABLE users DROP COLUMN rol");
        echo "Successfully migrated 'rol' to 'roles' JSONB.<br>";
    } else {
        echo "'roles' column already exists.<br>";
    }
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>
