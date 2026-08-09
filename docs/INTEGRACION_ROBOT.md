# Integración del robot — especificación técnica

Documento para el **área de hardware / software embarcado**. Define todo lo que
el robot tiene que hacer para funcionar con la plataforma: cómo se conecta, qué
recibe, qué debe publicar y qué está obligado a hacer cuando algo falla.

Complementa a [`TELEMETRIA_ROBOT.md`](./TELEMETRIA_ROBOT.md), que detalla
únicamente el paquete de sensores. Aquí está el resto: control, vídeo,
identidad, seguridad y reconexión.

Referencia de implementación: `robot_receiver/robot_receiver_prod.py`, que ya
recibe comandos y sirve de esqueleto.

---

## 1. Panorama

Todo pasa por una sala de **LiveKit**. No hay servidor propio en medio, ni
WebSocket aparte, ni MQTT: quien esté en la sala se habla directamente.

```
  OPERADOR (navegador)                      ROBOT (embarcado)
  ─────────────────────                     ──────────────────
   comandos de control    ──── topic ────►   los ejecuta
   (mov., actuadores)        'control'
                                             publica sus sensores
   pinta el HUD          ◄─ 'telemetria_robot' ──
                                             publica su cámara
   ve el vídeo           ◄──── track de vídeo ──

  ESPECTADORES (público)
  ──────────────────────
   ven vídeo + HUD       ◄── track + 'telemetria' (del operador)
```

El robot **nunca habla con la web ni con la base de datos**. Su único
interlocutor es la sala.

---

## 2. Conexión

### 2.1 Credenciales

El robot firma su propio token con la clave y el secreto de LiveKit, que lleva
en su configuración local (`.env`). Esas credenciales son **las mismas** que el
administrador guardó para esa unidad en el panel web.

```python
from livekit import api

token = (api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
         .with_identity("robot-rassor-1")      # ← ver 2.2, es obligatorio
         .with_name("RASSOR 1")
         .with_grants(api.VideoGrants(
             room_join=True,
             room=LIVEKIT_ROOM,                # el campo `room` de la unidad
             can_publish=True,                 # vídeo
             can_subscribe=True,
             can_publish_data=True,            # telemetría
         )).to_jwt())
```

### 2.2 La identidad tiene que empezar por `robot-`

**Este es el requisito que más fácil se pasa por alto y el que más cosas
rompe.** La plataforma no tiene ningún registro de qué participante es el
robot: lo deduce del prefijo de su identidad.

| Si la identidad empieza por | La plataforma entiende |
|---|---|
| `robot-` | Es el robot. Le manda los comandos y da la unidad por **en línea**. |
| `viewer-` / `public-viewer-` | Es público. Cuenta para la audiencia. |
| `overlay-` | Es una capa de OBS. No cuenta como audiencia. |
| cualquier otra cosa | Es el operador. |

Consecuencias de equivocarse: los comandos **no se envían** (el operador solo
los dirige a identidades `robot-`), la unidad aparece **offline** en el panel
aunque esté conectada, y el robot **se cuenta como espectador** inflando la
audiencia pública.

Recomendado: `robot-<id de la unidad>`, por ejemplo `robot-rassor-1`.

### 2.3 Sala

El nombre de sala lo fija el administrador en el panel (campo `room`, hoy
`room-1`). Debe coincidir exactamente.

---

## 3. Canal de control (lo que el robot RECIBE)

Todo llega por el topic **`control`**. Hay que distinguir los mensajes **por el
tamaño y el tipo del payload**, en este orden:

```python
@room.on("data_received")
def on_data(paquete: rtc.DataPacket):
    if paquete.topic != "control":
        return
    datos = bytes(paquete.data)

    if len(datos) == 12:          # 1) movimiento — SIEMPRE se comprueba primero
        procesar_movimiento(datos)
    else:                          # 2) el resto es JSON
        procesar_comando(json.loads(datos.decode("utf-8")))
```

> El orden importa: la comprobación de movimiento es por longitud exacta, y
> hacerlo al revés obligaría a intentar un `json.loads` sobre binario en cada
> paquete, diez veces por segundo.

### 3.1 Movimiento — binario, 12 bytes

El formato más crítico y el más frecuente: **10 paquetes por segundo**,
continuos mientras el operador tenga el mando fuera del centro.

