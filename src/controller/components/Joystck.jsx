import React, { useEffect, useCallback } from 'react';
import { Joystick } from 'react-joystick-component';

// Con qué fuerza conduce una tecla sin acelerador. El teclado no tiene
// gradación: o pulsas o no, así que a fondo sería la única velocidad posible.
const VELOCIDAD_TECLADO = 0.5;

export function Joystck({ onMove, onStop, setBinPack, size, dispatchGlobalEvent = true, keyboardEnabled = true, keyboardMappings }) {

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

        // CustomEvent para actualizar el StatusHUD sin re-renderizar todo ControllerApp.
        // Una segunda instancia (p. ej. el joystick de cámara) no debe pisar el
        // estado del joystick de movimiento en StatusHUD, por eso es opcional.
        if (dispatchGlobalEvent) {
            window.dispatchEvent(new CustomEvent('joystickMove', { detail: { x, y } }));
        }
    }, [onMove, setBinPack, dispatchGlobalEvent]);

    const handleStopEvent = useCallback(() => {
        const stopResult = onStop?.(0, 0);
        setBinPack?.(stopResult);

        if (dispatchGlobalEvent) {
            window.dispatchEvent(new CustomEvent('joystickMove', { detail: { x: 0, y: 0 } }));
        }
    }, [onStop, setBinPack, dispatchGlobalEvent]);

    useEffect(() => {
        if (!keyboardEnabled) return;
        const keys = { Forward: false, Backward: false, Left: false, Right: false };
        let active = false;
        let rapido = false;

        const maps = keyboardMappings || { Forward: 'KeyW', Backward: 'KeyS', Left: 'KeyA', Right: 'KeyD' };

        const updateJoystickFromKeys = () => {
            const tope = rapido ? 1 : VELOCIDAD_TECLADO;

            let x = 0;
            let y = 0;
            if (keys.Forward) y += tope;
            if (keys.Backward) y -= tope;
            if (keys.Right) x += tope;
            if (keys.Left) x -= tope;

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

        // Cuando el operador cambia de pestaña o la ventana pierde el foco, el
        // navegador deja de disparar keyup. Sin este handler el robot seguiría
        // recibiendo comandos aunque el operador no esté mirando la consola.
        const detenerPorPerderFoco = () => {
            let habiaMovimiento = false;
            for (const k of Object.keys(keys)) {
                if (keys[k]) habiaMovimiento = true;
                keys[k] = false;
            }
            rapido = false;
            if (habiaMovimiento || active) {
                active = false;
                handleStopEvent();
            }
        };

        const handleKeyDown = (e) => {
            if (e.repeat) return;
            if (e.key === 'Shift') {
                rapido = true;
                updateJoystickFromKeys();
                return;
            }
            let match = null;
            if (e.code === maps.Forward || e.key === 'ArrowUp') match = 'Forward';
            if (e.code === maps.Backward || e.key === 'ArrowDown') match = 'Backward';
            if (e.code === maps.Left || e.key === 'ArrowLeft') match = 'Left';
            if (e.code === maps.Right || e.key === 'ArrowRight') match = 'Right';
            
            if (match) {
                rapido = e.shiftKey;
                keys[match] = true;
                updateJoystickFromKeys();
            }
        };

        const handleKeyUp = (e) => {
            if (e.key === 'Shift') {
                rapido = false;
                updateJoystickFromKeys();
                return;
            }
            let match = null;
            if (e.code === maps.Forward || e.key === 'ArrowUp') match = 'Forward';
            if (e.code === maps.Backward || e.key === 'ArrowDown') match = 'Backward';
            if (e.code === maps.Left || e.key === 'ArrowLeft') match = 'Left';
            if (e.code === maps.Right || e.key === 'ArrowRight') match = 'Right';

            if (match) {
                keys[match] = false;
                updateJoystickFromKeys();
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
    }, [handleMoveEvent, handleStopEvent, keyboardEnabled, keyboardMappings]);

    return (
        <Joystick
            size={size}
            stickSize={size * .30}
            // El envío real al robot ya lo marca el setInterval de 100ms en
            // ControllerApp -- un throttle igual aquí encadenaba dos
            // cuantizaciones de 100ms (hasta ~200ms dedo->paquete en el peor
            // caso). 30ms solo evita renders de sobra en el arrastre del
            // stick, sin sumarle su propia latencia al camino de control.
            throttle={30}
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
