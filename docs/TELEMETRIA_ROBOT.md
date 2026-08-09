# Contrato de telemetría del robot → interfaz web

Documento para el **área de hardware**. Define qué debe publicar el robot para
que la interfaz web lo muestre, en qué formato y con qué frecuencia.

El objetivo es cerrar el contrato **antes** de escribir el firmware, para que
ninguna de las dos partes tenga que rehacer trabajo. Si algo de aquí no es
viable con el hardware previsto, decidlo cuanto antes: es más barato cambiar
este documento que cambiar los dos lados.

---

## 1. Por qué hace falta

Hoy la web solo puede mostrar **lo que el operador ordena**: cuánto empuja el
joystick y qué botones mantiene pulsados. No sabe nada de lo que el robot
realmente hace.

La diferencia importa. Si el operador ordena «avance 60%» y el robot está
atascado, la pantalla dice 60% igualmente. En cuanto llegue esta telemetría, la
interfaz podrá enseñar **ordenado contra real** — que es la lectura que de
verdad dice si la máquina está respondiendo.

También es lo que permite el resto: velocidad real, batería, inclinación y los
indicadores de estilo aeroespacial que se quieren para la transmisión pública.

---

## 2. Cómo se envía

El robot ya está conectado a la sala de LiveKit y su credencial ya incluye
permiso de publicación (`can_publish_data=True` en `robot_receiver_prod.py`), así
que **no hay que cambiar nada de infraestructura ni de permisos**.

| | |
|---|---|
| Canal | Data channel de LiveKit (el mismo por el que ya recibe comandos) |
| Topic | **`telemetria_robot`** |
| Fiabilidad | `reliable=False` |
| Destino | Broadcast (sin `destination_identities`) |
| Frecuencia | **10 Hz — un paquete cada 100 ms** |
| Formato | JSON codificado en UTF-8 |
| Tamaño | Mantenerlo por debajo de 1 KB |

Notas sobre estas decisiones:

- **Topic separado.** El topic `telemetria` ya lo usa el operador para publicar
  sus órdenes. Mezclar medidas y órdenes en el mismo canal haría imposible
  distinguir «lo que se pidió» de «lo que pasó», que es justo lo que se quiere
  comparar.
- **`reliable=False` es deliberado.** No se retransmite un paquete perdido: 100
  ms después llega el siguiente con el estado completo. Reintentar añadiría
  retraso para mostrar un dato ya caduco.
- **Frecuencia constante.** 10 Hz *siempre*, aunque no cambie nada. La interfaz
  interpola entre paquetes contando con ese ritmo; si el intervalo baila, los
  indicadores dan tirones. Y si dejan de llegar paquetes durante 2 segundos, la
  interfaz da el robot por desconectado en lugar de dejar el último valor
  congelado en pantalla.
- **Estado completo en cada paquete.** No enviar incrementos ni «solo lo que
  cambió»: cada paquete debe poder leerse por sí solo.

---

## 3. El paquete

```json
{
  "v": 1,
  "t": 1043500,

  "velocidad":  { "lineal": 0.42, "angular": -0.15 },
  "odometria":  { "distancia": 12.6 },
  "bateria":    { "porcentaje": 78, "voltaje": 24.6, "corriente": 3.1 },
  "imu":        { "pitch": -2.4, "roll": 0.8, "rumbo": 137.2 },
  "actuadores": {
    "brazo_delantero": { "angulo": 32.5 },
    "brazo_trasero":   { "angulo": 0.0 },
    "tambor_delantero": { "rpm": 45 },
    "tambor_trasero":   { "rpm": 0 }
  },
  "temperatura": { "motores": 41.2, "controlador": 38.0 },
  "estado": { "nivel": "ok", "mensaje": "" }
}
```

### Campos

