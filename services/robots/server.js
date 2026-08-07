import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { getPool } from '../shared/db.js';
import { verifyToken, requireRole, IS_PRODUCTION } from '../shared/auth.js';
import { csrfProtection } from '../shared/csrf.js';
import { encryptSecret, decryptSecret, maskSecret } from '../shared/crypto.js';

const app = express();
const PORT = process.env.PORT || 3001;
const pool = getPool();
const TOKEN_TTL = '4h';
const PUBLIC_TOKEN_TTL = '30m';

app.use(cors({ origin: IS_PRODUCTION ? (process.env.CORS_ORIGIN || false) : true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

async function saveLog(type, message) {
  await pool.query('INSERT INTO logs (type, message) VALUES ($1, $2)', [type, message]);
}

// Token de LiveKit: 10/min por usuario logueado (igual que antes).
const livekitTokenLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.matricula || req.ip,
  handler: (req, res) => res.status(429).json({ success: false, message: 'Demasiadas solicitudes: espera un minuto antes de reintentar.' }),
});

// Espectador público (sin login): límite más agresivo por IP, es la
// superficie más expuesta de todo el proyecto porque no requiere cuenta.
const publicTokenLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.ip,
  handler: (req, res) => res.status(429).json({ success: false, message: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' }),
});

function rowToRobot(row, { includeAdminFields }) {
  const base = {
    id: row.id,
    name: row.name,
    status: row.status,
    room: row.room,
    modelUrl: row.model_url,
    livekitUrl: row.livekit_url,
    isPublicEvent: row.is_public_event,
    ...(row.settings ?? {}),
  };
  if (!includeAdminFields) return base;

  let livekitApiSecretMasked = '';
  try {
    livekitApiSecretMasked = maskSecret(decryptSecret(row.livekit_api_secret_encrypted));
  } catch {
    livekitApiSecretMasked = row.livekit_api_secret_encrypted ? '(no se pudo leer)' : '';
  }
  return { ...base, livekitApiKey: row.livekit_api_key, livekitApiSecretMasked };
}

// El receptor del robot entra a la sala con una identidad que empieza por
// `robot-` (robot_receiver/robot_receiver_prod.py). Es el mismo criterio que usa
// el controlador para decidir a quién le manda los comandos: si aquí y allá no
// coincidieran, el panel podría marcar un robot como apagado mientras el
// operador le sigue enviando mandos.
const PREFIJO_ROBOT = 'robot-';

// El estado se consulta a LiveKit una vez por robot y por petición a
// /api/robots. Una caché corta evita machacar a LiveKit cuando el panel se
// refresca, sin que el estado se sienta desactualizado. Es por proceso: con
// varias réplicas cada una tiene la suya, aceptable con esta ventana.
const CACHE_ESTADO_MS = 5000;
const cacheEstado = new Map();

const TIMEOUT_LIVEKIT_MS = 2000;

async function fetchRealStatus(row) {
  const enCache = cacheEstado.get(row.id);
  if (enCache && enCache.expira > Date.now()) return enCache.estado;

  const secret = decryptSecretSafe(row.livekit_api_secret_encrypted);
  if (!row.livekit_url || !row.livekit_api_key || !secret) return 'offline';

  let estado = 'offline';
  try {
    const roomService = new RoomServiceClient(row.livekit_url, row.livekit_api_key, secret);
    // Un LiveKit que no responde no debe dejar colgado a /api/robots: la
    // consulta se hace por cada robot, así que sin tope un solo host lento
    // bloquea la lista entera.
    const participants = await Promise.race([
      roomService.listParticipants(row.room),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), TIMEOUT_LIVEKIT_MS)),
    ]);
    // Antes bastaba con participants.length > 0, así que un operador mirando —o
    // cualquier desconocido abriendo el enlace público— hacía figurar el robot
    // como encendido. Solo cuentan las identidades del robot.
    estado = participants?.some((p) => p.identity?.startsWith(PREFIJO_ROBOT)) ? 'online' : 'offline';
  } catch {
    estado = 'offline';
  }

  cacheEstado.set(row.id, { estado, expira: Date.now() + CACHE_ESTADO_MS });
  return estado;
}

function decryptSecretSafe(encrypted) {
  try {
    return decryptSecret(encrypted);
  } catch {
    return null;
  }
}

app.get('/api/hello', (req, res) => res.json({ message: 'svc-robots ok' }));

