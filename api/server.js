import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'data', 'posts.json');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const TOKEN_TTL = '4h';

import multer from 'multer';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = /\.(jpg|jpeg|png|gif|webp|glb|gltf|mp4)$/i;
  if (!file.originalname.match(allowedExtensions)) {
    return cb(new Error('Formato de archivo no permitido. Solo se permiten imágenes, videos y modelos 3D.'));
  }
  cb(null, true);
};

const upload = multer({ storage, fileFilter });
const livekitTokenLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.matricula || req.ip,
  handler: (req, res) => res.status(429).json({ success: false, message: 'Demasiadas solicitudes: espera un minuto antes de reintentar.' }),
});
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('Missing JWT_SECRET environment variable. Set JWT_SECRET before starting the server.');
}
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const DIST_DIR = path.join(__dirname, '..', 'dist');


const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(403).json({ success: false, message: 'Se requiere token de autenticación' });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
    req.user = decoded;
    next();
  });
};

// CORS: en producción solo permitir el mismo origen; en desarrollo todo abierto
if (IS_PRODUCTION) {
  app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
} else {
  app.use(cors());
}
app.use(express.json());
app.use('/api/uploads', express.static(UPLOADS_DIR));

// En producción, servir los archivos estáticos del build de Vite
if (IS_PRODUCTION) {
  app.use(express.static(DIST_DIR));
}

// Asegurar que exista el directorio y el archivo de datos
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}
if (!fs.existsSync(USERS_FILE)) {
  const initialUsers = [
    { matricula: 'admin', password: '123', nombre: 'Administrador RUR', roles: ['admin'], grupo: 'DEV', alias: 'Admin' }
  ];
  fs.writeFileSync(USERS_FILE, JSON.stringify(initialUsers));
}

const LOGS_FILE = path.join(__dirname, 'data', 'logs.json');
if (!fs.existsSync(LOGS_FILE)) {
  fs.writeFileSync(LOGS_FILE, JSON.stringify([]));
}

const ROBOTS_FILE = path.join(__dirname, 'data', 'robots.json');
if (!fs.existsSync(ROBOTS_FILE)) {
  const initialRobots = [
    { id: "rassor-1", name: "RASSOR Alpha", status: "online", room: "room-rassor-1", modelUrl: "", livekitUrl: "", livekitApiKey: "", livekitApiSecret: "" }
  ];
  fs.writeFileSync(ROBOTS_FILE, JSON.stringify(initialRobots));
}

const getPosts = () => JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
const savePosts = (posts) => fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2));

const getUsers = () => JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
const saveUsers = (users) => fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

const getRobots = () => JSON.parse(fs.readFileSync(ROBOTS_FILE, 'utf-8'));
const saveRobots = (robots) => fs.writeFileSync(ROBOTS_FILE, JSON.stringify(robots, null, 2));

const getLogs = () => JSON.parse(fs.readFileSync(LOGS_FILE, 'utf-8'));
const saveLog = (type, message) => {
  const logs = getLogs();
  const timestamp = new Date().toISOString();
  logs.push({ timestamp, type, message });
  // Keep only the last 100 logs to prevent file bloat
  if (logs.length > 100) logs.shift();
  fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));
};

// Endpoints
app.get('/api/hello', (req, res) => {
  res.json({ message: '¡Hola desde tu nuevo servidor Node en MAIN!' });
});

app.post(['/api/login', '/api/login.php'], (req, res) => {
  const { matricula, password } = req.body;
  const users = getUsers();
  const userRecord = users.find(u => u.matricula === matricula);

  let isMatch = false;
  if (userRecord) {
    if (userRecord.password.startsWith('$2')) {
      isMatch = bcrypt.compareSync(password, userRecord.password);
    } else {
      isMatch = userRecord.password === password;
      // Optionally rehash plain text password on login here, but let's keep it simple
    }
  }

  if (userRecord && isMatch) {
    const { password, ...safeUser } = userRecord;
    const user = {
      id: safeUser.matricula,
      ...safeUser,
      control_mappings: {}
    };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
    
    saveLog('success', `Usuario ${safeUser.nombre} (${matricula}) inició sesión exitosamente.`);
    
    return res.json({
      success: true,
      token,
      user
    });
  }

  if (userRecord) {
    saveLog('error', `Intento de acceso fallido para ${matricula} (Contraseña incorrecta).`);
  } else {
    saveLog('warning', `Intento de acceso fallido para usuario inexistente: ${matricula}`);
  }

  res.status(401).json({ success: false, message: 'Matrícula o código incorrecto' });
});

