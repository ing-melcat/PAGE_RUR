-- 001 — Preferencias de accesibilidad por usuario.
--
-- Antes "texto grande" y "reducir animaciones" solo existían en memoria del
-- navegador: se perdían en cada recarga y no seguían al usuario entre
-- dispositivos. Pasan a la base, junto al resto de preferencias del perfil.
--
-- Idempotente: se puede volver a ejecutar sin efecto.

ALTER TABLE users ADD COLUMN IF NOT EXISTS large_text BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reduce_animations BOOLEAN NOT NULL DEFAULT false;
