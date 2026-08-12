-- Cambio de contraseña sin intervención de un administrador.
--
-- Hasta ahora la única forma de cambiar una contraseña era que un admin la
-- escribiera en el panel. Eso tenía dos costes: el trabajo manual, y que la
-- contraseña de cada persona la acababa sabiendo quien se la puso (y quien
-- leyera el chat por donde se la pasó).
--
-- Estas tres columnas sostienen el reemplazo:
--
--   password_temporal    La que puso un administrador vale para entrar UNA vez
--                        y no deja hacer nada más que cambiarla. Sin esto, la
--                        contraseña provisional se queda puesta para siempre.
--   password_expira      Y caduca. Una provisional que sigue sirviendo tres
--                        meses después es una contraseña conocida por dos
--                        personas, esperando.
--   password_changed_at  Cuándo se cambió por última vez. Hoy solo se registra;
--                        es lo que hará falta el día que se revoquen las
--                        sesiones abiertas al cambiarla.
--
-- Idempotente: se puede correr sobre una base que ya las tenga.

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_temporal   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_expira     TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

-- Las cuentas que ya existen NO se marcan como temporales: sus dueños las
-- usan hoy y bloquearlas de golpe dejaría a todo el mundo fuera del panel en
-- el mismo instante del despliegue. A partir de ahora, cualquier contraseña
-- que ponga un administrador sí nace temporal.
COMMENT ON COLUMN users.password_temporal IS
  'La contraseña la puso un administrador: solo sirve para entrar y cambiarla.';
COMMENT ON COLUMN users.password_expira IS
  'Hasta cuándo vale una contraseña temporal. NULL si no es temporal.';
COMMENT ON COLUMN users.password_changed_at IS
  'Última vez que el dueño de la cuenta la cambió por su cuenta.';
