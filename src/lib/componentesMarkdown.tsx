import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import {
  IconoCalloutNota,
  IconoCalloutTip,
  IconoCalloutImportante,
  IconoCalloutWarning,
  IconoCalloutCaution,
} from '../components/iconos/IconosCallout';
import { copiarAlPortapapeles } from './clipboard';
import { slugify, extraerTexto } from './markdownUtils';

export { slugify, extraerTexto, extraerEncabezadosMarkdown, type TocItem } from './markdownUtils';

// Componentes que ReactMarkdown usa para ciertas etiquetas, compartidos
// por la página pública (PublicationPage, Landing.tsx) y la vista previa
// del editor (AdminContent.tsx) -- si cada una llevara los suyos, lo que
// ve quien redacta dejaría de coincidir con lo que se publica.
//
// Viven aquí y no en Landing.tsx para que el panel de administración no
// tenga que importar Landing entero: arrastraría con él el visor 3D y el
// resto de la web pública al paquete del panel.

const CALLOUT_REGEX = /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:[ \t]*\r?\n|[ \t]+|$)/i;

interface CalloutConfig {
  tipo: 'note' | 'tip' | 'important' | 'warning' | 'caution';
  titulo: string;
  Icono: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
}

const CALLOUT_CONFIGS: Record<string, CalloutConfig> = {
  NOTE: { tipo: 'note', titulo: 'PROTOCOLO // NOTA TÉCNICA', Icono: IconoCalloutNota },
  TIP: { tipo: 'tip', titulo: 'CALIBRACIÓN // TIP', Icono: IconoCalloutTip },
  IMPORTANT: { tipo: 'important', titulo: 'DIRECTRIZ // REQUERIMIENTO', Icono: IconoCalloutImportante },
  WARNING: { tipo: 'warning', titulo: 'PRECAUCIÓN OPERACIONAL', Icono: IconoCalloutWarning },
  CAUTION: { tipo: 'caution', titulo: 'ALERTA // PARO CRÍTICO', Icono: IconoCalloutCaution },
};

function procesarCallout(children: React.ReactNode): { config: CalloutConfig; content: React.ReactNode } | null {
  const arr = React.Children.toArray(children);
  let calloutKey: string | null = null;

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    if (typeof item === 'string' && !item.trim()) continue;

    if (typeof item === 'string') {
      const match = item.match(CALLOUT_REGEX);
      if (match) {
        calloutKey = match[1].toUpperCase();
        const resto = item.replace(CALLOUT_REGEX, '');
        if (resto.trim().length > 0) {
          arr[i] = resto;
        } else {
          arr.splice(i, 1);
        }
      }
      break;
    }

    if (React.isValidElement(item)) {
      const pProps = item.props as { children?: React.ReactNode };
      const pChildren = React.Children.toArray(pProps?.children);

      for (let j = 0; j < pChildren.length; j++) {
        const pChild = pChildren[j];
        if (typeof pChild === 'string' && !pChild.trim()) continue;

        if (typeof pChild === 'string') {
          const match = pChild.match(CALLOUT_REGEX);
          if (match) {
            calloutKey = match[1].toUpperCase();
            const resto = pChild.replace(CALLOUT_REGEX, '');
            if (resto.trim().length > 0) {
              pChildren[j] = resto;
            } else {
              pChildren.splice(j, 1);
            }

            if (pChildren.length > 0) {
              arr[i] = React.cloneElement(item, {}, ...pChildren);
            } else {
              arr.splice(i, 1);
            }
          }
          break;
        }
        break;
      }
      break;
    }
    break;
  }

  if (!calloutKey || !CALLOUT_CONFIGS[calloutKey]) return null;
  return { config: CALLOUT_CONFIGS[calloutKey], content: arr };
}

/**
 * Renderizador de blockquote: convierte citas que comienzan con `[!TIPO]`
 * en callouts de alerta estilizados tipo GitHub. Citas comunes mantienen
 * el blockquote nativo.
 */
function BloqueCitaOAlerta({ node: _node, children, ...props }: any) {
  const callout = procesarCallout(children);

  if (callout) {
    const { config, content } = callout;
    const IconoComponente = config.Icono;
    return (
      <div className={`markdown-callout markdown-callout-${config.tipo}`} role="note">
        <div className="markdown-callout__header">
          <IconoComponente size={18} className="markdown-callout__icon" aria-hidden="true" />
          <span className="markdown-callout__title">{config.titulo}</span>
        </div>
        <div className="markdown-callout__content">
          {content}
        </div>
      </div>
    );
  }

  return <blockquote {...props}>{children}</blockquote>;
}

/**
 * Renderizador de bloques `<pre>`: envuelve el código en un contenedor con
 * botón interactivo para copiar el texto con confirmación visual de 2 segundos.
 */
function BloquePreConCopiar({ node: _node, children, ...props }: any) {
  const [copiado, setCopiado] = useState(false);

  const handleCopiar = async () => {
    const texto = extraerTexto(children);
    if (!texto) return;
    const ok = await copiarAlPortapapeles(texto);
    if (ok) {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  return (
    <div className="codigo-bloque-wrapper">
      <button
        type="button"
        className={`codigo-copiar-btn ${copiado ? 'codigo-copiar-btn--copiado' : ''}`}
        onClick={handleCopiar}
        aria-label={copiado ? 'Copiado al portapapeles' : 'Copiar código al portapapeles'}
        title={copiado ? 'Copiado al portapapeles' : 'Copiar código'}
      >
        {copiado ? (
          <>
            <Check size={14} className="codigo-copiar-btn__icon" aria-hidden="true" />
            <span className="codigo-copiar-btn__texto">Copiado</span>
          </>
        ) : (
          <>
            <Copy size={14} className="codigo-copiar-btn__icon" aria-hidden="true" />
            <span className="codigo-copiar-btn__texto">Copiar</span>
          </>
        )}
      </button>
      <pre {...props}>{children}</pre>
    </div>
  );
}

// Se define una sola vez, fuera de todo componente: pasarle un objeto
// nuevo a ReactMarkdown en cada render le haría rehacer el contenido
// completo cada vez.
export const componentesMarkdown = {
  // Una tabla más ancha que la columna de lectura tiene que hacer scroll
  // ella sola. Necesita este contenedor porque una <table> no acepta
  // overflow sin perder el reparto automático de columnas.
  table: ({ node: _node, ...props }: any) => (
    <div className="tabla-scroll"><table {...props} /></div>
  ),

  // Bloques de código con botón flotante de copiado
  pre: BloquePreConCopiar,

  // Callouts de alerta GitHub ([!NOTE], [!TIP], etc.) o blockquote común
  blockquote: BloqueCitaOAlerta,

  // Encabezados con ID slugificado para anclas y tabla de contenidos
  h2: ({ node: _node, children, id: explicitId, ...props }: any) => {
    const slug = explicitId || slugify(extraerTexto(children));
    return (
      <h2 id={slug} className="encabezado-ancla" {...props}>
        {children}
      </h2>
    );
  },

  h3: ({ node: _node, children, id: explicitId, ...props }: any) => {
    const slug = explicitId || slugify(extraerTexto(children));
    return (
      <h3 id={slug} className="encabezado-ancla" {...props}>
        {children}
      </h3>
    );
  },
};
