import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'data', 'posts.json');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

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
const JWT_SECRET = 'rur_super_secret_key_2026';

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(403).json({ success: false, message: 'Se requiere token de autenticación' });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
    req.user = decoded;
    next();
  });
};

app.use(cors());
app.use(express.json());
app.use('/api/uploads', express.static(UPLOADS_DIR));

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

const getPosts = () => JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
const savePosts = (posts) => fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2));

const getUsers = () => JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
const saveUsers = (users) => fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

// Endpoints
app.get('/api/hello', (req, res) => {
  res.json({ message: '¡Hola desde tu nuevo servidor Node en MAIN!' });
});

app.post('/api/login.php', (req, res) => {
  const { matricula, password } = req.body;
  const users = getUsers();
  const userRecord = users.find(u => u.matricula === matricula && u.password === password);

  if (userRecord) {
    const { password, ...safeUser } = userRecord;
    const user = {
      id: safeUser.matricula,
      ...safeUser,
      control_mappings: {}
    };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
    
    return res.json({
      success: true,
      token,
      user
    });
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
    password: req.body.password,
    nombre: req.body.nombre,
    roles: req.body.roles || [],
    grupo: req.body.grupo || 'GENERAL',
    alias: req.body.alias || ''
  };
  users.push(newUser);
  saveUsers(users);
  res.json({ success: true, message: 'Usuario creado' });
});

app.delete('/api/users/:matricula', verifyToken, (req, res) => {
  if (!req.user.roles.includes('admin')) return res.status(403).json({ message: 'Sin permisos' });
  let users = getUsers();
  if (req.params.matricula === req.user.matricula) {
    return res.status(400).json({ message: 'No puedes eliminarte a ti mismo' });
  }
  users = users.filter(u => u.matricula !== req.params.matricula);
  saveUsers(users);
  res.json({ success: true, message: 'Usuario eliminado' });
});

app.listen(PORT, () => {
  console.log(`Servidor Node corriendo en http://localhost:${PORT}`);
});
