-- 004 — índice en posts.date.
--
-- GET /api/posts (services/content/server.js) hace
-- `SELECT * FROM posts ORDER BY date DESC` sin filtro: es la query pública
-- más frecuente del sitio (landing, /explora, /archivo) y hasta ahora
-- ordenaba sin ningún índice que la respalde -- un sort completo de tabla en
-- cada request, que empeora con cada publicación nueva.
--
-- Aditivo y sin riesgo: no cambia el esquema que consumen otros servicios
-- (incluida una futura app móvil), solo acelera el ORDER BY existente.
--
-- Idempotente: CREATE INDEX IF NOT EXISTS no falla si ya se aplicó.

CREATE INDEX IF NOT EXISTS idx_posts_date ON posts (date DESC);
