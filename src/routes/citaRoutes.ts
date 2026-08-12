import { Router } from 'express';
import {
  getMisCitas,
  getAllCitas,
  createCita,
  updateCitaEstado,
  cancelarCita,
  calificarServicio,
  getCitasByCliente,
  actualizarEstadosAutomaticos
} from '../controllers/citaController';
import { authMiddleware, adminOnly } from '../middlewares/auth';

const router = Router();

// Rutas de cliente
router.get('/mis-citas', authMiddleware, getMisCitas);
router.post('/', authMiddleware, createCita);
router.put('/:id/cancelar', authMiddleware, cancelarCita);
router.put('/:id/calificar', authMiddleware, calificarServicio);

// Rutas de administrador
router.get('/all', authMiddleware, adminOnly, getAllCitas);
router.put('/:id/estado', authMiddleware, adminOnly, updateCitaEstado);
router.get('/cliente/:clienteId', authMiddleware, adminOnly, getCitasByCliente);

// ✅ NUEVO: Endpoint para actualizar estados automáticamente
router.post('/actualizar-estados', authMiddleware, adminOnly, async (req, res) => {
  const resultado = await actualizarEstadosAutomaticos();
  res.json(resultado);
});

export default router;