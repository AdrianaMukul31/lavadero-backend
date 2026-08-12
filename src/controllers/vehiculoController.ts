import { Request, Response } from 'express';
import pool from '../config/database';

// ==========================================
// CREAR VEHÍCULO (CON VALIDACIÓN DE TIPO)
// ==========================================
export const crearVehiculo = async (req: Request, res: Response) => {
  try {
    const { tipo } = req.body;
    // @ts-ignore
    const userId = req.userId;

    // ✅ VALIDAR QUE EL TIPO SEA VÁLIDO
    const tiposValidos = ['coche', 'camioneta', 'furgoneta', 'motocicleta'];
    
    if (!tipo) {
      return res.status(400).json({ error: 'El tipo de vehículo es obligatorio' });
    }

    if (!tiposValidos.includes(tipo.toLowerCase())) {
      return res.status(400).json({ 
        error: 'Tipo de vehículo no válido. Opciones: coche, camioneta, furgoneta, motocicleta' 
      });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    console.log('📝 Creando vehículo:', { userId, tipo });

    const result = await pool.query(
      'INSERT INTO vehiculos (usuario_id, tipo) VALUES ($1, $2) RETURNING *',
      [userId, tipo.toLowerCase()]
    );

    console.log('✅ Vehículo creado:', result.rows[0]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error en crearVehiculo:', error);
    res.status(500).json({ error: 'Error al crear vehículo' });
  }
};

// ==========================================
// OBTENER VEHÍCULOS DE UN USUARIO
// ==========================================
export const getVehiculosByUser = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId;
    
    const result = await pool.query(
      'SELECT * FROM vehiculos WHERE usuario_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener vehículos' });
  }
};

// ==========================================
// OBTENER TODOS LOS VEHÍCULOS (ADMIN)
// ==========================================
export const getAllVehiculos = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT v.*, u.nombre, u.apellido, u.email 
       FROM vehiculos v
       JOIN usuarios u ON v.usuario_id = u.id
       ORDER BY v.created_at DESC`
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener vehículos' });
  }
};

// ==========================================
// ELIMINAR VEHÍCULO (ADMIN)
// ==========================================
export const deleteVehiculo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM vehiculos WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    }
    
    res.json({ message: 'Vehículo eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar vehículo' });
  }
};