| Desplazamiento | Tipo | Contenido |
|---|---|---|
| 0 | `uint32` LE | Marca de tiempo, **segundos** Unix |
| 4 | `float32` LE | **Avance**, −1.0 … 1.0. Positivo = adelante |
| 8 | `float32` LE | **Giro**, −1.0 … 1.0. Positivo = derecha |

```python
import struct
marca, avance, giro = struct.unpack('<Iff', datos)
```

Notas de implementación:

- **Todo little-endian** (`<`).
- La marca de tiempo va en **segundos**, no milisegundos: sirve para descartar
  paquetes viejos, no para medir latencia con precisión.
- El operador ya aplica su propia zona muerta: por debajo de 0,05 manda cero
  exacto. No hace falta filtrar otra vez, y hacerlo restaría recorrido útil.
- Se envía **sin retransmisión** (`reliable: false`). Un paquete perdido no se
  recupera: 100 ms después llega el siguiente con la posición completa. **No
  implementéis acuses de recibo ni reintentos** — solo añadirían retraso para
  ejecutar una orden ya caduca.

### 3.2 Actuadores — JSON, presionar/soltar

```json
{ "component": "ArmFront", "action": "Up", "state": true }
```

| Campo | Valores |
|---|---|
| `component` | `ArmFront` · `ArmBack` · `DrumFront` · `DrumBack` · `Wheel` |
| `action` | Brazos: `Up` / `Down` · Tambores: `Cw` / `Ccw` · Ruedas: `Forward` / `Backward` / `Left` / `Right` |
| `state` | `true` al presionar, `false` al soltar |

Semántica: **mientras `state` sea `true`, el actuador se mueve**. Se detiene al
recibir el mismo `component`+`action` con `state: false`.

Estos sí van **con retransmisión** (`reliable: true`), a propósito: perder un
`state: false` dejaría un brazo subiendo indefinidamente.

Aun así, **no confiéis solo en el mensaje de soltar** — ver el watchdog (§5).

Mientras el botón sigue pulsado, el operador **reenvía** el comando cada 100 ms.
Recibir un `state: true` repetido de algo que ya está en marcha es normal y debe
ser idempotente.

### 3.3 Cámara — JSON, continuo

```json
{ "component": "Camera", "pan": 0.42, "tilt": -0.15 }
```

Posición absoluta del mando de cámara, −1.0 … 1.0, a 10 Hz mientras se mueve.
No lleva `action` ni `state`: es un flujo de posición, como el movimiento.

Hoy no hay motores de cámara conectados; el receptor guarda el valor y no mueve
nada. El protocolo está listo para cuando existan.

---

## 4. Lo que el robot PUBLICA

### 4.1 Vídeo

Una pista de vídeo normal de LiveKit. El grant ya lo permite (`can_publish`).

```python
fuente = rtc.VideoSource(ANCHO, ALTO)
pista = rtc.LocalVideoTrack.create_video_track("camara-frontal", fuente)
opciones = rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_CAMERA)
await room.local_participant.publish_track(pista, opciones)
```

- **Poned nombre descriptivo a la pista** (`camara-frontal`, `camara-brazo`).
  Cuando haya varias cámaras, ese nombre es lo que permitirá elegir cuál se ve
  en cada escena de la transmisión.
- Resolución y tasa: empezad por **720p a 30 fps**. Prioridad a la **latencia**
  sobre la nitidez — quien conduce necesita ver ya, no ver bonito.

### 4.2 Telemetría de sensores

Topic **`telemetria_robot`**, 10 Hz, JSON. Formato completo, unidades, signos y
fases de entrega en [`TELEMETRIA_ROBOT.md`](./TELEMETRIA_ROBOT.md).

Las dos reglas que no se pueden romper: **un sensor ausente se omite, nunca se
manda cero**, y el paquete lleva un **reloj monotónico** en `t`.

---

## 5. Watchdog — parada por pérdida de señal

**Esta sección es de seguridad. Si solo se implementa una cosa de todo el
documento, que sea esta.**

El operador manda su posición 10 veces por segundo. Si esos paquetes dejan de
llegar —se cayó el wifi, se cerró el navegador, se fue la batería del portátil,
el operador se desconectó a media maniobra— el robot **no recibe ninguna orden
de parada**: simplemente deja de recibir. Sin watchdog seguiría ejecutando
indefinidamente la última orden, que es una máquina avanzando sola.

