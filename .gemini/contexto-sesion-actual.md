# Contexto de Sesión — Actualizado 2026-09-30

## Estado General
El proyecto está **estable y desplegado** en producción y desarrollo.

## Barra de Telemetría del Operador (LEER ANTES DE TOCAR)

El operador usa **un solo componente**: `BarraTelemetria.jsx`. Se adapta al modo de entrada con el prop `esencial`:
- `esencial={true}` → táctil, barra compacta para no estorbar joysticks
- `esencial={false}` → teclado/mando, barra expandida

**NO existe alternancia entre componentes.** Solo `BarraTelemetria`. El archivo `HudOperador.jsx` existe pero NO se usa ni se importa.

La lógica está en `ControllerApp.jsx` (~línea 1000):
```
<BarraTelemetria esencial={!controlesOcultos} ... />
```

## Archivos clave

| Archivo | Propósito |
|---|---|
| `src/controller/ControllerApp.jsx` (~1185 líneas) | Controlador principal. Renderiza BarraTelemetria. Dispara eventos joystickMove. |
| `src/controller/components/BarraTelemetria.jsx` (~820 líneas) | Barra de telemetría única para todos los modos. Exporta ChipEntrada. |
| `src/controller/components/HudEspectador.jsx` (~184 líneas) | HUD del espectador público (read-only, componente aparte). |
| `src/controller/widgets.js` | Catálogo de widgets y defaults (WIDGETS_OPERADOR incluye audiencia). |

## Control del Robot (intocable)
- Paquete binario de 12 bytes: Timestamp(Uint32) + Avance(Float32) + Giro(Float32)
- Topic WebRTC: `"control"`
- Compatible con `robot_receiver_prod.py` en ROS

## Despliegue
- Frontend PROD: `./scripts/deploy-frontend.sh` (desde /home/rur/PAGE_RUR)
- Frontend DEV: `cd /home/rur/rur-dev && ./build-spa.sh`
- Backend: `docker compose up -d --build <servicio>` (sin volúmenes, hay que rebuildar)
