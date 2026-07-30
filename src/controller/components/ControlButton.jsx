import React, { useState, useRef, useEffect } from 'react';

export const ControlButton = ({ label, style, onPress, onRelease }) => {
  const [isPressed, setIsPressed] = useState(false);
  const isTouch = useRef(false);
  const btnRef = useRef(null);

  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;

    const handleStartNative = (e) => {
      if (e.cancelable) e.preventDefault();
      if (e.type.includes('touch')) isTouch.current = true;
      if (e.type.includes('mouse') && isTouch.current) return;
      setIsPressed(true);
      if (onPress) onPress();
    };

    const handleEndNative = (e) => {
      if (e.type.includes('mouse') && isTouch.current) {
        setTimeout(() => { isTouch.current = false; }, 500);
        return;
      }
      setIsPressed(false);
      if (onRelease) onRelease();
    };

    btn.addEventListener('touchstart', handleStartNative, { passive: false });
    btn.addEventListener('touchend', handleEndNative, { passive: false });
    btn.addEventListener('touchcancel', handleEndNative, { passive: false });
    btn.addEventListener('mousedown', handleStartNative, { passive: false });
    btn.addEventListener('mouseup', handleEndNative, { passive: false });
    btn.addEventListener('mouseleave', handleEndNative, { passive: false });

    return () => {
      btn.removeEventListener('touchstart', handleStartNative);
      btn.removeEventListener('touchend', handleEndNative);
      btn.removeEventListener('touchcancel', handleEndNative);
      btn.removeEventListener('mousedown', handleStartNative);
      btn.removeEventListener('mouseup', handleEndNative);
      btn.removeEventListener('mouseleave', handleEndNative);
    };
  }, []);

  return (
    <button 
      ref={btnRef}
      style={style}
      className={`control-btn ${isPressed ? 'pressed' : ''}`}
      onContextMenu={(e) => { e.preventDefault(); return false; }}
    >
      <span>{label}</span>
    </button>
  );
};
