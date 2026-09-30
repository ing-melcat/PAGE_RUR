# Reglas del Proyecto RUR

## ⚠️ REGLA CRÍTICA: Barra de Telemetría del Operador

El operador usa **un solo componente de telemetría**: `BarraTelemetria` (archivo `src/controller/components/BarraTelemetria.jsx`). Se muestra en **todos** los modos de entrada (táctil, teclado, mando).

- Cuando hay controles táctiles en pantalla: `esencial={true}` → la barra se achica para no estorbar los joysticks.
- Cuando se usa teclado/mando: `esencial={false}` → la barra se expande y aprovecha todo el espacio.

### Lógica (en ControllerApp.jsx, ~línea 1000)

```jsx
{!isFetchingToken && mode !== 'vr' && (
  <BarraTelemetria
    ...
    esencial={!controlesOcultos}
    ...
  />
)}
```

### Lo que NO debes hacer NUNCA

1. ❌ Reemplazar `BarraTelemetria` por `HudOperador` ni por ningún otro componente.
2. ❌ Agregar condicionales para alternar entre diferentes componentes de telemetría.
3. ❌ Pasar props que no existan como variables declaradas (como `tituloMision`, `objetivoMision`, `inicioMision`) — eso causa crashes.
4. ❌ Quitar el `esencial={!controlesOcultos}` — eso es lo que adapta la barra al modo de entrada.

---

## Arquitectura de Despliegue

### Producción (servidor público)
- Código fuente: `/home/rur/PAGE_RUR`
- Deploy frontend: `./scripts/deploy-frontend.sh` (desde `/home/rur/PAGE_RUR`)
- Deploy backend: `docker compose up -d --build <servicio>` (desde `/home/rur/PAGE_RUR`)
- Los contenedores **NO montan volúmenes de código**, hay que rebuildar.

### Desarrollo (rur-dev local)
- Directorio: `/home/rur/rur-dev`
- Deploy SPA: `cd /home/rur/rur-dev && ./build-spa.sh`
- Deploy backend: `./up.sh up -d --build <servicio>` (desde `/home/rur/rur-dev`)
- Los contenedores **NO montan volúmenes de código**, hay que rebuildar.

### Para desplegar cambios de frontend a AMBOS entornos:
```bash
cd /home/rur/PAGE_RUR && ./scripts/deploy-frontend.sh && cd /home/rur/rur-dev && ./build-spa.sh
```

---

## Control del Robot (NO TOCAR)

El paquete de datos WebRTC de control es un `ArrayBuffer` binario de **12 bytes**:
- `Timestamp` (Uint32, offset 0)
- `Avance` (Float32, offset 4)
- `Giro` (Float32, offset 8)

Se publica via `publishData` al topic `"control"` y es 100% compatible con `robot_receiver_prod.py` en el robot ROS. **No cambiar la estructura del paquete bajo ninguna circunstancia.**

---

## Eventos globales de telemetría

`ControllerApp.jsx` dispara `window.dispatchEvent(new CustomEvent('joystickMove', ...))` para que los widgets de telemetría reflejen el movimiento del joystick/teclado/mando en tiempo real. **No quitar este dispatch.**

---

## Idioma

El usuario habla español (México). Los comentarios en código están en español. Las respuestas deben ser en español informal.
