import { Joystck } from "./components/Joystck";
import "./ConfigPanel.css";
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Settings, X } from 'lucide-react';
import { useLanguage } from '../lib/i18n';

const INDICE_A_ETIQUETA_GAMEPAD = {
  0: 'A', 1: 'B', 2: 'X', 3: 'Y',
  4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT',
  8: 'Back', 9: 'Start', 10: 'LS', 11: 'RS',
  12: 'Up', 13: 'Down', 14: 'Left', 15: 'Right',
};
const INDICES_RESERVADOS_GAMEPAD = new Set([6, 7]);

const DEFAULT_MAPPINGS = {
  gamepad: {
    DrumFrontCw: "Y", DrumFrontCcw: "X", DrumBackCw: "B", DrumBackCcw: "A"
  },
  keyboard: {
    ArmFrontUp: "KeyI", ArmFrontDown: "KeyK", ArmBackUp: "KeyO", ArmBackDown: "KeyL",
    DrumFrontCw: "KeyR", DrumFrontCcw: "KeyF", DrumBackCw: "KeyT", DrumBackCcw: "KeyG"
  },
  keyboardMovement: {
    Forward: "KeyW", Backward: "KeyS", Left: "KeyA", Right: "KeyD"
  }
};

const LABELS_MOVIMIENTO = {
  Forward: 'adelante',
  Backward: 'atras',
  Left: 'izquierda',
  Right: 'derecha',
};

const LABELS_BRAZOS = {
  ArmFrontUp: 'brazoFrenteSubir',
  ArmFrontDown: 'brazoFrenteBajar',
  ArmBackUp: 'brazoTraseroSubir',
  ArmBackDown: 'brazoTraseroBajar',
};

const LABELS_TAMBORES = {
  DrumFrontCw: 'tamborFrenteHorario',
  DrumFrontCcw: 'tamborFrenteAntihorario',
  DrumBackCw: 'tamborTraseroHorario',
  DrumBackCcw: 'tamborTraseroAntihorario',
};

const TECLAS_RAPIDAS = [
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyI', 'KeyK', 'KeyO', 'KeyL',
  'KeyR', 'KeyF', 'KeyT', 'KeyG',
  'KeyQ', 'KeyE', 'KeyJ', 'KeyU',
  'Space'
];

function formatearTecla(codigo) {
  if (!codigo) return '—';
  if (codigo === 'ArrowUp') return '↑ (Arriba)';
  if (codigo === 'ArrowDown') return '↓ (Abajo)';
  if (codigo === 'ArrowLeft') return '← (Izquierda)';
  if (codigo === 'ArrowRight') return '→ (Derecha)';
  if (codigo === 'Space') return 'Espacio';
  const match = codigo.match(/^(Key|Digit)(.+)$/);
  return match ? match[2] : codigo;
}

function normalizarCodigoTecla(e) {
  if (e.code && e.code !== 'Unidentified') return e.code;
  if (e.key) {
    if (e.key === 'ArrowUp') return 'ArrowUp';
    if (e.key === 'ArrowDown') return 'ArrowDown';
    if (e.key === 'ArrowLeft') return 'ArrowLeft';
    if (e.key === 'ArrowRight') return 'ArrowRight';
    if (e.key === ' ' || e.key === 'Spacebar') return 'Space';
    if (e.key === 'Escape') return 'Escape';
    if (e.key.length === 1) {
      const char = e.key.toUpperCase();
      if (/[A-Z]/.test(char)) return `Key${char}`;
      if (/[0-9]/.test(char)) return `Digit${char}`;
    }
  }
  const code = e.keyCode || e.which;
  if (code) {
    if (code === 27) return 'Escape';
    if (code >= 65 && code <= 90) return `Key${String.fromCharCode(code)}`;
    if (code >= 48 && code <= 57) return `Digit${String.fromCharCode(code)}`;
    if (code === 38) return 'ArrowUp';
    if (code === 40) return 'ArrowDown';
    if (code === 37) return 'ArrowLeft';
    if (code === 39) return 'ArrowRight';
    if (code === 32) return 'Space';
  }
  return null;
}