Requisito:

```python
ULTIMO_COMANDO = time.monotonic()
LIMITE = 0.5   # segundos

async def watchdog():
    while True:
        if time.monotonic() - ULTIMO_COMANDO > LIMITE:
            parada_de_emergencia()   # motores a cero, actuadores detenidos
        await asyncio.sleep(0.1)
```

- **Medio segundo** es un buen límite: son cinco paquetes perdidos seguidos, muy
  por encima de un hipo normal de red, y suficientemente corto para que el robot
  no recorra una distancia peligrosa.
- El temporizador se reinicia con **cualquier** paquete del topic `control`, no
  solo con los de movimiento.
- La parada debe detener **todo**: tracción y actuadores.
- Al reanudarse la comunicación, el robot arranca **detenido**. Nunca debe
  retomar por su cuenta la orden que estaba ejecutando.

Conviene tratar igual la desconexión explícita del operador
(`participant_disconnected`): si el que se va era el operador, parada inmediata
sin esperar al medio segundo.

---

## 6. Reconexión

El SDK de LiveKit reintenta solo, pero el proceso debe sobrevivir a que la sala
se caiga del todo:

- Escuchar `disconnected` y volver a conectar con retroceso exponencial (1 s, 2,
  4… hasta un tope de 30 s).
- El token tiene caducidad: **regenerarlo en cada intento**, no reutilizar el de
  la sesión anterior.
- Al reconectar, el estado interno del robot arranca **en cero**. Ver §5.
- El bucle de telemetría no debe morir porque falle un sensor: capturar la
  excepción, saltarse ese paquete y seguir.

---

## 7. Seguridad

- Las credenciales de LiveKit viven en el robot y **solo ahí**. No se envían por
  el canal de datos ni se registran en los logs.
- El robot **no debe ejecutar nada que venga de un participante cuya identidad
  no sea la del operador**. Los espectadores tienen el canal de datos capado por
  el servidor (`canPublishData: false`), pero comprobarlo en el robot es barato
  y es la última línea de defensa:

  ```python
  if paquete.participant and paquete.participant.identity.startswith(("viewer-", "public-viewer-", "overlay-")):
      return   # un espectador no manda
  ```

- Nada de ejecutar cadenas recibidas, ni de mapear `component` a nombres de
  función por reflexión: una tabla explícita de componentes permitidos y punto.

---

## 8. Lista de comprobación

Para dar la integración por terminada:

- [ ] La identidad empieza por `robot-` y la unidad aparece **en línea** en el panel.
- [ ] El robot se une a la sala del campo `room` de su unidad.
- [ ] Movimiento: el paquete de 12 bytes mueve la tracción, con los signos correctos (adelante y derecha positivos).
- [ ] Actuadores: los cuatro responden a presionar y soltar, y el `state: true` repetido es idempotente.
- [ ] **Watchdog: al cortar el wifi del operador, el robot se detiene en menos de un segundo.**
- [ ] Al reconectar, el robot arranca detenido.
- [ ] Publica vídeo con nombre de pista descriptivo y se ve en el panel.
- [ ] Publica `telemetria_robot` a 10 Hz, con los campos que ya tenga instrumentados.
- [ ] Omite los bloques de los sensores que no existan (no manda ceros).
- [ ] Un espectador conectado no puede provocar ningún movimiento.

---

## 9. Cómo probar cada mitad por separado

**Control (web → robot):** ya funciona. Levantad `robot_receiver_prod.py` con
las credenciales de la unidad y abrid la consola de operador: cada comando se
imprime en el terminal del robot. Sirve para validar signos y formatos sin
mover un motor.

**Telemetría (robot → web):** la interfaz tiene un simulador que publica
paquetes con la forma exacta del contrato. Se activa añadiendo `?demo=1` a la
URL del espectador, y sirve para ver cómo reaccionan los indicadores antes de
tener sensores. Cuando el robot publique de verdad, si algo se ve al revés el
fallo estará en el firmware — la interfaz ya está validada contra ese formato.

---

## 10. Cambios en este documento

Cualquier cambio de protocolo afecta a las dos partes. Se actualiza **primero
este documento** y después el código. Si el cambio rompe lo ya entregado, se
sube la versión del paquete (`v`) en lugar de reinterpretar la actual.
