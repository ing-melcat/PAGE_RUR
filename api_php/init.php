<?php
// Configuración estricta de seguridad de sesiones centralizada
ini_set('session.use_strict_mode', 1);
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);

session_set_cookie_params([
    'lifetime' => 3600, // La sesión caduca en 1 hora
    'path' => '/',
    'domain' => $_SERVER['HTTP_HOST'] ?? 'localhost',
    'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on', // True si usa HTTPS
    'httponly' => true, // Mitiga XSS
    'samesite' => 'Strict' // Mitiga CSRF
]);
session_start();

// Cabeceras de seguridad HTTP globales para la API
header('Content-Type: application/json; charset=utf-8');
header('X-Frame-Options: DENY'); // Previene Clickjacking
header('X-XSS-Protection: 1; mode=block'); // Fuerzo protección anti-XSS
header('X-Content-Type-Options: nosniff'); // Previene MIME-sniffing
header('Referrer-Policy: strict-origin-when-cross-origin'); // Privacidad en cabecera Referer
header('Content-Security-Policy: default-src \'none\''); // Bloquea ejecución de cualquier script en la API

// Manejo de peticiones pre-flight (CORS) si se requiere desde el front
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Methods: POST, GET, DELETE, PUT, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    http_response_code(200);
    exit;
}
?>