app.get('/api/robots', verifyToken, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM robots ORDER BY id');
  const isAdmin = req.user.roles.includes('admin');
  const augmented = await Promise.all(
    rows.map(async (row) => ({ ...row, status: await fetchRealStatus(row) }))
  );
  res.json(augmented.map((row) => rowToRobot(row, { includeAdminFields: isAdmin })));
});

app.post('/api/robots', verifyToken, requireRole('admin'), csrfProtection, async (req, res) => {
  const body = req.body ?? {};
  const { rows: existing } = await pool.query('SELECT 1 FROM robots WHERE id = $1', [body.id]);
  if (existing.length > 0) return res.status(400).json({ message: 'El ID de robot ya existe' });

  const { id, name, status, room, modelUrl, livekitUrl, livekitApiKey, livekitApiSecret, isPublicEvent, ...settings } = body;
  await pool.query(
    `INSERT INTO robots (id, name, status, room, model_url, livekit_url, livekit_api_key, livekit_api_secret_encrypted, settings, is_public_event)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10)`,
    [id, name, status || 'offline', room || null, modelUrl || null, livekitUrl || null, livekitApiKey || null,
      encryptSecret(livekitApiSecret), JSON.stringify(settings), Boolean(isPublicEvent)]
  );
  await saveLog('info', `Administrador ${req.user.matricula} creó el robot ${id}.`);
  const { rows } = await pool.query('SELECT * FROM robots WHERE id = $1', [id]);
  res.json({ success: true, message: 'Robot creado', robot: rowToRobot(rows[0], { includeAdminFields: true }) });
});

app.put('/api/robots/:id', verifyToken, requireRole('admin'), csrfProtection, async (req, res) => {
  const { rows: existingRows } = await pool.query('SELECT * FROM robots WHERE id = $1', [req.params.id]);
  const existing = existingRows[0];
  if (!existing) return res.status(404).json({ message: 'Robot no encontrado' });

  const { name, status, room, modelUrl, livekitUrl, livekitApiKey, livekitApiSecret, isPublicEvent, ...settingsPatch } = req.body ?? {};
  const mergedSettings = { ...(existing.settings ?? {}), ...settingsPatch };
  // Solo se re-cifra el secreto si mandan un reemplazo real; nunca se acepta
  // de vuelta el valor enmascarado que el propio backend devolvió antes.
  const newEncryptedSecret =
    livekitApiSecret && !livekitApiSecret.startsWith('••••')
      ? encryptSecret(livekitApiSecret)
      : existing.livekit_api_secret_encrypted;

  await pool.query(
    `UPDATE robots SET name=$1, status=$2, room=$3, model_url=$4, livekit_url=$5, livekit_api_key=$6,
       livekit_api_secret_encrypted=$7, settings=$8::jsonb, is_public_event=$9 WHERE id=$10`,
    [
      name ?? existing.name,
      status ?? existing.status,
      room ?? existing.room,
      modelUrl ?? existing.model_url,
      livekitUrl ?? existing.livekit_url,
      livekitApiKey ?? existing.livekit_api_key,
      newEncryptedSecret,
      JSON.stringify(mergedSettings),
      isPublicEvent !== undefined ? Boolean(isPublicEvent) : existing.is_public_event,
      req.params.id,
    ]
  );
  await saveLog('info', `Administrador ${req.user.matricula} actualizó el robot ${req.params.id}.`);
  const { rows } = await pool.query('SELECT * FROM robots WHERE id = $1', [req.params.id]);
  res.json({ success: true, message: 'Robot actualizado', robot: rowToRobot(rows[0], { includeAdminFields: true }) });
});

app.delete('/api/robots/:id', verifyToken, requireRole('admin'), csrfProtection, async (req, res) => {
  await pool.query('DELETE FROM robots WHERE id = $1', [req.params.id]);
  await saveLog('warning', `Administrador ${req.user.matricula} eliminó el robot ${req.params.id}.`);
  res.json({ success: true, message: 'Robot eliminado' });
});

app.post('/api/livekit-verify', verifyToken, csrfProtection, async (req, res) => {
  const { livekitUrl, livekitApiKey, livekitApiSecret } = req.body ?? {};
  if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
    return res.status(400).json({ success: false, message: 'Faltan parámetros de conexión.' });
  }
  try {
    const httpUrl = livekitUrl.replace('wss://', 'https://').replace('ws://', 'http://');
    const roomService = new RoomServiceClient(httpUrl, livekitApiKey, livekitApiSecret);
    await roomService.listRooms();
    res.json({ success: true, message: 'Conexión a LiveKit Cloud establecida correctamente.' });
  } catch (error) {
    res.status(401).json({ success: false, message: error.message || 'Credenciales inválidas o servidor inalcanzable.' });
  }
});

