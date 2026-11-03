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
          {/* Retícula óptica sutil */}
          <div style={{
            position: 'absolute',
            inset: '64px 20px 20px 20px',
            border: '1px solid rgba(245, 243, 233, 0.04)',
            pointerEvents: 'none',
          }}>
            {/* Esquinas tácticas del visor */}
            <div style={{ position: 'absolute', top: -1, left: -1, width: 12, height: 12, borderTop: '2px solid rgba(251, 202, 1, 0.35)', borderLeft: '2px solid rgba(251, 202, 1, 0.35)' }} />
            <div style={{ position: 'absolute', top: -1, right: -1, width: 12, height: 12, borderTop: '2px solid rgba(251, 202, 1, 0.35)', borderRight: '2px solid rgba(251, 202, 1, 0.35)' }} />
            <div style={{ position: 'absolute', bottom: -1, left: -1, width: 12, height: 12, borderBottom: '2px solid rgba(251, 202, 1, 0.35)', borderLeft: '2px solid rgba(251, 202, 1, 0.35)' }} />
            <div style={{ position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, borderBottom: '2px solid rgba(251, 202, 1, 0.35)', borderRight: '2px solid rgba(251, 202, 1, 0.35)' }} />
          </div>

          {/* Estado de conexión de vídeo - Terminal puro, sin cajas opacas ni blur */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              padding: '16px 24px',
              background: 'transparent',
              fontFamily: 'var(--font-codigo)',
              textAlign: 'center',
              userSelect: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent)', boxShadow: '0 0 10px var(--accent)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--accent)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                [ FEED DE VÍDEO // STANDBY ]
              </span>
            </div>

            <span style={{ fontSize: '1.4rem', color: 'var(--bone)', letterSpacing: '0.12em', fontWeight: 600, textTransform: 'uppercase', lineHeight: 1.2 }}>
              SIN CONEXIÓN DE VÍDEO
            </span>

            <span style={{ fontSize: '0.72rem', color: 'var(--muted)', letterSpacing: '0.15em' }}>
              ESPERANDO SEÑAL WEBRTC · CANAL P2P ACTIVO
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
