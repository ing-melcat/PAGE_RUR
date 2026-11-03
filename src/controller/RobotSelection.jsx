import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Robot3DPreview } from './components/Robot3DPreview';
import { Gamepad2, Keyboard, X } from 'lucide-react';
import { useLanguage } from '../lib/i18n';

// Índice de botón (API estándar de Gamepad, W3C) -> etiqueta que ya usa
// este archivo y ControllerApp.jsx en sus mapeos por defecto. Mismo orden
// que GAMEPAD_BOTON_INDICE en ControllerApp.jsx, pero invertido: aquí se
// necesita ir de "se presionó el botón 5" a "eso es RB".
const INDICE_A_ETIQUETA_GAMEPAD = {
    0: 'A', 1: 'B', 2: 'X', 3: 'Y',
    4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT',
    8: 'Back', 9: 'Start', 10: 'LS', 11: 'RS',
    12: 'Up', 13: 'Down', 14: 'Left', 15: 'Right',
};

// LT/RT quedan reservados por el esquema de gatillo+stick de
// ControllerApp.jsx (sostenerlos sube/baja el brazo de esa mano) -- no se
// pueden reasignar a otra acción desde este panel.
const INDICES_RESERVADOS_GAMEPAD = new Set([6, 7]);

const LABELS_ACCIONES = {
    Forward: 'adelante',
    Backward: 'atras',
    Left: 'izquierda',
    Right: 'derecha',
    ArmFrontUp: 'brazoFrenteSubir',
    ArmFrontDown: 'brazoFrenteBajar',
    ArmBackUp: 'brazoTraseroSubir',
    ArmBackDown: 'brazoTraseroBajar',
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

// Shared style tokens
const S = {
  label: { fontFamily: 'var(--font-etiqueta), sans-serif', fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-tech)', fontWeight: 700 },
  input: { padding: '10px 14px', fontSize: '0.88rem', background: 'var(--background)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', outline: 'none', fontFamily: 'var(--font-ibm-mono)', width: '100%', transition: 'all 0.2s ease', boxSizing: 'border-box' },
  sectionTitle: { margin: 0, color: 'var(--text)', fontFamily: 'var(--font-etiqueta), sans-serif', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: 'var(--tracking-tech)', textIndent: 'calc(var(--tracking-tech) * 0.5)', fontWeight: 700, paddingBottom: '8px', borderBottom: '1px solid var(--border)' },
  panel: { background: 'var(--surface)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border)' },
  btn: { background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-etiqueta), sans-serif', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: 'var(--tracking-tech)', textIndent: 'calc(var(--tracking-tech) * 0.5)', fontWeight: 700, transition: 'all 0.2s ease' },
};

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

export function RobotSelection({ robots, errorRobots, onReintentar, onSelectRobot, onBack, controlMappings, onUpdateMappings }) {
    const { t } = useLanguage();
    useEffect(() => {
        const forzarScroll = () => {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            if (document.scrollingElement) {
                document.scrollingElement.scrollTop = 0;
            }
        };
        forzarScroll();
        const rafId = requestAnimationFrame(forzarScroll);
        const t1 = setTimeout(forzarScroll, 40);
        const t2 = setTimeout(forzarScroll, 120);
        return () => {
            cancelAnimationFrame(rafId);
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, []);
    const [loading, setLoading] = useState(false);
    const [columns, setColumns] = useState(3);
    const [activeTab, setActiveTab] = useState('keyboard'); // 'keyboard' | 'gamepad'
    const hiddenInputRef = useRef(null);

    // Mapping state
    const [showMappingsModal, setShowMappingsModal] = useState(false);
    const [mappingForm, setMappingForm] = useState({
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
    });

    const [capturandoTecla, setCapturandoTecla] = useState(null);
    const [hoverTecla, setHoverTecla] = useState(null);
    const [capturandoBoton, setCapturandoBoton] = useState(null);
    const [hoverBoton, setHoverBoton] = useState(null);

    useEffect(() => {
        const updateColumns = () => {
            const width = window.innerWidth;
            if (width < 768) setColumns(1);
            else if (width < 1024) setColumns(2);
            else if (width < 1400) setColumns(3);
            else setColumns(4);
        };
        updateColumns();
        window.addEventListener('resize', updateColumns);
        return () => window.removeEventListener('resize', updateColumns);
    }, []);

    useEffect(() => {
        if (controlMappings && Object.keys(controlMappings).length > 0) {
            setMappingForm(prev => {
                const gamepadValido = Object.fromEntries(
                    Object.entries(controlMappings.gamepad || {}).filter(([clave]) => clave in prev.gamepad)
                );
                const keyboardValido = Object.fromEntries(
                    Object.entries(controlMappings.keyboard || {}).filter(([clave]) => clave in prev.keyboard)
                );
                const movementValido = Object.fromEntries(
                    Object.entries(controlMappings.keyboardMovement || {}).filter(([clave]) => clave in (prev.keyboardMovement || {}))
                );
                return {
                    gamepad: { ...prev.gamepad, ...gamepadValido },
                    keyboard: { ...prev.keyboard, ...keyboardValido },
                    keyboardMovement: { ...prev.keyboardMovement, ...movementValido }
                };
            });
        }
    }, [controlMappings]);

    useEffect(() => {
        if (!showMappingsModal) {
            setCapturandoTecla(null);
            setCapturandoBoton(null);
        }
    }, [showMappingsModal]);

    const asignarTecla = (codigo) => {
        if (!capturandoTecla || !codigo) return;
        setMappingForm(prev => {
            const isMovement = prev.keyboardMovement && capturandoTecla in prev.keyboardMovement;
            if (isMovement) {
                return { ...prev, keyboardMovement: { ...prev.keyboardMovement, [capturandoTecla]: codigo } };
            }
            return { ...prev, keyboard: { ...prev.keyboard, [capturandoTecla]: codigo } };
        });
        setCapturandoTecla(null);
    };

    // Auto focus hidden input for mobile/virtual keyboards
    useEffect(() => {
        if (capturandoTecla && hiddenInputRef.current) {
            hiddenInputRef.current.focus();
        }
    }, [capturandoTecla]);

    // Listener global de keydown con fase de captura
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

    // Gamepad button polling
    useEffect(() => {
        if (!capturandoBoton) return;
        let animationFrameId;
        const yaPresionados = new Set();
        const mandosIniciales = navigator.getGamepads ? navigator.getGamepads() : [];
        for (const mando of mandosIniciales) {
            if (!mando) continue;
            mando.buttons.forEach((b, i) => {
                if (b.pressed) yaPresionados.add(i);
            });
        }

        const sondear = () => {
            const mandos = navigator.getGamepads ? navigator.getGamepads() : [];
            for (const mando of mandos) {
                if (!mando) continue;
                for (let i = 0; i < mando.buttons.length; i++) {
                    const presionado = mando.buttons[i].pressed;
                    if (presionado && !yaPresionados.has(i)) {
                        if (!INDICES_RESERVADOS_GAMEPAD.has(i)) {
                            const etiqueta = INDICE_A_ETIQUETA_GAMEPAD[i] ?? `B${i}`;
                            setMappingForm(prev => ({
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

    const robotsOrdenados = [...robots].sort(
        (a, b) => (a.status === 'online' ? 0 : 1) - (b.status === 'online' ? 0 : 1)
    );

    const handleSelect = (robot) => {
        onSelectRobot(robot);
    };

    const getActionLabel = (action) => {
        const key = LABELS_ACCIONES[action];
        return key ? t(`operador.configPanel.${key}`) : action.replace(/([A-Z])/g, ' $1').trim();
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', minHeight: '600px' }}>
            {/* Hidden input for mobile keyboard focus */}
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

            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '36px', borderBottom: '1px solid var(--border)', paddingBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ flex: 1, minWidth: '280px' }}>
                    <h2 style={{ margin: 0, fontSize: '3.2rem', fontFamily: 'var(--font-titulo)', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: '1', fontWeight: 400 }}>
                        {t('operador.seleccion.titulo')}
                    </h2>
                </div>
                <div style={{ paddingTop: '8px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button
                        onClick={() => setShowMappingsModal(true)}
                        style={{ ...S.btn, display: 'flex', alignItems: 'center', gap: '8px' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                        title={t('operador.seleccion.mapeoTitle')}
                    >
                        <Gamepad2 size={22} /> <span style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.78rem' }}>{t('operador.seleccion.mapeoTitle')}</span>
                    </button>
                </div>
            </div>

            {/* GRID DE UNIDADES */}
            <motion.div
                variants={{
                    hidden: { opacity: 0 },
                    show: {
                        opacity: 1,
                        transition: { staggerChildren: 0.1 }
                    }
                }}
                initial="hidden"
                animate="show"
                style={{ display: 'grid', gap: '24px', gridTemplateColumns: `repeat(${columns}, 1fr)`, flex: 1 }}
            >
                {robotsOrdenados.length === 0 && (
                    <div style={{ ...S.panel, gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-start' }}>
                        <h3 style={{ ...S.sectionTitle, borderBottom: 'none', paddingBottom: 0, color: errorRobots ? 'var(--error)' : 'var(--muted)' }}>
                            {errorRobots ? t('operador.seleccion.sinUnidadesError') : t('operador.seleccion.sinUnidades')}
                        </h3>
                        <p style={{ ...S.label, textTransform: 'none', margin: 0, lineHeight: 1.6 }}>
                            {errorRobots
                                ? errorRobots
                                : t('operador.seleccion.registraUnidad')}
                        </p>
                        {errorRobots && onReintentar && (
                            <button onClick={onReintentar} style={{ ...S.btn, marginTop: '4px' }}>
                                {t('operador.seleccion.reintentar')}
                            </button>
                        )}
                    </div>
                )}

                {robotsOrdenados.map((robot) => {
                    const enLinea = robot.status === 'online';
                    return (
                    <motion.div
                        key={robot.id}
                        variants={{
                            hidden: { opacity: 0, y: 12 },
                            show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } }
                        }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleSelect(robot)}
                        style={{
                            display: 'flex', flexDirection: 'column', gap: '14px',
                            pointerEvents: loading ? 'none' : 'auto', position: 'relative',
                            ...S.panel, borderRadius: '2px', cursor: 'pointer', transition: 'border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease',
                        }}
                        onMouseEnter={e => { 
                            e.currentTarget.style.borderColor = 'var(--accent)'; 
                            e.currentTarget.style.background = 'var(--surface-strong)';
                            e.currentTarget.style.boxShadow = '0 0 24px rgba(251, 202, 1, 0.12)'; 
                        }}
                        onMouseLeave={e => { 
                            e.currentTarget.style.borderColor = 'var(--border)'; 
                            e.currentTarget.style.background = 'var(--surface)';
                            e.currentTarget.style.boxShadow = 'none'; 
                        }}
                    >
                        {/* Marcas angulares tácticas en esquinas */}
                        <div style={{ position: 'absolute', top: -1, left: -1, width: 6, height: 6, borderTop: '2px solid var(--accent)', borderLeft: '2px solid var(--accent)' }} />
                        <div style={{ position: 'absolute', top: -1, right: -1, width: 6, height: 6, borderTop: '2px solid var(--accent)', borderRight: '2px solid var(--accent)' }} />
                        <div style={{ position: 'absolute', bottom: -1, left: -1, width: 6, height: 6, borderBottom: '2px solid var(--accent)', borderLeft: '2px solid var(--accent)' }} />
                        <div style={{ position: 'absolute', bottom: -1, right: -1, width: 6, height: 6, borderBottom: '2px solid var(--accent)', borderRight: '2px solid var(--accent)' }} />

                        {/* Cabecera técnica de la unidad */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                            <span style={{ fontFamily: 'var(--font-codigo)', fontSize: '0.68rem', color: 'var(--muted)', letterSpacing: 'var(--tracking-tech)' }}>
                                UNIT // {robot.id.toUpperCase()}
                            </span>
                            <span style={{
                                fontFamily: 'var(--font-codigo)',
                                fontSize: '0.65rem',
                                letterSpacing: '0.1em',
                                padding: '2px 8px',
                                textTransform: 'uppercase',
                                background: enLinea ? 'rgba(46, 204, 113, 0.12)' : 'rgba(255, 0, 0, 0.12)',
                                color: enLinea ? 'var(--success)' : 'var(--error)',
                                border: `1px solid ${enLinea ? 'rgba(46, 204, 113, 0.35)' : 'rgba(255, 0, 0, 0.35)'}`,
                            }}>
                                {enLinea ? t('operador.seleccion.enLinea') : t('operador.seleccion.apagado')}
                            </span>
                        </div>

                        {/* Ventana de Sensor 3D */}
                        <div style={{ position: 'relative', overflow: 'hidden', background: '#01050e', border: '1px solid rgba(245, 243, 233, 0.08)' }}>
                            <Robot3DPreview status={robot.status} modelUrl={robot.modelUrl} />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'var(--font-titulo)', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 400 }}>
                                {robot.name}
                            </h3>
                            <span style={{ fontFamily: 'var(--font-codigo)', fontSize: '0.75rem', color: 'var(--accent)' }}>
                                {robot.room || `room-${robot.id.toLowerCase()}`}
                            </span>
                        </div>

                        <div style={{ 
                            fontFamily: 'var(--font-codigo)', 
                            fontSize: '0.72rem', 
                            color: 'var(--accent)', 
                            letterSpacing: 'var(--tracking-tech)', 
                            textTransform: 'uppercase',
                            border: '1px solid var(--border)',
                            padding: '8px 12px',
                            textAlign: 'center',
                            background: 'rgba(245, 243, 233, 0.03)',
                            marginTop: 'auto'
                        }}>
                            {enLinea ? 'ACOPLAR UNIDAD →' : t('operador.seleccion.abrirConsola')}
                        </div>
                    </motion.div>
                    );
                })}
            </motion.div>

            {/* FOOTER */}
            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-start', paddingTop: '32px' }}>
                <button className="back-link" onClick={onBack}>{t('operador.seleccion.volverMenu')}</button>
            </div>

            {/* ============================================================ */}
            {/*  LOADING OVERLAY (POPUP PORTAL)                             */}
            {/* ============================================================ */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {loading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                width: '100vw',
                                height: '100vh',
                                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                backdropFilter: 'blur(8px)',
                                WebkitBackdropFilter: 'blur(8px)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 99999,
                            }}
                        >
                            <div style={{ width: '48px', height: '48px', border: '3px solid var(--surface)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '24px' }} />
                            <span style={{ fontFamily: 'var(--font-ibm-mono)', color: 'var(--accent)', letterSpacing: '0.1em', fontSize: '1.2rem' }}>
                                {t('operador.seleccion.conectando')}
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* ============================================================ */}
            {/*  MODAL DE MAPEO DE CONTROLES (POPUP PORTAL)                 */}
            {/* ============================================================ */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                {showMappingsModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setShowMappingsModal(false)}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            width: '100vw',
                            height: '100vh',
                            backgroundColor: 'rgba(0, 0, 0, 0.75)',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 99999,
                            padding: '20px',
                            boxSizing: 'border-box',
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                            onClick={e => e.stopPropagation()}
                            style={{
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                borderRadius: '4px',
                                padding: '24px 28px',
                                width: '100%',
                                maxWidth: '720px',
                                maxHeight: '88vh',
                                display: 'flex',
                                flexDirection: 'column',
                                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
                                overflow: 'hidden',
                                boxSizing: 'border-box',
                            }}
                        >
                            {/* Modal Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid var(--border)' }}>
                                <div>
                                    <h3 style={{ margin: 0, color: 'var(--accent)', fontFamily: 'var(--font-titulo)', fontSize: '1.25rem', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 400 }}>
                                        {t('operador.seleccion.mapeoModalTitulo')}
                                    </h3>
                                    <p style={{ margin: '6px 0 0 0', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', color: 'var(--muted)' }}>
                                        {t('operador.seleccion.mapeoModalDesc')}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowMappingsModal(false)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--muted)',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'color 0.2s ease',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                                    onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
                                    title={t('operador.seleccion.cancelar')}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Tabs */}
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('keyboard')}
                                    style={{
                                        ...S.btn, display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        color: activeTab === 'keyboard' ? 'var(--accent)' : 'var(--muted)',
                                        borderColor: activeTab === 'keyboard' ? 'var(--border)' : 'transparent',
                                        background: activeTab === 'keyboard' ? 'var(--background)' : 'transparent',
                                    }}
                                >
                                    <Keyboard size={16} /> {t('operador.seleccion.teclado')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('gamepad')}
                                    style={{
                                        ...S.btn, display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        color: activeTab === 'gamepad' ? 'var(--accent)' : 'var(--muted)',
                                        borderColor: activeTab === 'gamepad' ? 'var(--border)' : 'transparent',
                                        background: activeTab === 'gamepad' ? 'var(--background)' : 'transparent',
                                    }}
                                >
                                    <Gamepad2 size={16} /> {t('operador.seleccion.mando')}
                                </button>
                            </div>

                            {/* Quick Select Key Palette when Capturing */}
                            {capturandoTecla && (
                                <div style={{
                                    background: 'var(--background)',
                                    border: '1px solid var(--accent)',
                                    borderRadius: '8px',
                                    padding: '12px 16px',
                                    marginBottom: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--accent)', animation: 'pulse 1.5s infinite' }} />
                                            {t('operador.seleccion.presionaTecla')} ({getActionLabel(capturandoTecla)})
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
                                        {TECLAS_RAPIDAS.map(kCode => (
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
                                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text)'; }}
                                            >
                                                {formatearTecla(kCode)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Modal Body */}
                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingRight: '4px' }}>
                                {activeTab === 'keyboard' && (
                                    <>
                                        {/* Movimiento Chasis */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <h4 style={{ margin: 0, color: 'var(--accent)', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                                                {t('operador.configPanel.movimiento')}
                                            </h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                {Object.keys(mappingForm.keyboardMovement).map(action => (
                                                    <label key={action} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <span style={S.label}>{getActionLabel(action)}</span>
                                                        <motion.button
                                                            type="button"
                                                            onClick={() => setCapturandoTecla(action)}
                                                            onMouseEnter={() => setHoverTecla(action)}
                                                            onMouseLeave={() => setHoverTecla(null)}
                                                            title={t('operador.seleccion.cambiarTecla')}
                                                            whileTap={{ scale: 0.97 }}
                                                            style={{
                                                                ...S.input,
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                                                cursor: 'pointer', fontWeight: 600, letterSpacing: '0.05em',
                                                                color: capturandoTecla === action ? 'var(--accent)' : 'var(--text)',
                                                                borderColor: (capturandoTecla === action || hoverTecla === action) ? 'var(--accent)' : 'var(--border)',
                                                            }}
                                                        >
                                                            {capturandoTecla === action ? (
                                                                <>
                                                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0, backgroundColor: 'var(--accent)', animation: 'pulse 1.5s infinite' }} />
                                                                    {t('operador.seleccion.presionaTecla')}
                                                                </>
                                                            ) : (
                                                                formatearTecla(mappingForm.keyboardMovement[action])
                                                            )}
                                                        </motion.button>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Brazos Mecánicos */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <h4 style={{ margin: 0, color: 'var(--accent)', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                                                {t('operador.configPanel.brazos')}
                                            </h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                {['ArmFrontUp', 'ArmFrontDown', 'ArmBackUp', 'ArmBackDown'].map(action => (
                                                    <label key={action} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <span style={S.label}>{getActionLabel(action)}</span>
                                                        <motion.button
                                                            type="button"
                                                            onClick={() => setCapturandoTecla(action)}
                                                            onMouseEnter={() => setHoverTecla(action)}
                                                            onMouseLeave={() => setHoverTecla(null)}
                                                            title={t('operador.seleccion.cambiarTecla')}
                                                            whileTap={{ scale: 0.97 }}
                                                            style={{
                                                                ...S.input,
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                                                cursor: 'pointer', fontWeight: 600, letterSpacing: '0.05em',
                                                                color: capturandoTecla === action ? 'var(--accent)' : 'var(--text)',
                                                                borderColor: (capturandoTecla === action || hoverTecla === action) ? 'var(--accent)' : 'var(--border)',
                                                            }}
                                                        >
                                                            {capturandoTecla === action ? (
                                                                <>
                                                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0, backgroundColor: 'var(--accent)', animation: 'pulse 1.5s infinite' }} />
                                                                    {t('operador.seleccion.presionaTecla')}
                                                                </>
                                                            ) : (
                                                                formatearTecla(mappingForm.keyboard[action])
                                                            )}
                                                        </motion.button>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Tambores */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <h4 style={{ margin: 0, color: 'var(--accent)', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                                                {t('operador.configPanel.tambores')}
                                            </h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                {['DrumFrontCw', 'DrumFrontCcw', 'DrumBackCw', 'DrumBackCcw'].map(action => (
                                                    <label key={action} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <span style={S.label}>{getActionLabel(action)}</span>
                                                        <motion.button
                                                            type="button"
                                                            onClick={() => setCapturandoTecla(action)}
                                                            onMouseEnter={() => setHoverTecla(action)}
                                                            onMouseLeave={() => setHoverTecla(null)}
                                                            title={t('operador.seleccion.cambiarTecla')}
                                                            whileTap={{ scale: 0.97 }}
                                                            style={{
                                                                ...S.input,
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                                                cursor: 'pointer', fontWeight: 600, letterSpacing: '0.05em',
                                                                color: capturandoTecla === action ? 'var(--accent)' : 'var(--text)',
                                                                borderColor: (capturandoTecla === action || hoverTecla === action) ? 'var(--accent)' : 'var(--border)',
                                                            }}
                                                        >
                                                            {capturandoTecla === action ? (
                                                                <>
                                                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0, backgroundColor: 'var(--accent)', animation: 'pulse 1.5s infinite' }} />
                                                                    {t('operador.seleccion.presionaTecla')}
                                                                </>
                                                            ) : (
                                                                formatearTecla(mappingForm.keyboard[action])
                                                            )}
                                                        </motion.button>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {activeTab === 'gamepad' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted)', fontFamily: 'var(--font-ibm-mono)' }}>
                                            Stick Izquierdo: Movimiento · Gatillos LT/RT: Control de Brazos Frontal/Trasero.
                                        </p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <h4 style={{ margin: 0, color: 'var(--accent)', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                                                {t('operador.configPanel.tambores')}
                                            </h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                {Object.keys(mappingForm.gamepad).map(action => (
                                                    <label key={action} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <span style={S.label}>{getActionLabel(action)}</span>
                                                        <motion.button
                                                            type="button"
                                                            onClick={() => setCapturandoBoton(action)}
                                                            onMouseEnter={() => setHoverBoton(action)}
                                                            onMouseLeave={() => setHoverBoton(null)}
                                                            title={t('operador.seleccion.cambiarBoton')}
                                                            whileTap={{ scale: 0.97 }}
                                                            style={{
                                                                ...S.input,
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                                                cursor: 'pointer', fontWeight: 600, letterSpacing: '0.05em',
                                                                color: capturandoBoton === action ? 'var(--accent)' : 'var(--text)',
                                                                borderColor: (capturandoBoton === action || hoverBoton === action) ? 'var(--accent)' : 'var(--border)',
                                                            }}
                                                        >
                                                            {capturandoBoton === action ? (
                                                                <>
                                                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0, backgroundColor: 'var(--accent)', animation: 'pulse 1.5s infinite' }} />
                                                                    {t('operador.seleccion.presionaBoton')}
                                                                </>
                                                            ) : (
                                                                mappingForm.gamepad[action] || '—'
                                                            )}
                                                        </motion.button>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                                <button onClick={() => setShowMappingsModal(false)} style={S.btn}>{t('operador.seleccion.cancelar')}</button>
                                <button
                                    onClick={() => {
                                        if (onUpdateMappings) onUpdateMappings(mappingForm);
                                        setShowMappingsModal(false);
                                    }}
                                    style={{ ...S.btn, background: 'var(--accent)', color: 'var(--background)', borderColor: 'var(--accent)', fontWeight: 700 }}
                                >{t('operador.seleccion.guardarMapeo')}</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
