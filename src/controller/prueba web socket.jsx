import React, { useState, useEffect } from 'react';

export const ConexionRobot = ({ onDataReceived,setSocketPadre }) => {
  const [status, setStatus] = useState({ text: 'Buscando...', color: '#ff4d4d' });
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Cambia 'ip_robot' por la IP real
    const ws = new WebSocket('ws://ip_robot:5000/ws');

    ws.onopen = () => {
      setStatus({ text: 'Conectado', color: '#0ac800' });
      setSocketPadre(ws); // Enviamos el socket a App.js para que pueda enviar comandos al robot
    };

    ws.onclose = () => {
      setStatus({ text: 'Desconectado', color: '#ff4d4d' });
      setSocketPadre(null); // Limpiamos el socket en App.js al desconectar
    };

    ws.onerror = () => {
      setStatus({ text: 'Error de Red', color: '#fffb00' });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onDataReceived(data); // Enviamos los datos al dashboard (App.js)
      } catch (e) {
        console.error("Error procesando JSON del robot", e);
      }
    };

    setSocket(ws);

    return () => ws.close();
  }, [onDataReceived, setSocketPadre]);

  return (
    <span style={{
      backgroundColor: status.color,
      color: 'white',
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '0.8rem',
      fontWeight: 'bold',
    }}>
      {status.text}
    </span>
  );
};