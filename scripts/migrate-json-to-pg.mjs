// Migra api/data/{users,posts,robots,logs}.json a Postgres. Idempotente:
// se puede correr varias veces sin duplicar filas (INSERT ... ON CONFLICT).
// El monolito (rur-web) sigue leyendo/escribiendo los JSON mientras esta
// fase se valida — este script NO los borra ni los toca, solo los lee.
//
// Uso:
//   PGHOST=localhost PGPORT=55432 PGUSER=postgres PGPASSWORD=... PGDATABASE=rur \
//   ROBOTS_SECRET_KEY=$(openssl rand -base64 32) \
//   node scripts/migrate-json-to-pg.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { encryptSecret } from '../services/shared/crypto.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.RUR_DATA_DIR || path.join(__dirname, '..', 'api', 'data');

function readJson(name, fallback) {
  const file = path.join(DATA_DIR, name);
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

async function migrateUsers(client, users) {
  let count = 0;
  for (const u of users) {
    const isHashed = typeof u.password === 'string' && u.password.startsWith('$2');
    // Aprovechamos la migración para cerrar el hueco de contraseñas en texto
    // plano en vez de arrastrarlo a la base de datos nueva.
    const passwordHash = isHashed ? u.password : bcrypt.hashSync(String(u.password ?? ''), 10);
    await client.query(
      `INSERT INTO users (matricula, password_hash, nombre, grupo, roles, alias, control_mappings)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb)
       ON CONFLICT (matricula) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         nombre = EXCLUDED.nombre,
         grupo = EXCLUDED.grupo,
         roles = EXCLUDED.roles,
         alias = EXCLUDED.alias,
         control_mappings = EXCLUDED.control_mappings`,
      [
        u.matricula,
        passwordHash,
        u.nombre ?? u.matricula,
        u.grupo ?? null,
        JSON.stringify(u.roles ?? []),
        u.alias ?? null,
        JSON.stringify(u.control_mappings ?? {}),
      ]
    );
    count++;
  }
  return count;
}

const POST_KNOWN_FIELDS = new Set([
  'id', 'title', 'type', 'content', 'image', 'videoUrl', 'modelUrl',
  'category', 'isHidden', 'pages', 'author', 'date',
]);

async function migratePosts(client, posts) {
  let count = 0;
  for (const p of posts) {
    const extra = Object.fromEntries(
      Object.entries(p).filter(([k, v]) => !POST_KNOWN_FIELDS.has(k) && v !== undefined)
    );
    await client.query(
      `INSERT INTO posts (id, title, type, content, image, video_url, model_url, category, is_hidden, pages, extra)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         type = EXCLUDED.type,
         content = EXCLUDED.content,
         image = EXCLUDED.image,
         video_url = EXCLUDED.video_url,
         model_url = EXCLUDED.model_url,
         category = EXCLUDED.category,
         is_hidden = EXCLUDED.is_hidden,
         pages = EXCLUDED.pages,
         extra = EXCLUDED.extra`,
      [
        p.id,
        p.title,
        p.type ?? 'simple',
        p.content ?? null,
        p.image ?? null,
        p.videoUrl ?? null,
        p.modelUrl ?? null,
        p.category ?? null,
        Boolean(p.isHidden),
        JSON.stringify(p.pages ?? []),
        JSON.stringify(extra),
      ]
    );
    count++;
  }
  return count;
}

async function migrateRobots(client, robots, secretKey) {
  let count = 0;
  for (const r of robots) {
    const { id, name, status, room, modelUrl, livekitUrl, livekitApiKey, livekitApiSecret, ...rest } = r;
    const encryptedSecret = encryptSecret(livekitApiSecret, secretKey);
    await client.query(
      `INSERT INTO robots (id, name, status, room, model_url, livekit_url, livekit_api_key, livekit_api_secret_encrypted, settings, is_public_event)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         status = EXCLUDED.status,
         room = EXCLUDED.room,
         model_url = EXCLUDED.model_url,
         livekit_url = EXCLUDED.livekit_url,
         livekit_api_key = EXCLUDED.livekit_api_key,
         livekit_api_secret_encrypted = EXCLUDED.livekit_api_secret_encrypted,
         settings = EXCLUDED.settings`,
      [
        id,
        name,
        status ?? 'offline',
        room ?? null,
        modelUrl ?? null,
        livekitUrl ?? null,
        livekitApiKey ?? null,
        encryptedSecret,
        JSON.stringify(rest),
        false,
      ]
    );
    count++;
  }
  return count;
}

async function migrateLogs(client, logs) {
  let count = 0;
  for (const l of logs) {
    await client.query(
      `INSERT INTO logs (type, message, date) VALUES ($1, $2, $3)`,
      [l.type, l.message, l.timestamp ?? new Date().toISOString()]
    );
    count++;
  }
  return count;
}

async function main() {
  const secretKey = process.env.ROBOTS_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Falta ROBOTS_SECRET_KEY en el entorno (necesaria para cifrar livekit_api_secret).');
  }

  const users = readJson('users.json', []);
  const posts = readJson('posts.json', []);
  const robots = readJson('robots.json', []);
  const logs = readJson('logs.json', []);

  const client = new pg.Client();
  await client.connect();

  try {
    await client.query('BEGIN');

    // logs solo se migran si la tabla está vacía: si ya se corrió antes, no
    // queremos duplicar 100 filas de log en cada re-ejecución (logs no tiene
    // una clave natural para ON CONFLICT).
    const { rows: logCountRows } = await client.query('SELECT count(*)::int AS c FROM logs');
    const shouldMigrateLogs = logCountRows[0].c === 0;

    const results = {
      users: await migrateUsers(client, users),
      posts: await migratePosts(client, posts),
      robots: await migrateRobots(client, robots, secretKey),
      logs: shouldMigrateLogs ? await migrateLogs(client, logs) : 0,
    };

    await client.query('COMMIT');

    console.log('Migración completa:');
    console.log(`  users:  ${results.users} / ${users.length} en JSON`);
    console.log(`  posts:  ${results.posts} / ${posts.length} en JSON`);
    console.log(`  robots: ${results.robots} / ${robots.length} en JSON`);
    console.log(`  logs:   ${results.logs} migrados (${shouldMigrateLogs ? '' : 'ya había datos, se omitió'})`);

    for (const table of ['users', 'posts', 'robots', 'logs']) {
      const { rows } = await client.query(`SELECT count(*)::int AS c FROM ${table}`);
      console.log(`  Postgres ${table}: ${rows[0].c} filas totales`);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Migración falló:', err);
  process.exit(1);
});
