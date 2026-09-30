import { useState } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
  PreJoin,
  type LocalUserChoices,
} from '@livekit/components-react';
import '@livekit/components-styles';

export default function TestLiveKit() {
  const [choices, setChoices] = useState<LocalUserChoices | undefined>(undefined);

  // ⚠️ REEMPLAZA ESTOS VALORES CON TUS DATOS DE PRUEBA ⚠️
  // Si no tienes un token, puedes generarlo desde el dashboard de LiveKit o usando su CLI.
  const LIVEKIT_URL = 'wss://tu-proyecto.livekit.cloud';
  const LIVEKIT_TOKEN = 'tu-token-de-prueba';

  // 1. Mostrar widget de selección de cámara y micrófono (PreJoin)
  if (!choices) {
    return (
      <div style={{ height: '100vh', display: 'grid', placeItems: 'center', background: '#111' }}>
        <div style={{ color: 'white', marginBottom: '20px', textAlign: 'center' }}>
          <h2>Prueba de Widgets de LiveKit</h2>
          <p>Selecciona tu cámara y micrófono para probar los widgets locales.</p>
        </div>
        <PreJoin
          defaults={{
            videoEnabled: true,
            audioEnabled: true,
          }}
          onSubmit={(valores) => setChoices(valores)}
        />
      </div>
    );
  }

  // 2. Conectar a la sala y transmitir
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px', background: '#222', color: 'white', textAlign: 'center' }}>
        Transmitiendo a la sala... (Verificando conexión)
      </div>
      
      {/* 
        LiveKitRoom maneja la conexión. 
        VideoConference renderiza la interfaz completa (widgets de cámara, cuadrícula y controles)
      */}
      <LiveKitRoom
        serverUrl={LIVEKIT_URL}
        token={LIVEKIT_TOKEN}
        video={choices.videoEnabled}
        audio={choices.audioEnabled}
        connect={true}
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
