import { useEffect, useId, useRef, useState } from 'react';

/**
 * Botón de ayuda: una interrogación pequeña que revela una explicación.
 *
 * Sustituye a las frases explicativas que iban sueltas bajo cada botón y cada
 * tarjeta del panel. Aquellas ocupaban sitio permanentemente para decir algo
 * que hace falta una vez —la primera— y que después estorba: quien usa el
 * panel a diario ya sabe qué hace cada botón y solo quiere llegar a él.
 *
 * Funciona con ratón y con dedo, que es lo que suele fallar en estos casos:
 * en escritorio se muestra al pasar por encima, y en una pantalla táctil —donde
 * no existe "pasar por encima"— se abre al tocar y se cierra al tocar fuera.
 * También se abre con el teclado y se cierra con Escape.
 */
export function Ayuda({ texto }: { texto: string }) {
  const [abierta, setAbierta] = useState(false);
  const contenedor = useRef<HTMLSpanElement>(null);
  const id = useId();

  // Tocar fuera cierra. Sin esto, en el móvil la explicación se quedaría
  // abierta hasta recargar, porque no hay ningún "salir con el ratón".
  useEffect(() => {
    if (!abierta) return;

    const fuera = (e: MouseEvent | TouchEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierta(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierta(false);
    };

    document.addEventListener('mousedown', fuera);
    document.addEventListener('touchstart', fuera);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('touchstart', fuera);
      document.removeEventListener('keydown', escape);
    };
  }, [abierta]);

  return (
    <span className="ayuda" ref={contenedor}>
      <button
        type="button"
        className="ayuda__boton"
        aria-label={texto}
        aria-expanded={abierta}
        aria-describedby={abierta ? id : undefined}
        onClick={(e) => {
          // El botón vive dentro de tarjetas que son pulsables enteras: sin
          // esto, pedir ayuda abriría también la publicación.
          e.preventDefault();
          e.stopPropagation();
          setAbierta((v) => !v);
        }}
      >
        ?
      </button>
      <span id={id} role="tooltip" className={`ayuda__globo${abierta ? ' ayuda__globo--abierto' : ''}`}>
        {texto}
      </span>
    </span>
  );
}
