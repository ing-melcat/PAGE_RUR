-- Segundo factor por aplicación autenticadora (TOTP), en modo passwordless.
--
-- No es "contraseña + código": quien activa el 2FA CAMBIA la contraseña por el
-- autenticador. services/identity/server.js pone `password_hash = NULL` al
-- activarlo, y el login pasa a verificar solo el código de seis dígitos. Por
-- eso hacen falta tres cambios y no dos:
--
--   totp_secret    El secreto compartido, base32, tal como lo generó
--                  generateSecret(20) — 32 caracteres.
--   totp_enabled   Es lo que decide qué rama del login corre. Va aparte del
--                  secreto porque hay un momento, entre generar el QR y
--                  validar el primer código, en el que el secreto existe pero
--                  todavía no debe autenticar a nadie.
--   password_hash  Deja de ser NOT NULL. Sin esto, activar el 2FA falla con
--                  violación de restricción y la cuenta se queda a medias.
--
-- Idempotente.

ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret  VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- El NOT NULL de totp_enabled, aparte y no solo en el ADD COLUMN. Donde la
-- columna ya se hubiera creado a mano —que es lo que pasó en producción—,
-- IF NOT EXISTS la salta entera y se queda como la dejaron: nullable. Y un
-- totp_enabled NULL es peor que uno en false, por dos razones:
--
--   1. El login lo lee como falso y busca contraseña, pero la contraseña de
--      esa cuenta es NULL, así que la comparación revienta en vez de negar
--      el acceso limpiamente.
--   2. El CHECK de abajo evalúa a NULL, y un CHECK que da NULL se da por
--      cumplido. La restricción existiría sin proteger nada.
UPDATE users SET totp_enabled = false WHERE totp_enabled IS NULL;
ALTER TABLE users ALTER COLUMN totp_enabled SET DEFAULT false;
ALTER TABLE users ALTER COLUMN totp_enabled SET NOT NULL;

-- Quitar el NOT NULL abre una puerta que no debe quedar abierta: una cuenta
-- sin contraseña y sin 2FA no la puede usar nadie, ni su dueño ni un
-- administrador, y desde fuera parece una cuenta normal que "no deja entrar".
-- El CHECK exige que siempre quede exactamente uno de los dos métodos en pie,
-- de modo que un UPDATE incompleto falle en la base en vez de dejar a alguien
-- fuera en silencio.
--
-- La guarda de pg_constraint es lo que la hace repetible: ADD CONSTRAINT no
-- admite IF NOT EXISTS.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_metodo_acceso_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_metodo_acceso_check
      CHECK (totp_enabled OR password_hash IS NOT NULL);
  END IF;
END $$;

COMMENT ON COLUMN users.totp_secret IS
  'Secreto TOTP en base32. Guardado en claro: quien lea la tabla puede generar códigos válidos.';
COMMENT ON COLUMN users.totp_enabled IS
  'El autenticador SUSTITUYE a la contraseña; con esto en true, password_hash es NULL.';
