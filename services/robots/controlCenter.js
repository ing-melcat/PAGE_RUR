// Centro de Control (app de escritorio de la estación de tierra).
//
// La app NO usa la sesión por cookie del navegador: se autentica con una llave
// de dispositivo (`Authorization: Bearer rurcc_...`) que crea un administrador
// desde el panel. Solo se guarda el SHA-256 de la llave y se puede revocar.
//
// Lo que la app puede hacer con esa llave, y nada más:
//   - GET  /api/control-center/robots            lista sin secretos + versión
//   - POST /api/control-center/robots/:id/tokens tokens `robot-<id>` firmados aquí
//
// El API Secret de LiveKit nunca sale de este servicio: la app recibe JWT ya
// firmados y con caducidad. Si roban el equipo, lo que se filtra caduca solo y
// la llave se revoca desde el panel.
import crypto from 'crypto';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { verifyToken, noStore, requirePermiso } from '../shared/auth.js';
import { csrfProtection } from '../shared/csrf.js';
import { decryptSecret } from '../shared/crypto.js';
import { saveLog } from '../shared/logs.js';

const PREFIJO_LLAVE = 'rurcc_';
const TOKEN_TTL_SEGUNDOS = 4 * 60 * 60;
const LAST_SEEN_CADA_MS = 60 * 1000;
const DOMINIO_ROS_POR_DEFECTO = 42;

// Mismo criterio que PREFIJO_ROBOT en server.js: la web reconoce al robot por
// el prefijo `robot-`. Cada proceso necesita identidad propia porque LiveKit
// expulsa a un participante cuando entra otro con la misma identidad.
const IDENTIDADES = {
  receiver: (id) => `robot-${id}`,
  camera: (id) => `robot-${id}-cam`,
};

function sha256(texto) {
  return crypto.createHash('sha256').update(texto).digest('hex');
}

// Huella corta para detectar que un valor cambió sin revelarlo.
function huella(texto) {
  return texto ? sha256(texto).slice(0, 12) : null;
}

function descifrarSeguro(cifrado) {
  try {
    return cifrado ? decryptSecret(cifrado) : null;
  } catch {
    return null;
  }
}

function dominioRos(settings) {
  const valor = Number(settings?.rosDomainId);
  return Number.isInteger(valor) && valor >= 0 && valor <= 232 ? valor : DOMINIO_ROS_POR_DEFECTO;
}

const cacheEstado = new Map();
async function consultarEstadoLivekit(robot, pool) {
  const enCache = cacheEstado.get(robot.id);
  if (enCache && enCache.expira > Date.now()) return enCache.estado;
  const secreto = descifrarSeguro(robot.livekit_api_secret_encrypted);
  if (!robot.livekit_url || !robot.livekit_api_key || !secreto) return 'offline';
  try {
    const roomService = new RoomServiceClient(robot.livekit_url, robot.livekit_api_key, secreto);
    const participants = await Promise.race([
      roomService.listParticipants(robot.room),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
    ]);
    const online = participants?.some((p) => p.identity?.startsWith('robot-')) ? 'online' : 'offline';
    cacheEstado.set(robot.id, { estado: online, expira: Date.now() + 5000 });
    return online;
  } catch {
    return 'offline';
  }
}

async function filaARobotCentro(row, pool) {
  const secreto = descifrarSeguro(row.livekit_api_secret_encrypted);
  const status = await consultarEstadoLivekit(row, pool);
  return {
    id: row.id,
    name: row.name,
    status,
    room: row.room,
    livekitUrl: row.livekit_url,
    rosDomainId: dominioRos(row.settings),
    locomotionType: row.settings?.locomotionType ?? null,
    hasCredentials: Boolean(row.livekit_url && row.livekit_api_key && secreto),
    apiKeyFingerprint: huella(row.livekit_api_key),
    secretFingerprint: huella(secreto),
    version: row.config_version,
    updatedAt: row.config_updated_at,
  };
}

