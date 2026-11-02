-- 015 — Centro de Control (app de escritorio) sincronizado con la tabla robots.
--
-- Dos piezas:
--
-- 1) robots.config_version / config_updated_at: el Centro de Control consulta
--    la lista cada pocos segundos y necesita saber si cambió algo que afecte a
--    sus procesos (sala, URL, credenciales, dominio ROS). NO se incrementa con
--    cambios de misión ni de estado: esos se escriben constantemente desde el
--    panel del operador y harían saltar avisos de "actualización" falsos.
--
-- 2) control_center_devices: cada instalación del Centro de Control se
--    autentica con una llave de dispositivo que crea un administrador. Solo se
--    guarda su SHA-256: la llave en claro se muestra una única vez.
--
-- Idempotente: se puede ejecutar más de una vez sin efecto.

ALTER TABLE robots ADD COLUMN IF NOT EXISTS config_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE robots ADD COLUMN IF NOT EXISTS config_updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION robots_bump_config_version() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.config_version := 1;
    NEW.config_updated_at := now();
    RETURN NEW;
  END IF;

  IF NEW.name IS DISTINCT FROM OLD.name
     OR NEW.room IS DISTINCT FROM OLD.room
     OR NEW.livekit_url IS DISTINCT FROM OLD.livekit_url
     OR NEW.livekit_api_key IS DISTINCT FROM OLD.livekit_api_key
     OR NEW.livekit_api_secret_encrypted IS DISTINCT FROM OLD.livekit_api_secret_encrypted
     OR (COALESCE(NEW.settings, '{}'::jsonb) - 'mission') IS DISTINCT FROM (COALESCE(OLD.settings, '{}'::jsonb) - 'mission')
  THEN
    NEW.config_version := OLD.config_version + 1;
    NEW.config_updated_at := now();
  ELSE
    NEW.config_version := OLD.config_version;
    NEW.config_updated_at := OLD.config_updated_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_robots_config_version ON robots;
CREATE TRIGGER trg_robots_config_version
  BEFORE INSERT OR UPDATE ON robots
  FOR EACH ROW EXECUTE FUNCTION robots_bump_config_version();

CREATE TABLE IF NOT EXISTS control_center_devices (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    key_hash CHAR(64) NOT NULL UNIQUE,
    key_prefix VARCHAR(16) NOT NULL,
    creado_por VARCHAR(100) NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    revocado BOOLEAN NOT NULL DEFAULT false,
    revocado_en TIMESTAMPTZ,
    last_seen TIMESTAMPTZ,
    last_ip VARCHAR(64)
);

-- svc-robots es el único servicio que atiende al Centro de Control.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'svc_robots_role') THEN
    GRANT SELECT, INSERT, UPDATE ON control_center_devices TO svc_robots_role;
    GRANT USAGE, SELECT ON SEQUENCE control_center_devices_id_seq TO svc_robots_role;
  END IF;
END $$;
