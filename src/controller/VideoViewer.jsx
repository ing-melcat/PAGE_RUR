import { useLiveKitVideoTrack } from './useLiveKitVideoTrack';

export function VideoViewer({ room, isConnected }) {
  const { videoRef, hasVideo } = useLiveKitVideoTrack(room, isConnected);

  // showVideo SOLO depende de si realmente hay un video de LiveKit.
  // Ignoramos "isRobotConnected" porque a veces el robot manda video antes
  // de conectarse formalmente a datos, o viceversa, lo que queremos es
  // saber si la imagen real está presente.
  const showVideo = isConnected && hasVideo;

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
        ref={videoRef}
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
