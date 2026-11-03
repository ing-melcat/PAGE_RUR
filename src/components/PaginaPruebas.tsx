import React, { useState, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Gamepad2, Glasses, Cpu, Activity, Terminal, ArrowRight, 
  Wifi, Battery, Sliders, Gauge, Compass, ShieldCheck, 
  AlertTriangle, CheckCircle2, ChevronRight, Play, RotateCcw
} from 'lucide-react';
import { Robot3DPreview } from '../controller/components/Robot3DPreview';
import { RassorEnVivo } from '../controller/components/RassorEnVivo';
import { ErrorBoundary } from './ErrorBoundary';
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
            <div>
              <span style={{ fontFamily: 'var(--font-codigo)', fontSize: '0.75rem', color: 'var(--accent)', letterSpacing: 'var(--tracking-tech)' }}>
                CONSOLAS DE VUELO GCS Y TELEPRESENCIA
              </span>
              <h2 style={{ margin: '4px 0 0', fontFamily: 'var(--font-titulo)', fontSize: '2rem', color: 'var(--text)', letterSpacing: '0.04em' }}>
                SELECTOR DE PROTOCOLO DE ENLACE
              </h2>
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
                  <span className="tactical-badge tactical-badge--accent">PROTOCOLO 01 // DIRECT LINK</span>
                  <Gamepad2 size={28} color="var(--accent)" />
                </div>

                <div>
                  <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--font-titulo)', fontSize: '1.8rem', color: 'var(--text)', letterSpacing: '0.04em' }}>
                    MODO CABINA GCS (CONTROL MANUAL)
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
                  <span className="tactical-badge tactical-badge--accent">PROTOCOLO 02 // WEBXR 6DOF</span>
                  <Glasses size={28} color="var(--accent)" />
                </div>

                <div>
                  <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--font-titulo)', fontSize: '1.8rem', color: 'var(--text)', letterSpacing: '0.04em' }}>
                    ENLACE HÁPTICO ESPACIAL (VR)
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
            <div>
              <span style={{ fontFamily: 'var(--font-codigo)', fontSize: '0.75rem', color: 'var(--accent)', letterSpacing: 'var(--tracking-tech)' }}>
                BISELES DE INSTRUMENTACIÓN AEROESPACIAL Y TELEMETRÍA CENITAL
              </span>
              <h2 style={{ margin: '4px 0 0', fontFamily: 'var(--font-titulo)', fontSize: '2rem', color: 'var(--text)', letterSpacing: '0.04em' }}>
                COCKPIT HUD Y BANCO DE CONTROL TÁCTICO
              </h2>
            </div>

            <div className="hud-simulation-panel">
              {/* VISTA DEL ROVER Y GUÍAS DE TRAYECTORIA CORREGIDAS */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                background: '#01050e', 
                border: '1px solid var(--border)',
                padding: '24px 16px',
                position: 'relative'
              }}>
                <div style={{ position: 'absolute', top: '12px', left: '16px', fontFamily: 'var(--font-codigo)', fontSize: '0.72rem', color: 'var(--accent)' }}>
                  RADAR CENITAL // ROVER RASSOR-01 [VISTA SUPERIOR CORREGIDA]
                </div>
                
                <div style={{ position: 'absolute', top: '12px', right: '16px', fontFamily: 'var(--font-codigo)', fontSize: '0.72rem', color: 'var(--muted)' }}>
                  PITCH: {hudPitch}° · ROLL: {hudRoll}°
                </div>

                {/* Lienzo 3D con RassorEnVivo */}
                <div style={{ margin: '20px 0' }}>
                  <ErrorBoundary fallback={
                    <div style={{ color: 'var(--muted)', fontFamily: 'var(--font-codigo)', fontSize: '0.75rem', padding: '24px' }}>
                      TELEMETRÍA 3D EN CARGA...
                    </div>
                  }>
                    <RassorEnVivo
                      avance={{ nivel: Math.abs(hudAvance) * 10, dir: hudAvance >= 0 ? 'adelante' : 'atras' }}
                      giro={{ nivel: Math.abs(hudGiro) * 10, dir: hudGiro >= 0 ? 'derecha' : 'izquierda' }}
                      imu={{ pitch: hudPitch, roll: hudRoll }}
                      escala={1.6}
                      modelUrl="/api/uploads/1792432091929-344939674-rassorbody_full.glb"
                    />
                  </ErrorBoundary>
                </div>

                <div style={{ fontFamily: 'var(--font-codigo)', fontSize: '0.72rem', color: 'var(--muted)', textAlign: 'center' }}>
                  Las líneas amarillas se curvan con el giro y avanzan con la velocidad. El modelo reposa plano sobre sus ruedas.
                </div>
              </div>

              {/* PANEL DE CONTROL INTERACTIVO */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                {/* Control de Movimiento */}
                <div className="tactical-frame" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ fontFamily: 'var(--font-codigo)', fontSize: '0.75rem', color: 'var(--accent)' }}>
                    PROPULSIÓN Y DIRECCIÓN
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-codigo)', fontSize: '0.72rem', marginBottom: '4px' }}>
                      <span>AVANCE (ACELERADOR):</span>
                      <span style={{ color: 'var(--accent)' }}>{Math.round(hudAvance * 100)}%</span>
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
                      <span>GIRO (DIRECCIÓN):</span>
                      <span style={{ color: 'var(--accent)' }}>{Math.round(hudGiro * 100)}%</span>
                    </div>
                    <input 
                      type="range" min="-1" max="1" step="0.05"
                      value={hudGiro}
                      onChange={(e) => setHudGiro(parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--accent)' }}
                    />
                  </div>

                  <button 
                    className="tactical-btn tactical-btn--secondary" 
                    style={{ padding: '8px 16px', fontSize: '0.75rem' }}
                    onClick={() => { setHudAvance(0); setHudGiro(0); }}
                  >
                    <RotateCcw size={14} /> CENTRAR MANDOS
                  </button>
                </div>

                {/* Control de Inclinación IMU */}
                <div className="tactical-frame" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ fontFamily: 'var(--font-codigo)', fontSize: '0.75rem', color: 'var(--accent)' }}>
                    SIMULACIÓN DE TERRENO (IMU)
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-codigo)', fontSize: '0.72rem', marginBottom: '4px' }}>
                      <span>INCLINACIÓN PITCH (CABECEO):</span>
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
                      <span>INCLINACIÓN ROLL (ALABEO):</span>
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
                    <RotateCcw size={14} /> NIVELAR HORIZONTE
                  </button>
                </div>

                {/* Graduación de Potencia de Actuadores */}
                <div className="tactical-frame" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ fontFamily: 'var(--font-codigo)', fontSize: '0.75rem', color: 'var(--accent)' }}>
                    POTENCIA DE ACTUADORES
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                    {[25, 50, 75, 100].map((nivel) => (
                      <button
                        key={nivel}
                        className={`tactical-btn ${potenciaActuadores === nivel ? '' : 'tactical-btn--secondary'}`}
                        style={{ padding: '8px 4px', fontSize: '0.75rem' }}
                        onClick={() => setPotenciaActuadores(nivel)}
                      >
                        {nivel}%
                      </button>
                    ))}
                  </div>

                  {/* Interruptores de instrumentación con LEDs */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                    <div 
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                      onClick={() => setSwitchLuces(!switchLuces)}
                    >
                      <span style={{ fontFamily: 'var(--font-codigo)', fontSize: '0.72rem' }}>FAROS AUXILIARES:</span>
                      <span className={`tactical-badge ${switchLuces ? 'tactical-badge--online' : 'tactical-badge--offline'}`}>
                        {switchLuces ? 'ENCENDIDO' : 'APAGADO'}
                      </span>
                    </div>

                    <div 
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                      onClick={() => setSwitchTelemetria(!switchTelemetria)}
                    >
                      <span style={{ fontFamily: 'var(--font-codigo)', fontSize: '0.72rem' }}>OVERLAY TELEMETRÍA:</span>
                      <span className={`tactical-badge ${switchTelemetria ? 'tactical-badge--online' : 'tactical-badge--offline'}`}>
                        {switchTelemetria ? 'ACTIVO' : 'OCULTO'}
                      </span>
                    </div>

                    <div 
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                      onClick={() => setSwitchAlarma(!switchAlarma)}
                    >
                      <span style={{ fontFamily: 'var(--font-codigo)', fontSize: '0.72rem' }}>ALARMA DE VUELCO:</span>
                      <span className={`tactical-badge ${switchAlarma ? 'tactical-badge--accent' : 'tactical-badge--online'}`}>
                        {switchAlarma ? 'ALERTA' : 'NORMAL'}
                      </span>
                    </div>
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
                COMPARATIVA DIRECTA: ANTES (PLANTILLA IA) VS DESPUÉS (GCS AEROESPACIAL)
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
                  <span>[ DESPUÉS ] GCS AEROESPACIAL RUR</span>
                  <span>SOLUCIÓN</span>
                </div>

                <div className="tactical-frame" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="tactical-corner tactical-corner--tl" />
                  <div className="tactical-corner tactical-corner--tr" />
                  <div className="tactical-corner tactical-corner--bl" />
                  <div className="tactical-corner tactical-corner--br" />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="tactical-badge tactical-badge--accent">PROTOCOLO 01 // GCS CABIN</span>
                    <span className="tactical-badge tactical-badge--online">60 HZ P2P</span>
                  </div>

                  <h4 style={{ margin: 0, fontFamily: 'var(--font-titulo)', fontSize: '1.4rem', color: 'var(--text)', letterSpacing: '0.04em' }}>
                    CABINA GCS // MODO MANUAL
                  </h4>
                  
                  <div style={{ fontFamily: 'var(--font-codigo)', fontSize: '0.72rem', color: 'var(--muted)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <div>DISPOSITIVO: <code>GAMEPAD / QWERTY</code></div>
                    <div>LATENCIA: <code>&lt; 25 MS</code></div>
                    <div>ENLACE: <code>WEBRTC DATACHANNEL</code></div>
                    <div>RESOLUCIÓN: <code>1080P @ 60 FPS</code></div>
                  </div>

                  <button className="tactical-btn" style={{ width: '100%', marginTop: '8px' }}>
                    ACTIVAR PROTOCOLO DE VUELO →
                  </button>
                </div>

                {/* Virtudes del nuevo diseño */}
                <div style={{ background: 'rgba(251, 202, 1, 0.05)', border: '1px solid rgba(251, 202, 1, 0.2)', padding: '16px', fontFamily: 'var(--font-codigo)', fontSize: '0.75rem', color: 'var(--accent)', lineHeight: 1.6 }}>
                  ✓ <strong>Marcos angulares tácticos <code>┌ ┐ └ ┘</code>:</strong> Se siente como instrumentación aeroespacial real de la NASA.<br />
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
