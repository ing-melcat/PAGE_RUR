import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Basic Route
app.get('/api/hello', (req, res) => {
  res.json({ message: '¡Hola desde tu nuevo servidor Node en MAIN!' });
});

app.listen(PORT, () => {
  console.log(`Servidor Node corriendo en http://localhost:${PORT}`);
});
