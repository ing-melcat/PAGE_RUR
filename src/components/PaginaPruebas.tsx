import React, { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Gamepad2, Glasses, Cpu, Activity, Terminal, ArrowRight, 
  Wifi, Battery, Sliders, Gauge, Compass, ShieldCheck, 
  AlertTriangle, CheckCircle2, ChevronRight, Play, RotateCcw,
  Users, Radio, Flag, LayoutGrid, Keyboard
} from 'lucide-react';
import { Robot3DPreview } from '../controller/components/Robot3DPreview';
import { RassorEnVivo } from '../controller/components/RassorEnVivo';
import { ErrorBoundary } from './ErrorBoundary';
import '../controller/HudEspectador.css';
import '../controller/BarraTelemetria.css';
import './PaginaPruebas.css';

// Lista de robots de prueba para la simulación
const ROBOTS_TEST = [
  {
    id: 'rassor-1',
    name: 'RASSOR 01',
    status: 'online',
    modelUrl: '/api/uploads/1792432091929-344939674-rassorbody_full.glb',
    room: 'room-rassor-1',
    bateria: 94,
    ping: 18,
    chasis: 'DOBLE TAMBOR ROTATIVO DUMPER',
    mision: 'EXTRACCIÓN DE REGOLITO'
  },
  {
    id: 'rassor-2',
    name: 'RASSOR 02',
    status: 'online',
    modelUrl: '/api/uploads/1792432091929-344939674-rassorbody_full.glb',
    room: 'room-rassor-2',
    bateria: 76,
    ping: 24,
    chasis: 'DOBLE TAMBOR ROTATIVO DUMPER',
    mision: 'EXPLORACIÓN GEOLÓGICA'
  },
  {
    id: 'lumobox-1',
    name: 'LUMOBOX PROTO',
    status: 'offline',
    modelUrl: null,
    room: 'room-lumobox-1',
    bateria: 0,
    ping: null,
    chasis: 'PLATAFORMA CIENTÍFICA ESTÁTICA',
    mision: 'STANDBY EN HANGAR'
  }
];

