import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { useLiveKitVideoTrack } from './useLiveKitVideoTrack';

export function VideoViewer({ room, isConnected, hlsUrl, onPlayingDateChange }) {
  const { videoRef: webrtcVideoRef, hasVideo: hasWebrtcVideo } = useLiveKitVideoTrack(room, isConnected);
  const hlsVideoRef = useRef(null);
  const [hasHlsVideo, setHasHlsVideo] = useState(false);

  useEffect(() => {
    if (!hlsUrl || !hlsVideoRef.current) {
      setHasHlsVideo(false);
      return;
    }

    const video = hlsVideoRef.current;
    let hls = null;
    let intervalId = null;

    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: false });
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setHasHlsVideo(true);
        video.play().catch(e => console.warn('HLS autoplay error:', e));
        if (onPlayingDateChange) {
          intervalId = setInterval(() => {
            if (hls.playingDate) {
              onPlayingDateChange(hls.playingDate);
            }
          }, 500);
        }
      });
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          setHasHlsVideo(false);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // For Safari native HLS
      video.src = hlsUrl;
      video.addEventListener('loadedmetadata', () => {
        setHasHlsVideo(true);
        video.play().catch(e => console.warn('Native HLS autoplay error:', e));
      });
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (hls) {
        hls.destroy();
      }
    };
  }, [hlsUrl, onPlayingDateChange]);

  // showVideo SOLO depende de si realmente hay un video de LiveKit o HLS.
  // Ignoramos "isRobotConnected" porque a veces el robot manda video antes
  // de conectarse formalmente a datos, o viceversa, lo que queremos es
  // saber si la imagen real está presente.
  const isHlsMode = Boolean(hlsUrl);
  const showVideo = isHlsMode ? hasHlsVideo : (isConnected && hasWebrtcVideo);
  
  // Decide which ref to use based on mode
  const activeVideoRef = isHlsMode ? hlsVideoRef : webrtcVideoRef;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#000',
        overflow: 'hidden',
        zIndex: 0 // Behind everything else
      }}
    >
      <video
        ref={activeVideoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: showVideo ? 'block' : 'none'
        }}
      />
      {!showVideo && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
        >
          {/* Retícula óptica y marcas de cuadrícula de aviónica */}
          <div style={{
            position: 'absolute',
            inset: '40px',
            border: '1px solid rgba(245, 243, 233, 0.05)',
            pointerEvents: 'none',
          }}>
            {/* Esquinas tácticas del visor */}
            <div style={{ position: 'absolute', top: -1, left: -1, width: 12, height: 12, borderTop: '2px solid rgba(251, 202, 1, 0.4)', borderLeft: '2px solid rgba(251, 202, 1, 0.4)' }} />
            <div style={{ position: 'absolute', top: -1, right: -1, width: 12, height: 12, borderTop: '2px solid rgba(251, 202, 1, 0.4)', borderRight: '2px solid rgba(251, 202, 1, 0.4)' }} />
            <div style={{ position: 'absolute', bottom: -1, left: -1, width: 12, height: 12, borderBottom: '2px solid rgba(251, 202, 1, 0.4)', borderLeft: '2px solid rgba(251, 202, 1, 0.4)' }} />
            <div style={{ position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, borderBottom: '2px solid rgba(251, 202, 1, 0.4)', borderRight: '2px solid rgba(251, 202, 1, 0.4)' }} />

            {/* Marcadores de calibración en los bordes */}
            <div style={{ position: 'absolute', top: 8, left: 12, fontFamily: 'var(--font-codigo)', fontSize: '0.65rem', color: 'rgba(251, 202, 1, 0.45)', letterSpacing: '0.15em' }}>
              CAM // PRIMARY PAYLOAD SENSOR [OPTICAL 1080P]
            </div>
            <div style={{ position: 'absolute', top: 8, right: 12, fontFamily: 'var(--font-codigo)', fontSize: '0.65rem', color: 'rgba(245, 243, 233, 0.25)', letterSpacing: '0.15em' }}>
              FOV: 90° · AZ: 000.0° · EL: +00.0°
            </div>
            <div style={{ position: 'absolute', bottom: 8, left: 12, fontFamily: 'var(--font-codigo)', fontSize: '0.65rem', color: 'rgba(245, 243, 233, 0.25)', letterSpacing: '0.15em' }}>
              RES: 1920×1080 @ 60FPS · CODEC: H.264
            </div>
          </div>

          {/* Mira central de orientación con telemetría */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px',
              padding: '20px 32px',
              background: 'rgba(5, 16, 37, 0.65)',
              border: '1px solid rgba(245, 243, 233, 0.12)',
              borderRadius: '2px',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            <div style={{ position: 'absolute', top: -1, left: -1, width: 6, height: 6, borderTop: '2px solid var(--accent)', borderLeft: '2px solid var(--accent)' }} />
            <div style={{ position: 'absolute', top: -1, right: -1, width: 6, height: 6, borderTop: '2px solid var(--accent)', borderRight: '2px solid var(--accent)' }} />
            <div style={{ position: 'absolute', bottom: -1, left: -1, width: 6, height: 6, borderBottom: '2px solid var(--accent)', borderLeft: '2px solid var(--accent)' }} />
            <div style={{ position: 'absolute', bottom: -1, right: -1, width: 6, height: 6, borderBottom: '2px solid var(--accent)', borderRight: '2px solid var(--accent)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--warning)', boxShadow: '0 0 10px var(--warning)' }} />
              <span style={{ fontFamily: 'var(--font-codigo)', fontSize: '0.72rem', color: 'var(--warning)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                STANDBY DE SEÑAL
              </span>
            </div>

            <span style={{ fontFamily: 'var(--font-titulo)', fontSize: '1.6rem', color: 'var(--text)', letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1 }}>
              SIN CONEXIÓN DE VÍDEO
            </span>

            <span style={{ fontFamily: 'var(--font-codigo)', fontSize: '0.72rem', color: 'var(--muted)', letterSpacing: '0.12em' }}>
              ESPERANDO FEED LIVEKIT WEBRTC // CANAL ABIERTO
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
