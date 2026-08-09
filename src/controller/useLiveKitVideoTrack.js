import { useEffect, useRef } from 'react';
import { RoomEvent, Track } from 'livekit-client';

// Extraído de VideoViewer.jsx para poder alimentar también la pantalla
// virtual del modo VR con el mismo track, sin escuchar los eventos de
// LiveKit dos veces con dos <video> compitiendo por el mismo attach.
export function useLiveKitVideoTrack(room, isConnected) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!room || !isConnected) return;

    const attachTrack = (track) => {
      if (track.kind === Track.Kind.Video && videoRef.current) {
        track.attach(videoRef.current);
      }
    };

    const handleTrackSubscribed = (track) => {
      attachTrack(track);
    };

    const handleTrackUnsubscribed = (track) => {
      if (track.kind === Track.Kind.Video) {
        track.detach();
        if (videoRef.current) videoRef.current.srcObject = null;
      }
    };

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);

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

  return videoRef;
}
