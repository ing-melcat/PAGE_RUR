// Cifrado simétrico para secretos guardados en Postgres (hoy: livekit_api_secret
// de la tabla robots). Antes vivían en texto plano en api/data/robots.json.
// AES-256-GCM: la clave nunca se guarda en la base de datos, solo en la
// variable de entorno ROBOTS_SECRET_KEY del servicio que la usa.
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getKey(rawKey) {
  const key = rawKey ?? process.env.ROBOTS_SECRET_KEY;
  if (!key) {
    throw new Error('Missing ROBOTS_SECRET_KEY environment variable.');
  }
  // openssl rand -base64 32 produce 32 bytes en base64 -> clave AES-256 exacta.
  const buf = Buffer.from(key, 'base64');
  if (buf.length !== 32) {
    throw new Error('ROBOTS_SECRET_KEY debe decodificar a 32 bytes (usa: openssl rand -base64 32).');
  }
  return buf;
}

export function encryptSecret(plaintext, rawKey) {
  if (plaintext === null || plaintext === undefined || plaintext === '') return null;
  const key = getKey(rawKey);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join(':');
}

export function decryptSecret(stored, rawKey) {
  if (!stored) return null;
  const key = getKey(rawKey);
  const [ivB64, tagB64, dataB64] = stored.split(':');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Formato inválido de secreto cifrado.');
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]);
  return plaintext.toString('utf8');
}

// Para mostrar en el panel admin sin exponer el secreto completo (ej. "••••3A").
export function maskSecret(plaintext) {
  if (!plaintext) return '';
  const tail = plaintext.slice(-4);
  return `${'•'.repeat(8)}${tail}`;
}
