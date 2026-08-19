import { defaultSchema } from 'rehype-sanitize';
import type { Schema } from 'hast-util-sanitize';

const atributosBase = defaultSchema.attributes ?? {};

// El esquema por defecto (el de GitHub) no permite `class` libremente: la
// restringe etiqueta por etiqueta -- en <a> solo admite el literal
// `data-footnote-backref`, en <li> solo `task-list-item`... Y como en HAST
// `className` es un array, esa regla específica devuelve un array VACÍO en
// vez de "no sé", así que nunca cae al comodín `*` de abajo y el atributo
// llega vacío al HTML. Por eso las clases oficiales de la interfaz
// (.action-card, .primary-btn, .message) se perdían al renderizar. Aquí se
// quitan esas reglas de `className` por etiqueta y se permite una sola vez,
// en `*`.
const sinReglasDeClase = Object.fromEntries(
  Object.entries(atributosBase).map(([etiqueta, lista]) => [
    etiqueta,
    (lista ?? []).filter((attr) => (Array.isArray(attr) ? attr[0] : attr) !== 'className'),
  ]),
);

// Extiende el esquema por defecto (basado en el de GitHub) con lo que ya
// usaban las publicaciones antes de este cambio: iframes de incrustación
// (YouTube, etc.) y el atributo `style` en línea que escriben los
// redactores. El resto de la protección -- nada de <script>, atributos on*,
// ni URLs javascript: -- la sigue dando el esquema por defecto sin tocarlo.
export const markdownSanitizeSchema: Schema = {
  ...defaultSchema,
  // Los `id` que pone el redactor se dejan tal cual: el `user-content-`
  // que antepone hast-util-sanitize por defecto rompe cualquier enlace
  // interno `href="#ancla"` de un índice dentro de la publicación.
  clobberPrefix: '',
  tagNames: [...(defaultSchema.tagNames ?? []), 'iframe'],
  attributes: {
    ...sinReglasDeClase,
    '*': [...(atributosBase['*'] ?? []), 'className', 'style'],
    a: [...(sinReglasDeClase.a ?? []), 'target', 'rel'],
    iframe: [
      'src',
      'title',
      'width',
      'height',
      'allow',
      'allowFullScreen',
      'frameBorder',
      'scrolling',
      'loading',
      'referrerPolicy',
    ],
  },
};
