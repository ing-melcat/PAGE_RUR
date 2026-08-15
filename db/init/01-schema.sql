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
    -- Perfil público (sección de miembros). Aparecer es voluntario y está
    -- apagado por defecto: nadie se publica por el hecho de tener cuenta.
    -- `rol_publico` y `area` son lo que la persona quiere que se lea de
    -- ella; `roles`, arriba, sigue siendo solo permisos del sistema y no se
    -- publica nunca.
    perfil_publico BOOLEAN NOT NULL DEFAULT false,
    rol_publico VARCHAR(80),
    area VARCHAR(80),
    generacion VARCHAR(20),
    linkedin VARCHAR(255),
    show_alias BOOLEAN NOT NULL DEFAULT false,
    push_notifications BOOLEAN NOT NULL DEFAULT false,
    -- Preferencias de accesibilidad. Viven en la base y no en el navegador
    -- porque son del usuario, no del dispositivo: quien necesita texto grande
    -- lo necesita también desde otra máquina, y no debe perderlo al recargar.
    large_text BOOLEAN NOT NULL DEFAULT false,
    reduce_animations BOOLEAN NOT NULL DEFAULT false,
    control_mappings JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Permisos sueltos de esta persona, además de los que le den sus roles.
    -- Es lo que evita inventar un rol entero para una excepción de una sola
    -- persona. Los nombres válidos son los de services/shared/permisos.js.
    permisos_extra JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Contraseñas. La que pone un administrador nace temporal y con fecha de
    -- caducidad: sirve para entrar y para cambiarla, nada más. Sin esto, la
    -- provisional se queda puesta para siempre y la saben dos personas.
    password_temporal BOOLEAN NOT NULL DEFAULT false,
    password_expira TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cuando se borra un rol el servidor busca quién lo tiene con
-- `WHERE roles ? $1`. Sin este índice, Postgres recorre la tabla entera.
CREATE INDEX IF NOT EXISTS idx_users_roles ON users USING GIN (roles);

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
-- Quién desarrolló cada publicación.
--
-- Es lo que hace que la sección de miembros sea un historial de trabajo real
-- y no un catálogo de personas: el recorrido de cada uno no se escribe a
-- mano, se deduce de los proyectos que el sitio ya publica.
--
-- Esta tabla SÍ lleva claves foráneas, a diferencia del resto del esquema.
-- Es una tabla de enlace y nada más: sus filas no significan nada sin las
-- dos que unen, y una fila que apunte a una publicación borrada no es un
-- dato viejo, es basura que ensuciaría la ficha de alguien. Aquí el
-- ON DELETE CASCADE es la limpieza correcta, no una comodidad.
CREATE TABLE IF NOT EXISTS post_miembros (
    post_id  VARCHAR(64) NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id  INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Qué hizo esa persona en ESE proyecto: "electrónica", "control",
    -- "documentación". La misma persona tiene papeles distintos en
    -- proyectos distintos, así que no puede vivir en su fila de users.
    papel    VARCHAR(80),
    -- Quién lideró ese proyecto. Es lo que convierte "líder" en un hecho
    -- registrado en vez de en una opinión: sostiene una medalla que se
    -- calcula sola.
    lider    BOOLEAN     NOT NULL DEFAULT false,
    PRIMARY KEY (post_id, user_id)
);

-- La consulta natural es "los proyectos de esta persona", que va por
-- user_id; la clave primaria solo indexa bien el sentido contrario.
CREATE INDEX IF NOT EXISTS idx_post_miembros_user ON post_miembros (user_id);

CREATE TABLE IF NOT EXISTS post_translations (
    post_id TEXT NOT NULL,
    lang VARCHAR(10) NOT NULL,
    title VARCHAR(255),
    content TEXT,
    pages JSONB NOT NULL DEFAULT '[]'::jsonb,
    translated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (post_id, lang)
);


-- ---------------------------------------------------------------------------
-- Roles administrables desde el panel, con color y permisos propios.
--
-- `users.roles` sigue siendo el array de nombres de rol: es la clave foránea
-- lógica hacia roles.nombre. No hay FK real porque es un array JSONB.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    nombre      VARCHAR(40) PRIMARY KEY,
    -- Para distinguirlos de un vistazo en el panel. Es del panel, nunca de la
    -- web pública: los roles del sistema dicen quién puede entrar dónde y eso
    -- no se publica.
    color       VARCHAR(7)  NOT NULL DEFAULT '#8c9bb0',
    -- Qué puede hacer quien lo tenga. Los nombres válidos son los del catálogo
    -- de services/shared/permisos.js: inventarse uno aquí no da acceso a nada.
    permisos    JSONB       NOT NULL DEFAULT '[]'::jsonb,
    -- Los del sistema no se pueden borrar ni renombrar desde el panel.
    del_sistema BOOLEAN     NOT NULL DEFAULT false
);

-- Los cuatro roles de partida. Sin ellos, una base recién creada no tendría
-- ningún rol con el que administrar nada, y el panel arrancaría vacío.
INSERT INTO roles (nombre, color, permisos, del_sistema) VALUES
  ('admin',    '#FBCA01', '["usuarios.gestionar","roles.gestionar","publicaciones.editar","publicaciones.borrar","publicaciones.firmar","robots.operar","robots.gestionar","transmision.gestionar","logs.ver"]'::jsonb, true),
  ('redactor', '#2ecc71', '["publicaciones.editar"]'::jsonb, false),
  ('operador', '#8c9bb0', '["robots.operar"]'::jsonb, false),
  ('hardware', '#fbbf24', '[]'::jsonb, false)
ON CONFLICT (nombre) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Medallas que no se calculan solas.
--
-- Las automáticas (proyecto terminado, grandes aportes, líder) salen de
-- post_miembros y no se guardan en ninguna parte. Aquí solo viven las
-- especiales, que otorga la coordinación: se registra quién y por qué, que es
-- lo que las hace valer algo.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medallas_otorgadas (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Del catálogo de services/shared/medallas.js (MEDALLAS_ESPECIALES).
    clave        VARCHAR(40) NOT NULL,
    -- Una medalla sin motivo es un adorno; con motivo es un reconocimiento
    -- que se puede leer.
    motivo       TEXT,
    -- Quién la dio. Va a la vista en el perfil público: alguien pone su
    -- nombre detrás, y eso es lo que impide que se repartan a la ligera.
    otorgada_por VARCHAR(50) NOT NULL,
    fecha        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, clave)
);

CREATE INDEX IF NOT EXISTS idx_medallas_user ON medallas_otorgadas (user_id);
