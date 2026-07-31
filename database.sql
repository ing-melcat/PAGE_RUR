-- PostgreSQL DDL Script
-- Nota: En PostgreSQL, la base de datos se debe crear antes (desde el docker-compose o shell).
-- Al conectar, este script se ejecutará directamente sobre la base de datos 'login_system'.

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    matricula VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    grupo VARCHAR(50),
    telefono VARCHAR(20),
    roles JSONB DEFAULT '["miembro"]',
    alias VARCHAR(100),
    bio TEXT,
    foto VARCHAR(255),
    github VARCHAR(255),
    instagram VARCHAR(255),
    reddit VARCHAR(255),
    facebook VARCHAR(255),
    show_alias BOOLEAN DEFAULT false,
    push_notifications BOOLEAN DEFAULT false,
    control_mappings JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Asegurar que las columnas existan si la tabla ya había sido creada antes
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS alias VARCHAR(100),
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS foto VARCHAR(255),
ADD COLUMN IF NOT EXISTS github VARCHAR(255),
ADD COLUMN IF NOT EXISTS instagram VARCHAR(255),
ADD COLUMN IF NOT EXISTS reddit VARCHAR(255),
ADD COLUMN IF NOT EXISTS facebook VARCHAR(255),
ADD COLUMN IF NOT EXISTS show_alias BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS control_mappings JSONB;

-- La contraseña es '123456' encriptada con bcrypt
INSERT INTO users (matricula, password_hash, nombre, grupo, telefono, roles)
VALUES ('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrador General', 'Sistemas', '555-0000', '["admin"]')
ON CONFLICT (matricula) DO NOTHING;
