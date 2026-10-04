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
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'rgba(255, 255, 255, 0.4)',
            fontFamily: 'var(--font-etiqueta), sans-serif',
            fontSize: '1.2rem',
            letterSpacing: '0.05em',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            pointerEvents: 'none'
          }}
        >
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.4)' }}></div>
          <span>SIN CONEXIÓN DE VIDEO</span>
        </div>
      )}
    </div>
  );
}