| Campo | Tipo | Unidad | Rango | Notas |
|---|---|---|---|---|
| `v` | entero | — | `1` | Versión del formato. **Obligatorio.** Si cambia el esquema, sube a 2 y la web sigue entendiendo el 1. |
| `t` | entero | milisegundos | — | Reloj monotónico del robot desde el arranque. **Obligatorio.** No es la hora del día. Ver §5. |
| `velocidad.lineal` | decimal | m/s | −2.0 … 2.0 | Positivo hacia delante. De encoders, no del comando. |
| `velocidad.angular` | decimal | rad/s | −3.0 … 3.0 | Positivo girando a la izquierda (regla de la mano derecha). |
| `odometria.distancia` | decimal | metros | ≥ 0 | Acumulada desde el arranque. |
| `bateria.porcentaje` | entero | % | 0 … 100 | Carga estimada. |
| `bateria.voltaje` | decimal | voltios | ≥ 0 | Lectura directa. |
| `bateria.corriente` | decimal | amperios | — | Positivo consumiendo. |
| `imu.pitch` | decimal | grados | −90 … 90 | Cabeceo. Positivo, morro arriba. |
| `imu.roll` | decimal | grados | −180 … 180 | Alabeo. Positivo, inclinado a la derecha. |
| `imu.rumbo` | decimal | grados | 0 … 360 | 0 = norte magnético. |
| `actuadores.<nombre>.angulo` | decimal | grados | según tope mecánico | Solo brazos. 0 = posición de reposo. |
| `actuadores.<nombre>.rpm` | decimal | rpm | — | Solo tambores. Positivo en sentido horario visto desde el lado derecho del robot. |
| `temperatura.motores` | decimal | °C | — | La más alta de las que se midan. |
| `temperatura.controlador` | decimal | °C | — | |
| `estado.nivel` | texto | — | `ok` \| `alerta` \| `fallo` | |
| `estado.mensaje` | texto | — | ≤ 80 caracteres | Vacío si `nivel` es `ok`. Se muestra tal cual al espectador: en español y legible. |

Los nombres de actuador son exactamente estos cuatro, y deben coincidir con los
que ya usa la web (`src/controller/telemetria.js`):

```
brazo_delantero   brazo_trasero   tambor_delantero   tambor_trasero
```

---

## 4. Las dos reglas que no se pueden romper

**1. Un sensor que no existe se omite; nunca se manda cero.**

Si el robot todavía no tiene IMU, el paquete no lleva la clave `imu`. La web
distingue perfectamente «no hay dato» (muestra `—`) de «el dato es cero»
(muestra `0.00`). Mandar ceros por un sensor ausente hace que la interfaz
afirme algo falso: que el robot está perfectamente nivelado, o que la batería
está a cero. En una transmisión pública eso se nota.

Esto además permite entregar por fases sin coordinar despliegues: en cuanto
empiece a llegar `bateria`, ese indicador se enciende solo.

**2. Un valor que no es de confianza se omite igual.**

Si el encoder está en fallo o la lectura está fuera de rango, mejor no enviar
ese campo que enviar ruido. Y marcarlo en `estado`.

---

## 5. El campo `t`, y por qué importa más de lo que parece

El vídeo de LiveKit llega al espectador con varios cientos de milisegundos de
retraso (codificación, red, búfer del reproductor). Los datos por el canal de
datos llegan casi al instante.

Sin corregirlo, **el indicador se adelanta a la imagen**: el número de avance
sube antes de que se vea moverse al robot. Con la barra actual apenas se nota;
con indicadores grandes en una transmisión, mucho.

El `t` monotónico permite retrasar la telemetría a propósito hasta casarla con
el vídeo. Por eso tiene que ser un contador estable del propio robot, no la
hora del sistema: nadie garantiza que el reloj del robot y el del espectador
estén sincronizados, pero el ritmo de un contador monotónico sí es fiable.

---

## 6. Ejemplo en Python

Encaja con lo que ya hay en `robot_receiver/robot_receiver_prod.py`, que hoy
solo recibe. Publicar es la otra mitad:

