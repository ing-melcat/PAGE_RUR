import asyncio
import os
import json
import struct
from livekit import rtc, api
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
LIVEKIT_ROOM = os.getenv("LIVEKIT_ROOM", "room-1")

# ── Estado actual del robot (se actualiza con cada comando recibido) ──
robot_state = {
    "linear_x": 0.0,
    "angular_z": 0.0,
    "arm_front": "stopped",   # "up", "down", "stopped"
    "arm_back": "stopped",
    "drum_front": "stopped",  # "cw", "ccw", "stopped"
    "drum_back": "stopped",
    "wheels": "stopped",      # "forward", "backward", "left", "right", "stopped"
    "camera_pan": 0.0,        # -1..1, joystick de cámara en modo manual
    "camera_tilt": 0.0,       # sin motores conectados todavía: solo se guarda
}

def decode_telemetry(payload):
    """
    Decodifica el paquete binario del joystick (12 bytes).
    Estructura: [Timestamp (Uint32), X (Float32), Y (Float32)]
    """
    if len(payload) == 12:
        try:
            raw_bytes = bytes(payload)
            timestamp, x, y = struct.unpack('<Iff', raw_bytes)
            robot_state["linear_x"] = round(x, 2)
            robot_state["angular_z"] = round(y, 2)
            
            if abs(x) > 0.05 or abs(y) > 0.05:
                return f"🕹️  Joystick → LIN_X: {x:+7.2f}  ANG_Z: {y:+7.2f}  (t={timestamp})"
            else:
                return "🛑 Joystick Centrado (Detenido)"
        except Exception as e:
            return f"❌ Error decodificando joystick: {e}"
    return None

def decode_command(payload):
    """
    Decodifica un comando JSON enviado por los botones (Arms, Drums, Wheels).
    Formato esperado: {"component": "ArmFront", "action": "Up", "state": true}
    """
    try:
        raw_bytes = bytes(payload)
        text = raw_bytes.decode('utf-8')
        cmd = json.loads(text)
        
        component = cmd.get("component", "?")

        # Cámara: paquete continuo de pan/tilt (-1..1), sin action/state de
        # presionar-soltar como el resto -- lo manda el joystick de cámara
        # cada 100ms mientras se mueve, igual que el joystick de movimiento.
        # Sin motores conectados todavía: se guarda el estado y no se mueve
        # nada físico, protocolo listo a la espera del hardware.
        if component == "Camera":
            pan = cmd.get("pan", 0.0)
            tilt = cmd.get("tilt", 0.0)
            robot_state["camera_pan"] = pan
            robot_state["camera_tilt"] = tilt
            if abs(pan) > 0.05 or abs(tilt) > 0.05:
                return f"🎥 Cámara → PAN: {pan:+.2f}  TILT: {tilt:+.2f}"
            return None

        action = cmd.get("action", "?")
        state = cmd.get("state", False)

        # Actualizar estado interno del robot
        status = action.lower() if state else "stopped"

        if component == "ArmFront":
            robot_state["arm_front"] = status
            icon = "🦾"
        elif component == "ArmBack":
            robot_state["arm_back"] = status
            icon = "🦾"
        elif component == "DrumFront":
            robot_state["drum_front"] = status
            icon = "🥁"
        elif component == "DrumBack":
            robot_state["drum_back"] = status
            icon = "🥁"
        elif component == "Wheel":
            robot_state["wheels"] = status
            icon = "⚙️"
        else:
            icon = "📦"
        
        if state:
            return f"{icon} {component} → {action} [ACTIVADO]"
        else:
            return f"{icon} {component} → {action} [DETENIDO]"
            
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None

def process_data(payload):
    """Intenta decodificar como binario (joystick) o JSON (botones)."""
    data = list(payload)
    
    # Primero intentar como paquete binario de joystick (exactamente 12 bytes)
    result = decode_telemetry(data)
    if result:
        return result
    
    # Si no es binario, intentar como comando JSON
    result = decode_command(data)
    if result:
        return result
    
    # Fallback: mostrar datos crudos
    return f"📩 Raw data (len={len(data)}): {bytes(data)}"

async def main():
    if not LIVEKIT_URL or not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET:
        print("❌ ERROR: LIVEKIT_URL, LIVEKIT_API_KEY o LIVEKIT_API_SECRET no están configurados.")
        return

    room_name = LIVEKIT_ROOM
    
    # Generar token para el robot
    token = api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET) \
        .with_identity("robot-receiver") \
        .with_name("Robot Receiver") \
        .with_grants(api.VideoGrants(
            room_join=True,
            room=room_name,
            can_publish=True,
            can_subscribe=True,
            can_publish_data=True
        )).to_jwt()

    room = rtc.Room()

    @room.on("data_received")
    def on_data_received(data_packet: rtc.DataPacket):
        payload = data_packet.data
        decoded = process_data(payload)
        sender = data_packet.participant.identity if data_packet.participant else "unknown"
        print(f"[{sender}] >> {decoded}")

    @room.on("participant_connected")
    def on_participant_connected(participant: rtc.RemoteParticipant):
        print(f"👤 Operador conectado: {participant.identity}")

    @room.on("participant_disconnected")
    def on_participant_disconnected(participant: rtc.RemoteParticipant):
        print(f"👤 Operador desconectado: {participant.identity}")

    print(f"Conectando robot a la sala {room_name} en {LIVEKIT_URL} ...")
    try:
        await room.connect(LIVEKIT_URL, token)
        print("✅ ¡Robot conectado exitosamente a LiveKit!")
        print("=" * 55)
        print("  Esperando comandos del panel de control...")
        print("  • Joystick  → paquetes binarios de 12 bytes")
        print("  • Botones   → comandos JSON (Arms/Drums/Wheels)")
        print("=" * 55)
        
        while True:
            await asyncio.sleep(3600)
    except Exception as e:
        print(f"❌ Error al conectar con LiveKit: {e}")

if __name__ == "__main__":
    print("=== CONTENEDOR RUR ROBOT RECEIVER ===")
    asyncio.run(main())
