import type { Transition, Variants } from 'framer-motion';

/**
 * Tokens de movimiento estándar para transiciones de pantalla en PAGE_RUR.
 *
 * Principios:
 * 1. Solo transformaciones compuestas por GPU (opacity, translateY). Cero filter: blur()
 *    para evitar caídas de FPS y rotura de stacking context / background-attachment: fixed.
 * 2. Tiempos snappies (200-240ms) con curva Bézier acelerada inicial y desaceleración orgánica.
 * 3. Desplazamiento sutil (8px) para sensación nativa e industrial, no de "ventana flotante".
 */

export const pageMotionVariants: Variants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -6,
  },
};

export const pageMotionTransition: Transition = {
  duration: 0.22,
  ease: [0.16, 1, 0.3, 1],
};

export const pageTransitionConfig = {
  variants: pageMotionVariants,
  initial: 'initial',
  animate: 'animate',
  exit: 'exit',
  transition: pageMotionTransition,
};
