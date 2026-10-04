import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { VideoViewer } from './VideoViewer';

export default function RecorderApp() {
  const { robotId } = useParams();
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [room, setRoom] = useState(null);
  const [hlsUrl, setHlsUrl] = useState(null);

  const roomRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const conectar = async () => {
      try {
        const res = await fetch('/api/livekit/public-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ robotId, proposito: 'overlay' }),
        });
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success || !data.token) {
          if (!cancelled) setError(data?.message || 'Sin transmisión');
          return;
        }
        if (cancelled) return;

        if (data.hlsUrl) {
          setHlsUrl(data.hlsUrl);
          setIsConnected(true);
          return;
        }

        const { Room, RoomEvent, setLogLevel } = await import('livekit-client');
        setLogLevel('warn');
        const instancia = new Room();
        await instancia.connect(data.livekitUrl, data.token, { autoSubscribe: true });

        if (cancelled) {
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
        if (!cancelled) setError('Error de conexión');
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
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000', color: 'var(--error)' }}>
        <ShieldAlert size={64} style={{ marginBottom: '24px' }} />
        <h2 style={{ fontFamily: 'var(--font-titulo)', textTransform: 'uppercase' }}>Señal no disponible</h2>
        <p>{error}</p>
        <Link to="/" style={{ marginTop: '20px', color: 'var(--accent)', textDecoration: 'none' }}>Volver al inicio</Link>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative' }}>
      <VideoViewer room={room} isConnected={isConnected} hlsUrl={hlsUrl} />
      
      {/* Botón sutil para salir, invisible hasta pasar el mouse */}
      <Link 
        to="/" 
        style={{ 
          position: 'absolute', top: 20, left: 20, color: 'var(--muted)', 
          textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px',
          opacity: 0.1, transition: 'opacity 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.1'}
      >
        <ArrowLeft size={16} /> Salir del Grabador
      </Link>
    </div>
  );
}