// GET: Leer el usuario actual desde el token (Validación Backend)
app.get('/api/me', verifyToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

// GET: Leer todas las publicaciones
app.get('/api/posts', (req, res) => res.json(getPosts()));

// POST: Subir archivo/imagen local
app.post('/api/upload', verifyToken, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo.' });
  const fileUrl = `/api/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message.includes('Formato')) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

// POST: Crear una nueva publicación (simple o revista)
app.post('/api/posts', verifyToken, (req, res) => {
  if (!req.user.roles.includes('admin') && !req.user.roles.includes('redactor')) {
    return res.status(403).json({ message: 'No tienes permisos para crear publicaciones' });
  }
  const posts = getPosts();
  const newPost = { 
    id: Date.now().toString(), 
    ...req.body, 
    // Si es modo revista, inicializar array de páginas
    pages: req.body.type === 'magazine' ? (req.body.pages || []) : undefined 
  };
  posts.push(newPost);
  savePosts(posts);
  res.status(201).json(newPost);
});

// PUT: Actualizar una publicación (ej. añadir/editar páginas)
app.put('/api/posts/:id', verifyToken, (req, res) => {
  if (!req.user.roles.includes('admin') && !req.user.roles.includes('redactor')) {
    return res.status(403).json({ message: 'No tienes permisos para editar publicaciones' });
  }
  const posts = getPosts();
  const index = posts.findIndex(p => p.id === req.params.id);
  if (index !== -1) {
    // Prevent overriding sensitive fields like id
    const { id, ...updateData } = req.body;
    posts[index] = { ...posts[index], ...updateData };
    savePosts(posts);
    res.json(posts[index]);
  } else {
    res.status(404).json({ message: "Publicación no encontrada" });
  }
});

// DELETE: Eliminar una publicación
app.delete('/api/posts/:id', verifyToken, (req, res) => {
  if (!req.user.roles.includes('admin')) {
    return res.status(403).json({ message: 'Solo los administradores pueden eliminar' });
  }
  let posts = getPosts();
  const initialLength = posts.length;
  posts = posts.filter(p => p.id !== req.params.id);
  if (posts.length < initialLength) {
    savePosts(posts);
    res.json({ success: true });
  } else {
    res.status(404).json({ message: "Publicación no encontrada" });
  }
});

// USERS MANAGEMENT
app.get('/api/users', verifyToken, (req, res) => {
  if (!req.user.roles.includes('admin')) return res.status(403).json({ message: 'Sin permisos' });
  const users = getUsers().map(({ password, ...u }) => u);
  res.json(users);
});

app.post('/api/users', verifyToken, (req, res) => {
  if (!req.user.roles.includes('admin')) return res.status(403).json({ message: 'Sin permisos' });
  const users = getUsers();
  if (users.find(u => u.matricula === req.body.matricula)) {
    return res.status(400).json({ message: 'La matrícula ya existe' });
  }
  const newUser = {
    matricula: req.body.matricula,
    password: bcrypt.hashSync(req.body.password, 10),
    nombre: req.body.nombre,
    roles: req.body.roles || [],
    grupo: req.body.grupo || 'GENERAL',
    alias: req.body.alias || ''
  };
  users.push(newUser);
  saveUsers(users);
  saveLog('info', `Administrador ${req.user.matricula} creó el usuario ${newUser.matricula}.`);
  res.json({ success: true, message: 'Usuario creado' });
});

app.put('/api/users/:matricula', verifyToken, (req, res) => {
  if (!req.user.roles.includes('admin')) return res.status(403).json({ message: 'Sin permisos' });
  const users = getUsers();
  const userIndex = users.findIndex(u => u.matricula === req.params.matricula);
  
  if (userIndex === -1) {
    return res.status(404).json({ message: 'Usuario no encontrado' });
  }

  const existingUser = users[userIndex];
  
  // Update fields
  if (req.body.nombre) existingUser.nombre = req.body.nombre;
  if (req.body.roles) existingUser.roles = req.body.roles;
  if (req.body.grupo) existingUser.grupo = req.body.grupo;
  if (req.body.alias !== undefined) existingUser.alias = req.body.alias;
  
  // Update password if provided
  if (req.body.password && req.body.password.trim() !== '') {
    existingUser.password = bcrypt.hashSync(req.body.password, 10);
  }

  users[userIndex] = existingUser;
  saveUsers(users);
  saveLog('info', `Administrador ${req.user.matricula} modificó el usuario ${req.params.matricula}.`);
  res.json({ success: true, message: 'Usuario actualizado correctamente' });
});

app.delete('/api/users/:matricula', verifyToken, (req, res) => {
  if (!req.user.roles.includes('admin')) return res.status(403).json({ message: 'Sin permisos' });
  let users = getUsers();
  if (req.params.matricula === req.user.matricula) {
    return res.status(400).json({ message: 'No puedes eliminarte a ti mismo' });
  }
  users = users.filter(u => u.matricula !== req.params.matricula);
  saveUsers(users);
  saveLog('warning', `Administrador ${req.user.matricula} eliminó el usuario ${req.params.matricula}.`);
  res.json({ success: true, message: 'Usuario eliminado' });
});

// LOGS MANAGEMENT
app.get('/api/logs', verifyToken, (req, res) => {
  if (!req.user.roles.includes('admin')) return res.status(403).json({ message: 'Sin permisos' });
  res.json(getLogs().reverse()); // Envía los logs más recientes primero
});

// CROWDSEC METRICS (Real data from LAPI)
app.get('/api/crowdsec/metrics', verifyToken, async (req, res) => {
  if (!req.user.roles.includes('admin')) return res.status(403).json({ message: 'Sin permisos' });
  
  try {
    const fetch = (await import('node-fetch')).default || globalThis.fetch;
    const response = await fetch('http://crowdsec:8080/v1/decisions/stream?startup=true', {
      headers: { 'X-Api-Key': process.env.CROWDSEC_API_KEY }
    });
    
    if (!response.ok) {
      throw new Error('Crowdsec HTTP ' + response.status);
    }
    
    const data = await response.json();
    const decisions = data.new || [];
    
    const scenarios = {};
    const recent = [];
    let bannedIps = 0;
    
    decisions.forEach(d => {
      if (d.type === 'ban') bannedIps++;
      scenarios[d.scenario] = (scenarios[d.scenario] || 0) + 1;
      
      if (recent.length < 10) {
        recent.push({
          ip: d.value,
          scenario: d.scenario,
          time: new Date().toISOString()
        });
      }
    });
    
    const topScenarios = Object.entries(scenarios)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
      
    res.json({
      active_decisions: decisions.length,
      banned_ips: bannedIps,
      top_scenarios: topScenarios,
      recent_alerts: recent
    });
  } catch (error) {
    console.error("Error fetching crowdsec metrics:", error);
    res.status(500).json({ message: 'Error obteniendo metricas de CrowdSec' });
  }
});
  
  // En producción, aquí harías una petición real a la LAPI de CrowdSec o a Prometheus
  // ej: fetch('http://crowdsec:8080/v1/alerts?active=true', { headers: { 'X-Api-Key': 'tu-key' } })
  
  const mockMetrics = {
    active_decisions: 142,
    banned_ips: 135,
    top_scenarios: [
      { name: "crowdsecurity/ssh-bf", count: 45 },
      { name: "crowdsecurity/http-bad-user-agent", count: 32 },
      { name: "crowdsecurity/http-probing", count: 28 }
    ],
    recent_alerts: [
      { ip: "192.168.1.105", scenario: "crowdsecurity/ssh-bf", time: new Date(Date.now() - 5000).toISOString() },
      { ip: "203.0.113.42", scenario: "crowdsecurity/http-probing", time: new Date(Date.now() - 150000).toISOString() }
    ]
  };
  
  res.json(mockMetrics);
});


// ROBOTS MANAGEMENT
app.get('/api/robots', verifyToken, async (req, res) => {
  const robots = getRobots();
  
  const augmentedRobots = await Promise.all(robots.map(async (robot) => {
    let realStatus = 'offline'; // Default
    if (robot.livekitUrl && robot.livekitApiKey && robot.livekitApiSecret) {
      try {
        const roomService = new RoomServiceClient(robot.livekitUrl, robot.livekitApiKey, robot.livekitApiSecret);
        const participants = await roomService.listParticipants(robot.room);
        
        if (participants && participants.length > 0) {
          realStatus = 'online';
        }
      } catch (error) {
        // Sala vacía o inexistente
      }
    }
    return { ...robot, status: realStatus };
  }));

  if (!req.user.roles.includes('admin')) {
    const safeRobots = augmentedRobots.map(({ livekitApiKey, livekitApiSecret, ...r }) => r);
    return res.json(safeRobots);
  }
  res.json(augmentedRobots);
});

app.post('/api/robots', verifyToken, (req, res) => {
  if (!req.user.roles.includes('admin')) return res.status(403).json({ message: 'Sin permisos' });
  const robots = getRobots();
  if (robots.find(r => r.id === req.body.id)) {
    return res.status(400).json({ message: 'El ID de robot ya existe' });
  }
  robots.push(req.body);
  saveRobots(robots);
  res.json({ success: true, message: 'Robot creado', robot: req.body });
});

app.put('/api/robots/:id', verifyToken, (req, res) => {
  if (!req.user.roles.includes('admin')) return res.status(403).json({ message: 'Sin permisos' });
  const robots = getRobots();
  const index = robots.findIndex(r => r.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Robot no encontrado' });
  
  robots[index] = { ...robots[index], ...req.body };
  saveRobots(robots);
  res.json({ success: true, message: 'Robot actualizado', robot: robots[index] });
});

app.delete('/api/robots/:id', verifyToken, (req, res) => {
  if (!req.user.roles.includes('admin')) return res.status(403).json({ message: 'Sin permisos' });
  let robots = getRobots();
  robots = robots.filter(r => r.id !== req.params.id);
  saveRobots(robots);
  res.json({ success: true, message: 'Robot eliminado' });
});

// LIVEKIT VERIFICATION ENDPOINT
app.post('/api/livekit-verify', verifyToken, async (req, res) => {
  const { livekitUrl, livekitApiKey, livekitApiSecret } = req.body;
  if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
    return res.status(400).json({ success: false, message: 'Faltan parámetros de conexión.' });
  }

  try {
    const httpUrl = livekitUrl.replace('wss://', 'https://').replace('ws://', 'http://');
    const roomService = new RoomServiceClient(httpUrl, livekitApiKey, livekitApiSecret);
    // Intentar listar las salas sirve como prueba de conexión real y autenticación
    await roomService.listRooms();
    res.json({ success: true, message: 'Conexión a LiveKit Cloud establecida correctamente.' });
  } catch (error) {
    console.error("LiveKit verification error:", error);
    res.status(401).json({ success: false, message: error.message || 'Credenciales inválidas o servidor inalcanzable.' });
  }
});

// LIVEKIT TOKEN GENERATOR
app.post('/api/livekit-token', verifyToken, livekitTokenLimiter, async (req, res) => {
  const { robotId } = req.body;
  const robots = getRobots();
  const robot = robots.find(r => r.id === robotId);

  if (!robot) {
    return res.status(404).json({ success: false, message: 'Robot no encontrado' });
  }

  if (!req.user.roles || (!req.user.roles.includes('admin') && !req.user.roles.includes('operador'))) {
    return res.status(403).json({ success: false, message: 'No tienes permisos para obtener un token con publicación' });
  }

  if (!robot.livekitApiKey || !robot.livekitApiSecret) {
    return res.status(400).json({ success: false, message: 'El robot no tiene configuradas sus credenciales (API Key/Secret) de LiveKit.' });
  }

  try {
    const participantName = `operator-${req.user.matricula}`;
    const at = new AccessToken(robot.livekitApiKey, robot.livekitApiSecret, {
      identity: participantName,
      ttl: TOKEN_TTL,
    });
    
    // Asignar permisos: unirse a la room específica, publicar y suscribirse
    at.addGrant({
      roomJoin: true,
      room: robot.room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });
    
    const token = await at.toJwt();
    await saveLog('info', `Usuario ${req.user.matricula} generó token para robot ${robotId} a las ${new Date().toISOString()}`);
    res.json({ success: true, token, livekitUrl: robot.livekitUrl, room: robot.room });
  } catch (error) {
    console.error("Error generando token:", error);
    res.status(500).json({ success: false, message: 'Error interno al generar el token' });
  }
});

// SPA catch-all: en producción, cualquier ruta no-API devuelve index.html
if (IS_PRODUCTION) {
  app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor RUR corriendo en puerto ${PORT} [${IS_PRODUCTION ? 'PRODUCCIÓN' : 'DESARROLLO'}]`);
});
