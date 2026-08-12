import { Router } from 'express';
import {
  crearVehiculo,
  getVehiculosByUser,
  getAllVehiculos,
  deleteVehiculo
} from '../controllers/vehiculoController';
import { authMiddleware, adminOnly } from '../middlewares/auth';

const router = Router();

// Rutas de cliente
router.post('/', authMiddleware, crearVehiculo);
router.get('/mis-vehiculos', authMiddleware, getVehiculosByUser);

// Rutas de admin
router.get('/all', authMiddleware, adminOnly, getAllVehiculos);
router.delete('/:id', authMiddleware, adminOnly, deleteVehiculo);

export default router;