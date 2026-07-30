import React from 'react';
import { ControlButton } from './ControlButton';

// Componente reutilizable para agrupar botones (ej. Arms, Drums)
// Implementa el principio DRY (Don't Repeat Yourself) de la arquitectura orientada a objetos.
export const ControlGroup = ({ title, buttons, groupClass = "arm-group" }) => (
  <div className={groupClass}>
    <h4>{title}</h4>
    {buttons.map((btn, idx) => (
      <ControlButton key={idx} label={btn.label} onPress={btn.onPress} onRelease={btn.onRelease} />
    ))}
  </div>
);