export default function PaginaPruebas() {
  const [tabActiva, setTabActiva] = useState<'hangar' | 'modo' | 'cockpit' | 'comparativa'>('hangar');
  const [robotSeleccionado, setRobotSeleccionado] = useState<string>('rassor-1');
  const [modoSeleccionado, setModoSeleccionado] = useState<string | null>(null);
  
  // Estado para simulación interactiva del Cockpit HUD (Opción 3)
  const [hudAvance, setHudAvance] = useState<number>(0);
  const [hudGiro, setHudGiro] = useState<number>(0);
  const [hudPitch, setHudPitch] = useState<number>(0);
  const [hudRoll, setHudRoll] = useState<number>(0);
  const [potenciaActuadores, setPotenciaActuadores] = useState<number>(100);
  const [bateriaSimulada, setBateriaSimulada] = useState<number>(94);
  const [bitrateSimulado, setBitrateSimulado] = useState<number>(2450);
  const [actuadoresSimulados, setActuadoresSimulados] = useState<{
    ArmFront: boolean;
    ArmBack: boolean;
    DrumFront: boolean;
    DrumBack: boolean;
  }>({
    ArmFront: false,
    ArmBack: false,
    DrumFront: false,
    DrumBack: false,
  });

  // Modos de operación del operador: Teclado QWERTY, Mando de Consola o Panel Táctil
  const [modoOperador, setModoOperador] = useState<'teclado' | 'mando' | 'tactil'>('teclado');
  const [teclasActivas, setTeclasActivas] = useState<{ [k: string]: boolean }>({});

  // Manejador del joystick táctil virtual en pantalla
  const joystickRef = React.useRef<HTMLDivElement>(null);
  const [joystickDragging, setJoystickDragging] = useState<boolean>(false);
  const [joystickPos, setJoystickPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const updateJoystick = (e: React.PointerEvent) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rawDx = e.clientX - centerX;
    const rawDy = e.clientY - centerY;
    const maxR = 48;
    const dist = Math.hypot(rawDx, rawDy);
    const clampedDist = Math.min(dist, maxR);
    const angle = Math.atan2(rawDy, rawDx);
    const x = Math.cos(angle) * clampedDist;
    const y = Math.sin(angle) * clampedDist;
    setJoystickPos({ x, y });

    const normGiro = parseFloat((x / maxR).toFixed(2));
    const normAvance = parseFloat((-y / maxR).toFixed(2));
    setHudGiro(normGiro);
    setHudAvance(normAvance);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setJoystickDragging(true);
    updateJoystick(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!joystickDragging) return;
    updateJoystick(e);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setJoystickDragging(false);
    setJoystickPos({ x: 0, y: 0 });
    setHudAvance(0);
    setHudGiro(0);
  };

  // Manejo de teclado interactivo para pilotar el HUD en tiempo real
  useEffect(() => {
    if (tabActiva !== 'cockpit') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en un input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      const key = e.key.toLowerCase();
      setTeclasActivas((prev) => ({ ...prev, [key]: true }));

      if (key === 'w' || key === 'arrowup') {
        e.preventDefault();
        setHudAvance((prev) => Math.min(1, parseFloat((prev + 0.2).toFixed(2))));
      } else if (key === 's' || key === 'arrowdown') {
        e.preventDefault();
        setHudAvance((prev) => Math.max(-1, parseFloat((prev - 0.2).toFixed(2))));
      } else if (key === 'a' || key === 'arrowleft') {
        e.preventDefault();
        setHudGiro((prev) => Math.max(-1, parseFloat((prev - 0.2).toFixed(2))));
      } else if (key === 'd' || key === 'arrowright') {
        e.preventDefault();
        setHudGiro((prev) => Math.min(1, parseFloat((prev + 0.2).toFixed(2))));
      } else if (key === ' ' || key === 'x') {
        e.preventDefault();
        setHudAvance(0);
        setHudGiro(0);
      } else if (key === '1') {
        setActuadoresSimulados((prev) => ({ ...prev, ArmFront: !prev.ArmFront }));
      } else if (key === '2') {
        setActuadoresSimulados((prev) => ({ ...prev, ArmBack: !prev.ArmBack }));
      } else if (key === '3') {
        setActuadoresSimulados((prev) => ({ ...prev, DrumFront: !prev.DrumFront }));
      } else if (key === '4') {
        setActuadoresSimulados((prev) => ({ ...prev, DrumBack: !prev.DrumBack }));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      setTeclasActivas((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [tabActiva]);

  // Opciones de título en blanco para el modo manual (solicitud del operador)
  const [opcionTituloManual, setOpcionTituloManual] = useState<'mando' | 'cabina' | 'teleoperacion' | 'terrestre'>('mando');

  const titulosManual: Record<'mando' | 'cabina' | 'teleoperacion' | 'terrestre', string> = {
    mando: 'MANDO DIRECTO',
    cabina: 'CABINA DE CONTROL GCS',
    teleoperacion: 'ESTACIÓN DE TELEOPERACIÓN TERRESTRE',
    terrestre: 'TELEOPERACIÓN TERRESTRE GCS',
  };
  const [switchLuces, setSwitchLuces] = useState<boolean>(true);
  const [switchTelemetria, setSwitchTelemetria] = useState<boolean>(true);
  const [switchAlarma, setSwitchAlarma] = useState<boolean>(false);

  return (
    <div className="pruebas-container">
      <div className="pruebas-grid-bg" />

      <div className="pruebas-content">
        {/* CABECERA TÉCNICA */}
        <header className="pruebas-header">
          <div className="pruebas-header__topline">
            <span className="pruebas-header__tag">RUR // GROUND CONTROL STATION · LAB SUITE</span>
            <div className="pruebas-header__server">
              <span className="pruebas-header__server-dot" />
              <span>SERVIDOR DE PRUEBAS: <code>RUR-DEV (100.126.20.52:8080)</code></span>
            </div>
          </div>

          <h1 className="pruebas-header__title">
            TEST DE OPCIONES DE REDISEÑO DE INTERFAZ
          </h1>
          <p className="pruebas-header__desc">
            Evaluación interactiva para sustituir las animaciones y tarjetas genéricas de IA/SaaS
            por el lenguaje brutalista, táctico y aeroespacial auténtico de la plataforma RUR.
          </p>
        </header>

        {/* NAVEGACIÓN DE PESTAÑAS */}
        <nav className="pruebas-tabs">
          <button 
            className={`pruebas-tab ${tabActiva === 'hangar' ? 'pruebas-tab--active' : ''}`}
            onClick={() => setTabActiva('hangar')}
          >
            [ 01 // HANGAR DE DESPLIEGUE (ROBOTS) ]
          </button>
          <button 
            className={`pruebas-tab ${tabActiva === 'modo' ? 'pruebas-tab--active' : ''}`}
            onClick={() => setTabActiva('modo')}
          >
            [ 02 // PROTOCOLO DE ENLACE (MODO) ]
          </button>
          <button 
            className={`pruebas-tab ${tabActiva === 'cockpit' ? 'pruebas-tab--active' : ''}`}
            onClick={() => setTabActiva('cockpit')}
          >
            [ 03 // INSTRUMENTACIÓN COCKPIT HUD ]
          </button>
          <button 
            className={`pruebas-tab ${tabActiva === 'comparativa' ? 'pruebas-tab--active' : ''}`}
            onClick={() => setTabActiva('comparativa')}
          >
            [ 04 // COMPARATIVA ANTES VS DESPUÉS ]
          </button>
        </nav>

        {/* ========================================================================= */}
        {/* PESTAÑA 1: HANGAR DE DESPLIEGUE TÉCNICO (SELECCIÓN DE ROBOTS)            */}
        {/* ========================================================================= */}
        {tabActiva === 'hangar' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span style={{ fontFamily: 'var(--font-codigo)', fontSize: '0.75rem', color: 'var(--accent)', letterSpacing: 'var(--tracking-tech)' }}>
                  ESTRUCTURA INDUSTRIAL DE ALTA FIDELIDAD
                </span>
                <h2 style={{ margin: '4px 0 0', fontFamily: 'var(--font-titulo)', fontSize: '2rem', color: 'var(--text)', letterSpacing: '0.04em' }}>
                  HANGAR DE DESPLIEGUE DE UNIDADES
                </h2>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <span className="tactical-badge tactical-badge--online">
                  <CheckCircle2 size={12} /> 2 ACTIVOS
                </span>
                <span className="tactical-badge tactical-badge--offline">
                  <AlertTriangle size={12} /> 1 STANDBY
                </span>
              </div>
            </div>

            {/* Grid de Robots Tácticos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
              {ROBOTS_TEST.map((robot) => {
                const isOnline = robot.status === 'online';
                const isSelected = robotSeleccionado === robot.id;

                return (
                  <div
                    key={robot.id}
                    className="tactical-frame tactical-frame--interactive"
                    style={{
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                      backgroundColor: isSelected ? 'var(--surface-strong)' : 'var(--surface)',
                    }}
                    onClick={() => setRobotSeleccionado(robot.id)}
                  >
                    {/* Marcas angulares tácticas ┌ ┐ └ ┘ */}
                    <div className="tactical-corner tactical-corner--tl" />
                    <div className="tactical-corner tactical-corner--tr" />
                    <div className="tactical-corner tactical-corner--bl" />
                    <div className="tactical-corner tactical-corner--br" />

                    {/* Cabecera de la ficha */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-codigo)', fontSize: '0.7rem', color: 'var(--muted)', letterSpacing: 'var(--tracking-tech)' }}>
                          ID // {robot.id.toUpperCase()}
                        </div>
                        <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-titulo)', fontSize: '1.4rem', color: 'var(--text)', letterSpacing: '0.05em' }}>
                          {robot.name}
                        </h3>
                      </div>

                      <span className={`tactical-badge ${isOnline ? 'tactical-badge--online' : 'tactical-badge--offline'}`}>
                        {isOnline ? `ENLACE OK // ${robot.ping}MS` : 'OFFLINE // HANGAR'}
                      </span>
                    </div>

                    {/* Visor 3D con retícula técnica de coordenadas */}
                    <div style={{ 
                      position: 'relative', 
                      height: '180px', 
                      background: '#01050e', 
                      border: '1px solid rgba(245, 243, 233, 0.08)',
                      overflow: 'hidden'
                    }}>
                      <div style={{ position: 'absolute', top: '8px', left: '8px', fontFamily: 'var(--font-codigo)', fontSize: '0.62rem', color: 'rgba(251, 202, 1, 0.6)', zIndex: 2 }}>
                        REC // CAM-3D [AZIMUTH: 0°]
                      </div>
                      <div style={{ position: 'absolute', bottom: '8px', right: '8px', fontFamily: 'var(--font-codigo)', fontSize: '0.62rem', color: 'var(--muted)', zIndex: 2 }}>
                        {robot.room}
                      </div>

                      <Suspense fallback={
                        <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--muted)', fontFamily: 'var(--font-codigo)', fontSize: '0.75rem' }}>
                          CARGANDO TELEMETRÍA 3D...
                        </div>
                      }>
                        <Robot3DPreview status={robot.status} modelUrl={robot.modelUrl} />
                      </Suspense>
                    </div>

                    {/* Especificaciones de aviónica */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontFamily: 'var(--font-codigo)', fontSize: '0.72rem', color: 'var(--muted)' }}>
                      <div style={{ background: 'rgba(245, 243, 233, 0.03)', padding: '8px', border: '1px solid rgba(245, 243, 233, 0.06)' }}>
                        <span style={{ color: 'var(--text)', display: 'block', marginBottom: '2px' }}>ENERGÍA</span>
                        <span style={{ color: isOnline ? 'var(--accent)' : 'var(--muted)' }}>{robot.bateria}% LiFePO4</span>
                      </div>
                      <div style={{ background: 'rgba(245, 243, 233, 0.03)', padding: '8px', border: '1px solid rgba(245, 243, 233, 0.06)' }}>
                        <span style={{ color: 'var(--text)', display: 'block', marginBottom: '2px' }}>PROTOCOLO</span>
                        <span style={{ color: isOnline ? '#2ecc71' : 'var(--muted)' }}>WEBRTC P2P</span>
                      </div>
                    </div>

                    <div style={{ fontFamily: 'var(--font-codigo)', fontSize: '0.68rem', color: 'var(--muted)' }}>
                      MISIÓN: <span style={{ color: 'var(--text)' }}>{robot.mision}</span>
                    </div>

                    {/* Botón de acoplamiento */}
                    <button 
                      className={`tactical-btn ${isSelected ? '' : 'tactical-btn--secondary'}`}
                      style={{ width: '100%', marginTop: 'auto' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setRobotSeleccionado(robot.id);
                      }}
                    >
                      {isSelected ? 'UNIDAD ACOPLADA ✓' : 'ACOPLAR UNIDAD →'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 2: SELECTOR DE PROTOCOLO DE ENLACE (MODO VR VS MANUAL)            */}
        {/* ========================================================================= */}
        {tabActiva === 'modo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <span style={{ fontFamily: 'var(--font-codigo)', fontSize: '0.75rem', color: 'var(--accent)', letterSpacing: 'var(--tracking-tech)' }}>
                  CONSOLAS DE TELEOPERACIÓN ROBÓTICA Y TELEPRESENCIA
                </span>
                <h2 style={{ margin: '4px 0 0', fontFamily: 'var(--font-titulo)', fontSize: '2rem', color: 'var(--text)', letterSpacing: '0.04em' }}>
                  SELECTOR DE PROTOCOLO DE ENLACE
                </h2>
              </div>

              {/* Selector interactivo de títulos en blanco para Modo Manual */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <span style={{ fontFamily: 'var(--font-codigo)', fontSize: '0.68rem', color: 'var(--muted)', letterSpacing: 'var(--tracking-tech)' }}>
                  TÍTULO:
                </span>
                {(Object.keys(titulosManual) as Array<keyof typeof titulosManual>).map((key) => (
                  <button
                    key={key}
                    onClick={() => setOpcionTituloManual(key)}
                    className="tactical-btn"
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.68rem',
                      background: opcionTituloManual === key ? 'var(--accent)' : 'transparent',
                      color: opcionTituloManual === key ? '#000' : 'var(--accent)',
                    }}
                  >
                    {titulosManual[key]} {opcionTituloManual === key ? '✓' : ''}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '28px' }}>
              {/* CONSOLA ALPHA: MODO CABINA GCS (MANUAL) */}
              <div 
                className="tactical-frame tactical-frame--interactive"
                style={{
                  padding: '32px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                  borderColor: modoSeleccionado === 'manual' ? 'var(--accent)' : 'var(--border)',
                  backgroundColor: modoSeleccionado === 'manual' ? 'var(--surface-strong)' : 'var(--surface)'
                }}
                onClick={() => setModoSeleccionado('manual')}
              >
                <div className="tactical-corner tactical-corner--tl" />
                <div className="tactical-corner tactical-corner--tr" />
                <div className="tactical-corner tactical-corner--bl" />
                <div className="tactical-corner tactical-corner--br" />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="tactical-badge tactical-badge--accent">MANUAL</span>
                  <Gamepad2 size={28} color="var(--accent)" />
                </div>

                <div>
                  <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--font-titulo)', fontSize: '1.8rem', color: '#ffffff', letterSpacing: '0.04em' }}>
                    {titulosManual[opcionTituloManual]}
                  </h3>
                  <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                    Enlace de vuelo primario por estación de control en tierra. Control directo
                    mediante gamepad USB o teclado de bajo nivel con canales de telemetría sincrónicos.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-codigo)', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--muted)' }}>TASA DE MUESTREO:</span>
                    <span style={{ color: 'var(--text)' }}>60 HZ REAL-TIME</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-codigo)', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--muted)' }}>DISPOSITIVOS:</span>
                    <span style={{ color: 'var(--text)' }}>GAMEPAD W3C / TECLADO QWERTY</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-codigo)', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--muted)' }}>LATENCIA ESTIMADA:</span>
                    <span style={{ color: '#2ecc71' }}>&lt; 25 MS (WEBRTC P2P)</span>
                  </div>
                </div>

                <button 
                  className={`tactical-btn ${modoSeleccionado === 'manual' ? '' : 'tactical-btn--secondary'}`}
                  style={{ width: '100%', marginTop: 'auto' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setModoSeleccionado('manual');
                  }}
                >
                  {modoSeleccionado === 'manual' ? 'PROTOCOLO ACTIVADO [CABINA GCS]' : 'INICIAR ENLACE GCS DIRECTO →'}
                </button>
              </div>

              {/* CONSOLA BETA: ENLACE HÁPTICO ESPACIAL (VR) */}
              <div 
                className="tactical-frame tactical-frame--interactive"
                style={{
                  padding: '32px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                  borderColor: modoSeleccionado === 'vr' ? 'var(--accent)' : 'var(--border)',
                  backgroundColor: modoSeleccionado === 'vr' ? 'var(--surface-strong)' : 'var(--surface)'
                }}
                onClick={() => setModoSeleccionado('vr')}
              >
                <div className="tactical-corner tactical-corner--tl" />
                <div className="tactical-corner tactical-corner--tr" />
                <div className="tactical-corner tactical-corner--bl" />
                <div className="tactical-corner tactical-corner--br" />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="tactical-badge tactical-badge--accent">VR</span>
                  <Glasses size={28} color="var(--accent)" />
                </div>

                <div>
                  <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--font-titulo)', fontSize: '1.8rem', color: '#ffffff', letterSpacing: '0.04em' }}>
                    ENLACE HÁPTICO ESPACIAL (6DOF)
                  </h3>
                  <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                    Telepresencia inmersiva en tiempo real con visor WebXR. Mapeo tridimensional
                    de actuadores y tambores mediante controladores espaciales de 6 grados de libertad.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-codigo)', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--muted)' }}>HARDWARE COMPATIBLE:</span>
                    <span style={{ color: 'var(--text)' }}>META QUEST 2/3 / HTC VIVE</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-codigo)', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--muted)' }}>CONTROLADORES:</span>
                    <span style={{ color: 'var(--text)' }}>DUAL SPATIAL WANDS (6DOF)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-codigo)', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--muted)' }}>ESTADO DEL DRIVER:</span>
                    <span style={{ color: 'var(--accent)' }}>SISTEMA LISTO (VERSIÓN EXPERIMENTAL)</span>
                  </div>
                </div>

                <button 
                  className={`tactical-btn ${modoSeleccionado === 'vr' ? '' : 'tactical-btn--secondary'}`}
                  style={{ width: '100%', marginTop: 'auto' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setModoSeleccionado('vr');
                  }}
                >
                  {modoSeleccionado === 'vr' ? 'PROTOCOLO ACTIVADO [VR SPATIAL]' : 'INICIAR ENLACE HÁPTICO VR →'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 3: INSTRUMENTACIÓN COCKPIT HUD & MANDOS TÁCTICOS                  */}
        {/* ========================================================================= */}
        {tabActiva === 'cockpit' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <span style={{ fontFamily: 'var(--font-codigo)', fontSize: '0.75rem', color: 'var(--accent)', letterSpacing: 'var(--tracking-tech)' }}>
                  SISTEMA DE VISUALIZACIÓN HEADS-UP // PROTOCOLO HUD 01
                </span>
                <h2 style={{ margin: '4px 0 0', fontFamily: 'var(--font-titulo)', fontSize: '2rem', color: 'var(--text)', letterSpacing: '0.04em' }}>
                  INTEGRACIÓN DE TERMINAL HUD & BANCO DE TELEOPERACIÓN GCS
                </h2>
                <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
                  Instrumentación táctica de robótica distribuida sobre la cámara (sin glassmorphism / sin blur opaco). Retícula óptica central, alas periféricas translúcidas y radar cenital 3D.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(4, 10, 20, 0.95)', border: '1px solid var(--accent)', borderRadius: '2px', padding: '8px 14px', boxShadow: '0 0 10px rgba(251, 202, 1, 0.2)' }}>
                <Keyboard size={16} color="var(--accent)" />
                <span style={{ fontFamily: 'var(--font-codigo)', fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.1em' }}>
                  MANDOS W/A/S/D + FLECHAS ACTIVOS
                </span>
              </div>
            </div>

            <div className="hud-simulation-panel">
              {/* VIEWPORT DE TELEOPERACIÓN Y NAVEGACIÓN HUD SIMULADO */}
              <div className="cockpit-hud-viewport">
                {/* FONDO DE CÁMARA CON GUÍAS DE TERRENO Y SCANLINES */}
                <div className="cockpit-camera-feed">
                  <div className="cockpit-camera-grid" />
                  
                  {/* Línea de horizonte de cámara que responde a pitch y roll */}
                  <div 
                    className="cockpit-camera-horizon"
                    style={{
                      top: `calc(50% + ${hudPitch * 4}px)`,
                      transform: `rotate(${-hudRoll}deg)`,
                      transition: 'all 0.1s linear'
                    }}
                  />

                  {/* Etiqueta OSD de cámara cruda */}
                  <div style={{
                    position: 'absolute', top: '16px', left: '20px',
                    fontFamily: 'var(--font-codigo)', fontSize: '0.68rem',
                    color: 'rgba(235, 240, 246, 0.6)', letterSpacing: '0.12em',
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff4d4d', boxShadow: '0 0 8px #ff4d4d' }} />
                    <span>REC ● RAW WEBRTC P2P · CAM 01 [FRONT HD]</span>
                  </div>
                </div>

                {/* DELIMITACIÓN DE ESQUINAS DEL COCKPIT */}
                <div className="hud__esquinas">
                  <div className="hud__esquina hud__esquina--tl">
                    <span>┌ CAM 01 // FRONT HD · BORESIGHT</span>
                  </div>
                  <div className="hud__esquina hud__esquina--tr">
                    <span>P2P DATACHANNEL // 60 HZ ┐</span>
                  </div>
                  <div className="hud__esquina hud__esquina--bl">
                    <span>└ SYS // ROVER TELEOP [ARMED & READY]</span>
                  </div>
                  <div className="hud__esquina hud__esquina--br">
                    <span>RUR-GCS // v2.4 ┘</span>
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* TERMINAL HUD DE TELEOPERACIÓN INTEGRADA (PLANTILLA 1: ROVER TAPES & OSD) */}
                {/* Sin títulos, sin explicaciones, magnitudes físicas reales (m/s, rad/s, °) */}
                {/* ========================================================================= */}
                <div className="hud-safe-zone">
                  {/* 1. CINTA DE AZIMUT / RUMBO HORIZONTAL AL CENTRO SUPERIOR */}
                  {(() => {
                    const headingDeg = Math.round((90 + hudGiro * 45 + 360) % 360);
                    const hMinus20 = String((headingDeg - 20 + 360) % 360).padStart(3, '0');
                    const hMinus10 = String((headingDeg - 10 + 360) % 360).padStart(3, '0');
                    const hCenter = String(headingDeg).padStart(3, '0');
                    const hPlus10 = String((headingDeg + 10) % 360).padStart(3, '0');
                    const hPlus20 = String((headingDeg + 20) % 360).padStart(3, '0');
                    return (
                      <div className="hud__tape-azimut">
                        <span>◄ {hMinus20} · · {hMinus10} · · [ {hCenter}° ] · · {hPlus10} · · {hPlus20} ►</span>
                      </div>
                    );
                  })()}

                  {/* 2. CINTA VERTICAL DE VELOCIDAD DINÁMICA (m/s) A LA IZQUIERDA */}
                  {(() => {
                    const velLineal = (hudAvance * 1.5).toFixed(1);
                    // Escala de 160px: top 5% es +2.0, 50% es 0.0, 95% es -2.0
                    const cursorPercent = Math.max(5, Math.min(95, 50 - (hudAvance * 40)));
                    return (
                      <div className="hud__tape-velocidad">
                        <div className="hud__speed-scale-wrap">
                          <div className="hud__speed-rail">
                            {/* Graduación de la escala en m/s */}
                            <div className="hud__speed-tick hud__speed-tick--major" style={{ top: '0%' }}>
                              <span className="hud__speed-tick-label">+2.0</span>
                            </div>
                            <div className="hud__speed-tick" style={{ top: '25%' }}>
                              <span className="hud__speed-tick-label">+1.0</span>
                            </div>
                            <div className="hud__speed-tick hud__speed-tick--major" style={{ top: '50%' }}>
                              <span className="hud__speed-tick-label" style={{ color: 'var(--accent)', fontWeight: 'bold' }}>0.0</span>
                            </div>
                            <div className="hud__speed-tick" style={{ top: '75%' }}>
                              <span className="hud__speed-tick-label">-1.0</span>
                            </div>
                            <div className="hud__speed-tick hud__speed-tick--major" style={{ top: '100%' }}>
                              <span className="hud__speed-tick-label">-2.0</span>
                            </div>

                            {/* Cursor móvil dinámico con etiqueta m/s */}
                            <div className="hud__speed-cursor" style={{ top: `${cursorPercent}%` }}>
                              <span className="hud__speed-arrow" />
                              <span className="hud__speed-tag">
                                {hudAvance > 0 ? '+' : ''}{velLineal} m/s
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Subdatos en magnitudes físicas reales medibles */}
                        <div className="hud__speed-subdata">
                          <div>DIST: {(12.6 + Math.abs(hudAvance) * 3.4).toFixed(1)} m</div>
                          <div>ANG : {hudGiro >= 0 ? '+' : ''}{(hudGiro * 1.25).toFixed(2)} rad/s</div>
                          <div>ARM : F:{actuadoresSimulados.ArmFront ? '+32.5°' : '0.0°'} R:{actuadoresSimulados.ArmBack ? '+18.0°' : '0.0°'}</div>
                          <div>DRM : F:{actuadoresSimulados.DrumFront ? '45' : '0'} R:{actuadoresSimulados.DrumBack ? '45' : '0'} RPM</div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 3. RETÍCULA ÓPTICA CENTRAL (BORESIGHT & PITCH LADDER) */}
                  <div className="hud__boresight">
                    <div className="hud__boresight-cross">
                      <span className="hud__boresight-line-h" />
                      <span className="hud__boresight-line-v" />
                      <span className="hud__boresight-corner hud__boresight-corner--tl" />
                      <span className="hud__boresight-corner hud__boresight-corner--tr" />
                      <span className="hud__boresight-corner hud__boresight-corner--bl" />
                      <span className="hud__boresight-corner hud__boresight-corner--br" />
                      <span className="hud__boresight-center" />
                    </div>
                    <div 
                      className="hud__boresight-ladder"
                      style={{ transform: `rotate(${-hudRoll * 0.5}deg) translateY(${hudPitch * 1.2}px)` }}
                    >
                      <span>+10</span>
                      <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>┌ 00 ┐</span>
                      <span>-10</span>
                    </div>
                    <div className="hud__boresight-angles">
                      P: {hudPitch >= 0 ? '+' : ''}{hudPitch.toFixed(1)}° │ R: {hudRoll >= 0 ? '+' : ''}{hudRoll.toFixed(1)}°
                    </div>
                  </div>

                  {/* 4. COLUMNA DERECHA DE POTENCIA, TÉRMICA Y ENLACE */}
                  {(() => {
                    const volt = (24.0 + (bateriaSimulada / 100) * 4.6).toFixed(1);
                    const amp = (1.8 + Math.abs(hudAvance) * 3.2).toFixed(1);
                    const watts = (parseFloat(volt) * parseFloat(amp)).toFixed(1);
                    return (
                      <div className="hud__tape-avionica">
                        <div style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.85rem' }}>
                          {volt} V · {amp} A
                        </div>
                        <div style={{ color: 'var(--muted)', fontSize: '0.68rem' }}>
                          BUS: 24V NOM · {watts} W
                        </div>
                        <div>TEMP: 41.2°C MOT · 38.0°C CTL</div>
                        <div style={{ marginTop: '6px', color: '#2ecc71', fontWeight: 600 }}>
                          18 ms · {bitrateSimulado} kbps
                        </div>
                        <div>1080p @ 60 fps · 0 loss</div>
                        <div style={{ color: 'var(--bone)', fontSize: '0.68rem' }}>
                          12 USR · P2P ENLACE OK
                        </div>
                      </div>
                    );
                  })()}

                  {/* 5. DECK INFERIOR CENTRAL: ROVER 3D + MISIÓN + SELECTOR DE MODO */}
                  <div className="hud__deck-inferior">
                    <ErrorBoundary fallback={<div style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>3D EN CARGA...</div>}>
                      <RassorEnVivo
                        avance={{ nivel: Math.abs(hudAvance) * 10, dir: hudAvance >= 0 ? 'adelante' : 'atras' }}
                        giro={{ nivel: Math.abs(hudGiro) * 10, dir: hudGiro >= 0 ? 'derecha' : 'izquierda' }}
                        imu={{ pitch: hudPitch, roll: hudRoll }}
                        escala={1.3}
                        modelUrl="/api/uploads/1792432091929-344939674-rassorbody_full.glb"
                      />
                    </ErrorBoundary>

                    <span className="hud__mission-clock">T+ 00:14:22</span>

                    <div className="hud__controls-pill">
                      <button
                        className={`hud__mode-btn ${modoOperador === 'teclado' ? 'hud__mode-btn--active' : ''}`}
                        onClick={() => setModoOperador('teclado')}
                        title="Modo Teclado QWERTY (W/A/S/D / Flechas)"
                      >
                        <Keyboard size={13} /> TECLADO
                      </button>
                      <button
                        className={`hud__mode-btn ${modoOperador === 'mando' ? 'hud__mode-btn--active' : ''}`}
                        onClick={() => setModoOperador('mando')}
                        title="Modo Mando / Gamepad de Consola"
                      >
                        <Gamepad2 size={13} /> MANDO
                      </button>
                      <button
                        className={`hud__mode-btn ${modoOperador === 'tactil' ? 'hud__mode-btn--active' : ''}`}
                        onClick={() => setModoOperador('tactil')}
                        title="Modo Panel Táctil en Pantalla"
                      >
                        <Activity size={13} /> TÁCTIL
                      </button>
                    </div>
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* 6. MÓDULOS DE CONTROL SEGÚN MODO OPERADOR SELECCIONADO                    */}
                {/* ========================================================================= */}
                {modoOperador === 'tactil' && (
                  <div className="hud__touch-overlay">
                    {/* Joystick virtual a la izquierda */}
                    <div 
                      ref={joystickRef}
                      className="hud__virtual-joystick"
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      title="Arrastra para pilotar avance y giro"
                    >
                      <span className="hud__joystick-crosshair-h" />
                      <span className="hud__joystick-crosshair-v" />
                      <div 
                        className="hud__joystick-thumb"
                        style={{
                          transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`
                        }}
                      />
                    </div>

                    {/* Botonera táctil de actuadores a la derecha */}
                    <div className="hud__touch-actuators">
                      <div className="hud__touch-actuator-row">
                        <button 
                          className={`hud__touch-act-btn ${actuadoresSimulados.ArmFront ? 'hud__touch-act-btn--on' : ''}`}
                          onClick={() => setActuadoresSimulados(p => ({ ...p, ArmFront: !p.ArmFront }))}
                        >
                          BF {actuadoresSimulados.ArmFront ? '▲ ON' : 'IDLE'}
                        </button>
                        <button 
                          className={`hud__touch-act-btn ${actuadoresSimulados.ArmBack ? 'hud__touch-act-btn--on' : ''}`}
                          onClick={() => setActuadoresSimulados(p => ({ ...p, ArmBack: !p.ArmBack }))}
                        >
                          BT {actuadoresSimulados.ArmBack ? '▲ ON' : 'IDLE'}
                        </button>
                      </div>
                      <div className="hud__touch-actuator-row">
                        <button 
                          className={`hud__touch-act-btn ${actuadoresSimulados.DrumFront ? 'hud__touch-act-btn--on' : ''}`}
                          onClick={() => setActuadoresSimulados(p => ({ ...p, DrumFront: !p.DrumFront }))}
                        >
                          TF {actuadoresSimulados.DrumFront ? '↺ 45' : '0 RPM'}
                        </button>
                        <button 
                          className={`hud__touch-act-btn ${actuadoresSimulados.DrumBack ? 'hud__touch-act-btn--on' : ''}`}
                          onClick={() => setActuadoresSimulados(p => ({ ...p, DrumBack: !p.DrumBack }))}
                        >
                          TT {actuadoresSimulados.DrumBack ? '↺ 45' : '0 RPM'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {modoOperador === 'mando' && (
                  <div style={{
                    position: 'absolute', bottom: '16px', left: '20px',
                    pointerEvents: 'none', zIndex: 25,
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}>
                    <div className="hud__gamepad-banner">
                      <Gamepad2 size={15} color="var(--accent)" />
                      <span>CONSOLA GCS // STICK IZQ: TRACCIÓN · STICK DER: MIRA · RT/LT: TAMBORES · D-PAD: BRAZOS</span>
                    </div>
                  </div>
                )}

                {modoOperador === 'teclado' && (
                  <div style={{
                    position: 'absolute', bottom: '16px', left: '20px',
                    pointerEvents: 'none', zIndex: 25,
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}>
                    <div className="hud__gamepad-banner">
                      <Keyboard size={15} color="var(--accent)" />
                      <div className="hud__keyboard-keys">
                        <span className={`hud__key-pill ${teclasActivas['w'] || teclasActivas['arrowup'] ? 'hud__key-pill--active' : ''}`}>W</span>
                        <span className={`hud__key-pill ${teclasActivas['a'] || teclasActivas['arrowleft'] ? 'hud__key-pill--active' : ''}`}>A</span>
                        <span className={`hud__key-pill ${teclasActivas['s'] || teclasActivas['arrowdown'] ? 'hud__key-pill--active' : ''}`}>S</span>
                        <span className={`hud__key-pill ${teclasActivas['d'] || teclasActivas['arrowright'] ? 'hud__key-pill--active' : ''}`}>D</span>
                        <span className={`hud__key-pill ${teclasActivas[' '] || teclasActivas['x'] ? 'hud__key-pill--active' : ''}`} style={{ minWidth: '40px' }}>ESP</span>
                      </div>
                      <span style={{ color: 'var(--muted)', fontSize: '0.65rem' }}>1/2/3/4: ACTUADORES</span>
                    </div>
                  </div>
                )}
              </div>

              {/* SELECTOR RÁPIDO DE MODOS DE ENTRADA Y BANCO DE CONTROL */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-codigo)', fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 'bold' }}>
                    MODO DE CONTROL ACTIVO:
                  </span>
                  <span style={{ fontFamily: 'var(--font-codigo)', fontSize: '0.72rem', color: 'var(--bone)' }}>
                    {modoOperador === 'teclado' ? 'TECLADO QWERTY (W/A/S/D · 1/2/3/4)' : modoOperador === 'mando' ? 'MANDO / GAMEPAD DE CONSOLA' : 'PANEL TÁCTIL (JOYSTICK Y BOTONERA EN PANTALLA)'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className={`tactical-btn ${modoOperador === 'teclado' ? '' : 'tactical-btn--secondary'}`}
                    style={{ padding: '6px 12px', fontSize: '0.72rem' }}
                    onClick={() => setModoOperador('teclado')}
                  >
                    <Keyboard size={13} /> [ TECLADO ]
                  </button>
                  <button
                    className={`tactical-btn ${modoOperador === 'mando' ? '' : 'tactical-btn--secondary'}`}
                    style={{ padding: '6px 12px', fontSize: '0.72rem' }}
                    onClick={() => setModoOperador('mando')}
                  >
                    <Gamepad2 size={13} /> [ MANDO ]
                  </button>
                  <button
                    className={`tactical-btn ${modoOperador === 'tactil' ? '' : 'tactical-btn--secondary'}`}
                    style={{ padding: '6px 12px', fontSize: '0.72rem' }}
                    onClick={() => setModoOperador('tactil')}
                  >
                    <Activity size={13} /> [ TÁCTIL ]
                  </button>
                </div>
              </div>

              {/* BANCO DE CONTROL INTERACTIVO PARA EVALUAR RESPUESTA DEL HUD */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {/* Control de Propulsión y Dirección */}
                <div className="tactical-frame" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-codigo)', fontSize: '0.75rem', color: 'var(--accent)' }}>
                      PROPULSIÓN Y DIRECCIÓN
                    </span>
                    <span style={{ fontFamily: 'var(--font-codigo)', fontSize: '0.68rem', color: 'var(--muted)' }}>
                      W/S · A/D
                    </span>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-codigo)', fontSize: '0.72rem', marginBottom: '4px' }}>
                      <span>VELOCIDAD LINEAL:</span>
                      <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{(hudAvance * 1.5).toFixed(1)} m/s ({Math.round(hudAvance * 100)}%)</span>
                    </div>
                    <input 
                      type="range" min="-1" max="1" step="0.05"
                      value={hudAvance}
                      onChange={(e) => setHudAvance(parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--accent)' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-codigo)', fontSize: '0.72rem', marginBottom: '4px' }}>
                      <span>VELOCIDAD ANGULAR:</span>
                      <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{(hudGiro * 1.25).toFixed(2)} rad/s ({Math.round(hudGiro * 100)}%)</span>
                    </div>
                    <input 
                      type="range" min="-1" max="1" step="0.05"
                      value={hudGiro}
                      onChange={(e) => setHudGiro(parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--accent)' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button 
                      className="tactical-btn tactical-btn--secondary" 
                      style={{ padding: '6px 12px', fontSize: '0.72rem', flex: 1 }}
                      onClick={() => setHudAvance(1)}
                    >
                      ▲ 100% ACEL
                    </button>
                    <button 
                      className="tactical-btn" 
                      style={{ padding: '6px 12px', fontSize: '0.72rem', flex: 1 }}
                      onClick={() => { setHudAvance(0); setHudGiro(0); }}
                    >
                      ■ ALTO (ESPACIO)
                    </button>
                    <button 
                      className="tactical-btn tactical-btn--secondary" 
                      style={{ padding: '6px 12px', fontSize: '0.72rem', flex: 1 }}
                      onClick={() => setHudAvance(-1)}
                    >
                      ▼ 100% REV
                    </button>
                  </div>
                </div>

                {/* Control de Inclinación IMU */}
                <div className="tactical-frame" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ fontFamily: 'var(--font-codigo)', fontSize: '0.75rem', color: 'var(--accent)' }}>
                    SIMULACIÓN DE TERRENO (IMU HORIZON)
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-codigo)', fontSize: '0.72rem', marginBottom: '4px' }}>
                      <span>CABECEO PITCH (INCLINACIÓN VERTICAL):</span>
                      <span style={{ color: 'var(--accent)' }}>{hudPitch}°</span>
                    </div>
                    <input 
                      type="range" min="-25" max="25" step="1"
                      value={hudPitch}
                      onChange={(e) => setHudPitch(parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--accent)' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-codigo)', fontSize: '0.72rem', marginBottom: '4px' }}>
                      <span>ALABEO ROLL (INCLINACIÓN LATERAL):</span>
                      <span style={{ color: 'var(--accent)' }}>{hudRoll}°</span>
                    </div>
                    <input 
                      type="range" min="-25" max="25" step="1"
                      value={hudRoll}
                      onChange={(e) => setHudRoll(parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--accent)' }}
                    />
                  </div>

                  <button 
                    className="tactical-btn tactical-btn--secondary" 
                    style={{ padding: '8px 16px', fontSize: '0.75rem' }}
                    onClick={() => { setHudPitch(0); setHudRoll(0); }}
                  >
                    <RotateCcw size={14} /> NIVELAR HORIZONTE (0°, 0°)
                  </button>
                </div>

                {/* Actuadores y Sensores de Enlace */}
                <div className="tactical-frame" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ fontFamily: 'var(--font-codigo)', fontSize: '0.75rem', color: 'var(--accent)' }}>
                    ACTUADORES Y ENLACE DE TELEOPERACIÓN
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    {[
                      { id: 'ArmFront', label: 'BRAZO FRONT (BF)' },
                      { id: 'ArmBack', label: 'BRAZO TRAS (BT)' },
                      { id: 'DrumFront', label: 'TAMBOR FRONT (TF)' },
                      { id: 'DrumBack', label: 'TAMBOR TRAS (TT)' },
                    ].map(({ id, label }) => {
                      const activo = actuadoresSimulados[id as keyof typeof actuadoresSimulados];
                      return (
                        <button
                          key={id}
                          className={`actuator-toggle-btn ${activo ? 'actuator-toggle-btn--active' : ''}`}
                          onClick={() => setActuadoresSimulados(prev => ({ ...prev, [id]: !prev[id as keyof typeof prev] }))}
                        >
                          <span>{label}</span>
                          <span>{activo ? 'ON' : 'OFF'}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Nivel de Batería */}
                  <div style={{ marginTop: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-codigo)', fontSize: '0.72rem', marginBottom: '4px' }}>
                      <span>NIVEL DE BATERÍA:</span>
                      <span style={{
                        color: bateriaSimulada <= 15 ? 'var(--error)' : bateriaSimulada <= 30 ? 'var(--warning)' : '#2ecc71'
                      }}>
                        {bateriaSimulada}% {bateriaSimulada <= 15 ? '(!CRÍTICA)' : ''}
                      </span>
                    </div>
                    <input 
                      type="range" min="5" max="100" step="1"
                      value={bateriaSimulada}
                      onChange={(e) => setBateriaSimulada(parseInt(e.target.value, 10))}
                      style={{ width: '100%', accentColor: bateriaSimulada <= 15 ? 'var(--error)' : 'var(--accent)' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 4: COMPARATIVA ANTES VS DESPUÉS                                   */}
        {/* ========================================================================= */}
        {tabActiva === 'comparativa' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <span style={{ fontFamily: 'var(--font-codigo)', fontSize: '0.75rem', color: 'var(--accent)', letterSpacing: 'var(--tracking-tech)' }}>
                ANÁLISIS TÉCNICO DE IDENTIDAD VISUAL
              </span>
              <h2 style={{ margin: '4px 0 0', fontFamily: 'var(--font-titulo)', fontSize: '2rem', color: 'var(--text)', letterSpacing: '0.04em' }}>
                COMPARATIVA DIRECTA: ANTES (PLANTILLA IA) VS DESPUÉS (GCS ROBÓTICA RUR)
              </h2>
            </div>

            <div className="comparativa-grid">
              {/* COLUMNA ANTES */}
              <div className="comparativa-col">
                <div className="comparativa-col__header comparativa-col__header--old">
                  <span>[ ANTES ] PLANTILLA IA / SAAS GENÉRICO</span>
                  <span>PROBLEMA</span>
                </div>

                <div style={{ 
                  background: '#0b1329', 
                  border: '1px solid rgba(255, 107, 107, 0.3)', 
                  borderRadius: '8px', 
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255, 107, 107, 0.15)', display: 'grid', placeItems: 'center' }}>
                    <Gamepad2 size={24} color="#ff6b6b" />
                  </div>
                  <h4 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>Modo Manual</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#9ca3af', lineHeight: 1.5 }}>
                    Controla el robot mediante teclado o control conectado.
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>En línea</span>
                  </div>
                  <button style={{ 
                    background: '#2563eb', 
                    color: '#fff', 
                    border: 'none', 
                    borderRadius: '6px', 
                    padding: '10px 16px', 
                    cursor: 'pointer',
                    marginTop: '8px'
                  }}>
                    Seleccionar plan
                  </button>
                </div>

                {/* Defectos identificados */}
                <div style={{ background: 'rgba(255, 107, 107, 0.05)', border: '1px solid rgba(255, 107, 107, 0.2)', padding: '16px', fontFamily: 'var(--font-codigo)', fontSize: '0.75rem', color: '#ff9999', lineHeight: 1.6 }}>
                  ❌ <strong>Bordes redondeados de 8px:</strong> Parece tarjeta de precios de un SaaS web.<br />
                  ❌ <strong>Animación de elevación <code>y: -4px</code>:</strong> Flotación de e-commerce desconectada de una cabina de control.<br />
                  ❌ <strong>Puntito redondo aislado:</strong> No transmite telemetría real ni datos de enlace.<br />
                  ❌ <strong>Icono genérico centrado:</strong> Desperdicia espacio sin aportar especificaciones técnicas.
                </div>
              </div>

              {/* COLUMNA DESPUÉS */}
              <div className="comparativa-col">
                <div className="comparativa-col__header comparativa-col__header--new">
                  <span>[ DESPUÉS ] GCS ROBÓTICA RUR</span>
                  <span>SOLUCIÓN</span>
                </div>

                {/* Alternativas de Título en Blanco */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--surface)', padding: '10px', border: '1px solid var(--border)' }}>
                  <span style={{ fontFamily: 'var(--font-codigo)', fontSize: '0.68rem', color: 'var(--accent)', letterSpacing: 'var(--tracking-tech)' }}>
                    ALTERNAR TÍTULO EN BLANCO:
                  </span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {(Object.keys(titulosManual) as Array<keyof typeof titulosManual>).map((key) => (
                      <button
                        key={key}
                        onClick={() => setOpcionTituloManual(key)}
                        className="tactical-btn"
                        style={{
                          padding: '4px 8px',
                          fontSize: '0.66rem',
                          background: opcionTituloManual === key ? 'var(--accent)' : 'transparent',
                          color: opcionTituloManual === key ? '#000' : 'var(--accent)',
                        }}
                      >
                        {titulosManual[key]} {opcionTituloManual === key ? '✓' : ''}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="tactical-frame" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="tactical-corner tactical-corner--tl" />
                  <div className="tactical-corner tactical-corner--tr" />
                  <div className="tactical-corner tactical-corner--bl" />
                  <div className="tactical-corner tactical-corner--br" />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="tactical-badge tactical-badge--accent">MANUAL</span>
                    <span className="tactical-badge tactical-badge--online">60 HZ P2P</span>
                  </div>

                  <h4 style={{ margin: 0, fontFamily: 'var(--font-titulo)', fontSize: '1.4rem', color: '#ffffff', letterSpacing: '0.04em' }}>
                    {titulosManual[opcionTituloManual]}
                  </h4>
                  
                  <div style={{ fontFamily: 'var(--font-codigo)', fontSize: '0.72rem', color: 'var(--muted)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <div>DISPOSITIVO: <code>GAMEPAD / QWERTY</code></div>
                    <div>LATENCIA: <code>&lt; 25 MS</code></div>
                    <div>ENLACE: <code>WEBRTC DATACHANNEL</code></div>
                    <div>RESOLUCIÓN: <code>1080P @ 60 FPS</code></div>
                  </div>

                  <button className="tactical-btn" style={{ width: '100%', marginTop: '8px' }}>
                    ACTIVAR PROTOCOLO DE TELEOPERACIÓN →
                  </button>
                </div>

                {/* Virtudes del nuevo diseño */}
                <div style={{ background: 'rgba(251, 202, 1, 0.05)', border: '1px solid rgba(251, 202, 1, 0.2)', padding: '16px', fontFamily: 'var(--font-codigo)', fontSize: '0.75rem', color: 'var(--accent)', lineHeight: 1.6 }}>
                  ✓ <strong>Marcos angulares tácticos <code>┌ ┐ └ ┘</code>:</strong> Se siente como instrumentación de teleoperación robótica de campo.<br />
                  ✓ <strong>Feedback lumínico sin flotar:</strong> Respuesta táctil mecánica e instantánea.<br />
                  ✓ <strong>Telemetría granular:</strong> Latencia, tasa de muestreo y estado del protocolo a la vista.<br />
                  ✓ <strong>Tipografía institucional:</strong> Bebas Neue para títulos + JetBrains Mono para telemetría.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
