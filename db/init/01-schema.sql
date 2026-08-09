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
    -- Preferencias de accesibilidad. Viven en la base y no en el navegador
    -- porque son del usuario, no del dispositivo: quien necesita texto grande
    -- lo necesita también desde otra máquina, y no debe perderlo al recargar.
    large_text BOOLEAN NOT NULL DEFAULT false,
    reduce_animations BOOLEAN NOT NULL DEFAULT false,
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

-- Respalda el ORDER BY date DESC de GET /api/posts (services/content/server.js),
-- la query pública más frecuente del sitio (landing, /explora, /archivo).
CREATE INDEX IF NOT EXISTS idx_posts_date ON posts (date DESC);

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

-- Caché de traducción automática (LibreTranslate) del contenido que escribe
-- el redactor. Nunca se toca `posts` para esto -- lo que el redactor ve y
-- edita en el panel es siempre el español original. Una fila por
-- publicación+idioma; se borra (no se actualiza) cuando el post se edita o
-- se borra, y se regenera sola la próxima vez que alguien la pida en ese
-- idioma. Sin FK a posts a propósito: el resto del schema tampoco usa FKs,
-- el borrado en cascada se maneja a mano en services/content/server.js.
CREATE TABLE IF NOT EXISTS post_translations (
    post_id TEXT NOT NULL,
    lang VARCHAR(10) NOT NULL,
    title VARCHAR(255),
    content TEXT,
    pages JSONB NOT NULL DEFAULT '[]'::jsonb,
    translated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (post_id, lang)
);
