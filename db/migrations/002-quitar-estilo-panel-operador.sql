-- 002 — Retirar el estilo HUD del panel del operador.
--
-- Se probó dibujar las tarjetas de la consola con el lenguaje de la barra de
-- telemetría, guardando la elección por usuario en panel_hud. No convenció: la
-- barra pasa a usar el estilo del resto del sitio, y la consola se queda como
-- estaba. La columna no llegó a tener datos reales —se añadió y se retiró el
-- mismo día, con todos los valores en su default— así que se elimina en vez de
-- dejarla como lastre.
--
-- Sustituye por completo a la migración anterior con este número, que añadía la
-- columna. En una base donde nunca se aplicó aquella, esto tampoco hace nada.
--
-- Idempotente: se puede volver a ejecutar sin efecto.

ALTER TABLE users DROP COLUMN IF EXISTS panel_hud;
