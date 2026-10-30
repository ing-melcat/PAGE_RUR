import React from 'react';

/**
 * Iconografía técnica de RUR para los bloques de alerta y especificaciones (Callouts).
 * Sustituye a los iconos genéricos de bombillas o signos de exclamación comunes
 * por símbolos de instrumentación, protocolos y telemetría de laboratorio.
 */

interface IconoCalloutProps {
  size?: number;
  className?: string;
}

/**
 * NOTA TÉCNICA (NOTE): Marco de bitácora y registro de telemetría.
 */
export function IconoCalloutNota({ size = 16, className }: IconoCalloutProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Marco de registro */}
      <rect x="4" y="3" width="16" height="18" rx="2" />
      {/* Líneas de registro técnico */}
      <path d="M8 7 H16" />
      <path d="M8 11 H16" />
      <path d="M8 15 H12" />
      {/* Terminal de circuito en ángulo de 45 */}
      <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * CALIBRACIÓN Y TIP (TIP): Nodo de optimización y tuning con pista de 45°.
 */
export function IconoCalloutTip({ size = 16, className }: IconoCalloutProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Núcleo de sintonización */}
      <circle cx="12" cy="12" r="5" />
      {/* Nodos y pines de ajuste en cruz */}
      <path d="M12 2 V5" />
      <path d="M12 19 V22" />
      <path d="M2 12 H5" />
      <path d="M19 12 H22" />
      {/* Indicador de calibración activo */}
      <path d="M10 12 L11.5 13.5 L14.5 10.5" />
    </svg>
  );
}

/**
 * DIRECTRIZ CRÍTICA (IMPORTANT): Rombo técnico de requerimiento de misión.
 */
export function IconoCalloutImportante({ size = 16, className }: IconoCalloutProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Rombo de especificación técnica */}
      <path d="M12 2 L21 12 L12 22 L3 12 Z" />
      {/* Punto de control central */}
      <path d="M12 7 V13" />
      <circle cx="12" cy="17" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * PRECAUCIÓN OPERACIONAL (WARNING): Triángulo de advertencia de maquinaria robótica.
 */
export function IconoCalloutWarning({ size = 16, className }: IconoCalloutProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Triángulo industrial con esquinas achaflanadas */}
      <path d="M12 3 L22 20 H2 Z" />
      {/* Indicador de advertencia */}
      <path d="M12 9 V13" />
      <circle cx="12" cy="17" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * ALERTA DE SEGURIDAD / PARO DE EMERGENCIA (CAUTION): Octágono de paro y bypass.
 */
export function IconoCalloutCaution({ size = 16, className }: IconoCalloutProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Octágono de parada crítica */}
      <path d="M7.86 2 H16.14 L22 7.86 V16.14 L16.14 22 H7.86 L2 16.14 V7.86 Z" />
      {/* Cruz de desconexión técnica */}
      <path d="M12 8 V13" />
      <circle cx="12" cy="16.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
