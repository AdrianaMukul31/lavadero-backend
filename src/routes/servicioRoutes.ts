import { Router } from 'express';
import { getServicios, getServicioById, createServicio, updateServicio, deleteServicio } from '../controllers/servicioController';
import { authMiddleware, adminOnly } from '../middlewares/auth';

const router = Router();

router.get('/', getServicios);
router.get('/:id', getServicioById);
router.post('/', authMiddleware, adminOnly, createServicio);
router.put('/:id', authMiddleware, adminOnly, updateServicio);
router.delete('/:id', authMiddleware, adminOnly, deleteServicio);

export default router;
