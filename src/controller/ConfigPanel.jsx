import { Joystck } from "./components/Joystck";
import "./ConfigPanel.css";
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Settings } from 'lucide-react';


export function ConfigPanel({ onApply }) {
    const [isOpen, setIsOpen] = useState(false)
    const [size, setSize] = useState(100);
    const [sensitivity, setSensitivity] = useState(1.0);

    const scaleMultiplier = 0.8 + (size / 100) * 0.9;
    const [directionx, setDirectionx] = useState("0");
    const [directiony, setDirectiony] = useState("0");

    function applySensivity(value, sensitivity) {
        const sign = Math.sign(value)
        const magnitude = Math.abs(value)
        const adjust = Math.pow(magnitude, 1 / sensitivity)
        return sign * adjust
    }

    function handleClose() {
        onApply?.({ size: scaleMultiplier * 80, sensitivity })
        setIsOpen(false)
    }

    return (
        <>
            <button
                className={`config-toggle ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Toggle configuration panel"
            >
                <span className="hud-bracket">[</span>
                <Settings size={22} className="hud-icon" style={{ margin: '0 4px' }} />
                <span className="hud-bracket">]</span>
            </button>

            {createPortal(
                <div className={`config-overlay ${isOpen ? 'open' : ''}`}>
                    <div className="config-modal">
                        <div className="config-header">
                            <h3>Ajustes</h3>
                        </div>

                        <div className="controls" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div className="control-group">
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--muted)', fontSize: '0.9rem' }}>
                                    Tamaño del Joystick: {size}%
                                </label>
                                <input
                                    type="range"
                                    min="50"
                                    max="150"
                                    value={size}
                                    onChange={(e) => setSize(Number(e.target.value))}
                                    className="slider"
                                />
                            </div>

                            <div className="control-group">
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--muted)', fontSize: '0.9rem' }}>
                                    Sensibilidad: {sensitivity.toFixed(1)}x
                                </label>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="2.0"
                                    step="0.1"
                                    value={sensitivity}
                                    onChange={(e) => setSensitivity(Number(e.target.value))}
                                    className="slider"
                                />
                            </div>

                            <div className="control-group" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '15px 0' }}>
                                <label style={{ display: 'block', marginBottom: '15px', color: 'var(--muted)', fontSize: '0.9rem', width: '100%', textAlign: 'center' }}>
                                    Prueba (Linear: {directionx} | Angular: {directiony})
                                </label>
                                <Joystck
                                    size={scaleMultiplier * 80}
                                    onMove={(x, y) => {
                                        const scaledx = applySensivity(x, sensitivity).toFixed(2);
                                        const scaledy = applySensivity(y, sensitivity).toFixed(2);
                                        setDirectionx(scaledx);
                                        setDirectiony(scaledy);
                                    }}
                                    onStop={(x, y) => {
                                        setDirectionx(x);
                                        setDirectiony(y);
                                    }}
                                />
                            </div>

                            <button className="config-close" onClick={handleClose} style={{ marginTop: '5px' }}>
                                GUARDAR Y CERRAR
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}