import { useEffect, useRef, useState } from 'react';
import { RoomEvent, Track } from 'livekit-client';

export function useLiveKitVideoTrack(room, isConnected) {
  const videoRef = useRef(null);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    if (!room || !isConnected) {
      setHasVideo(false);
      return;
    }

    const attachTrack = (track) => {
      if (track.kind === Track.Kind.Video && videoRef.current) {
        track.attach(videoRef.current);
        setHasVideo(true);
      }
    };

    const handleTrackSubscribed = (track) => {
      attachTrack(track);
    };

    const handleTrackUnsubscribed = (track) => {
      if (track.kind === Track.Kind.Video) {
        track.detach();
        if (videoRef.current) videoRef.current.srcObject = null;
        
        // Comprobar si queda algun otro track de video
        let videoAunExiste = false;
        room.remoteParticipants.forEach((participant) => {
          participant.trackPublications.forEach((publication) => {
            if (publication.isSubscribed && publication.track && publication.track.kind === Track.Kind.Video) {
              videoAunExiste = true;
            }
          });
        });
        setHasVideo(videoAunExiste);
      }
    };

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);

    let videoInicial = false;
    room.remoteParticipants.forEach((participant) => {
      participant.trackPublications.forEach((publication) => {
        if (publication.isSubscribed && publication.track && publication.track.kind === Track.Kind.Video) {
          attachTrack(publication.track);
          videoInicial = true;
        }
      });
    });
    setHasVideo(videoInicial);

    return () => {
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    };
  }, [room, isConnected]);

  return { videoRef, hasVideo };
}
