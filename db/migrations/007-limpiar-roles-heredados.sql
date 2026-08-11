-- Saca de `users.roles` los valores que nunca fueron roles.
--
-- Vienen de la integración inicial, cuando el campo aceptaba texto libre:
-- "Software & Mechanical" y "Software  & Hardware" (con dos espacios) se
-- guardaron ahí como si fueran permisos. No lo son, y el efecto real es que
-- esas dos cuentas llevaban desde entonces sin poder hacer NADA: ni operar el
-- robot ni editar, porque ningún requireRole reconocía ese texto.
--
-- Ya no puede volver a pasar: crear un rol exige pasar por /api/roles, que
-- valida el nombre contra ^[a-z0-9_-]{2,40}$ y lo guarda en la tabla `roles`.
--
-- Idempotente: la segunda pasada no encuentra nada que mover.

-- El texto se conserva en `rol_publico` —que es literalmente "a qué te
-- dedicas"— en vez de tirarlo o de repartirlo a ojo entre las áreas. Decidir
-- si "Software & Mechanical" es Software o es Mecánica no me toca a mí: el
-- área la elige cada quien desde su perfil, y ahí tendrá el texto original
-- delante para hacerlo.
UPDATE users
   SET rol_publico = COALESCE(NULLIF(rol_publico, ''), trim(regexp_replace(elemento, '\s+', ' ', 'g')))
  FROM (
    SELECT id AS uid, jsonb_array_elements_text(roles) AS elemento FROM users
  ) AS sueltos
 WHERE users.id = sueltos.uid
   AND elemento !~ '^[a-z0-9_-]{2,40}$';

-- Y fuera de `roles`: solo se quedan los nombres que existen de verdad en la
-- tabla de roles.
UPDATE users
   SET roles = COALESCE(
     (SELECT jsonb_agg(e) FROM jsonb_array_elements_text(roles) AS e
       WHERE e IN (SELECT nombre FROM roles)),
     '[]'::jsonb
   )
 WHERE EXISTS (
   SELECT 1 FROM jsonb_array_elements_text(roles) AS e
    WHERE e NOT IN (SELECT nombre FROM roles)
 );

-- Estas cuentas quedan SIN permisos, que es exactamente lo que tenían de
-- hecho hasta ahora — solo que ahora se ve. Se les asignan desde el panel de
-- personal, pestaña PERSONAS, marcando sus roles.
