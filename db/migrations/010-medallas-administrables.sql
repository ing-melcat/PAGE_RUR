-- Las medallas dejan de estar escritas en el código.
--
-- Estaban en un objeto de services/shared/medallas.js: cuatro especiales y
-- tres automáticas, fijas. Inventar una medalla nueva exigía tocar código,
-- desplegar los tres servicios y elegir a mano un icono y un color en el CSS.
-- Es el mismo problema que ya tuvimos con los roles, y se resuelve igual: la
-- tabla manda, el panel la edita.
--
-- La diferencia entre los dos tipos SÍ sigue en el código, porque no es una
-- preferencia:
--
--   automatica = true   Se calcula desde los proyectos firmados. Su REGLA vive
--                       en medallasDe() y no se puede escribir desde el panel:
--                       una regla es código. Aquí solo viven su nombre, su
--                       icono y su color, que sí se pueden cambiar.
--   automatica = false  La otorga la coordinación con un motivo escrito. Estas
--                       se crean, se editan y se borran libremente.
--
-- Idempotente.

CREATE TABLE IF NOT EXISTS medallas (
    clave       VARCHAR(40) PRIMARY KEY,
    nombre      VARCHAR(80)  NOT NULL,
    -- El criterio. Se enseña al concederla, que es lo que evita que la misma
    -- medalla acabe significando cosas distintas según quién la dé.
    descripcion TEXT         NOT NULL DEFAULT '',
    -- Un solo carácter visible. Se distinguen por FORMA además de por color:
    -- fiarlo todo al tono deja fuera a quien no separa el ámbar del verde.
    icono       VARCHAR(8)   NOT NULL DEFAULT '✦',
    color       VARCHAR(7)   NOT NULL DEFAULT '#fbbf24',
    -- Se calcula sola desde post_miembros; no se otorga a mano.
    automatica  BOOLEAN      NOT NULL DEFAULT false,
    -- Las que tienen regla en el código no se pueden borrar: la regla seguiría
    -- corriendo y calcularía una medalla que ya no existe en la tabla.
    del_sistema BOOLEAN      NOT NULL DEFAULT false,
    -- En qué orden salen en el perfil y en el panel.
    orden       INTEGER      NOT NULL DEFAULT 100
);

-- Las siete que ya existían, con los mismos iconos y colores que tenían
-- cableados en Medallas.tsx y Medallas.css. Nadie gana ni pierde nada el día
-- del despliegue: esto solo mueve a datos lo que ya estaba en el código.
--
-- ON CONFLICT DO NOTHING para que una segunda pasada no pise lo que se haya
-- editado desde el panel.
INSERT INTO medallas (clave, nombre, descripcion, icono, color, automatica, del_sistema, orden) VALUES
  ('proyecto',       'Proyecto terminado', 'Firmó al menos un proyecto publicado.',                        '▲', '#8c9bb0', true,  true,  10),
  ('aportes',        'Grandes aportes',    'Cinco proyectos o más, o trabajo en tres facetas distintas.',  '◆', '#2ecc71', true,  true,  20),
  ('lider',          'Líder',              'Lideró al menos un proyecto.',                                 '★', '#FBCA01', true,  true,  30),
  ('excelencia',     'Excelencia',         'Trayectoria sostenida por encima de lo que se le pidió.',      '✦', '#fbbf24', false, false, 40),
  ('innovacion',     'Innovación',         'Resolvió algo que en la unidad no existía o nadie había logrado.', '◈', '#fbbf24', false, false, 50),
  ('mentoria',       'Mentoría',           'Formó a otros miembros y los dejó capaces de seguir solos.',   '❖', '#fbbf24', false, false, 60),
  ('representacion', 'Representación',     'Representó a la unidad fuera: competencia, congreso o convenio.', '◉', '#fbbf24', false, false, 70)
ON CONFLICT (clave) DO NOTHING;

-- Una medalla concedida tiene que apuntar a una que exista. Sin esto, borrar
-- una del catálogo dejaría filas huérfanas que el perfil ignora en silencio:
-- la persona la seguiría teniendo en la base y no la vería nunca.
--
-- RESTRICT y no CASCADE a propósito: borrar una medalla que alguien lleva
-- puesta le estaría quitando un reconocimiento de paso. El servidor responde
-- diciendo a cuántas personas hay que retirársela antes.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'medallas_otorgadas_clave_fkey'
  ) THEN
    -- Primero se limpian las concedidas cuya clave ya no esté en el catálogo,
    -- o la clave foránea no podría crearse. medallasDe() ya las ignoraba, así
    -- que no se pierde nada que estuviera a la vista.
    DELETE FROM medallas_otorgadas o
     WHERE NOT EXISTS (SELECT 1 FROM medallas m WHERE m.clave = o.clave);

    ALTER TABLE medallas_otorgadas
      ADD CONSTRAINT medallas_otorgadas_clave_fkey
      FOREIGN KEY (clave) REFERENCES medallas(clave) ON DELETE RESTRICT;
  END IF;
END $$;

-- identity sirve los perfiles públicos con sus medallas y administra el
-- catálogo desde el panel de personal. Los otros dos servicios no las tocan.
GRANT SELECT, INSERT, UPDATE, DELETE ON medallas TO svc_identity_role;
