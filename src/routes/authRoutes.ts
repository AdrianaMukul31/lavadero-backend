import { Router } from 'express';
import { register, login, getProfile, updatePerfil } from '../controllers/authController'; // ✅ NUEVO
import { authMiddleware, adminOnly } from '../middlewares/auth';
import pool from '../config/database';

const router = Router();

// Rutas públicas
router.post('/register', register);
router.post('/login', login);

// Rutas protegidas
router.get('/profile', authMiddleware, getProfile);
router.put('/perfil', authMiddleware, updatePerfil); // ✅ NUEVO

// Ruta para obtener todos los clientes (solo admin)
router.get('/clientes', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nombre, apellido, email, telefono, created_at 
       FROM usuarios 
       WHERE rol = 'cliente' 
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

// Ruta para obtener un cliente por ID (solo admin)
router.get('/clientes/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, nombre, apellido, email, telefono, created_at 
       FROM usuarios 
       WHERE id = $1 AND rol = 'cliente'`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener cliente:', error);
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
});

export default router;