import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, Eye, ShieldAlert, ArrowLeft } from 'lucide-react';
import { VideoViewer } from './VideoViewer';
import { BarraTelemetria } from './components/BarraTelemetria';
import { useLanguage } from '../lib/i18n';

/**
 * Espectador público de una unidad. Ruta: /espectador/:robotId
 *
 * Sin login: solo funciona con robots que un admin marcó como evento público
 * (is_public_event). El permiso de solo-lectura NO se decide aquí — el backend
 * firma el token con canPublish:false y canPublishData:false fijos, así que un
 * espectador no puede enviar nada al robot aunque manipule esta página. Este
 * componente únicamente se suscribe y pinta el video.
 */
export default function SpectatorApp() {
  const { t } = useLanguage();
  const { robotId } = useParams();
  const [robotName, setRobotName] = useState('');
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [room, setRoom] = useState(null);

  // La sala también se guarda en una ref para poder cerrarla al desmontar
  // aunque la conexión termine después: si el usuario se va mientras el
  // connect() sigue en vuelo, el estado ya no se actualiza y sin la ref la
  // sala quedaría abierta consumiendo ancho de banda contra LiveKit.
  const roomRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const conectar = async () => {
      try {
        // fetch normal y no apiFetch: este endpoint es público y no lleva
        // sesión ni token CSRF. Mandar credenciales aquí sería ruido.
        const res = await fetch('/api/livekit/public-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ robotId }),
        });
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success || !data.token) {
          if (!cancelled) {
            setError(data?.message || t('operador.espectador.sinTransmision'));
          }
          return;
        }
        if (cancelled) return;

        setRobotName(data.robotName || robotId);

        const { Room, RoomEvent, setLogLevel } = await import('livekit-client');
        // Ver la nota en ControllerApp.jsx: 'info' es demasiado verboso para
        // producción, 'warn' conserva lo que sí importa.
        setLogLevel('warn');
        const instancia = new Room();
        await instancia.connect(data.livekitUrl, data.token, { autoSubscribe: true });

        if (cancelled) {
          // Se desmontó mientras conectábamos: cerrar y no tocar el estado.
          instancia.disconnect();
          return;
        }

        instancia.on(RoomEvent.Disconnected, () => {
          setIsConnected(false);
          setRoom(null);
          roomRef.current = null;
        });

        roomRef.current = instancia;
        setRoom(instancia);
        setIsConnected(true);
      } catch (err) {
        console.error('Error al conectar con LiveKit:', err);
        if (!cancelled) setError(t('operador.espectador.errorConexion'));
      }
    };

    conectar();

    return () => {
      cancelled = true;
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, [robotId]);

  if (error) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', color: 'var(--error)' }}>
        <ShieldAlert size={64} style={{ marginBottom: '24px' }} />
        <h2 style={{ fontFamily: 'var(--font-ibm-mono)', textTransform: 'uppercase' }}>{t('operador.espectador.transmisionNoDisponible')}</h2>
        <p style={{ maxWidth: '480px', textAlign: 'center' }}>{error}</p>
        <Link to="/" style={{ marginTop: '20px', color: 'var(--accent)', textDecoration: 'none' }}>{t('operador.espectador.volverInicio')}</Link>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>

      {/* El cargador se mantiene hasta que hay video, no hasta que llega el
          token: entre una cosa y otra está el connect() a LiveKit, y sin esto
          se veía un hueco negro con el HUD encima. */}
      {!isConnected && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 999999, background: 'var(--background)' }}>
          <Loader2 className="animate-spin" size={64} color="var(--accent)" style={{ marginBottom: '24px' }} />
          <h2 style={{ fontFamily: 'var(--font-ibm-mono)', color: 'var(--accent)', margin: 0, letterSpacing: '0.2em' }}>
            {t('operador.espectador.modoEspectador')}
          </h2>
          <p style={{ fontFamily: 'var(--font-ibm-mono)', color: 'var(--muted)', marginTop: '8px' }}>
            {t('operador.espectador.conectandoCon')} {robotName || robotId}…
          </p>
        </div>
      )}

      <div style={{ opacity: isConnected ? 1 : 0, transition: 'opacity 0.5s ease-out', width: '100%', height: '100%' }}>
        <VideoViewer room={room} isConnected={isConnected} />
      </div>

      <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '12px', pointerEvents: 'none' }}>
        <Link to="/" style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: '8px', color: 'white', textDecoration: 'none', fontFamily: 'var(--font-ibm-mono)', textShadow: '1px 1px 2px rgba(0,0,0,0.8)', background: 'rgba(0,0,0,0.4)', padding: '8px 12px', borderRadius: '4px', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', width: 'fit-content', border: '1px solid rgba(255,255,255,0.1)' }}>
          <ArrowLeft size={16} /> {t('operador.espectador.salir')}
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.6)', padding: '12px 20px', borderRadius: '4px', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Eye size={24} color="var(--accent)" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-ibm-mono)', fontWeight: 'bold', fontSize: '1.2rem', letterSpacing: '0.05em' }}>{t('operador.espectador.modoEspectador')}</span>
            <span style={{ color: 'var(--bone)', fontFamily: 'var(--font-ibm-sans)', fontSize: '0.8rem' }}>{robotName || robotId} — {t('operador.espectador.soloLectura')}</span>
          </div>
        </div>
      </div>

      {/* Telemetría de lo que está haciendo el operador. Solo se pinta con la
          sala ya conectada: antes de eso no hay canal de datos que escuchar. */}
      {isConnected && <BarraTelemetria room={room} />}
    </div>
  );
}
