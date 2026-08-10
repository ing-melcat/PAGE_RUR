-- Perfil público de los miembros e historial de proyectos.
--
-- Idempotente, como el resto: se puede aplicar sobre una base ya viva y
-- volver a aplicarse sin efecto. El estado final equivalente está en
-- db/init/01-schema.sql.
--
-- Por qué campos nuevos y no reutilizar los que ya hay:
--
--   * `roles` NO sirve como rol público. Hoy contiene mezclados permisos del
--     sistema (admin, redactor, operador) y áreas de trabajo escritas a mano
--     ("Software & Mechanical"). Publicarlo tal cual anunciaría al mundo
--     quién es administrador —dato de seguridad, no de presentación— y a la
--     vez enseñaría "operador", que no dice nada del trabajo de nadie.
--     `rol_publico` y `area` son lo que la persona quiere que se lea de
--     ella; `roles` sigue siendo solo permisos.
--
--   * `bio`, `foto` y las redes ya existen y ya son editables por su dueño:
--     se reutilizan tal cual.

-- Aparecer en la web pública es voluntario y está apagado por defecto. Nadie
-- se publica por el hecho de tener cuenta: la sección se llena porque cada
-- quien decide entrar, no porque exista una tabla de usuarios.
ALTER TABLE users ADD COLUMN IF NOT EXISTS perfil_publico BOOLEAN NOT NULL DEFAULT false;

-- Lo que la persona hace, en sus palabras. Corto a propósito: es una línea
-- bajo el nombre, no un puesto de trabajo.
ALTER TABLE users ADD COLUMN IF NOT EXISTS rol_publico VARCHAR(80);

-- Área o especialidad. Es lo que permite agrupar la página por equipos en
-- vez de dar una lista plana de personas.
ALTER TABLE users ADD COLUMN IF NOT EXISTS area VARCHAR(80);

-- Año de ingreso al grupo. Distingue a quien acaba de entrar de quien lleva
-- tres años, y más adelante permite separar a los antiguos miembros.
ALTER TABLE users ADD COLUMN IF NOT EXISTS generacion VARCHAR(20);

-- Faltaba entre las redes, y es justo la que importa en un perfil
-- profesional de cara a fuera.
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin VARCHAR(255);

-- Quién desarrolló cada publicación.
--
-- Es lo que convierte la sección en un historial de trabajo real en vez de
-- en un catálogo de personas: el recorrido de cada miembro no se escribe a
-- mano, se deduce de los proyectos que el sitio ya publica. Un proyecto
-- nuevo aparece solo en la ficha de quienes lo firmaron.
CREATE TABLE IF NOT EXISTS post_miembros (
    post_id  VARCHAR(64) NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id  INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Qué hizo esa persona en ESE proyecto: "electrónica", "control",
    -- "documentación". La misma persona tiene papeles distintos en
    -- proyectos distintos, así que no puede vivir en su fila de users.
    papel    VARCHAR(80),
    PRIMARY KEY (post_id, user_id)
);

-- La consulta natural es "los proyectos de esta persona", que va por
-- user_id; la clave primaria solo indexa bien el sentido contrario.
CREATE INDEX IF NOT EXISTS idx_post_miembros_user ON post_miembros (user_id);

-- svc-identity sirve la lista de miembros y necesita leer los proyectos de
-- cada uno. Solo lectura: quién firma una publicación se decide desde el
-- panel de publicaciones, que es de svc-content.
GRANT SELECT ON post_miembros TO svc_identity_role;
-- Y leer posts, porque la lista de miembros resuelve el título de cada
-- proyecto. Solo SELECT: publicar y editar sigue siendo exclusivo de
-- svc-content.
GRANT SELECT ON posts TO svc_identity_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON post_miembros TO svc_content_role;

-- svc-identity ya lee users. svc-content necesita leerla también para
-- resolver los nombres de quienes firman una publicación, pero nada más:
-- ningún permiso de escritura sobre las cuentas.
GRANT SELECT ON users TO svc_content_role;