app.post('/api/livekit-token', verifyToken, livekitTokenLimiter, csrfProtection, async (req, res) => {
  const { robotId } = req.body ?? {};
  const { rows } = await pool.query('SELECT * FROM robots WHERE id = $1', [robotId]);
  const robot = rows[0];
  if (!robot) return res.status(404).json({ success: false, message: 'Robot no encontrado' });

  const secret = decryptSecretSafe(robot.livekit_api_secret_encrypted);
  if (!robot.livekit_api_key || !secret) {
    return res.status(400).json({ success: false, message: 'El robot no tiene configuradas sus credenciales (API Key/Secret) de LiveKit.' });
  }

  const isOperator = req.user.roles?.includes('admin') || req.user.roles?.includes('operador');
  const grantedRole = isOperator ? 'operador' : 'espectador';
  const participantName = `${isOperator ? 'operator' : 'viewer'}-${req.user.matricula}`;

  try {
    const at = new AccessToken(robot.livekit_api_key, secret, { identity: participantName, ttl: TOKEN_TTL });
    at.addGrant({ roomJoin: true, room: robot.room, canPublish: isOperator, canSubscribe: true, canPublishData: isOperator });
    const token = await at.toJwt();
    await saveLog('info', `Usuario ${req.user.matricula} generó token de ${grantedRole} para robot ${robotId}.`);
    res.json({ success: true, token, livekitUrl: robot.livekit_url, room: robot.room });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno al generar el token' });
  }
});

// Espectador público, sin login: solo para robots que el admin marcó como
// evento público (is_public_event). Nunca puede publicar ni enviar datos —
// grant fijo de solo-lectura, sin excepciones, sin importar lo que mande el
// cliente en el body.
app.post('/api/livekit/public-token', publicTokenLimiter, async (req, res) => {
  const { robotId } = req.body ?? {};
  const { rows } = await pool.query('SELECT * FROM robots WHERE id = $1 AND is_public_event = true', [robotId]);
  const robot = rows[0];
  if (!robot) {
    return res.status(404).json({ success: false, message: 'No hay transmisión pública disponible para este robot.' });
  }

  const secret = decryptSecretSafe(robot.livekit_api_secret_encrypted);
  if (!robot.livekit_api_key || !secret) {
    return res.status(400).json({ success: false, message: 'Robot sin credenciales de LiveKit configuradas.' });
  }

  try {
    const identity = `public-viewer-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const at = new AccessToken(robot.livekit_api_key, secret, { identity, ttl: PUBLIC_TOKEN_TTL });
    at.addGrant({ roomJoin: true, room: robot.room, canPublish: false, canSubscribe: true, canPublishData: false });
    const token = await at.toJwt();
    // robotName es para el HUD del espectador. Se expone a propósito: esta
    // transmisión ya es pública (is_public_event), así que el nombre de la
    // unidad no añade nada que el espectador no vaya a ver en pantalla.
    res.json({
      success: true,
      token,
      livekitUrl: robot.livekit_url,
      room: robot.room,
      robotName: robot.name,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno al generar el token' });
  }
});

app.get('/api/logs', verifyToken, requireRole('admin'), async (req, res) => {
  const { rows } = await pool.query('SELECT type, message, date FROM logs ORDER BY date DESC LIMIT 200');
  res.json(rows);
});

app.get('/api/crowdsec/metrics', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const response = await fetch('http://crowdsec:8080/v1/decisions/stream?startup=true', {
      headers: { 'X-Api-Key': process.env.CROWDSEC_API_KEY },
    });
    if (!response.ok) throw new Error('Crowdsec HTTP ' + response.status);
    const data = await response.json();
    const decisions = data.new || [];
    const scenarios = {};
    const recent = [];
    let bannedIps = 0;
    decisions.forEach((d) => {
      if (d.type === 'ban') bannedIps++;
      scenarios[d.scenario] = (scenarios[d.scenario] || 0) + 1;
      if (recent.length < 10) recent.push({ ip: d.value, scenario: d.scenario, time: new Date().toISOString() });
    });
    const topScenarios = Object.entries(scenarios).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
    res.json({ active_decisions: decisions.length, banned_ips: bannedIps, top_scenarios: topScenarios, recent_alerts: recent });
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo metricas de CrowdSec' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`svc-robots escuchando en :${PORT} [${IS_PRODUCTION ? 'PRODUCCIÓN' : 'DESARROLLO'}]`);
});
