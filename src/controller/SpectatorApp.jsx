import { Suspense, useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Loader2, Eye, ShieldAlert, ArrowLeft } from 'lucide-react';
import { VideoViewer } from './VideoViewer';
import { HudEspectador } from './components/HudEspectador';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useLanguage } from '../lib/i18n';
import './Espectador.css';

// Mismo patrón que ComingSoon/NotFound (App.tsx, components/NotFound.tsx):
// lazyConRecarga y no React.lazy a secas, para recuperarse solo si el
// navegador tiene en caché un index.html viejo que pide un chunk de una
// release ya rotada.
import { lazyConRecarga } from '../lib/lazyConRecarga';
const VisorModelo3D = lazyConRecarga(() => import('../VisorModelo3D'));

const dosDigitos = (n) => String(n).padStart(2, '0');

function SpectatorTimer({ mission, playingDate }) {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    if (playingDate) return;
    const id = setInterval(() => setAhora(Date.now()), 500);
    return () => clearInterval(id);
  }, [playingDate]);

  const startedAt = mission?.started_at;

  if (!startedAt) {
    return <span>T- <span style={{ color: 'var(--muted)' }}>--:--:--</span></span>;
  }

  const currentNow = playingDate ? playingDate.getTime() : ahora;
  const s = Math.max(0, Math.floor((currentNow - startedAt) / 1000));
  return (
    <span>
      T+ {dosDigitos(Math.floor(s / 3600))}:{dosDigitos(Math.floor(s / 60) % 60)}:{dosDigitos(s % 60)}
    </span>
  );
}

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
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);
  // ?demo=1 simula los sensores del robot para poder ver el comportamiento de
  // los instrumentos sin hardware (ver docs/TELEMETRIA_ROBOT.md §8).
  const [searchParams] = useSearchParams();
  const simular = searchParams.get('demo') === '1';
  const [robotName, setRobotName] = useState('');
  // El mismo modelo que se sube en Administración de Robots -- ver el
  // comentario junto a VisorModelo3D más abajo para dónde se pinta.
  const [robotModelUrl, setRobotModelUrl] = useState('');
  const [hlsUrl, setHlsUrl] = useState(null);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [mission, setMission] = useState(null);
  const [playingDate, setPlayingDate] = useState(null);
  // La conexión puede resolverse en 200 ms, y entonces la portada aparece y
  // desaparece de un tirón mientras el vídeo y el HUD todavía se están
  // montando: se ve como un fallo, no como una carga. Con un mínimo en
  // pantalla, la entrada siempre se lee como una transición deliberada.
  //
  // Es la misma idea que el "mínimo en pantalla" de un rótulo de televisión:
  // más vale medio segundo de más que un parpadeo.
  const [esperaMinima, setEsperaMinima] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setEsperaMinima(true), 250);
    return () => clearTimeout(id);
  }, []);
  const listo = isConnected && esperaMinima;

  // La portada se desmonta 400 ms después de estar todo listo: ese margen es
  // el que dura su desvanecido. Sin él, el elemento desaparecería del DOM
  // antes de poder animarse y el cambio se vería como un corte.
  const [montarPortada, setMontarPortada] = useState(true);
  useEffect(() => {
    if (!listo) return;
    const id = setTimeout(() => setMontarPortada(false), 400);
    return () => clearTimeout(id);
  }, [listo]);
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
        setRobotModelUrl(data.modelUrl || '');
        if (data.mission) setMission(data.mission);

        if (data.hlsUrl) {
          // Si el backend provee HLS, no nos conectamos a WebRTC.
          setHlsUrl(data.hlsUrl);
          setIsConnected(true);
          return;
        }

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
        <h2 style={{ fontFamily: 'var(--font-titulo)', textTransform: 'uppercase' }}>{t('operador.espectador.transmisionNoDisponible')}</h2>
        <p style={{ maxWidth: '480px', textAlign: 'center' }}>{error}</p>
        <Link to="/" style={{ marginTop: '20px', color: 'var(--accent)', textDecoration: 'none' }}>{t('operador.espectador.volverInicio')}</Link>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>

      {/* Portada de carga.

          Se mantiene hasta que hay vídeo, no hasta que llega el token: entre
          una cosa y otra está el connect() a LiveKit, y sin esto se veía un
          hueco negro con el HUD encima.

          Sigue montada un instante DESPUÉS de estar lista, para poder
          desvanecerse: si se desmontara al momento, el corte sería seco. Sale
          en 400 ms, más rápido de lo que entró — en directo, un rótulo que se
          demora al irse hace parecer que la señal va lenta. */}
      {montarPortada && (
        <div className={`espectador__portada${listo ? ' espectador__portada--saliendo' : ''}`}>
          {/* El mismo modelo que se sube en Administración de Robots, de
              fondo mientras se conecta -- antes la portada era solo texto,
              sin ninguna seña de qué unidad es. z-index:-1 y no el orden del
              DOM: dentro de un contenedor normal (sin ancestro con filter ni
              portal de por medio, a diferencia del caso de las
              publicaciones) un hijo con z-index negativo pinta por encima
              del fondo propio del contenedor pero por debajo de sus
              hermanos sin posicionar -- justo donde tiene que quedar. Si no
              hay modelo asignado, no se pinta nada: la portada se queda
              como estaba. */}
          {robotModelUrl && (
            <div style={{ position: 'absolute', inset: 0, zIndex: -1, opacity: 0.35, pointerEvents: 'none' }}>
              <ErrorBoundary fallback={null}>
                <Suspense fallback={null}>
                  <VisorModelo3D url={robotModelUrl} variante="publicacion" />
                </Suspense>
              </ErrorBoundary>
            </div>
          )}

          <div className="espectador__marca-carga">
            <Eye size={15} />
            <span>{t('operador.espectador.modoEspectador')}</span>
          </div>

          {/* Barra indeterminada en vez de un disco girando: ocupa poco, no
              tiene centro que llame la atención y encaja con el lenguaje de
              líneas del resto de la interfaz. */}
          <div className="espectador__barra"><span /></div>

          <p className="espectador__unidad">{robotName || robotId}</p>
        </div>
      )}

      <div style={{ opacity: listo ? 1 : 0, transition: 'opacity 0.6s ease-out', width: '100%', height: '100%' }}>
        <VideoViewer room={room} isConnected={isConnected} hlsUrl={hlsUrl} onPlayingDateChange={setPlayingDate} />
      </div>

      {/* Identificación de la vista.

          Era un cartel con recuadro, icono ámbar y el nombre en grande: en una
          pantalla que es sobre todo vídeo, ese peso compite con la imagen y
          delata la interfaz. Aquí basta con decir quién eres y de qué unidad,
          en el tono de un rótulo de esquina — se lee cuando se busca y
          desaparece cuando no. */}
      <div className="espectador__marca" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Link to="/" className="espectador__salir">
          <ArrowLeft size={14} /> {t('operador.espectador.salir')}
        </Link>
        <span className="espectador__sep">·</span>
        <Eye size={13} />
        <span>MODO ESPECTADOR</span>
      </div>

      <img 
        src="/logo-wordmark.png" 
        alt="RUR Logo"
        style={{
            position: 'absolute',
            right: '40px',
            top: '25px',
            height: '24px',
            opacity: 0.3,
            filter: 'invert(1)',
            pointerEvents: 'none',
            zIndex: 100
        }}
      />

      <div style={{
        position: 'absolute',
        right: '40px',
        top: '65px',
        zIndex: 100,
        fontFamily: 'var(--font-ibm-mono), monospace',
        color: 'var(--accent)',
        fontSize: '1.2rem',
        textShadow: '0 2px 4px rgba(0,0,0,0.8)'
      }}>
        <SpectatorTimer mission={mission} playingDate={playingDate} />
      </div>

      {/* Telemetría de lo que está haciendo el operador, con el lenguaje de
          una retransmisión de lanzamiento. Solo se pinta con la sala ya
          conectada: antes de eso no hay canal de datos que escuchar. */}
      {listo && <HudEspectador room={room} titulo={robotName || robotId} simular={simular} modelUrl={robotModelUrl} missionHls={mission} playingDate={playingDate} />}
    </div>
  );
}
