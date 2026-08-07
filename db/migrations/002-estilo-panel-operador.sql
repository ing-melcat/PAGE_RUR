-- 002 — Estilo del panel del operador.
--
-- La consola puede dibujar sus tarjetas de control con el lenguaje de la barra
-- de telemetría (translúcidas, etiquetas apagadas) en lugar del clásico de
-- tarjeta maciza. Es una preferencia del usuario y no del dispositivo, igual
-- que el texto grande: quien elige un estilo lo quiere también desde la tablet.
-- Por eso vive aquí y no en el navegador.
--
-- Idempotente: se puede volver a ejecutar sin efecto.

ALTER TABLE users ADD COLUMN IF NOT EXISTS panel_hud BOOLEAN NOT NULL DEFAULT false;
