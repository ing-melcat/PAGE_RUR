import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Robot3DPreview } from './components/Robot3DPreview';
import { Gamepad2, Settings } from 'lucide-react';
import { apiFetch } from '../lib/apiClient';
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

// Shared style tokens
const S = {
  label: { fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  input: { padding: '12px 14px', fontSize: '0.95rem', background: 'var(--background)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', outline: 'none', fontFamily: 'var(--font-ibm-mono)', width: '100%', transition: 'border-color 0.2s ease' },
  sectionTitle: { margin: 0, color: 'var(--text)', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500, paddingBottom: '12px', borderBottom: '1px solid var(--border)' },
  panel: { background: 'var(--surface)', padding: '24px', borderRadius: '8px', border: '1px solid var(--border)' },
  btn: { background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'all 0.2s ease' },
};

export function RobotSelection({ robots, errorRobots, onReintentar, onSelectRobot, onBack, onAddRobot, onUpdateRobot, controlMappings, onUpdateMappings }) {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [columns, setColumns] = useState(3);
    const [configRobot, setConfigRobot] = useState(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    // Editable form state
    const [formData, setFormData] = useState({});
    
    // Mapping state
    const [showMappingsModal, setShowMappingsModal] = useState(false);
    const [mappingForm, setMappingForm] = useState({
        gamepad: {
            ArmFrontUp: "Y", ArmFrontDown: "X", ArmBackUp: "RB", ArmBackDown: "RT",
            DrumFrontCw: "A", DrumFrontCcw: "B", DrumBackCw: "LB", DrumBackCcw: "LT"
        },
        keyboard: {
            ArmFrontUp: "KeyW", ArmFrontDown: "KeyS", ArmBackUp: "KeyE", ArmBackDown: "KeyD",
            DrumFrontCw: "KeyR", DrumFrontCcw: "KeyF", DrumBackCw: "KeyT", DrumBackCcw: "KeyG"
        }
    });
    // Nombre de la acción (ej. "ArmFrontUp") que está esperando la siguiente
    // tecla que se presione, o null si no se está capturando ninguna. Así el
    // operador ya no tiene que saber de memoria el nombre de `event.code`
    // ("KeyW", "ArrowUp", etc.) para escribirlo a mano.
    const [capturandoTecla, setCapturandoTecla] = useState(null);
    // Resalte al pasar el mouse sobre el botón de una tecla -- por estado,
    // no por :hover/whileHover (ver por qué en el comentario donde se usa).
    const [hoverTecla, setHoverTecla] = useState(null);
    // Mismo mecanismo que capturandoTecla/hoverTecla, pero para el botón del
    // mando físico que se está esperando.
    const [capturandoBoton, setCapturandoBoton] = useState(null);
    const [hoverBoton, setHoverBoton] = useState(null);

    // We use props.controlMappings instead of local user since we are not directly holding user here, wait I need to add controlMappings and onUpdateMappings to the component props:

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
            setMappingForm(prev => ({
                gamepad: { ...prev.gamepad, ...(controlMappings.gamepad || {}) },
                keyboard: { ...prev.keyboard, ...(controlMappings.keyboard || {}) }
            }));
        }
    }, [controlMappings]);

    // Si se cierra el modal a medio capturar (clic afuera, Cancelar), no debe
    // quedar un listener de teclado ni un sondeo de mando colgado esperando
    // en el resto de la página.
    useEffect(() => {
        if (!showMappingsModal) {
            setCapturandoTecla(null);
            setCapturandoBoton(null);
        }
    }, [showMappingsModal]);

    // Mientras `capturandoTecla` tiene una acción, la siguiente tecla que se
    // presione en toda la ventana se guarda como su mapeo -- Escape cancela
    // sin cambiar nada. preventDefault() evita que la tecla capturada, de
    // paso, haga scroll o dispare algún atajo del navegador.
    useEffect(() => {
        if (!capturandoTecla) return;
        const alPresionar = (e) => {
            e.preventDefault();
            if (e.code === 'Escape') {
                setCapturandoTecla(null);
                return;
            }
            setMappingForm(prev => ({
                ...prev,
                keyboard: { ...prev.keyboard, [capturandoTecla]: e.code },
            }));
            setCapturandoTecla(null);
        };
        window.addEventListener('keydown', alPresionar);
        return () => window.removeEventListener('keydown', alPresionar);
    }, [capturandoTecla]);

    // "KeyW" -> "W", "Digit1" -> "1", "ArrowUp" se queda igual: para que el
    // botón muestre algo legible en vez del nombre crudo de event.code.
    const formatearTecla = (codigo) => {
        if (!codigo) return '—';
        const conPrefijo = codigo.match(/^(Key|Digit)(.+)$/);
        return conPrefijo ? conPrefijo[2] : codigo;
    };

    // Escape cancela la captura de botón de mando igual que la de teclado.
    useEffect(() => {
        if (!capturandoBoton) return;
        const alCancelar = (e) => {
            if (e.code === 'Escape') setCapturandoBoton(null);
        };
        window.addEventListener('keydown', alCancelar);
        return () => window.removeEventListener('keydown', alCancelar);
    }, [capturandoBoton]);

    // No hay evento "gamepadbuttondown" en el navegador -- hay que sondear
    // frame a frame mientras se espera, igual que hace ControllerApp.jsx
    // para leer el mando durante la partida. Se guarda una foto de qué
    // botones ya estaban presionados al empezar a escuchar, para que uno
    // que el operador sigue sosteniendo de antes no se lea como "se acaba
    // de presionar".
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
                        const etiqueta = INDICE_A_ETIQUETA_GAMEPAD[i];
                        if (etiqueta) {
                            setMappingForm(prev => ({
                                ...prev,
                                gamepad: { ...prev.gamepad, [capturandoBoton]: etiqueta },
                            }));
                            setCapturandoBoton(null);
                            return;
                        }
                        // Botón sin nombre en la tabla (ej. stick central): se
                        // ignora, pero se marca para no reintentar cada frame.
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

    // Sync formData when configRobot changes
    useEffect(() => {
        if (configRobot) {
            setFormData({
                name: configRobot.name || '',
                room: configRobot.room || `room-${configRobot.id}`,
                maxSpeed: configRobot.maxSpeed ?? 75,
                steeringSensitivity: configRobot.steeringSensitivity ?? 50,
                digForce: configRobot.digForce ?? 90,
                livekitUrl: configRobot.livekitUrl || '',
                livekitApiKey: configRobot.livekitApiKey || '',
                livekitApiSecret: configRobot.livekitApiSecret || '',
            });
            setShowAdvanced(false);
        }
    }, [configRobot]);

    // Todos van a la rejilla, encendidos o no. Antes solo entraban los que
    // estaban 'online' y el resto acababa en una fila diminuta abajo; desde que
    // el estado refleja de verdad si el receptor del robot esta en la sala, eso
    // dejaba la pantalla de seleccion practicamente vacia.
    const robotsOrdenados = [...robots].sort(
        (a, b) => (a.status === 'online' ? 0 : 1) - (b.status === 'online' ? 0 : 1)
    );

    const handleSelect = async (robot) => {
        setLoading(true);
        setTimeout(() => {
            onSelectRobot(robot);
            setLoading(false);
        }, 600); 
    };

    const handleAddNewRobot = () => {
        const newId = `RBT-${Math.floor(Math.random() * 9000) + 1000}`;
        const newRobot = {
            id: newId,
            name: `UNIDAD ${newId.split('-')[1]}`,
            type: "terrestre",
            status: "offline",
            battery: 100,
            location: "TBD",
            room: `room-${newId.toLowerCase()}`,
            modelUrl: "/placeholder_rover.glb",
            maxSpeed: 75,
            steeringSensitivity: 50,
            digForce: 90,
        };
        if (onAddRobot) {
            onAddRobot(newRobot);
            setConfigRobot(newRobot);
        }
    };

    const handleSave = async () => {
        if (onUpdateRobot && configRobot) {
            const updated = { ...configRobot, ...formData };
            
            // Verificación completa con el backend de LiveKit
            if (updated.livekitUrl && updated.livekitApiKey && updated.livekitApiSecret) {
              try {
                const verifyRes = await apiFetch('/api/livekit-verify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    livekitUrl: updated.livekitUrl,
                    livekitApiKey: updated.livekitApiKey,
                    livekitApiSecret: updated.livekitApiSecret
                  })
                });
                
                const verifyData = await verifyRes.json();
                if (!verifyData.success) {
                  window.alert(`${t('operador.seleccion.errorLivekitPrefijo')}\n${verifyData.message}\n\n${t('operador.seleccion.errorLivekitSufijo')}`);
                  return false;
                }
              } catch (err) {
                window.alert(t('operador.seleccion.errorLivekitConexion'));
                return false;
              }
            } else if (updated.livekitUrl || updated.livekitApiKey || updated.livekitApiSecret) {
                if (!window.confirm(t('operador.seleccion.confirmLivekitParcial'))) {
                    return false;
                }
            }
            
            onUpdateRobot(updated);
            // Also update the local configRobot reference
            setConfigRobot(updated);
            return true;
        }
        return false;
    };

    const handleFormChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };



    const inputFocusHandlers = {
        onFocus: (e) => { e.currentTarget.style.borderColor = 'var(--accent)'; },
        onBlur: (e) => { e.currentTarget.style.borderColor = 'var(--border)'; },
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', minHeight: '600px' }}>
            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '48px', borderBottom: '1px solid var(--border)', paddingBottom: '24px' }}>
                <div style={{ flex: 1, paddingRight: '40px' }}>
                    <h2 style={{ margin: '16px 0', fontSize: '3.5rem', fontFamily: 'var(--font-ibm-mono)', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: '1', fontWeight: 500 }}>
                        {t('operador.seleccion.titulo')}
                    </h2>
                </div>
                <div style={{ paddingTop: '12px', display: 'flex', gap: '12px' }}>
                    <button 
                        onClick={() => setShowMappingsModal(true)}
                        style={{ ...S.btn, display: 'flex', alignItems: 'center', gap: '8px' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                        title={t('operador.seleccion.mapeoTitle')}
                    >
                        <Gamepad2 size={24} /> <span style={{display: 'none'}}>{t('operador.seleccion.mapeoTitle')}</span>
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
                {/* Sin esto, un fallo al pedir la lista dejaba la rejilla
                    vacía y muda: parecía que la pantalla no cargaba, cuando lo
                    que fallaba era la petición. */}
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
                            hidden: { opacity: 0, y: 16 },
                            show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } }
                        }}
                        whileHover={{ y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelect(robot)}
                        style={{
                            display: 'flex', flexDirection: 'column', gap: '12px',
                            pointerEvents: loading ? 'none' : 'auto', position: 'relative',
                            ...S.panel, cursor: 'pointer', transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(251, 202, 1, 0.08)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                        <Robot3DPreview status={robot.status} modelUrl={robot.modelUrl} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontFamily: 'var(--font-ibm-mono)', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>{robot.name}</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: enLinea ? 'var(--success)' : 'var(--error)' }} />
                                <span style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.7rem', letterSpacing: '0.05em', color: enLinea ? 'var(--success)' : 'var(--error)' }}>
                                    {enLinea ? t('operador.seleccion.enLinea') : t('operador.seleccion.apagado')}
                                </span>
                            </div>
                        </div>
                        <div style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{robot.id.toUpperCase()}</span>
                            <span style={{ color: 'var(--accent)' }}>{robot.room || `room-${robot.id.toLowerCase()}`}</span>
                        </div>
                        {/* Se puede abrir igual: la consola sirve para prepararla
                            o para esperar a que el robot arranque, y ya avisa por
                            su cuenta cuando no hay nadie escuchando. */}
                        {!enLinea && (
                            <span style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.7rem', color: 'var(--muted)' }}>
                                {t('operador.seleccion.abrirConsola')}
                            </span>
                        )}
                    </motion.div>
                    );
                })}
            </motion.div>

            {/* LOADING OVERLAY */}
            <AnimatePresence>
                {loading && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(2, 7, 19, 0.7)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 50, borderRadius: '8px' }}
                    >
                        <div style={{ width: '48px', height: '48px', border: '3px solid var(--surface)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '24px' }} />
                        <span style={{ fontFamily: 'var(--font-ibm-mono)', color: 'var(--accent)', letterSpacing: '0.1em', fontSize: '1.2rem' }}>
                            {t('operador.seleccion.conectando')}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* FOOTER */}
            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '32px' }}>
                <button className="back-link" onClick={onBack}>{t('operador.seleccion.volverMenu')}</button>
                {/* Los robots apagados ya no viven aquí abajo: ahora salen en
                    la rejilla como los demás, marcados en rojo. Tenerlos en una
                    lista aparte dejaba la pantalla vacía cuando ninguno estaba
                    encendido, que es lo normal hasta que arranca el receptor. */}
            </div>

            {/* ============================================================ */}
            {/*  MODAL DE MAPEO DE CONTROLES                               */}
            {/* ============================================================ */}
            <AnimatePresence>
            {showMappingsModal && (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                    onClick={() => setShowMappingsModal(false)}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(2,7,19,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', padding: '32px' }}
                >
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.3 }}
                        onClick={e => e.stopPropagation()}
                        style={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '32px', width: '100%', maxWidth: '800px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                            <div>
                                <h3 style={{ ...S.sectionTitle, borderBottom: 'none', paddingBottom: 0, fontSize: '1.1rem' }}>{t('operador.seleccion.mapeoModalTitulo')}</h3>
                                <p style={{ margin: '6px 0 0 0', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', color: 'var(--muted)' }}>{t('operador.seleccion.mapeoModalDesc')}</p>
                            </div>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {['gamepad', 'keyboard'].map(type => (
                                <div key={type} style={{ ...S.panel, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <h4 style={{ ...S.sectionTitle }}>{type === 'gamepad' ? t('operador.seleccion.mando') : t('operador.seleccion.teclado')}</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        {Object.keys(mappingForm[type]).map(action => (
                                            <label key={action} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <span style={S.label}>{action.replace(/([A-Z])/g, ' $1').trim()}</span>
                                                {/* Sin escribir el código/nombre a mano en ninguno de los dos:
                                                    se toca el botón y se presiona la tecla o el botón del
                                                    mando que se quiera asignar. El puntito con pulse es el
                                                    mismo lenguaje visual que ya usa el sitio para "esto está
                                                    pasando ahora" (ej. el badge de aviso activo del header) --
                                                    no es una animación nueva.

                                                    El resalte al pasar el mouse va por estado de React + la
                                                    transición CSS nativa de S.input, no por whileHover de
                                                    Motion: Motion no interpola bien un var(--...) crudo como
                                                    valor de animación (el color salía mal, tipo negro), y en
                                                    pantallas táctiles whileHover se queda pegado hasta el
                                                    siguiente toque en otra parte. */}
                                                {type === 'keyboard' ? (
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
                                                ) : (
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
                                                )}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                            <button onClick={() => setShowMappingsModal(false)} style={S.btn}>{t('operador.seleccion.cancelar')}</button>
                            <button
                                onClick={() => {
                                    if (onUpdateMappings) onUpdateMappings(mappingForm);
                                    setShowMappingsModal(false);
                                }}
                                style={{ ...S.btn, background: 'var(--accent)', color: 'var(--background)', borderColor: 'var(--accent)', fontWeight: 600 }}
                            >{t('operador.seleccion.guardarMapeo')}</button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
            </AnimatePresence>

            {/* ============================================================ */}
            {/*  MODAL DE CONFIGURACIÓN                                      */}
            {/* ============================================================ */}
            <AnimatePresence>
            {configRobot && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setConfigRobot(null)}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(2,7,19,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', padding: '32px' }}
                >
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                        onClick={e => e.stopPropagation()}
                        style={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '32px', width: '100%', maxWidth: '900px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                    >
                        {/* MODAL HEADER */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                            <div>
                                <h3 style={{ ...S.sectionTitle, borderBottom: 'none', paddingBottom: 0, fontSize: '1.1rem' }}>{t('operador.seleccion.configTitulo')}</h3>
                                <p style={{ margin: '6px 0 0 0', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', color: 'var(--muted)' }}>{t('operador.seleccion.configDesc')}</p>
                            </div>
                            <button 
                                onClick={() => setConfigRobot(null)} 
                                style={{ ...S.btn, border: 'none', fontSize: '1.5rem', padding: '4px 8px', lineHeight: 1 }}
                                onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                                onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
                            >×</button>
                        </div>

                        {/* ROBOT SELECTOR */}
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                            <select 
                                value={configRobot.id} 
                                onChange={(e) => setConfigRobot(robots.find(r => r.id === e.target.value))}
                                style={{ ...S.input, flex: 1 }}
                            >
                                {robots.map(r => (
                                    <option key={r.id} value={r.id}>{r.name} — {r.id} ({r.status})</option>
                                ))}
                            </select>
                            <button 
                                onClick={handleAddNewRobot}
                                style={{ ...S.btn, color: 'var(--accent)', borderColor: 'var(--accent)', whiteSpace: 'nowrap' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = 'var(--background)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--accent)'; }}
                            >{t('operador.seleccion.nuevaUnidad')}</button>
                        </div>

                        {/* SCROLLABLE CONTENT */}
                        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
                            <AnimatePresence mode="wait">
                            {!showAdvanced ? (
                                <motion.div 
                                    key="basic"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ duration: 0.2 }}
                                    style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
                                >
                                    {/* STATUS */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', ...S.panel }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: configRobot.status === 'online' ? 'var(--success)' : 'var(--error)' }} />
                                        <span style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.85rem', color: configRobot.status === 'online' ? 'var(--success)' : 'var(--error)' }}>
                                            {configRobot.status === 'online' ? t('operador.seleccion.enLinea') : t('operador.seleccion.fueraDeLinea')}
                                        </span>
                                        <span style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', color: 'var(--muted)', marginLeft: 'auto' }}>
                                            ID: {configRobot.id}
                                        </span>
                                    </div>

                                    {/* IDENTIDAD */}
                                    <div style={{ ...S.panel, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <h4 style={{ ...S.sectionTitle }}>{t('operador.seleccion.identificacion')}</h4>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <span style={S.label}>{t('operador.seleccion.nombreVisible')}</span>
                                                <input
                                                    type="text"
                                                    value={formData.name || ''}
                                                    onChange={e => handleFormChange('name', e.target.value)}
                                                    style={S.input}
                                                    {...inputFocusHandlers}
                                                />
                                            </label>
                                            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <span style={S.label}>{t('operador.seleccion.salaLivekit')}</span>
                                                <input 
                                                    type="text" 
                                                    value={formData.room || ''} 
                                                    onChange={e => handleFormChange('room', e.target.value)}
                                                    style={S.input}
                                                    {...inputFocusHandlers}
                                                />
                                            </label>
                                        </div>
                                    </div>

                                    {/* LÍMITES OPERACIONALES */}
                                    <div style={{ ...S.panel, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <h4 style={{ ...S.sectionTitle }}>{t('operador.seleccion.limitesOperacionales')}</h4>

                                        {[
                                            { key: 'maxSpeed', label: t('operador.seleccion.velocidadMaxima'), suffix: '%' },
                                            { key: 'steeringSensitivity', label: t('operador.seleccion.sensibilidadGiro'), suffix: '%' },
                                            { key: 'digForce', label: t('operador.seleccion.fuerzaExcavacion'), suffix: '%' },
                                        ].map(({ key, label, suffix }) => (
                                            <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={S.label}>{label}</span>
                                                    <span style={{ ...S.label, color: 'var(--accent)' }}>{formData[key] || 0}{suffix}</span>
                                                </div>
                                                <input 
                                                    type="range" min="10" max="100" 
                                                    value={formData[key] || 50}
                                                    onChange={e => handleFormChange(key, parseInt(e.target.value))}
                                                    style={{ width: '100%', accentColor: 'var(--accent)' }} 
                                                />
                                            </label>
                                        ))}
                                    </div>

                                    {/* TOGGLE AVANZADAS */}
                                    <button 
                                        onClick={() => setShowAdvanced(true)}
                                        style={{ ...S.btn, borderStyle: 'dashed', borderColor: 'var(--border)', width: '100%', justifyContent: 'center', alignItems: 'center', gap: '8px', display: 'flex', padding: '14px' }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--muted)'; e.currentTarget.style.color = 'var(--text)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)'; }}
                                    >
                                        <Settings size={16} /> {t('operador.seleccion.opcionesAvanzadas')}
                                    </button>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="advanced"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.2 }}
                                    style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
                                >
                                    <button 
                                        onClick={() => setShowAdvanced(false)}
                                        style={{ ...S.btn, alignSelf: 'flex-start' }}
                                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--text)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                                    >
                                        {t('operador.seleccion.volver')}
                                    </button>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                                        {/* TRANSMISIÓN Y CREDENCIALES LIVEKIT */}
                                        <div style={{ ...S.panel, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            <h4 style={{ ...S.sectionTitle }}>{t('operador.seleccion.credencialesLivekit')}</h4>
                                            <p style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.75rem', color: 'var(--muted)', margin: 0, padding: '8px 12px', background: 'var(--background)', borderRadius: '4px', border: '1px solid var(--border)' }}>
                                                {t('operador.seleccion.credencialesDesc')}
                                            </p>

                                            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <span style={S.label}>{t('operador.seleccion.servidorLivekit')}</span>
                                                <input
                                                    type="text"
                                                    value={formData.livekitUrl || ''}
                                                    onChange={e => handleFormChange('livekitUrl', e.target.value)}
                                                    placeholder="wss://..."
                                                    style={S.input}
                                                    {...inputFocusHandlers}
                                                />
                                            </label>
                                            
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    <span style={S.label}>API Key</span>
                                                    <input 
                                                        type="password" 
                                                        value={formData.livekitApiKey || ''} 
                                                        onChange={e => handleFormChange('livekitApiKey', e.target.value)}
                                                        placeholder="API Key"
                                                        style={S.input}
                                                        {...inputFocusHandlers}
                                                    />
                                                </label>
                                                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    <span style={S.label}>API Secret</span>
                                                    <input 
                                                        type="password" 
                                                        value={formData.livekitApiSecret || ''} 
                                                        onChange={e => handleFormChange('livekitApiSecret', e.target.value)}
                                                        placeholder="API Secret"
                                                        style={S.input}
                                                        {...inputFocusHandlers}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            </AnimatePresence>
                        </div>

                        {/* FOOTER BUTTONS */}
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                            <button 
                                onClick={() => setConfigRobot(null)} 
                                style={S.btn}
                                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--text)'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                            >{t('operador.seleccion.cancelar')}</button>
                            <button
                                onClick={async () => {
                                    const success = await handleSave();
                                    if(success) setConfigRobot(null);
                                }}
                                style={{ ...S.btn, background: 'var(--accent)', color: 'var(--background)', borderColor: 'var(--accent)', fontWeight: 600 }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--text)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                            >{t('operador.seleccion.guardarCambios')}</button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
}
