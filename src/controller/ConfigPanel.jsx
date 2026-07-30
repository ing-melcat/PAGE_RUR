import { Joystck } from "./components/Joystck";
import "./ConfigPanel.css";
import React, { useState } from 'react';
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

            <div className={`config-panel ${isOpen ? 'open' : 'closed'}`}>
                <div className="config-header">
                    <h3>Configuration</h3>
                    <button
                        className="config-close"
                        onClick={handleClose}
                        aria-label="Save and close configuration panel"
                    >
                        Save Configuration
                    </button>
                </div>

                <label>Size: {size}%</label>
                <input className="slider"
                    type="range"
                    min="50"
                    max="200"
                    value={size}
                    onChange={(e) => setSize(parseInt(e.target.value))}
                    style={{ '--thumb-scale': scaleMultiplier * 50 }}
                />

                <label>Sensitivity: X{sensitivity}</label>
                <input
                    className="slider"
                    type="range"
                    min="0.25"
                    max="2"
                    value={sensitivity}
                    step="0.03"
                    onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                />

                <label>Values
                    <p>Linear X: {directionx}</p>
                    <p>Angular Z: {directiony}</p>
                </label>
                <Joystck
                    size={scaleMultiplier * 80}


                    onMove={(x, y) => {
                        const scaledx = applySensivity(x, sensitivity)
                        const scaledy = applySensivity(y, sensitivity)
                        setDirectionx(scaledx);
                        setDirectiony(scaledy);
                    }}
                    onStop={(x, y) => {
                        setDirectionx(x);
                        setDirectiony(y);
                    }}
                />
            </div>
        </>
    );
}