import { defaultSchema } from 'rehype-sanitize';
import type { Schema } from 'hast-util-sanitize';

// Extiende el esquema por defecto (basado en el de GitHub) con lo que ya
// usaban las publicaciones antes de este cambio: iframes de incrustación
// (YouTube, etc.) y el atributo `style` en línea que escriben los
// redactores. El resto de la protección -- nada de <script>, atributos on*,
// ni URLs javascript: -- la sigue dando el esquema por defecto sin tocarlo.
export const markdownSanitizeSchema: Schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'iframe'],
  attributes: {
    ...defaultSchema.attributes,
    '*': [...(defaultSchema.attributes?.['*'] ?? []), 'style', 'className'],
    iframe: ['src', 'allow', 'allowFullScreen', 'frameBorder', 'scrolling', 'width', 'height'],
  },
};
