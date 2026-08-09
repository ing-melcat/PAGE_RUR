import { useLiveKitVideoTrack } from './useLiveKitVideoTrack';

export function VideoViewer({ room, isConnected }) {
  const videoRef = useLiveKitVideoTrack(room, isConnected);

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
      {isConnected ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      ) : (
        <div
          style={{
            color: 'var(--muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            width: '100%',
            fontFamily: 'var(--font-ibm-mono), monospace',
            fontSize: '1.2rem',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}
        >
          No video connection
        </div>
      )}
    </div>
  );
}
