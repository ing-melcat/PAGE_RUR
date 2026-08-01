import { useState, useEffect, useCallback } from 'react';
import './App.css';
import { RotateCcw, RotateCw } from 'lucide-react';
import { Segment } from './Segment';
import { Cabezal } from './Cabezal';
import { VideoViewer } from './VideoViewer';
import { DataPacket_Kind } from 'livekit-client';
import { Login } from './Login';

import { ControlButton } from './components/ControlButton';
import { ControlGroup } from './components/ControlGroup';
import { Joystck } from './components/Joystck';
import { StatusHUD } from './components/StatusHUD';

const TOPIC = 'control';
const SERVER_URL = import.meta.env.VITE_LIVEKIT_URL || "wss://rur-livekit-server-8b010r3b.livekit.cloud";

export default function ControllerApp({ onBack, robot }) {
  const [isMobile] = useState(window.innerWidth <= 932);
  const [visible, setVisible] = useState(true);
  const [visible1, setVisible1] = useState(true); // Joystick visible by default
  const [visible2, setVisible2] = useState(false);
  const [error, setError] = useState(null);
  const [opcion, setOpcion] = useState('Set0');
  const [token, setToken] = useState("");
  const [connect, setConnect] = useState(false);
  const [isFetchingToken, setIsFetchingToken] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);

  const [room, setRoom] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRobotConnected, setIsRobotConnected] = useState(false);
  const [binPacket, setBinPacket] = useState(null);

  const [joystickSize, setJystickSize] = useState(136)
  const [sensitivity, setSensitivity] = useState(1.0)

  const [hasGamepad, setHasGamepad] = useState(false);
  const [gamepadStatus, setGamepadStatus] = useState("Iniciando Gamepad API...");
  const [forceMobileMode, setForceMobileMode] = useState(false);
  
  useEffect(() => {
    const handleGamepadConnected = (e) => {
      console.log("Gamepad connected:", e.gamepad.id);
      setHasGamepad(true);
      setGamepadStatus(`Conectado: ${e.gamepad.id}`);
    };
    const handleGamepadDisconnected = (e) => {
      console.log("Gamepad disconnected:", e.gamepad.id);
      setHasGamepad(false);
      setGamepadStatus("Desconectado. Esperando gamepad...");
    };

    window.addEventListener("gamepadconnected", handleGamepadConnected);
    window.addEventListener("gamepaddisconnected", handleGamepadDisconnected);

    // Initial check
    if (navigator.getGamepads) {
      const gamepads = navigator.getGamepads();
      let found = false;
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
          setHasGamepad(true);
          setGamepadStatus(`Conectado: ${gamepads[i].id}`);
          found = true;
          break;
        }
      }
      if (!found) {
        setGamepadStatus("API Ready. Esperando gamepad...");
      }
    } else {
      setGamepadStatus("Error: Gamepad API no soportada en este navegador.");
    }

    return () => {
      window.removeEventListener("gamepadconnected", handleGamepadConnected);
      window.removeEventListener("gamepaddisconnected", handleGamepadDisconnected);
    };
  }, []);

  const handleMove = useCallback((x, y) => {
    const deadZone = 0.05
    const applyDeadZone = (v) => Math.abs(v) < deadZone ? 0 : v

    const applySensivity = (value) => {
      const sign = Math.sign(value)
      const magnitude = Math.abs(value)
      return sign * Math.pow(magnitude, 1 / sensitivity)
    }

    const deadX = applySensivity(applyDeadZone(x))
    const deadY = applySensivity(applyDeadZone(y))

    const packet = new ArrayBuffer(12)
    const view = new DataView(packet)
    const timestamp = Math.floor(Date.now() / 1000)

    view.setUint32(0, timestamp, true)
    view.setFloat32(4, deadX, true)
    view.setFloat32(8, deadY, true)

    return new Uint8Array(packet)
  }, [sensitivity])

  useEffect(() => {
    if (opcion === 'Set1') {
      setVisible1(false);
      setVisible(true);
    } else if (opcion === 'Set2') {
      setVisible1(true);
      setVisible(false);
    }
  }, [opcion]);

  useEffect(() => {
    if (token !== '') {
      setVisible2(false);
      if (isMobile === true) {
        setVisible1(false);
        setVisible(true);
      } else {
        setVisible(true);
        setVisible1(true);
      }
    }
  }, [connect, token, isMobile]);

  const connectToLiveKit = useCallback(async (authToken, customUrl) => {
    try {
      const { Room, RoomEvent } = await import('livekit-client');
      const roomInstance = new Room();
      
      const serverUrl = customUrl || robot?.livekitUrl || import.meta.env.VITE_LIVEKIT_URL || "wss://rur-livekit-server-8b010r3b.livekit.cloud";
      
      await roomInstance.connect(serverUrl, authToken, {
        autoSubscribe: true
      });

      setIsConnected(true);
      setRoom(roomInstance);
      
      console.log("Connection established to", serverUrl);
      console.log("Current participants in room:", Array.from(roomInstance.participants.values()).map(p => p.identity));
      setIsRobotConnected(roomInstance.participants.size > 0);
      
      roomInstance.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log("NUEVO PARTICIPANTE CONECTADO:", participant.identity);
        setIsRobotConnected(roomInstance.participants.size > 0);
      });
      roomInstance.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log("PARTICIPANTE DESCONECTADO:", participant.identity);
        setIsRobotConnected(roomInstance.participants.size > 0);
      });
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('LiveKit connection error:', err);
      alert("Error crítico conectando al servidor LiveKit:\n" + err.message);
    }
  }, [robot]);

  // Fetch API token basado en el robot
  useEffect(() => {
    if (robot && !connect && !hasFetched) {
      setHasFetched(true);
      setIsFetchingToken(true);
      
      const fetchToken = async () => {
        try {
          const userToken = localStorage.getItem('authToken');
          const res = await fetch('/api/livekit-token', {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${userToken}`
            },
            body: JSON.stringify({ robotId: robot.id })
          });
          
          const data = await res.json();
          if (data.success && data.token) {
             setToken(data.token);
             setConnect(true);
             connectToLiveKit(data.token, data.livekitUrl);
          } else {
             setError(data.message || 'Error al obtener token de LiveKit');
             alert("Error de LiveKit: " + (data.message || 'Error al obtener token'));
             setVisible(true);
             setVisible1(true);
          }
        } catch (err) {
          console.error(err);
          setError("Error de red contactando al servidor");
          alert("Error crítico del servidor: " + err.message);
          setVisible(true);
          setVisible1(true);
        } finally {
          setIsFetchingToken(false);
        }
      };

      fetchToken();
    }
  }, [robot, connect, hasFetched, connectToLiveKit]);

  const disconnect = useCallback(() => {
    if (room) {
      room.disconnect();
      setRoom(null);
      setIsConnected(false);
      setConnect(false);
    }
  }, [room]);

  useEffect(() => {
    if (binPacket) {
      // Create a readable representation of the binary packet (Uint8Array)
      const packetArray = Array.from(binPacket);
      
      if (room && isConnected) {
        room.localParticipant.publishData(binPacket, {
          topic: TOPIC,
          kind: DataPacket_Kind.Lossy,
        });
        console.log(`[LIVEKIT] Sent data to robot:`, packetArray);
      } else {
        // En desarrollo local o sin conexión, simulamos el envío para probar controles
        console.log(`[LOCAL DEV MOCK] Simulando envío al robot:`, packetArray);
      }
    }
  }, [binPacket, room, isConnected]);

  return (
    <div className="App App-header">
      {isFetchingToken && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 999999, background: 'var(--background)' }}>
          <div className="loading-spinner" style={{ width: '64px', height: '64px', border: '4px solid var(--surface)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '24px' }} />
          <h2 style={{ fontFamily: 'var(--font-ibm-mono)', color: 'var(--accent)', margin: 0, letterSpacing: '0.2em' }}>
            ESTABLECIENDO ENLACE
          </h2>
          <p style={{ fontFamily: 'var(--font-ibm-mono)', color: 'var(--muted)', marginTop: '8px' }}>
            Obteniendo token seguro para la sala: {robot?.room}
          </p>
        </div>
      )}
      
      {/* 1. Fullscreen Video Background Component */}
      <div className="video-background-container" style={{ opacity: visible && !isFetchingToken ? '1' : '0', transition: 'opacity 0.5s ease-out' }}>
        <VideoViewer room={room}
          isConnected={isConnected} />
      </div>

      {/* Subtle Gamepad HUD Indicator */}
      <div style={{ position: 'absolute', top: '80px', left: '20px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '8px', textShadow: '1px 1px 2px rgba(0,0,0,0.8)', opacity: isFetchingToken ? 0 : 1, transition: 'opacity 0.5s' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: hasGamepad ? 'var(--success)' : 'var(--error)', boxShadow: `0 0 8px ${hasGamepad ? 'var(--success)' : 'var(--error)'}` }}></div>
            <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'var(--font-ibm-sans), Inter, sans-serif' }}>
              {hasGamepad ? 'Controller Connected' : 'Controller Offline'}
            </span>
          </div>
          <span style={{ color: '#b0b0b0', fontSize: '0.7rem', fontFamily: 'var(--font-ibm-mono), monospace', marginLeft: '16px' }}>
            {gamepadStatus}
          </span>
        </div>
        
        {hasGamepad && (
          <button 
            onClick={() => setForceMobileMode(!forceMobileMode)}
            style={{ 
              background: forceMobileMode ? 'var(--accent)' : 'rgba(0,0,0,0.5)', 
              color: forceMobileMode ? 'black' : 'var(--muted)', 
              border: `1px solid ${forceMobileMode ? 'var(--accent)' : 'var(--border)'}`, 
              padding: '6px 12px', 
              borderRadius: '4px', 
              fontFamily: 'var(--font-ibm-mono)', 
              fontSize: '0.7rem', 
              cursor: 'pointer',
              textTransform: 'uppercase',
              alignSelf: 'flex-start',
              marginLeft: '16px',
              transition: 'all 0.2s ease'
            }}
          >
            {forceMobileMode ? 'Volver a modo mando' : 'Forzar controles táctiles'}
          </button>
        )}
        
        {/* HUD DEBUG LOCAL */}
        <div style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid var(--accent)', padding: '8px', borderRadius: '4px', marginTop: '16px', color: 'var(--accent)', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.75rem', width: '300px', wordWrap: 'break-word', pointerEvents: 'none' }}>
          <strong style={{ color: '#fff' }}>📡 PAQUETE A ENVIAR (DEV):</strong><br/>
          {binPacket ? `[${Array.from(binPacket).join(', ')}]` : "Esperando control..."}
        </div>
      </div>
        {/* TOP NAVBAR (Cabezal) */}
        {robot && <Cabezal robot={robot} onBack={onBack} battery={100} latency={45} />}

        <div className="layout-grid">
          
        <div id="left-panel">
          <div className='arms' style={{ opacity: visible ? '1' : '0' }}>
            <Segment id="arms">
              <h3>Arms</h3>
              <div className="arm-controls">
                <ControlGroup 
                  title="Front" 
                  groupClass="arm-group" 
                  buttons={[
                    { label: "▲", onPress: () => handleAction('ArmFront', 'Up', true), onRelease: () => handleAction('ArmFront', 'Up', false) }, 
                    { label: "▼", onPress: () => handleAction('ArmFront', 'Down', true), onRelease: () => handleAction('ArmFront', 'Down', false) }
                  ]} 
                />
                <ControlGroup 
                  title="Back" 
                  groupClass="arm-group" 
                  buttons={[
                    { label: "▲", onPress: () => handleAction('ArmBack', 'Up', true), onRelease: () => handleAction('ArmBack', 'Up', false) }, 
                    { label: "▼", onPress: () => handleAction('ArmBack', 'Down', true), onRelease: () => handleAction('ArmBack', 'Down', false) }
                  ]} 
                />
              </div>
            </Segment>
          </div>

          <Segment id="joystick" style={{ display: visible1 ? 'flex' : 'none', height: Math.max(230, joystickSize + 80) }}>
            <h3>Joystick Control</h3>
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Joystck onMove={handleMove} onStop={handleMove} setBinPack={setBinPacket} size={joystickSize} />
            </div>
          </Segment>
        </div>

        <div id="right-panel">
          <div className='drums' style={{ opacity: visible ? '1' : '0' }}>
            <Segment id="drums">
              <h3>Drums</h3>
              <div className="drum-controls">
                <ControlGroup 
                  title="Front" 
                  groupClass="drum-group" 
                  buttons={[
                    { label: <RotateCcw size={24} />, onPress: () => handleAction('DrumFront', 'CCW', true), onRelease: () => handleAction('DrumFront', 'CCW', false) }, 
                    { label: <RotateCw size={24} />, onPress: () => handleAction('DrumFront', 'CW', true), onRelease: () => handleAction('DrumFront', 'CW', false) }
                  ]} 
                />
                <ControlGroup 
                  title="Back" 
                  groupClass="drum-group" 
                  buttons={[
                    { label: <RotateCcw size={24} />, onPress: () => handleAction('DrumBack', 'CCW', true), onRelease: () => handleAction('DrumBack', 'CCW', false) }, 
                    { label: <RotateCw size={24} />, onPress: () => handleAction('DrumBack', 'CW', true), onRelease: () => handleAction('DrumBack', 'CW', false) }
                  ]} 
                />
              </div>
            </Segment>
          </div>

          <StatusHUD isConnected={isRobotConnected} visible={visible1} height={Math.max(230, joystickSize + 80)} />
        </div>

        <div id="video-container">
          <Segment id="video-panel" style={{ height: '100%', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Cámara Principal</h3>
              <div className="status-indicator" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isConnected ? 'var(--success)' : 'var(--error)', boxShadow: `0 0 8px ${isConnected ? 'var(--success)' : 'var(--error)'}` }} />
                {isConnected ? 'TRANSMITIENDO' : 'DESCONECTADO'}
              </div>
            </div>
            <div style={{ height: 'calc(100% - 50px)', position: 'relative', background: '#000' }}>
              {room ? (
                <VideoViewer room={room} />
              ) : (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
                  {error ? error : "Esperando conexión..."}
                </div>
              )}
            </div>
          </Segment>
        </div>


        <div id="container-conf">
          <Segment id="config" style={{ opacity: visible2 ? '1' : '0', pointerEvents: visible2 ? 'auto' : 'none' }}>
            <h3>Settings</h3>
            {/* Aquí pasamos los setters a ConfigPanel para que modifique los estados locales */}
            <div style={{ display: "none" }}>
              <Login />
            </div>
            {isConnected ? (
              <>
                <p style={{ color: 'green' }}>Connected to TRINITY</p>
                <button onClick={disconnect} className="boton">
                  Disconnect
                </button>
              </>
            ) : (
              <>
                <p style={{ color: 'green' }}>Connected to TRINITY</p>
                <button onClick={disconnect} className="boton">
                  Disconnect
                </button>
              </>
            )}
          </Segment>
        </div>

        <div id="container">
          <Segment id="wheels" style={{ display: 'none' }}>
            <h3>Wheels</h3>
            <div className="control-grid">
              <ControlButton label="Forward" onPress={() => handleAction('Wheel', 'Forward', true)} onRelease={() => handleAction('Wheel', 'Forward', false)} />
              <ControlButton label="Left" onPress={() => handleAction('Wheel', 'Left', true)} onRelease={() => handleAction('Wheel', 'Left', false)} />
              <ControlButton label="Right" onPress={() => handleAction('Wheel', 'Right', true)} onRelease={() => handleAction('Wheel', 'Right', false)} />
              <ControlButton label="Backward" onPress={() => handleAction('Wheel', 'Backward', true)} onRelease={() => handleAction('Wheel', 'Backward', false)} />
            </div>
          </Segment>   </Segment>


        </div>

        <Segment id="login-conteiner">
          <Login id="login" />
        </Segment>
        </div>


      </div>
    </div>
  );
}