import React from 'react';

/**
 * Iconografía técnica de RUR para el editor de publicaciones y documentación.
 * Diseñada siguiendo el vocabulario del manual de marca:
 * - Pistas de circuito impreso en ángulos de 45°
 * - Nodos de entrada de punto lleno y salida de anillo
 * - Retículas de calibración óptica y consolas HUD
 * - Trazo limpio en currentColor (1.6px)
 */

interface IconoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Icono de Modo Escribir: Pluma técnica de trazo con ángulo de 45° y pista de entrada.
 */
export function IconoModoEscribir({ size = 14, className, style }: IconoProps) {
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
      style={style}
      aria-hidden="true"
    >
      {/* Pluma técnica en 45 grados */}
      <path d="M18 2 L22 6 L9 19 L4 20 L5 15 Z" />
      <path d="M15 5 L19 9" />
      {/* Pista de datos con terminal de punto */}
      <path d="M2 12 H5 L8 9" />
      <circle cx="2" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Icono de Modo Previsualizar: Sensor óptico y retícula de calibración HUD.
 */
export function IconoModoPrevisualizar({ size = 14, className }: IconoProps) {
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
      {/* Lente óptica exterior */}
      <circle cx="12" cy="12" r="8" />
      {/* Núcleo de sensor */}
      <circle cx="12" cy="12" r="3" />
      {/* Marcas de cruceta técnica en los 4 ejes */}
      <path d="M12 2 V5" />
      <path d="M12 19 V22" />
      <path d="M2 12 H5" />
      <path d="M19 12 H22" />
    </svg>
  );
}

/**
 * Icono de Modo Dividido: Panel dual técnico con bus de separación.
 */
export function IconoModoDividido({ size = 14, className }: IconoProps) {
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
      {/* Marco modular */}
      <rect x="3" y="4" width="18" height="16" rx="2" />
      {/* Línea divisoria central con terminal de enlace */}
      <path d="M12 4 V20" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Icono de Modo Zen / Pantalla Completa: 4 esquinas de calibración de visor táctico.
 */
export function IconoModoZen({ size = 14, className }: IconoProps) {
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
      {/* Esquinas tácticas exteriores */}
      <path d="M4 9 V4 H9" />
      <path d="M15 4 H20 V9" />
      <path d="M20 15 V20 H15" />
      <path d="M9 20 H4 V15" />
      {/* Cruz central de referencia */}
      <path d="M12 10 V14" />
      <path d="M10 12 H14" />
    </svg>
  );
}

/**
 * Icono de Salir de Modo Zen: Retracción de coordenadas tácticas.
 */
export function IconoSalirZen({ size = 14, className, style }: IconoProps) {
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
      style={style}
      aria-hidden="true"
    >
      <path d="M9 4 V9 H4" />
      <path d="M15 4 V9 H20" />
      <path d="M15 20 V15 H20" />
      <path d="M9 20 V15 H4" />
    </svg>
  );
}

/**
 * Icono de Código / Script: Corchetes de instrucción de firmware con terminal de circuito.
 */
export function IconoCodigoTecnico({ size = 14, className }: IconoProps) {
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
      <path d="M8 7 L3 12 L8 17" />
      <path d="M16 7 L21 12 L16 17" />
      <path d="M13 5 L11 19" />
    </svg>
  );
}

/**
 * Icono de Tabla / Matriz de Telemetría: Matriz técnica de datos con terminal de bus.
 */
export function IconoMatrizTabla({ size = 14, className }: IconoProps) {
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
      {/* Contorno técnico */}
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      {/* Rejilla de telemetría */}
      <path d="M3 10 H21" />
      <path d="M3 15 H21" />
      <path d="M9 4 V20" />
      <path d="M15 4 V20" />
    </svg>
  );
}

/**
 * Icono de Subida de Imagen / Telemetría: Vector técnico de carga hacia el sistema.
 */
export function IconoSubirTelemetria({ size = 14, className }: IconoProps) {
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
      {/* Flecha técnica con terminales en 45 */}
      <path d="M12 3 V15" />
      <path d="M7 8 L12 3 L17 8" />
      {/* Chasis base de recepción */}
      <path d="M4 17 V20 H20 V17" />
      <circle cx="12" cy="15" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Icono de Protocolo / Alerta: Insignia hexagonal de instrumentación robótica.
 */
export function IconoProtocoloCallout({ size = 14, className, style }: IconoProps) {
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
      style={style}
      aria-hidden="true"
    >
      {/* Escudo hexagonal industrial */}
      <path d="M12 2 L20 6.5 V15 L12 22 L4 15 V6.5 Z" />
      {/* Símbolo central de estado */}
      <path d="M12 8 V12" />
      <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
