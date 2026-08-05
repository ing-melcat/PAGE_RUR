-- PAGE_RUR — schema Postgres (reemplaza el almacenamiento en JSON plano)
-- Corregido contra la forma real de api/data/*.json (no solo contra el DDL viejo):
--   - users.roles es JSONB (array), no un VARCHAR singular: el código de la app
--     hace req.user.roles.includes(...) en todas partes.
--   - posts.id es TEXT (ids tipo "seed-deliver-e"), no SERIAL.
--   - posts tiene category / is_hidden / image (no image_url) en los datos reales.
--   - robots tiene settings variables (maxSpeed, steeringSensitivity, digForce, ...)
--     -> JSONB en vez de columnas fijas, mismo patrón que control_mappings.
--   - robots.livekit_api_secret nunca se guarda en texto plano: se cifra en la
--     capa de aplicación (AES-256-GCM) antes del INSERT/UPDATE.
--   - robots.is_public_event controla el endpoint anónimo de espectador LiveKit.

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    matricula VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    grupo VARCHAR(50),
    telefono VARCHAR(20),
    roles JSONB NOT NULL DEFAULT '[]'::jsonb,
    alias VARCHAR(100),
    bio TEXT,
    foto VARCHAR(255),
    github VARCHAR(255),
    instagram VARCHAR(255),
    reddit VARCHAR(255),
    facebook VARCHAR(255),
    show_alias BOOLEAN NOT NULL DEFAULT false,
    push_notifications BOOLEAN NOT NULL DEFAULT false,
    control_mappings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'simple',
    author VARCHAR(100),
    content TEXT,
    image TEXT,
    video_url TEXT,
    model_url TEXT,
    category VARCHAR(50),
    is_hidden BOOLEAN NOT NULL DEFAULT false,
    pages JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Campos específicos de un tipo de post (ej. countdownDate en
    -- 'aviso'/'evento') sin necesitar una migración por cada campo nuevo
    -- que el panel de administración decida enviar.
    extra JSONB NOT NULL DEFAULT '{}'::jsonb,
    date TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS robots (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'offline',
    room VARCHAR(255),
    model_url TEXT,
    livekit_url TEXT,
    livekit_api_key TEXT,
    livekit_api_secret_encrypted TEXT,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_public_event BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logs_date ON logs (date DESC);