export function crearRutasCentroControl(pool) {
  const router = express.Router();

  const limitadorDispositivo = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    keyGenerator: (req) => (req.dispositivo ? `cc-${req.dispositivo.id}` : req.ip),
    handler: (req, res) =>
      res.status(429).json({ success: false, codigo: 'RATE_LIMITED', message: 'Demasiadas solicitudes del Centro de Control. Reintenta en un minuto.' }),
  });

  // Antes de buscar la llave, para que adivinar llaves cueste caro por IP.
  const limitadorAutenticacion = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    keyGenerator: (req) => req.ip,
    handler: (req, res) =>
      res.status(429).json({ success: false, codigo: 'RATE_LIMITED', message: 'Demasiadas solicitudes. Reintenta en un minuto.' }),
  });

  async function verificarDispositivo(req, res, next) {
    const cabecera = req.headers.authorization || '';
    const llave = cabecera.startsWith('Bearer ') ? cabecera.slice(7).trim() : '';
    if (!llave.startsWith(PREFIJO_LLAVE) || llave.length < 40 || llave.length > 100) {
      return res.status(401).json({ success: false, codigo: 'DEVICE_UNAUTHORIZED', message: 'Falta la llave de dispositivo o tiene un formato inválido.' });
    }
    try {
      const { rows } = await pool.query(
        'SELECT id, nombre, revocado, last_seen FROM control_center_devices WHERE key_hash = $1',
        [sha256(llave)]
      );
      const dispositivo = rows[0];
      if (!dispositivo) {
        return res.status(401).json({ success: false, codigo: 'DEVICE_UNAUTHORIZED', message: 'Llave de dispositivo desconocida.' });
      }
      if (dispositivo.revocado) {
        return res.status(401).json({ success: false, codigo: 'DEVICE_REVOKED', message: 'La llave de este Centro de Control fue revocada en el panel web.' });
      }
      req.dispositivo = dispositivo;

      const ultimaVez = dispositivo.last_seen ? new Date(dispositivo.last_seen).getTime() : 0;
      if (Date.now() - ultimaVez > LAST_SEEN_CADA_MS) {
        pool.query('UPDATE control_center_devices SET last_seen = now(), last_ip = $1 WHERE id = $2', [req.ip?.slice(0, 64) ?? null, dispositivo.id])
          .catch((err) => console.error('[svc-robots] No se pudo actualizar last_seen:', err.message));
      }
      next();
    } catch (err) {
      next(err);
    }
  }

  // ---------------------------------------------------------------------
  // Rutas que consume la app de escritorio (llave de dispositivo)
  // ---------------------------------------------------------------------

  router.get('/api/control-center/robots', limitadorAutenticacion, verificarDispositivo, limitadorDispositivo, noStore, async (req, res) => {
    const { rows } = await pool.query(
      `SELECT id, name, room, livekit_url, livekit_api_key, livekit_api_secret_encrypted,
              settings, config_version, config_updated_at
         FROM robots ORDER BY id`
    );
    const robots = await Promise.all(rows.map((row) => filaARobotCentro(row, pool)));
    // ETag sobre lo que se devuelve: la app consulta cada pocos segundos y
    // casi siempre recibe un 304 sin cuerpo.
    const etag = `"${sha256(JSON.stringify(robots)).slice(0, 32)}"`;
    res.setHeader('ETag', etag);
    if (req.headers['if-none-match'] === etag) return res.status(304).end();
    res.json({ success: true, generatedAt: new Date().toISOString(), robots });
  });

  router.post('/api/control-center/robots/:id/tokens', limitadorAutenticacion, verificarDispositivo, limitadorDispositivo, noStore, async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM robots WHERE id = $1', [req.params.id]);
    const robot = rows[0];
    if (!robot) {
      return res.status(404).json({ success: false, codigo: 'ROBOT_DELETED', message: `El robot ${req.params.id} ya no existe en la plataforma.` });
    }
    const secreto = descifrarSeguro(robot.livekit_api_secret_encrypted);
    if (!robot.livekit_url || !robot.livekit_api_key || !secreto) {
      return res.status(400).json({ success: false, codigo: 'NO_CREDENTIALS', message: `El robot ${robot.name} no tiene URL, API Key o API Secret de LiveKit configurados en la web.` });
    }
    if (!robot.room) {
      return res.status(400).json({ success: false, codigo: 'NO_CREDENTIALS', message: `El robot ${robot.name} no tiene sala (room) configurada.` });
    }

    const tokens = {};
    for (const [rol, identidad] of Object.entries(IDENTIDADES)) {
      const at = new AccessToken(robot.livekit_api_key, secreto, {
        identity: identidad(robot.id),
        name: `${robot.name} (${rol === 'receiver' ? 'receptor' : 'cámara'})`,
        ttl: TOKEN_TTL_SEGUNDOS,
      });
      at.addGrant({ roomJoin: true, room: robot.room, canPublish: true, canSubscribe: true, canPublishData: true });
      tokens[rol] = await at.toJwt();
    }

    saveLog('info', `Centro de Control "${req.dispositivo.nombre}" obtuvo tokens del robot ${robot.id}.`)
      .catch((err) => console.error('[svc-robots] No se pudo guardar el log de tokens:', err.message));

    res.json({
      success: true,
      robot: await filaARobotCentro(robot, pool),
      livekitUrl: robot.livekit_url,
      room: robot.room,
      rosDomainId: dominioRos(robot.settings),
      expiresAt: new Date(Date.now() + TOKEN_TTL_SEGUNDOS * 1000).toISOString(),
      identities: { receiver: IDENTIDADES.receiver(robot.id), camera: IDENTIDADES.camera(robot.id) },
      tokens,
    });
  });

  // ---------------------------------------------------------------------
  // Administración de llaves (panel web, sesión por cookie)
  // ---------------------------------------------------------------------

  router.get('/api/control-center/devices', verifyToken, requirePermiso('robots.gestionar'), noStore, async (req, res) => {
    const { rows } = await pool.query(
      `SELECT id, nombre, key_prefix, creado_por, creado_en, revocado, revocado_en, last_seen, last_ip
         FROM control_center_devices ORDER BY revocado, creado_en DESC`
    );
    res.json({
      success: true,
      devices: rows.map((d) => ({
        id: d.id,
        nombre: d.nombre,
        keyPrefix: d.key_prefix,
        creadoPor: d.creado_por,
        creadoEn: d.creado_en,
        revocado: d.revocado,
        revocadoEn: d.revocado_en,
        lastSeen: d.last_seen,
        lastIp: d.last_ip,
      })),
    });
  });

  router.post('/api/control-center/devices', verifyToken, requirePermiso('robots.gestionar'), csrfProtection, noStore, async (req, res) => {
    const nombre = String(req.body?.nombre ?? '').trim();
    if (nombre.length < 2 || nombre.length > 120) {
      return res.status(400).json({ success: false, message: 'El nombre del equipo debe tener entre 2 y 120 caracteres.' });
    }
    const llave = `${PREFIJO_LLAVE}${crypto.randomBytes(32).toString('base64url')}`;
    const { rows } = await pool.query(
      `INSERT INTO control_center_devices (nombre, key_hash, key_prefix, creado_por)
       VALUES ($1, $2, $3, $4) RETURNING id, nombre, key_prefix, creado_en`,
      [nombre, sha256(llave), llave.slice(0, 12), req.user.matricula]
    );
    await saveLog('info', `Administrador ${req.user.matricula} creó la llave del Centro de Control "${nombre}".`);
    // Única vez que la llave viaja en claro.
    res.json({ success: true, device: { id: rows[0].id, nombre: rows[0].nombre, keyPrefix: rows[0].key_prefix, creadoEn: rows[0].creado_en }, key: llave });
  });

  router.delete('/api/control-center/devices/:id', verifyToken, requirePermiso('robots.gestionar'), csrfProtection, async (req, res) => {
    const { rows } = await pool.query(
      'UPDATE control_center_devices SET revocado = true, revocado_en = now() WHERE id = $1 AND revocado = false RETURNING nombre',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Llave no encontrada o ya revocada.' });
    await saveLog('warning', `Administrador ${req.user.matricula} revocó la llave del Centro de Control "${rows[0].nombre}".`);
    res.json({ success: true, message: 'Llave revocada' });
  });

  return router;
}
