import React, { useEffect, useCallback } from 'react';
import { Joystick } from 'react-joystick-component';

export function Joystck({ onMove, onStop, setBinPack, size }) {

    const handleMoveEvent = useCallback((eje) => {
        const y = eje.x;
        const x = eje.y;

        const result = onMove?.(x, y);
        if (result) {
            setBinPack?.(result);
        }

        // CustomEvent para actualizar el StatusHUD sin re-renderizar todo ControllerApp
        window.dispatchEvent(new CustomEvent('joystickMove', { detail: { x, y } }));
    }, [onMove, setBinPack]);

    const handleStopEvent = useCallback(() => {
        const stopResult = onStop?.(0, 0);
        setBinPack?.(stopResult);
        
        window.dispatchEvent(new CustomEvent('joystickMove', { detail: { x: 0, y: 0 } }));
    }, [onStop, setBinPack]);

    useEffect(() => {
        const keys = { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
        let active = false;

        const updateJoystickFromKeys = () => {
            let x = 0;
            let y = 0;
            if (keys.w || keys.ArrowUp) y += 100;
            if (keys.s || keys.ArrowDown) y -= 100;
            if (keys.d || keys.ArrowRight) x += 100;
            if (keys.a || keys.ArrowLeft) x -= 100;

            if (x !== 0 || y !== 0) {
                // Notifica el evento de teclado
                handleMoveEvent({ x, y });
            } else if (active && x === 0 && y === 0) {
                // Detenerse
                handleStopEvent();
                active = false;
            }

            if (x !== 0 || y !== 0) active = true;
        };

        const handleKeyDown = (e) => {
            if (e.repeat) return;
            if (keys.hasOwnProperty(e.key)) {
                keys[e.key] = true;
                updateJoystickFromKeys();
            }
        };

        const handleKeyUp = (e) => {
            if (keys.hasOwnProperty(e.key)) {
                keys[e.key] = false;
                updateJoystickFromKeys();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [handleMoveEvent, handleStopEvent]);

    return (
        <Joystick
            size={size}
            stickSize={size * .30}
            throttle={100} // 10 fps
            stickShape="square"
            baseColor="var(--surface-strong)"
            stickColor="var(--accent)"
            followCursor={false}
            controlStyle={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                transition: 'all 0.2s ease-out' // Smooth spring
            }}
            move={handleMoveEvent}
            stop={handleStopEvent}
        />
    );
}