```python
import asyncio, json, time
from livekit import rtc

PERIODO = 0.1  # 10 Hz, constante

async def publicar_telemetria(room: rtc.Room, leer_sensores):
    """Publica el estado del robot cada 100 ms, pase lo que pase.

    `leer_sensores()` devuelve un dict solo con lo que se pudo medir de
    verdad: las claves de un sensor ausente o en fallo simplemente no
    aparecen (ver §4).
    """
    arranque = time.monotonic()

    while True:
        try:
            datos = leer_sensores()
            datos["v"] = 1
            datos["t"] = int((time.monotonic() - arranque) * 1000)

            await room.local_participant.publish_data(
                json.dumps(datos).encode("utf-8"),
                topic="telemetria_robot",
                reliable=False,
            )
        except Exception as e:
            # Un fallo de un sensor no puede tumbar el bucle: se pierde un
            # paquete y el siguiente sale 100 ms después.
            print(f"[telemetria] error publicando: {e}")

        await asyncio.sleep(PERIODO)
```

Lanzarlo junto al bucle que ya escucha comandos:

```python
asyncio.create_task(publicar_telemetria(room, leer_sensores))
```

> Sobre el `sleep(PERIODO)`: si leer los sensores llega a tardar de forma
> apreciable, el ritmo se irá desviando. En ese caso, calcular el siguiente
> instante de despertar en lugar de dormir un fijo.

---

## 7. Orden de entrega sugerido

No hace falta entregar todo de una vez. Por valor sobre esfuerzo:

1. **`estado` y `bateria`** — lo más barato de instrumentar y lo que más
   preocupa en una demostración en campo (quedarse sin batería a media
   exhibición).
2. **`velocidad`** (encoders) — desbloquea el «ordenado contra real», que es la
   lectura que dice si la máquina responde.
3. **`imu`** — inclinación y rumbo. Muy vistoso, y útil de verdad en terreno
   irregular.
4. **`odometria` y `temperatura`** — completan el cuadro.

---

## 8. Cómo probarlo sin hardware

No hace falta robot para validar el contrato de los dos lados. Con un script
que se conecte a la sala y publique valores inventados **respetando el
formato**, la web debe reaccionar. Es la forma de comprobar que las unidades y
los signos coinciden antes de tener la máquina montada.

Merece la pena verificar explícitamente:

- que omitir un bloque entero (`imu`, por ejemplo) deja el indicador en `—` y
  no en `0`;
- que al dejar de publicar durante 2 segundos, la web da el robot por
  desconectado;
- que los signos son los acordados: empujar el joystick adelante debe dar
  `velocidad.lineal` positiva, y girar a la izquierda, `angular` positiva.

---

## 9. Qué hace la web con cada dato

| Dato | Dónde aparece |
|---|---|
| `velocidad.lineal` | Indicador de velocidad real, junto al avance ordenado |
| `velocidad.angular` | Giro real, junto al ordenado |
| `bateria.porcentaje` | Widget de batería en la barra de telemetría |
| `imu.pitch` / `roll` | Indicador de inclinación |
| `imu.rumbo` | Brújula |
| `odometria.distancia` | Distancia recorrida en la sesión |
| `temperatura.*` | Widget de temperatura, con aviso al pasar el umbral |
| `estado` | Aviso destacado, en ámbar, sobre la barra |

La preparación del lado web está en `src/controller/telemetria.js`
(`TOPIC_TELEMETRIA_ROBOT` y `decodificarTelemetriaRobot`), y el catálogo de
widgets pendientes, en `src/controller/widgets.js`.

---

## 10. Contacto y cambios

Cualquier cambio en este contrato afecta a las dos partes. Si hardware necesita
otra unidad, otro rango o un campo más, se actualiza **este documento primero**
y luego el código, no al revés. Si el cambio rompe lo ya entregado, se sube la
versión `v` en lugar de reinterpretar el `1`.
