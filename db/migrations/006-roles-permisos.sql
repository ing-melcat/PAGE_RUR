-- Roles administrables desde el panel, con color y permisos propios.
--
-- Hasta ahora los permisos estaban cableados: `requireRole('admin')` en doce
-- sitios del backend. Dar un permiso nuevo a alguien exigía tocar código y
-- desplegar, y no había forma de crear un rol sin pasar por un programador.
--
-- `users.roles` NO cambia: sigue siendo el array de nombres de rol. Es la
-- clave foránea lógica hacia roles.nombre y evita reescribir el login, el
-- contenido del JWT y el panel entero.

CREATE TABLE IF NOT EXISTS roles (
    nombre      VARCHAR(40) PRIMARY KEY,
    -- Para distinguirlos de un vistazo en el panel. Es del panel, nunca de la
    -- web pública: los roles del sistema dicen quién puede entrar dónde y eso
    -- no se publica.
    color       VARCHAR(7)  NOT NULL DEFAULT '#8c9bb0',
    -- Qué puede hacer quien lo tenga. Los nombres válidos son los del
    -- catálogo de services/shared/permisos.js: inventarse uno aquí no daría
    -- acceso a nada, porque no hay ninguna comprobación que lo mire.
    permisos    JSONB       NOT NULL DEFAULT '[]'::jsonb,
    -- Los del sistema no se pueden borrar ni renombrar desde el panel.
    del_sistema BOOLEAN     NOT NULL DEFAULT false
);

-- Permisos sueltos de una persona, además de los que le den sus roles. Es lo
-- que evita tener que inventar un rol entero para una excepción de una sola
-- persona.
ALTER TABLE users ADD COLUMN IF NOT EXISTS permisos_extra JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Los cuatro roles que ya se usan, con los permisos EQUIVALENTES a lo que hoy
-- hace requireRole. Nadie gana ni pierde acceso el día del despliegue: esto
-- solo escribe en datos lo que ya estaba en el código.
--
-- ON CONFLICT DO NOTHING para que una segunda pasada no pise los permisos que
-- se hayan editado desde el panel.
INSERT INTO roles (nombre, color, permisos, del_sistema) VALUES
  ('admin',    '#FBCA01', '["usuarios.gestionar","roles.gestionar","publicaciones.editar","publicaciones.borrar","publicaciones.firmar","robots.operar","robots.gestionar","transmision.gestionar","logs.ver"]'::jsonb, true),
  ('redactor', '#2ecc71', '["publicaciones.editar"]'::jsonb, false),
  ('operador', '#8c9bb0', '["robots.operar"]'::jsonb, false),
  ('hardware', '#fbbf24', '[]'::jsonb, false)
ON CONFLICT (nombre) DO NOTHING;

-- Los tres servicios resuelven permisos en cada petición, así que los tres
-- necesitan leer la tabla. Escribirla es cosa de identity, que es quien
-- administra personal.
GRANT SELECT ON roles TO svc_identity_role, svc_content_role, svc_robots_role;
GRANT INSERT, UPDATE, DELETE ON roles TO svc_identity_role;

-- Resolver permisos también mira los permisos sueltos de la persona, que
-- viven en `users`. svc-content ya puede leer esa tabla (migración 005);
-- svc-robots no, y darle la tabla entera por esto sería excesivo: se le
-- conceden las dos columnas que necesita y ninguna más.
GRANT SELECT (matricula, permisos_extra) ON users TO svc_robots_role;
