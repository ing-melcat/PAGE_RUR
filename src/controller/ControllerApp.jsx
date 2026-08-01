import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [visible1, setVisible1] = useState(true);
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

  // Refs para el envío continuo del joystick (dead-man's switch)
  const joystickPosRef = useRef({ x: 0, y: 0 });
  const sendIntervalRef = useRef(null);

  const [joystickSize, setJystickSize] = useState(136)
  const [sensitivity, setSensitivity] = useState(1.0)

  const [hasGamepad, setHasGamepad] = useState(false);
  const [gamepadStatus, setGamepadStatus] = useState("Iniciando Gamepad API...");
  const [forceMobileMode, setForceMobileMode] = useState(false);
  
  const gamepadStateRef = useRef({ x: 0, y: 0, buttons: {} });
  const roomRef = useRef(null);
  const isConnectedRef = useRef(false);



  // Ref para intervalos de botones mantenidos presionados
  const buttonIntervalsRef = useRef({});

  const handleAction = useCallback((component, action, state) => {
    if (!roomRef.current || !isConnectedRef.current) return;
    const commandObj = { component, action, state };
    const commandStr = JSON.stringify(commandObj);
    const encoder = new TextEncoder();
    const data = encoder.encode(commandStr);

    const sendCommand = () => {
      try {
        roomRef.current.localParticipant.publishData(data, {
          topic: TOPIC,
          kind: DataPacket_Kind.RELIABLE,
        });
      } catch (err) {
        console.error('Error sending command:', err);
      }
    };

    const key = `${component}-${action}`;

    if (state) {
      // Enviar inmediatamente + iniciar envío continuo cada 100ms
      sendCommand();
      console.log('Sent command (START):', commandStr);
      if (!buttonIntervalsRef.current[key]) {
        buttonIntervalsRef.current[key] = setInterval(sendCommand, 100);
      }
    } else {
      // Detener envío continuo + enviar comando de stop
      if (buttonIntervalsRef.current[key]) {
        clearInterval(buttonIntervalsRef.current[key]);
        delete buttonIntervalsRef.current[key];
      }
      sendCommand();
      console.log('Sent command (STOP):', commandStr);
    }
  }, []);

  // Construye un paquete binario con la posición actual
  const buildPacket = useCallback((deadX, deadY) => {
    const packet = new ArrayBuffer(12)
    const view = new DataView(packet)
    const timestamp = Math.floor(Date.now() / 1000)
    view.setUint32(0, timestamp, true)
    view.setFloat32(4, deadX, true)
    view.setFloat32(8, deadY, true)
    return new Uint8Array(packet)
  }, [])

  // Envía un paquete directamente por LiveKit
  const sendPacketNow = useCallback((pkt) => {
    if (roomRef.current && isConnectedRef.current && pkt) {
      try {
        roomRef.current.localParticipant.publishData(pkt, {
          topic: TOPIC,
          kind: DataPacket_Kind.Lossy,
        });
      } catch (err) {
        console.error('Error sending joystick data:', err);
      }
    }
  }, [])

  // Inicia el loop continuo de envío (10 Hz = cada 100ms)
  const startContinuousSend = useCallback(() => {
    if (sendIntervalRef.current) return; // ya está corriendo
    sendIntervalRef.current = setInterval(() => {
      const { x, y } = joystickPosRef.current;
      const pkt = buildPacket(x, y);
      sendPacketNow(pkt);
    }, 100); // 10 paquetes por segundo
  }, [buildPacket, sendPacketNow])

  // Detiene el loop y envía un último paquete de stop (0,0)
  const stopContinuousSend = useCallback(() => {
    if (sendIntervalRef.current) {
      clearInterval(sendIntervalRef.current);
      sendIntervalRef.current = null;
    }
    // Enviar paquete final de frenado
    const stopPkt = buildPacket(0, 0);
    sendPacketNow(stopPkt);
  }, [buildPacket, sendPacketNow])

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

    // Guardar posición actual en el ref
    joystickPosRef.current = { x: deadX, y: deadY };

    // Si hay movimiento, iniciar envío continuo; si es (0,0), frenar
    if (Math.abs(deadX) > 0 || Math.abs(deadY) > 0) {
      startContinuousSend();
    } else {
      stopContinuousSend();
    }

    // También devolver el paquete para el setBinPack del Joystick component
    return buildPacket(deadX, deadY)
  }, [sensitivity, buildPacket, startContinuousSend, stopContinuousSend])

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

    let animationFrameId;
    const pollGamepad = () => {
      if (navigator.getGamepads) {
        const gamepads = navigator.getGamepads();
        for (let i = 0; i < gamepads.length; i++) {
          const gp = gamepads[i];
          if (gp) {
            const deadZone = 0.15;
            let lx = gp.axes[0] || 0;
            let ly = gp.axes[1] || 0;
            if (Math.abs(lx) < deadZone) lx = 0;
            if (Math.abs(ly) < deadZone) ly = 0;

            const x = lx * 100;
            const y = -ly * 100;

            if (x !== gamepadStateRef.current.x || y !== gamepadStateRef.current.y) {
              if (!hasGamepad && (Math.abs(x) > 0 || Math.abs(y) > 0)) {
                setHasGamepad(true);
                setGamepadStatus("Mando detectado. Controles táctiles ocultos.");
              }
              handleMove(x, y);
              gamepadStateRef.current.x = x;
              gamepadStateRef.current.y = y;
            }

            const checkButton = (index, component, action, stateVal) => {
              const pressed = gp.buttons[index]?.pressed;
              const wasPressed = gamepadStateRef.current.buttons[index];
              if (pressed && !wasPressed) {
                if (!hasGamepad) {
                  setHasGamepad(true);
                  setGamepadStatus("Mando detectado. Controles táctiles ocultos.");
                }
                handleAction(component, action, stateVal);
                gamepadStateRef.current.buttons[index] = true;
              } else if (!pressed && wasPressed) {
                handleAction(component, 'stop', 0);
                gamepadStateRef.current.buttons[index] = false;
              }
            };

            checkButton(12, 'arm', 'up', 1);
            checkButton(13, 'arm', 'down', -1);
            checkButton(14, 'drum', 'up', 1);
            checkButton(15, 'drum', 'down', -1);
            checkButton(4, 'drum', 'collect', 1);
            checkButton(5, 'drum', 'dump', -1);
          }
        }
      }
      animationFrameId = requestAnimationFrame(pollGamepad);
    };

    animationFrameId = requestAnimationFrame(pollGamepad);

    const handleAnyKeyDown = (e) => {
      const activeKeys = ['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','q','e','o','p'];
      if (activeKeys.includes(e.key.toLowerCase())) {
        if (!hasGamepad) {
          setHasGamepad(true);
          setGamepadStatus("Teclado detectado. Controles táctiles ocultos.");
        }
      }
    };
    window.addEventListener("keydown", handleAnyKeyDown);

    return () => {
      window.removeEventListener("gamepadconnected", handleGamepadConnected);
      window.removeEventListener("gamepaddisconnected", handleGamepadDisconnected);
      window.removeEventListener("keydown", handleAnyKeyDown);
      cancelAnimationFrame(animationFrameId);
    };
  }, [hasGamepad, handleMove, handleAction]);

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
      setVisible1(true);
      setVisible(true);
    }
  }, [connect, token]);

  const connectToLiveKit = useCallback(async (authToken, customUrl) => {
    if (!authToken) {
      setError('Please provide a token');
      return;
    }

    try {
      const { Room, RoomEvent } = await import('livekit-client');
      const roomInstance = new Room();
      const finalUrl = customUrl || SERVER_URL;

      await roomInstance.connect(finalUrl, authToken, {
        autoSubscribe: true
      });

      setIsConnected(true);
      isConnectedRef.current = true;
      setRoom(roomInstance);
      roomRef.current = roomInstance;
      
      console.log("Connection established to", finalUrl);
      console.log("Current remote participants in room:", Array.from(roomInstance.remoteParticipants.values()).map(p => p.identity));
      setIsRobotConnected(roomInstance.remoteParticipants.size > 0);
      
      roomInstance.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log("NUEVO PARTICIPANTE CONECTADO:", participant.identity);
        setIsRobotConnected(roomInstance.remoteParticipants.size > 0);
      });
      roomInstance.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log("PARTICIPANTE DESCONECTADO:", participant.identity);
        setIsRobotConnected(roomInstance.remoteParticipants.size > 0);
      });
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('LiveKit connection error:', err);
    }
  }, []);

  // Fetch API token basado en la room del robot
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
             setError(data.message || 'Error generating LiveKit token');
          }
        } catch (err) {
          console.error(err);
        } finally {
          setIsFetchingToken(false);
        }
      };

      fetchToken();
    }
  }, [robot, connect, hasFetched, connectToLiveKit]);

  const disconnect = useCallback(() => {
    if (room) {
      stopContinuousSend();
      room.disconnect();
      setRoom(null);
      roomRef.current = null;
      setIsConnected(false);
      isConnectedRef.current = false;
      setConnect(false);
    }
  }, [room, stopContinuousSend]);

  // Limpiar el intervalo al desmontar el componente
  useEffect(() => {
    return () => {
      if (sendIntervalRef.current) {
        clearInterval(sendIntervalRef.current);
        sendIntervalRef.current = null;
      }
    };
  }, []);

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '16px' }}>
            <span style={{ color: '#b0b0b0', fontSize: '0.7rem', fontFamily: 'var(--font-ibm-mono), monospace' }}>
              {gamepadStatus}
            </span>
            <button 
              onClick={() => {
                setHasGamepad(false);
                setGamepadStatus("Reseteado. Modo manual activo.");
                setForceMobileMode(false);
                setVisible(true);
                setVisible1(true);
              }}
              style={{
                background: 'transparent',
                color: 'var(--accent)',
                border: '1px solid var(--accent)',
                padding: '2px 8px',
                borderRadius: '4px',
                fontFamily: 'var(--font-ibm-mono)',
                fontSize: '0.65rem',
                cursor: 'pointer',
                textTransform: 'uppercase',
                opacity: 0.6,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => e.target.style.opacity = 1}
              onMouseLeave={(e) => e.target.style.opacity = 0.6}
              title="Reiniciar detector en caso de falsa detección"
            >
              Reset
            </button>
          </div>
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
      </div>

      {/* 2. Interactive Controls Layered On Top */}
      <div className="controls-overlay" style={{ pointerEvents: (hasGamepad && !forceMobileMode) || isFetchingToken ? 'none' : 'auto' }}>
        <div style={{ opacity: (hasGamepad && !forceMobileMode) || isFetchingToken ? 0 : 1, visibility: (hasGamepad && !forceMobileMode) || isFetchingToken ? 'hidden' : 'visible', transition: 'all 0.5s ease-out', width: '100%', height: '100%' }}>
        <div id="left-panel">
          <div className='arms' style={{ opacity: visible ? '1' : '0' }}>
            <Segment id="arms">
              <h3>Arms</h3>
              <div className="arm-controls">
                <ControlGroup 
                  title="Front" 
                  groupClass="arm-group" 
                  buttons={[{ label: "▲", onPress: () => handleAction('ArmFront', 'Up', true), onRelease: () => handleAction('ArmFront', 'Up', false) }, { label: "▼", onPress: () => handleAction('ArmFront', 'Down', true), onRelease: () => handleAction('ArmFront', 'Down', false) }]} 
                />
                <ControlGroup 
                  title="Back" 
                  groupClass="arm-group" 
                  buttons={[{ label: "▲", onPress: () => handleAction('ArmBack', 'Up', true), onRelease: () => handleAction('ArmBack', 'Up', false) }, { label: "▼", onPress: () => handleAction('ArmBack', 'Down', true), onRelease: () => handleAction('ArmBack', 'Down', false) }]} 
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
                  buttons={[{ label: <RotateCcw size={24} />, onPress: () => handleAction('DrumFront', 'Ccw', true), onRelease: () => handleAction('DrumFront', 'Ccw', false) }, { label: <RotateCw size={24} />, onPress: () => handleAction('DrumFront', 'Cw', true), onRelease: () => handleAction('DrumFront', 'Cw', false) }]} 
                />
                <ControlGroup 
                  title="Back" 
                  groupClass="drum-group" 
                  buttons={[{ label: <RotateCcw size={24} />, onPress: () => handleAction('DrumBack', 'Ccw', true), onRelease: () => handleAction('DrumBack', 'Ccw', false) }, { label: <RotateCw size={24} />, onPress: () => handleAction('DrumBack', 'Cw', true), onRelease: () => handleAction('DrumBack', 'Cw', false) }]} 
                />
              </div>
            </Segment>
          </div>

          <StatusHUD isConnected={isRobotConnected} visible={visible1} height={Math.max(230, joystickSize + 80)} />
        </div>


        </div>

        <Cabezal 
          onCambio={setOpcion} 
          onConfigApply={({ size, sensitivity: newSensitivity }) => {
            setJystickSize(size)
            setSensitivity(newSensitivity)
          }}
          onBack={onBack}
        />

      <div style={{ position: 'relative', zIndex: 110, opacity: hasGamepad ? 0 : 1, visibility: hasGamepad ? 'hidden' : 'visible', transition: 'all 0.5s ease-out', pointerEvents: 'none' }}>
        <div id='liveconn' style={{ pointerEvents: visible2 ? 'auto' : 'none' }}>
          <Segment id="connection" style={{ opacity: visible2 ? '1' : '0', pointerEvents: visible2 ? 'auto' : 'none' }}>
            <h3>LiveKit Connection</h3>
            {!isConnected ? (
              <>
                <input
                  type="text"
                  placeholder="Enter LiveKit token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="styled-input"
                />
                <button onClick={() => { connectToLiveKit(token); setConnect(true); }} className="boton">
                  Connect
                </button>
                {error && <p style={{ color: 'red' }}>{error}</p>}
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
          </Segment>


        </div>

        <Segment id="login-conteiner">
          <Login id="login" />
        </Segment>
        </div>


      </div>
    </div>
  );
}