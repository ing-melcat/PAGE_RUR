import React, { useEffect, useCallback } from 'react';
import { Joystick } from 'react-joystick-component';

// Con qué fuerza conduce una tecla sin acelerador. El teclado no tiene
// gradación: o pulsas o no, así que a fondo sería la única velocidad posible.
const VELOCIDAD_TECLADO = 0.5;

export function Joystck({ onMove, onStop, setBinPack, size }) {

    // Todo lo que sale de aquí va en -1..1, la escala de
    // react-joystick-component, y con el mismo significado de ejes: el primer
    // valor es el avance y el segundo el giro.
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
        let rapido = false;

        const updateJoystickFromKeys = () => {
            // El teclado es todo o nada, así que sin esto cada tecla saldría a
            // fondo. Se conduce a media potencia y Shift acelera.
            const tope = rapido ? 1 : VELOCIDAD_TECLADO;

            let x = 0;
            let y = 0;
            if (keys.w || keys.ArrowUp) y += tope;
            if (keys.s || keys.ArrowDown) y -= tope;
            if (keys.d || keys.ArrowRight) x += tope;
            if (keys.a || keys.ArrowLeft) x -= tope;

            // En diagonal los dos ejes suman y el vector se pasaría del tope
            // (1.41 con Shift). Se recorta manteniendo la dirección.
            const magnitud = Math.hypot(x, y);
            if (magnitud > tope) {
                x = (x / magnitud) * tope;
                y = (y / magnitud) * tope;
            }

            if (x !== 0 || y !== 0) {
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
            // Shift se aplica en caliente: si ya vas moviéndote, acelera sin
            // tener que soltar y volver a presionar la dirección.
            if (e.key === 'Shift') {
                rapido = true;
                updateJoystickFromKeys();
                return;
            }
            if (keys.hasOwnProperty(e.key)) {
                rapido = e.shiftKey;
                keys[e.key] = true;
                updateJoystickFromKeys();
            }
        };

        const handleKeyUp = (e) => {
            if (e.key === 'Shift') {
                rapido = false;
                updateJoystickFromKeys();
                return;
            }
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
