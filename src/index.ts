import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import servicioRoutes from './routes/servicioRoutes';
import citaRoutes from './routes/citaRoutes';
import vehiculoRoutes from './routes/vehiculoRoutes';
import horarioRoutes from './routes/horarioRoutes';
import limiteRoutes from './routes/limiteRoutes';
import { iniciarCronJobs } from './services/cronService';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/servicios', servicioRoutes);
app.use('/api/citas', citaRoutes);
app.use('/api/vehiculos', vehiculoRoutes);
app.use('/api/horarios', horarioRoutes);
app.use('/api/limites', limiteRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'API funcionando correctamente' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  // ✅ Iniciar cron jobs
  iniciarCronJobs();
});