import { useEffect, useRef } from 'react';
import { RoomEvent, Track } from 'livekit-client';

export function VideoViewer({ room, isConnected }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!room || !isConnected) return;


    // Función para adjuntar un track de video al elemento <video>
    const attachTrack = (track) => {
      if (track.kind === Track.Kind.Video && videoRef.current) {
        track.attach(videoRef.current);
      }
    };

    // Escucha nuevos tracks suscritos
    const handleTrackSubscribed = (track) => {
      attachTrack(track);
    };

    // Cuando alguien se desconecta, limpia el video
    const handleTrackUnsubscribed = (track) => {
      if (track.kind === Track.Kind.Video) {
        track.detach();
        if (videoRef.current) videoRef.current.srcObject = null;
      }
    };

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);

    // Si ya hay participantes con tracks activos cuando se monta el componente
    room.remoteParticipants.forEach((participant) => {
      participant.trackPublications.forEach((publication) => {
        if (publication.isSubscribed && publication.track) {
          attachTrack(publication.track);
        }
      });
    });

    return () => {
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    };
  }, [room, isConnected]);

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