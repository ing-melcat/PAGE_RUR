import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

// Rangos fijos por marcha para locomoción tipo Tanque (Opción A).
// El avance (linear) y el giro (angular) están separados para que el giro
// sobre el propio eje nunca sea excesivamente rápido ni caiga en ángulo muerto.
export const TANK_GEARS = [
  { id: 0, label: '0.4', linear: 0.40, angular: 0.35, arrows: 1 },
  { id: 1, label: '0.7', linear: 0.70, angular: 0.45, arrows: 2 },
  { id: 2, label: '1.0', linear: 1.00, angular: 0.60, arrows: 3 },
];

function PlayArrowsIcon({ count }) {
  return (
    <span className="tank-speed-icon-circle" aria-hidden="true">
      <svg
        width={9 + (count - 1) * 5}
        height="10"
        viewBox={`0 0 ${8 + (count - 1) * 6} 10`}
        fill="currentColor"
      >
        {Array.from({ length: count }).map((_, i) => {
          const offset = i * 6;
          return (
            <path
              key={i}
              d={`M${1 + offset} 1.2 L${7 + offset} 5 L${1 + offset} 8.8 Z`}
            />
          );
        })}
      </svg>
    </span>
  );
}

function TankDirectionButton({ dir, icon, activeDir, onStart, onEnd }) {
  const btnRef = useRef(null);
  const isTouchRef = useRef(false);
  const callbacksRef = useRef({ onStart, onEnd });

  useEffect(() => {
    callbacksRef.current = { onStart, onEnd };
  }, [onStart, onEnd]);

  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;

    const handleStart = (e) => {
      if (e.cancelable) e.preventDefault();
      if (e.type.includes('touch')) isTouchRef.current = true;
      if (e.type.includes('mouse') && isTouchRef.current) return;
      callbacksRef.current.onStart(dir);
    };

    const handleEnd = (e) => {
      if (e.type.includes('mouse') && isTouchRef.current) {
        setTimeout(() => { isTouchRef.current = false; }, 400);
        return;
      }
      callbacksRef.current.onEnd(dir);
    };

    btn.addEventListener('touchstart', handleStart, { passive: false });
    btn.addEventListener('touchend', handleEnd, { passive: false });
    btn.addEventListener('touchcancel', handleEnd, { passive: false });
    btn.addEventListener('mousedown', handleStart, { passive: false });
    btn.addEventListener('mouseup', handleEnd, { passive: false });
    btn.addEventListener('mouseleave', handleEnd, { passive: false });

    return () => {
      btn.removeEventListener('touchstart', handleStart);
      btn.removeEventListener('touchend', handleEnd);
      btn.removeEventListener('touchcancel', handleEnd);
      btn.removeEventListener('mousedown', handleStart);
      btn.removeEventListener('mouseup', handleEnd);
      btn.removeEventListener('mouseleave', handleEnd);
    };
  }, [dir]);

  const isPressed = activeDir === dir;

  return (
    <button
      ref={btnRef}
      type="button"
      className={`control-btn tank-dpad-btn tank-dpad-${dir.toLowerCase()} ${isPressed ? 'pressed' : ''}`}
      onContextMenu={(e) => { e.preventDefault(); return false; }}
    >
      {icon}
    </button>
  );
}

