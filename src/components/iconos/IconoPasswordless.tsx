/**
 * Icono del estado "passwordless activo", en el bloque de Seguridad del
 * perfil.
 *
 * Sustituye al CheckCircle de lucide, que se leía como el tilde genérico de
 * cualquier formulario. Aquí el vocabulario es el de la identidad de RUR:
 * pistas de circuito en ángulos de 45°, con terminal de punto lleno a la
 * entrada y de anillo a la salida -- las mismas dos piezas que aparecen en
 * las placas del manual de marca.
 *
 * El trazo va en currentColor a propósito: quien lo usa decide el color
 * (aquí lo hereda de --success) sin que el icono traiga uno propio.
 */
export function IconoPasswordless({ size = 32 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* El chip: la cuenta ya vinculada. */}
      <rect x="9" y="9" width="14" height="14" rx="2" />

      {/* La confirmación, dentro del chip y no encima: lo que está resuelto
          es la vinculación, no un paso suelto del formulario. */}
      <path d="M12.8 16.4 L15.3 18.9 L19.6 13.6" />

      {/* Entrada: pista con terminal de punto lleno. */}
      <path d="M2.6 13 H5 L8 16 H9" />
      <circle cx="2.6" cy="13" r="1.5" fill="currentColor" stroke="none" />

      {/* Salida: pista con terminal de anillo. */}
      <path d="M23 19 H25 L28 22 H28.6" />
      <circle cx="29.4" cy="22" r="1.5" />
    </svg>
  );
}
