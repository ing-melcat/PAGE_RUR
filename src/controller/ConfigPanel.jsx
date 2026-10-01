import { Joystck } from "./components/Joystck";
import "./ConfigPanel.css";
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Settings } from 'lucide-react';
import { useLanguage } from '../lib/i18n';


export function ConfigPanel({ onApply }) {
    const { t } = useLanguage();
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
                aria-label={t('operador.configPanel.toggleAriaLabel')}
                style={{
                    background: 'var(--surface)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '6px',
                    color: 'var(--bone)', 
                    cursor: 'pointer', 
                    padding: '8px 12px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
            >
                <Settings size={22} className="hud-icon" />
            </button>

            {createPortal(
                <div className={`config-overlay ${isOpen ? 'open' : ''}`}>
                    <div className="config-modal">
                        <div className="config-header">
                            <h3>{t('operador.configPanel.ajustes')}</h3>
                        </div>

                        <div className="controls" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div className="control-group">
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--muted)', fontSize: '0.9rem' }}>
                                    {t('operador.configPanel.tamanoJoystick')}: {size}%
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
                                    {t('operador.configPanel.sensibilidad')}: {sensitivity.toFixed(1)}x
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
                                <svg width="100%" height="60" viewBox="0 0 200 60" style={{ marginTop: '15px', background: 'var(--background)', borderRadius: '6px', border: '1px solid var(--border)', display: 'block', overflow: 'visible' }}>
                                    {/* Grid reference line (Linear) */}
                                    <path d="M 0 60 L 200 0" fill="none" stroke="var(--muted)" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
                                    {/* The Curve */}
                                    <path d={(() => {
                                        let d = "M 0 60";
                                        const steps = 40;
                                        for (let i = 1; i <= steps; i++) {
                                            const x = i / steps;
                                            const y = Math.pow(x, 1 / sensitivity);
                                            const px = x * 200;
                                            const py = 60 - (y * 60);
                                            d += ` L ${px.toFixed(1)} ${py.toFixed(1)}`;
                                        }
                                        return d;
                                    })()} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>

                            <div className="control-group" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '15px 0' }}>
                                <label style={{ display: 'block', marginBottom: '15px', color: 'var(--muted)', fontSize: '0.9rem', width: '100%', textAlign: 'center' }}>
                                    {t('operador.configPanel.prueba')} ({t('operador.configPanel.linear')}: {directionx} | {t('operador.configPanel.angular')}: {directiony})
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
                                {t('operador.configPanel.guardarCerrar')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}