export function TankPad({
  onMove,
  onStop,
  setBinPack,
  keyboardEnabled = true,
  keyboardMappings,
  gearIndex = 0,
  onGearChange,
}) {
  const [internalGear, setInternalGear] = useState(0);
  const currentGearIndex = gearIndex !== undefined ? gearIndex : internalGear;
  const currentGear = TANK_GEARS[currentGearIndex] || TANK_GEARS[0];

  const [activeDir, setActiveDir] = useState(null); // 'Forward' | 'Backward' | 'Left' | 'Right' | null
  const activeDirRef = useRef(null);
  const gearRef = useRef(currentGear);

  const selectGear = useCallback((idx) => {
    const clamped = Math.max(0, Math.min(TANK_GEARS.length - 1, idx));
    if (onGearChange) {
      onGearChange(clamped);
    } else {
      setInternalGear(clamped);
    }
  }, [onGearChange]);

  const dispatchDirection = useCallback((dir, gearObj) => {
    const g = gearObj || gearRef.current;
    if (!dir) {
      const stopPkt = onStop?.(0, 0);
      setBinPack?.(stopPkt);
      window.dispatchEvent(new CustomEvent('joystickMove', { detail: { x: 0, y: 0 } }));
      return;
    }

    let x = 0;
    let y = 0;
    if (dir === 'Forward') x = g.linear;
    else if (dir === 'Backward') x = -g.linear;
    else if (dir === 'Left') y = -g.angular;
    else if (dir === 'Right') y = g.angular;

    const pkt = onMove?.(x, y);
    if (pkt) setBinPack?.(pkt);
    window.dispatchEvent(new CustomEvent('joystickMove', { detail: { x, y } }));
  }, [onMove, onStop, setBinPack]);

  // Si el operador cambia de velocidad mientras mantiene presionada una dirección,
  // actualiza de inmediato el vector enviado con el nuevo rango.
  useEffect(() => {
    gearRef.current = currentGear;
    if (activeDirRef.current) {
      dispatchDirection(activeDirRef.current, currentGear);
    }
  }, [currentGear, dispatchDirection]);

  const handlePointerStart = useCallback((dir) => {
    activeDirRef.current = dir;
    setActiveDir(dir);
    dispatchDirection(dir, gearRef.current);
  }, [dispatchDirection]);

  const handlePointerEnd = useCallback((dir) => {
    if (activeDirRef.current === dir) {
      activeDirRef.current = null;
      setActiveDir(null);
      dispatchDirection(null);
    }
  }, [dispatchDirection]);

  useEffect(() => {
    if (!keyboardEnabled) return;
    // Pila de direcciones presionadas: la última tecla presionada gana (100% axial, cero diagonales)
    const dirStack = [];
    const maps = keyboardMappings || { Forward: 'KeyW', Backward: 'KeyS', Left: 'KeyA', Right: 'KeyD' };

    const normalizarCodigo = (e) => {
      if (e.code && e.code !== 'Unidentified') return e.code;
      if (e.key) {
        if (e.key === 'ArrowUp') return 'ArrowUp';
        if (e.key === 'ArrowDown') return 'ArrowDown';
        if (e.key === 'ArrowLeft') return 'ArrowLeft';
        if (e.key === 'ArrowRight') return 'ArrowRight';
        if (e.key === ' ' || e.key === 'Spacebar') return 'Space';
        if (e.key.length === 1) {
          const char = e.key.toUpperCase();
          if (/[A-Z]/.test(char)) return `Key${char}`;
          if (/[0-9]/.test(char)) return `Digit${char}`;
        }
      }
      return e.code || e.key;
    };

    const syncFromStack = () => {
      const topDir = dirStack.length > 0 ? dirStack[dirStack.length - 1] : null;
      if (topDir !== activeDirRef.current) {
        activeDirRef.current = topDir;
        setActiveDir(topDir);
        dispatchDirection(topDir, gearRef.current);
      }
    };

    const handleKeyDown = (e) => {
      if (e.repeat) return;
      const code = normalizarCodigo(e);

      if (code === 'Digit1' || e.key === '1') {
        selectGear(0);
        return;
      }
      if (code === 'Digit2' || e.key === '2') {
        selectGear(1);
        return;
      }
      if (code === 'Digit3' || e.key === '3') {
        selectGear(2);
        return;
      }

      let match = null;
      if (code === maps.Forward) match = 'Forward';
      else if (code === maps.Backward) match = 'Backward';
      else if (code === maps.Left) match = 'Left';
      else if (code === maps.Right) match = 'Right';

      if (match) {
        const existingIdx = dirStack.indexOf(match);
        if (existingIdx !== -1) dirStack.splice(existingIdx, 1);
        dirStack.push(match);
        syncFromStack();
      }
    };

    const handleKeyUp = (e) => {
      const code = normalizarCodigo(e);
      let match = null;
      if (code === maps.Forward) match = 'Forward';
      else if (code === maps.Backward) match = 'Backward';
      else if (code === maps.Left) match = 'Left';
      else if (code === maps.Right) match = 'Right';

      if (match) {
        const idx = dirStack.indexOf(match);
        if (idx !== -1) {
          dirStack.splice(idx, 1);
          syncFromStack();
        }
      }
    };

    const detenerPorPerderFoco = () => {
      if (dirStack.length > 0 || activeDirRef.current) {
        dirStack.length = 0;
        activeDirRef.current = null;
        setActiveDir(null);
        dispatchDirection(null);
      }
    };

    const handleVisibility = () => {
      if (document.hidden) detenerPorPerderFoco();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', detenerPorPerderFoco);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', detenerPorPerderFoco);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [keyboardEnabled, keyboardMappings, dispatchDirection, selectGear]);

  return (
    <div className="tank-pad-wrapper">
      <div className="tank-dpad-grid">
        <TankDirectionButton
          dir="Forward"
          icon={<ChevronUp size={22} strokeWidth={2.4} />}
          activeDir={activeDir}
          onStart={handlePointerStart}
          onEnd={handlePointerEnd}
        />
        <TankDirectionButton
          dir="Left"
          icon={<ChevronLeft size={22} strokeWidth={2.4} />}
          activeDir={activeDir}
          onStart={handlePointerStart}
          onEnd={handlePointerEnd}
        />
        <div className="tank-dpad-center" aria-hidden="true">
          <span className={`tank-dpad-center-dot ${activeDir ? 'active' : ''}`} />
        </div>
        <TankDirectionButton
          dir="Right"
          icon={<ChevronRight size={22} strokeWidth={2.4} />}
          activeDir={activeDir}
          onStart={handlePointerStart}
          onEnd={handlePointerEnd}
        />
        <TankDirectionButton
          dir="Backward"
          icon={<ChevronDown size={22} strokeWidth={2.4} />}
          activeDir={activeDir}
          onStart={handlePointerStart}
          onEnd={handlePointerEnd}
        />
      </div>

      <div className="tank-speed-selector" role="group" aria-label="Selector de velocidad">
        {TANK_GEARS.map((gear, idx) => {
          const isSelected = currentGearIndex === idx;
          return (
            <button
              key={gear.id}
              type="button"
              className={`control-btn tank-speed-btn ${isSelected ? 'active' : ''}`}
              onClick={() => selectGear(idx)}
              title={`Velocidad ${gear.label}`}
            >
              <PlayArrowsIcon count={gear.arrows} />
              <span className="tank-speed-label">{gear.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
