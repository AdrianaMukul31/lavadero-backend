import { Router } from 'express';
import {
  getLimites,
  updateLimite,
  verificarDisponibilidad
} from '../controllers/limiteController';
import { authMiddleware, adminOnly } from '../middlewares/auth';

const router = Router();

// Ruta pública (para clientes)
router.get('/verificar', verificarDisponibilidad);

// Rutas de administración
router.get('/', authMiddleware, adminOnly, getLimites);
router.put('/:id', authMiddleware, adminOnly, updateLimite);

export default router;