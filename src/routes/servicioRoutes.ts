import { Router } from 'express';
import { 
  getServicios, 
  getServicioById, 
  createServicio, 
  updateServicio, 
  deleteServicio,
  getServiciosPublic   // 👈 Importamos el nuevo controlador
} from '../controllers/servicioController';
import { authMiddleware, adminOnly } from '../middlewares/auth';

const router = Router();

// ==========================================
// RUTAS PÚBLICAS (sin autenticación)
// ==========================================
router.get('/public', getServiciosPublic);  // 👈 Nueva ruta pública

// ==========================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ==========================================
router.get('/', getServicios);  // Si quieres protegerla, añade authMiddleware, pero por ahora déjala abierta
router.get('/:id', getServicioById);
router.post('/', authMiddleware, adminOnly, createServicio);
router.put('/:id', authMiddleware, adminOnly, updateServicio);
router.delete('/:id', authMiddleware, adminOnly, deleteServicio);

export default router;