export function ConfigPanel({ onApply, controlMappings, onUpdateMappings }) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState('ajustes'); // 'ajustes' | 'teclado' | 'mando'
  const hiddenInputRef = useRef(null);

  const [size, setSize] = useState(100);
  const [sensitivity, setSensitivity] = useState(1.0);

  const scaleMultiplier = 0.8 + (size / 100) * 0.9;
  const [directionx, setDirectionx] = useState("0");
  const [directiony, setDirectiony] = useState("0");

  const [mappingForm, setMappingForm] = useState(DEFAULT_MAPPINGS);
  const [capturandoTecla, setCapturandoTecla] = useState(null);
  const [capturandoBoton, setCapturandoBoton] = useState(null);

  useEffect(() => {
    if (controlMappings && Object.keys(controlMappings).length > 0) {
      setMappingForm({
        gamepad: { ...DEFAULT_MAPPINGS.gamepad, ...(controlMappings.gamepad || {}) },
        keyboard: { ...DEFAULT_MAPPINGS.keyboard, ...(controlMappings.keyboard || {}) },
        keyboardMovement: { ...DEFAULT_MAPPINGS.keyboardMovement, ...(controlMappings.keyboardMovement || {}) },
      });
    }
  }, [controlMappings]);

  const asignarTecla = (codigo) => {
    if (!capturandoTecla || !codigo) return;
    setMappingForm((prev) => {
      const isMovement = prev.keyboardMovement && capturandoTecla in prev.keyboardMovement;
      if (isMovement) {
        return {
          ...prev,
          keyboardMovement: { ...prev.keyboardMovement, [capturandoTecla]: codigo }
        };
      }
      return {
        ...prev,
        keyboard: { ...prev.keyboard, [capturandoTecla]: codigo }
      };
    });
    setCapturandoTecla(null);
  };

  // Auto focus hidden input for mobile/virtual keyboards
  useEffect(() => {
    if (capturandoTecla && hiddenInputRef.current) {
      hiddenInputRef.current.focus();
    }
  }, [capturandoTecla]);

  // Listener para capturar teclas con fase de captura
  useEffect(() => {
    if (!capturandoTecla) return;
    const alPresionar = (e) => {
      const codigo = normalizarCodigoTecla(e);
      if (codigo === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setCapturandoTecla(null);
        return;
      }
      if (codigo) {
        e.preventDefault();
        e.stopPropagation();
        asignarTecla(codigo);
      }
    };
    window.addEventListener('keydown', alPresionar, true);
    return () => window.removeEventListener('keydown', alPresionar, true);
  }, [capturandoTecla]);

  // Listener para capturar botones de Gamepad
  useEffect(() => {
    if (!capturandoBoton) return;
    const yaPresionados = new Set();
    const gpInicial = navigator.getGamepads?.()[0];
    if (gpInicial) {
      gpInicial.buttons.forEach((b, i) => { if (b?.pressed) yaPresionados.add(i); });
    }

    let animationFrameId;
    const sondear = () => {
      const gp = navigator.getGamepads?.()[0];
      if (gp) {
        for (let i = 0; i < gp.buttons.length; i++) {
          const presionado = Boolean(gp.buttons[i]?.pressed);
          if (presionado && !yaPresionados.has(i)) {
            if (INDICES_RESERVADOS_GAMEPAD.has(i)) {
              yaPresionados.add(i);
              continue;
            }
            const etiqueta = INDICE_A_ETIQUETA_GAMEPAD[i];
            if (etiqueta) {
              setMappingForm((prev) => ({
                ...prev,
                gamepad: { ...prev.gamepad, [capturandoBoton]: etiqueta }
              }));
              setCapturandoBoton(null);
              return;
            }
            yaPresionados.add(i);
          } else if (!presionado) {
            yaPresionados.delete(i);
          }
        }
      }
      animationFrameId = requestAnimationFrame(sondear);
    };
    animationFrameId = requestAnimationFrame(sondear);
    return () => cancelAnimationFrame(animationFrameId);
  }, [capturandoBoton]);

  function applySensivity(value, sens) {
    const sign = Math.sign(value);
    const magnitude = Math.abs(value);
    const adjust = Math.pow(magnitude, 1 / sens);
    return sign * adjust;
  }

  function handleSave() {
    onApply?.({ size: scaleMultiplier * 80, sensitivity });
    if (onUpdateMappings) {
      onUpdateMappings(mappingForm);
    }
    setIsOpen(false);
  }

  function handleCancel() {
    setCapturandoTecla(null);
    setCapturandoBoton(null);
    setIsOpen(false);
  }

  const getActionName = (action) => {
    if (LABELS_MOVIMIENTO[action]) return t(`operador.configPanel.${LABELS_MOVIMIENTO[action]}`);
    if (LABELS_BRAZOS[action]) return t(`operador.configPanel.${LABELS_BRAZOS[action]}`);
    if (LABELS_TAMBORES[action]) return t(`operador.configPanel.${LABELS_TAMBORES[action]}`);
    return action;
  };

  return (
    <>
      <button
        type="button"
        className={`cabezal-terminal-btn ${isOpen ? 'cabezal-terminal-btn--active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('operador.configPanel.toggleAriaLabel')}
        title="Configuración de controles"
      >
        <span className="cabezal-terminal-btn-bracket">[</span>
        <Settings size={14} className="hud-icon" strokeWidth={2.2} />
        <span className="cabezal-terminal-btn-label">CFG</span>
        <span className="cabezal-terminal-btn-bracket">]</span>
      </button>

      {/* Hidden input for mobile keyboard input */}
      <input
        ref={hiddenInputRef}
        type="text"
        style={{ position: 'fixed', opacity: 0, pointerEvents: 'none', top: -100, left: -100 }}
        onChange={(e) => {
          const val = e.target.value;
          if (val) {
            const lastChar = val.slice(-1).toUpperCase();
            asignarTecla(`Key${lastChar}`);
            e.target.value = '';
          }
        }}
      />

      {createPortal(
        <div className={`config-overlay ${isOpen ? 'open' : ''}`} onClick={handleCancel}>
          <div className="config-modal" onClick={(e) => e.stopPropagation()}>
            <div className="config-header">
              <h3>{t('operador.configPanel.ajustes')}</h3>
              <button
                type="button"
                className="config-close-icon"
                onClick={handleCancel}
                title={t('operador.seleccion.cancelar')}
                aria-label={t('operador.seleccion.cancelar')}
              >
                <X size={20} />
              </button>
            </div>

            {/* Pestañas de Navegación */}
            <div className="config-tabs">
              <button
                type="button"
                className={`config-tab-btn ${tab === 'ajustes' ? 'active' : ''}`}
                onClick={() => setTab('ajustes')}
              >
                {t('operador.configPanel.pestanaAjustes')}
              </button>
              <button
                type="button"
                className={`config-tab-btn ${tab === 'teclado' ? 'active' : ''}`}
                onClick={() => setTab('teclado')}
              >
                {t('operador.configPanel.pestanaTeclado')}
              </button>
              <button
                type="button"
                className={`config-tab-btn ${tab === 'mando' ? 'active' : ''}`}
                onClick={() => setTab('mando')}
              >
                {t('operador.configPanel.pestanaMando')}
              </button>
            </div>

            {/* Quick Key Palette when capturing key */}
            {tab === 'teclado' && capturandoTecla && (
              <div style={{
                background: 'var(--background)',
                border: '1px solid var(--accent)',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--accent)', animation: 'pulse 1.5s infinite' }} />
                    {t('operador.seleccion.presionaTecla')} ({getActionName(capturandoTecla)})
                  </span>
                  <button
                    type="button"
                    onClick={() => setCapturandoTecla(null)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)' }}
                  >
                    [Esc {t('operador.seleccion.cancelar')}]
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {TECLAS_RAPIDAS.map((kCode) => (
                    <button
                      key={kCode}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        asignarTecla(kCode);
                      }}
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontFamily: 'var(--font-ibm-mono)',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        fontWeight: 600,
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text)'; }}
                    >
                      {formatearTecla(kCode)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="config-body">
              {/* TAB 1: AJUSTES */}
              {tab === 'ajustes' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div className="control-group">
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--muted)', fontSize: '0.85rem', fontFamily: 'var(--font-ibm-mono)' }}>
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
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--muted)', fontSize: '0.85rem', fontFamily: 'var(--font-ibm-mono)' }}>
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
                    <svg width="100%" height="50" viewBox="0 0 200 50" style={{ marginTop: '10px', background: 'var(--background)', borderRadius: '6px', border: '1px solid var(--border)', display: 'block' }}>
                      <path d="M 0 50 L 200 0" fill="none" stroke="var(--muted)" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
                      <path
                        d={(() => {
                          let d = "M 0 50";
                          const steps = 40;
                          for (let i = 1; i <= steps; i++) {
                            const x = i / steps;
                            const y = Math.pow(x, 1 / sensitivity);
                            const px = x * 200;
                            const py = 50 - (y * 50);
                            d += ` L ${px.toFixed(1)} ${py.toFixed(1)}`;
                          }
                          return d;
                        })()}
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  <div className="control-group" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <label style={{ display: 'block', marginBottom: '10px', color: 'var(--muted)', fontSize: '0.82rem', fontFamily: 'var(--font-ibm-mono)', width: '100%', textAlign: 'center' }}>
                      {t('operador.configPanel.prueba')} ({t('operador.configPanel.linear')}: {directionx} | {t('operador.configPanel.angular')}: {directiony})
                    </label>
                    <Joystck
                      size={scaleMultiplier * 70}
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
                      keyboardEnabled={false}
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: TECLADO */}
              {tab === 'teclado' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {/* Movimiento */}
                  <div>
                    <h4 className="config-section-title">{t('operador.configPanel.movimiento')}</h4>
                    <div className="config-key-grid">
                      {Object.keys(LABELS_MOVIMIENTO).map((action) => (
                        <div key={action} className="config-key-row">
                          <span className="config-key-label">{t(`operador.configPanel.${LABELS_MOVIMIENTO[action]}`)}</span>
                          <button
                            type="button"
                            className={`config-key-btn ${capturandoTecla === action ? 'capturing' : ''}`}
                            onClick={() => setCapturandoTecla(action)}
                            title={t('operador.seleccion.cambiarTecla')}
                          >
                            {capturandoTecla === action ? (
                              <>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent)', animation: 'pulse 1.5s infinite' }} />
                                {t('operador.seleccion.presionaTecla')}
                              </>
                            ) : (
                              formatearTecla(mappingForm.keyboardMovement?.[action])
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Brazos Mecánicos */}
                  <div>
                    <h4 className="config-section-title">{t('operador.configPanel.brazos')}</h4>
                    <div className="config-key-grid">
                      {Object.keys(LABELS_BRAZOS).map((action) => (
                        <div key={action} className="config-key-row">
                          <span className="config-key-label">{t(`operador.configPanel.${LABELS_BRAZOS[action]}`)}</span>
                          <button
                            type="button"
                            className={`config-key-btn ${capturandoTecla === action ? 'capturing' : ''}`}
                            onClick={() => setCapturandoTecla(action)}
                            title={t('operador.seleccion.cambiarTecla')}
                          >
                            {capturandoTecla === action ? (
                              <>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent)', animation: 'pulse 1.5s infinite' }} />
                                {t('operador.seleccion.presionaTecla')}
                              </>
                            ) : (
                              formatearTecla(mappingForm.keyboard?.[action])
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tambores */}
                  <div>
                    <h4 className="config-section-title">{t('operador.configPanel.tambores')}</h4>
                    <div className="config-key-grid">
                      {Object.keys(LABELS_TAMBORES).map((action) => (
                        <div key={action} className="config-key-row">
                          <span className="config-key-label">{t(`operador.configPanel.${LABELS_TAMBORES[action]}`)}</span>
                          <button
                            type="button"
                            className={`config-key-btn ${capturandoTecla === action ? 'capturing' : ''}`}
                            onClick={() => setCapturandoTecla(action)}
                            title={t('operador.seleccion.cambiarTecla')}
                          >
                            {capturandoTecla === action ? (
                              <>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent)', animation: 'pulse 1.5s infinite' }} />
                                {t('operador.seleccion.presionaTecla')}
                              </>
                            ) : (
                              formatearTecla(mappingForm.keyboard?.[action])
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: MANDO */}
              {tab === 'mando' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted)', fontFamily: 'var(--font-ibm-mono)' }}>
                    Stick Izquierdo: Movimiento · Gatillos LT/RT: Control de Brazos Frontal/Trasero.
                  </p>
                  <div>
                    <h4 className="config-section-title">{t('operador.configPanel.tambores')}</h4>
                    <div className="config-key-grid">
                      {Object.keys(LABELS_TAMBORES).map((action) => (
                        <div key={action} className="config-key-row">
                          <span className="config-key-label">{t(`operador.configPanel.${LABELS_TAMBORES[action]}`)}</span>
                          <button
                            type="button"
                            className={`config-key-btn ${capturandoBoton === action ? 'capturing' : ''}`}
                            onClick={() => setCapturandoBoton(action)}
                            title={t('operador.seleccion.cambiarBoton')}
                          >
                            {capturandoBoton === action ? (
                              <>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent)', animation: 'pulse 1.5s infinite' }} />
                                {t('operador.seleccion.presionaBoton')}
                              </>
                            ) : (
                              mappingForm.gamepad?.[action] || '—'
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="config-footer">
              <button type="button" className="config-btn-secondary" onClick={handleCancel}>
                {t('operador.seleccion.cancelar')}
              </button>
              <button type="button" className="config-close" onClick={handleSave}>
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