-- Medallas.
--
-- Tres de las cuatro se calculan al vuelo desde post_miembros y no se guardan
-- en ninguna parte: no se pueden regalar, no se olvidan y no hay que
-- mantenerlas. La cuarta, Excelencia, es un juicio y no hay número que la
-- represente, así que se otorga — y se guarda quién la dio, que es lo que la
-- hace valer algo.

-- Quién lideró un proyecto. Es lo que convierte "líder" en un hecho
-- registrado en vez de en una opinión: sale de la misma pantalla donde ya se
-- firma quién desarrolló qué.
ALTER TABLE post_miembros ADD COLUMN IF NOT EXISTS lider BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS medallas_otorgadas (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Hoy solo 'excelencia'. La columna existe para no tener que migrar la
    -- tabla el día que haya una segunda medalla otorgable.
    clave        VARCHAR(40) NOT NULL,
    -- Por qué. Una medalla sin motivo es un adorno; con motivo es un
    -- reconocimiento que se puede leer.
    motivo       TEXT,
    -- Quién la dio. Va a la vista en el perfil: alguien pone su nombre
    -- detrás, y eso es exactamente lo que impide que se repartan a la ligera.
    otorgada_por VARCHAR(50) NOT NULL,
    fecha        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, clave)
);

CREATE INDEX IF NOT EXISTS idx_medallas_user ON medallas_otorgadas (user_id);

-- identity sirve los perfiles con sus medallas y es quien las otorga desde el
-- panel de personal.
GRANT SELECT, INSERT, UPDATE, DELETE ON medallas_otorgadas TO svc_identity_role;
GRANT USAGE, SELECT ON SEQUENCE medallas_otorgadas_id_seq TO svc_identity_role;
