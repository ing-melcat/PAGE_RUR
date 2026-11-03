import { useEffect, useRef, useState } from 'react';

/**
 * Integra en tiempo real (10 Hz) la cinemática, odometría, ángulos de brazos,
 * revoluciones de tambores, inclinación dinámica (pitch/roll) y consumo eléctrico/térmico
 * a partir de las órdenes de telemetría del operador cuando el robot físico aún no
 * publica paquetes `rur:robot` de sensores de hardware.
 *
 * Si el robot publica `sensores` reales, las lecturas medidas tienen prioridad absoluta.
 */
export function useCinematicaViva(telemetria, sensores, isRobotConnected = true) {
  const estadoRef = useRef({
    rumbo: 90,
    odometria: 0,
    brazoDelantero: 0,
    brazoTrasero: 0,
    pitch: 0,
    roll: 0,
    tempMotores: 36.5,
    ultimoTick: Date.now(),
  });

  const [integrado, setIntegrado] = useState(() => ({ ...estadoRef.current }));
  const telemetriaRef = useRef(telemetria);
  telemetriaRef.current = telemetria;

  useEffect(() => {
    estadoRef.current.ultimoTick = Date.now();

    const intervalo = setInterval(() => {
      const ahora = Date.now();
      const dt = Math.min(0.25, Math.max(0.01, (ahora - estadoRef.current.ultimoTick) / 1000));
      estadoRef.current.ultimoTick = ahora;

      const actual = telemetriaRef.current || {};
      const avanceNivel = actual.avance?.nivel ?? 0;
      const avanceSigno = actual.avance?.dir === 'atras' ? -1 : 1;
      const avanceVal = avanceNivel ? avanceSigno * (avanceNivel / 10) : 0;

      const giroNivel = actual.giro?.nivel ?? 0;
      const giroSigno = actual.giro?.dir === 'izquierda' ? -1 : 1;
      const giroVal = giroNivel ? giroSigno * (giroNivel / 10) : 0;

      const act = actual.actuadores || {};

      // 1. Velocidad lineal (m/s) y Odometría acumulada (m)
      const velLineal = avanceVal * 1.5;
      if (Math.abs(velLineal) > 0.001) {
        estadoRef.current.odometria += Math.abs(velLineal) * dt;
      }

      // 2. Rumbo / Azimut integrado (0°..359°)
      if (Math.abs(giroVal) > 0.001) {
        estadoRef.current.rumbo = (estadoRef.current.rumbo + giroVal * 45 * dt + 360) % 360;
      }

      // 3. Ángulos de brazos delantero y trasero (-30° a +65°)
      const cmdBrazoDel = act.brazo_delantero;
      if (cmdBrazoDel === 'subiendo') {
        estadoRef.current.brazoDelantero = Math.min(65, estadoRef.current.brazoDelantero + 24 * dt);
      } else if (cmdBrazoDel === 'bajando') {
        estadoRef.current.brazoDelantero = Math.max(-30, estadoRef.current.brazoDelantero - 24 * dt);
      }

      const cmdBrazoTras = act.brazo_trasero;
      if (cmdBrazoTras === 'subiendo') {
        estadoRef.current.brazoTrasero = Math.min(65, estadoRef.current.brazoTrasero + 24 * dt);
      } else if (cmdBrazoTras === 'bajando') {
        estadoRef.current.brazoTrasero = Math.max(-30, estadoRef.current.brazoTrasero - 24 * dt);
      }

      // 4. Pitch y Roll dinámicos del chasis por reacción de tracción y brazos
      const diferenciaBrazos = (estadoRef.current.brazoDelantero - estadoRef.current.brazoTrasero) * 0.06;
      const pitchObjetivo = (-avanceVal * 3.2) + diferenciaBrazos;
      const rollObjetivo = giroVal * 2.4;
      estadoRef.current.pitch += (pitchObjetivo - estadoRef.current.pitch) * Math.min(1, dt * 8);
      estadoRef.current.roll += (rollObjetivo - estadoRef.current.roll) * Math.min(1, dt * 8);

      // 5. Temperatura de motores (modelo térmico suave 36.5°C -> 52°C bajo carga)
      const activosCount = Object.values(act).filter(Boolean).length;
      const factorCarga = Math.min(1, (Math.abs(avanceVal) * 0.6) + (Math.abs(giroVal) * 0.4) + (activosCount * 0.15));
      const tempObjetivo = 36.5 + factorCarga * 12.5;
      estadoRef.current.tempMotores += (tempObjetivo - estadoRef.current.tempMotores) * Math.min(1, dt * 0.8);

      setIntegrado({ ...estadoRef.current });
    }, 100);

    return () => clearInterval(intervalo);
  }, []);

  const avanceNivel = telemetria?.avance?.nivel ?? 0;
  const avanceSigno = telemetria?.avance?.dir === 'atras' ? -1 : 1;
  const avanceVal = avanceNivel ? avanceSigno * (avanceNivel / 10) : 0;

  const giroNivel = telemetria?.giro?.nivel ?? 0;
  const giroSigno = telemetria?.giro?.dir === 'izquierda' ? -1 : 1;
  const giroVal = giroNivel ? giroSigno * (giroNivel / 10) : 0;

  const act = telemetria?.actuadores || {};
  const cmdBrazoDel = act.brazo_delantero;
  const cmdBrazoTras = act.brazo_trasero;
  const cmdTamborDel = act.tambor_delantero;
  const cmdTamborTras = act.tambor_trasero;

  // Rumbo (grados)
  const headingDeg = sensores?.imu?.rumbo != null
    ? Math.round((sensores.imu.rumbo % 360 + 360) % 360)
    : Math.round((integrado.rumbo % 360 + 360) % 360);

  // Velocidad lineal (m/s) y angular (rad/s)
  const velNum = sensores?.velocidad?.lineal != null
    ? sensores.velocidad.lineal
    : avanceVal * 1.5;
  const velLineal = velNum.toFixed(1);

  const angNum = sensores?.velocidad?.angular != null
    ? sensores.velocidad.angular
    : giroVal * 1.25;
  const angVal = angNum.toFixed(2);

  // Odometría (m)
  const odoNum = sensores?.odometria?.distancia != null
    ? sensores.odometria.distancia
    : integrado.odometria;
  const distVal = `${odoNum.toFixed(1)} m`;

  // Clinómetro (Pitch y Roll en grados)
  const pitchVal = sensores?.imu?.pitch != null ? sensores.imu.pitch : integrado.pitch;
  const rollVal = sensores?.imu?.roll != null ? sensores.imu.roll : integrado.roll;
  const imuEfectivo = sensores?.imu || {
    pitch: pitchVal,
    roll: rollVal,
    rumbo: headingDeg,
  };

  // Brazos (grados + glifo de acción)
  const armFrontDeg = sensores?.actuadores?.brazo_delantero?.angulo != null
    ? sensores.actuadores.brazo_delantero.angulo
    : integrado.brazoDelantero;
  const armBackDeg = sensores?.actuadores?.brazo_trasero?.angulo != null
    ? sensores.actuadores.brazo_trasero.angulo
    : integrado.brazoTrasero;

  const armFrontGlyph = cmdBrazoDel === 'subiendo' ? '▲' : cmdBrazoDel === 'bajando' ? '▼' : '';
  const armBackGlyph = cmdBrazoTras === 'subiendo' ? '▲' : cmdBrazoTras === 'bajando' ? '▼' : '';

  const armFrontVal = `${armFrontDeg >= 0 ? '+' : ''}${armFrontDeg.toFixed(1)}°${armFrontGlyph}`;
  const armBackVal = `${armBackDeg >= 0 ? '+' : ''}${armBackDeg.toFixed(1)}°${armBackGlyph}`;

  // Tambores (RPM + sentido de giro)
  const drmFrontRpm = sensores?.actuadores?.tambor_delantero?.rpm != null
    ? sensores.actuadores.tambor_delantero.rpm
    : cmdTamborDel === 'girando_horario' ? 45 : cmdTamborDel === 'girando_antihorario' ? -45 : 0;
  const drmBackRpm = sensores?.actuadores?.tambor_trasero?.rpm != null
    ? sensores.actuadores.tambor_trasero.rpm
    : cmdTamborTras === 'girando_horario' ? 45 : cmdTamborTras === 'girando_antihorario' ? -45 : 0;

  const drmFrontVal = `${drmFrontRpm > 0 ? '+' : ''}${drmFrontRpm}`;
  const drmBackVal = `${drmBackRpm > 0 ? '+' : ''}${drmBackRpm}`;

  // Potencia eléctrica (V, A, W) y Temperatura de motores (°C)
  const brazosActivos = (cmdBrazoDel ? 1 : 0) + (cmdBrazoTras ? 1 : 0);
  const tamboresActivos = (cmdTamborDel ? 1 : 0) + (cmdTamborTras ? 1 : 0);
  const corrienteEstimada = 1.2
    + Math.abs(avanceVal) * 4.2
    + Math.abs(giroVal) * 2.6
    + brazosActivos * 1.5
    + tamboresActivos * 2.2;
  const caidaTension = Math.min(1.4, (corrienteEstimada - 1.2) * 0.08);
  const voltajeEstimado = 24.4 - caidaTension;

  const voltNum = sensores?.bateria?.voltaje != null ? sensores.bateria.voltaje : voltajeEstimado;
  const ampNum = sensores?.bateria?.corriente != null ? sensores.bateria.corriente : corrienteEstimada;
  const wattNum = voltNum * ampNum;
  const tempNum = sensores?.temperatura?.motores != null ? sensores.temperatura.motores : integrado.tempMotores;

  return {
    avanceVal,
    avancePct: avanceNivel * 10,
    avanceDir: telemetria?.avance?.dir || null,
    giroVal,
    giroPct: giroNivel * 10,
    giroDir: telemetria?.giro?.dir || null,
    headingDeg,
    velNum,
    velLineal,
    angNum,
    angVal,
    distVal,
    pitchVal,
    rollVal,
    imuEfectivo,
    armFrontVal,
    armBackVal,
    drmFrontVal,
    drmBackVal,
    voltVal: voltNum.toFixed(1),
    ampVal: ampNum.toFixed(1),
    wattVal: wattNum.toFixed(1),
    tempVal: `${tempNum.toFixed(1)}°C`,
    enReposoSinRobot: !isRobotConnected && avanceNivel === 0 && giroNivel === 0 && brazosActivos === 0 && tamboresActivos === 0,
  };
}
