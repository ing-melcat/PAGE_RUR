-- Formulario de contacto público.
--
-- El aviso llega por webhook de Discord, que es lo que hace que alguien lo
-- lea el mismo día. Pero un webhook no es un archivo: si Discord falla, si el
-- canal se limpia, o si nadie estaba mirando, el mensaje se perdió y quien lo
-- escribió no tiene forma de saberlo. La tabla es la copia que sí perdura, y
-- es la que permitirá contestar más tarde o abrir una bandeja en el panel sin
-- haber perdido lo de antes.
--
-- `status` nace como texto libre con DEFAULT 'unread' y sin CHECK a
-- propósito: todavía no hay panel que lo mueva, y fijar hoy los estados
-- válidos sería adivinar el flujo de trabajo antes de que exista.
--
-- Idempotente: se puede correr sobre una base que ya tenga la tabla.
--
-- Equivale a db/init/02-contact.sql, que solo corre en una base recién
-- creada. Este archivo es el mismo cambio para las que ya existen.

CREATE TABLE IF NOT EXISTS contact_messages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'unread',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- svc-content sirve /api/contact y hoy solo escribe: INSERT y nada más. No se
-- le concede SELECT porque no lee esta tabla, y son datos personales de gente
-- de fuera enviados a través de un formulario anónimo — el servicio más
-- expuesto del stack no necesita poder leerlos de vuelta. El día que exista
-- la bandeja en el panel, el SELECT se concede a svc_identity_role, que es
-- quien sirve pantallas autenticadas.
GRANT INSERT ON contact_messages TO svc_content_role;
GRANT USAGE, SELECT ON SEQUENCE contact_messages_id_seq TO svc_content_role;

COMMENT ON TABLE contact_messages IS
  'Mensajes del formulario público. El aviso va por webhook de Discord; esta tabla es la copia que perdura.';
COMMENT ON COLUMN contact_messages.status IS
  'Estado de atención. Hoy siempre "unread": aún no hay panel que lo cambie.';
