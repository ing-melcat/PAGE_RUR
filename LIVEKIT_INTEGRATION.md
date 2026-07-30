# Guía de Implementación LiveKit para Producción

Este documento describe la arquitectura y el flujo necesario para conectar la interfaz (Frontend) con LiveKit Cloud y el servidor PHP (Backend) en un entorno de producción, así como la separación de configuraciones entre la interfaz de usuario y el despliegue en Portainer.

## 1. Arquitectura General

El sistema consta de 3 actores principales:

1. **El Robot (Publicador)**: La Raspberry Pi conectada a la red (ejecutando nodos de ROS y LiveKit ingress).
2. **El Servidor (Backend)**: Tu API en PHP que funciona como "orquestador" y administrador de permisos.
3. **El Frontend (React)**: La interfaz web desde donde el operador visualiza y controla los robots.

---

## 2. Configuración y Separación de Datos (UI vs Portainer)

Para mantener el sistema modular y seguro, los datos de configuración se dividen en dos categorías principales. Esta separación dicta qué parámetros se editan desde la Interfaz Web y cuáles se configuran a nivel de infraestructura usando Docker/Portainer.

### 🎛️ Datos Operacionales (Configurables en la UI)
Estos son los valores que un operador puede necesitar ajustar entre sesiones o según las necesidades del terreno. Se configuran directamente en el **Modal de Edición de Robots**:

- **Nombre Visible:** Identificación rápida para el operador en el menú.
- **Sala LiveKit (Room):** El nombre de la sala a la que el robot y el operador deben conectarse (ej. `room-rassor-1`).
- **Límites Mecánicos:** 
  - Velocidad máxima de los motores (%).
  - Sensibilidad de giro (%).
  - Fuerza máxima de excavación (%).

### 🐳 Datos de Infraestructura (Configurables en Portainer / .env)
Estos valores **NO** deben cambiar durante la operación regular. Se configuran una sola vez al desplegar el sistema usando variables de entorno en tu archivo `docker-compose.yml` o a través de Portainer. Se muestran en la UI (en "Opciones Avanzadas") únicamente como referencia de sólo lectura:

- **URL del Servidor LiveKit:** (ej. `wss://livekit.cloud/`)
- **API Key y API Secret de LiveKit:** Credenciales críticas (NUNCA deben exponerse en el Frontend).
- **Parámetros de Transmisión de Video:**
  - Resolución de cámara (ej. `720p`).
  - Codec forzado (ej. `H.264`).
- **Tasa de Refresco de Telemetría:** Frecuencia de actualización de datos de sensores (ej. `30 Hz`).
- **Grabación en Bucle:** Configuraciones del servicio de grabación local del contenedor.

---

## 3. Flujo 1: Detección de Estado (Focos Verde/Rojo)

Actualmente en el Frontend el estado `online` o `offline` está simulado. Para que sea real:

### En el Backend (PHP):
Debes crear un endpoint `GET /api/livekit-status.php`.
1. Este endpoint debe usar el **LiveKit Server SDK** (o peticiones HTTP directas a la API de LiveKit, usando tu API Key y Secret definidos en las variables de entorno de Portainer).
2. Llama a la función `ListRooms` de LiveKit.
3. LiveKit responderá con las salas que actualmente están activas (porque una Raspberry Pi está publicando).
4. El endpoint debe devolver un arreglo JSON simple: `["room-rassor-1", "room-rassor-2"]`.

### En el Frontend (React):
1. Hacer un `fetch('/api/livekit-status.php')` de forma periódica (ej. cada 5-10 segundos).
2. Comparar el arreglo recibido con los robots registrados en el estado de la aplicación.
3. Si el valor `robot.room` está en la lista -> marcar `status: 'online'`. Si no -> marcar `status: 'offline'`.

---

## 4. Flujo 2: Conexión y Control (Tokens)

Cuando un operador hace clic en un robot `online`, necesita un "Token de Acceso" para poder entrar a esa sala específica de LiveKit a ver el video y enviar comandos de telemetría/control.

### En el Backend (PHP):
Debes crear un endpoint `POST /api/livekit-token.php`.
1. El Frontend envía a este endpoint el `room_name` configurado en la UI (ej. `room-rassor-1`) y el identificador del usuario (`matricula`).
2. El Backend verifica si ese usuario tiene permisos para operar (rol: `operador` o `admin`).
3. Si tiene permiso, el Backend usa el **LiveKit Server SDK** y las credenciales secretas (de Portainer) para generar un token (JWT).
   - `roomJoin: true`
   - `roomName: 'room-rassor-1'`
   - `canPublish: true` (para que el operador pueda enviar comandos DataChannel al robot)
   - `canSubscribe: true` (para que el operador pueda ver la cámara del robot)
4. El Backend devuelve el token generado al Frontend.

### En el Frontend (React):
1. El componente `ControllerApp.jsx` o similar recibe el objeto `robot` de las props (que incluye la sala y los límites operacionales).
2. Hace la petición a `/api/livekit-token.php` mandando `robot.room`.
3. Con el token recibido y la URL de LiveKit, el componente se conecta automáticamente a la sala.
4. Los límites de velocidad y mecánicos configurados en la UI se usan localmente en el Frontend para limitar o mapear los valores de los joysticks/teclado antes de enviarlos vía DataChannel al robot.

---

## 5. Recursos Recomendados

- **LiveKit Server SDK (PHP)**: Si usas PHP puro, puedes generar el JWT usando librerías como `firebase/php-jwt`. Los detalles de los payloads los encuentras en: https://docs.livekit.io/realtime/concepts/authentication/
- **LiveKit React Components**: La librería `@livekit/components-react` maneja toda la UI de los videos automáticamente una vez que le pasas el token.
