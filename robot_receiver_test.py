import asyncio
from livekit import rtc

async def main(url, token):
    room = rtc.Room()

    @room.on("data_received")
    def on_data_received(data_packet: rtc.DataPacket):
        # data_packet.data is a bytes object
        payload = list(data_packet.data)
        print(f"[TELEMETRÍA] Recibido desde el panel: {payload}")

    print(f"Conectando a LiveKit en {url} ...")
    try:
        await room.connect(url, token)
        print("¡Robot conectado exitosamente! Esperando comandos de movimiento...")
        
        # Keep the script running
        while True:
            await asyncio.sleep(1)
    except Exception as e:
        print(f"Error al conectar: {e}")

if __name__ == "__main__":
    print("=== SIMULADOR DE ROBOT RECEPTOR ===")
    url = input("Ingresa la URL de LiveKit Cloud (wss://...): ").strip()
    token = input("Ingresa un Token generado para el Robot: ").strip()
    
    if url and token:
        asyncio.run(main(url, token))
    else:
        print("Error: Necesitas proporcionar URL y Token.")
