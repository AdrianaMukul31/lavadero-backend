import { Router } from 'express';
import {
  getHorarios,
  updateHorario,
  updateAllHorarios,
  getDiasFestivos,
  createDiaFestivo,
  deleteDiaFestivo,
  getHorariosDisponibles,
  getDiasDisponibles
} from '../controllers/horarioController';
import { authMiddleware, adminOnly } from '../middlewares/auth';

const router = Router();

// Rutas públicas
router.get('/disponibles', getHorariosDisponibles);
router.get('/dias-disponibles', getDiasDisponibles);

// Rutas de administración
router.get('/', authMiddleware, adminOnly, getHorarios);
router.put('/:id', authMiddleware, adminOnly, updateHorario);
router.put('/all', authMiddleware, adminOnly, updateAllHorarios);
router.get('/festivos', authMiddleware, adminOnly, getDiasFestivos);
router.post('/festivos', authMiddleware, adminOnly, createDiaFestivo);
router.delete('/festivos/:id', authMiddleware, adminOnly, deleteDiaFestivo);

export default router;