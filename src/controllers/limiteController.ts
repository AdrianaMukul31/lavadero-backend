import { Request, Response } from 'express';
import pool from '../config/database';

// ==========================================
// OBTENER TODOS LOS LÍMITES
// ==========================================
export const getLimites = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM limites_diarios ORDER BY tipo_vehiculo'
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener límites' });
  }
};

// ==========================================
// ACTUALIZAR UN LÍMITE
// ==========================================
export const updateLimite = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limite_diario } = req.body;

    if (!limite_diario || limite_diario < 1) {
      return res.status(400).json({ error: 'El límite debe ser mayor a 0' });
    }

    const result = await pool.query(
      'UPDATE limites_diarios SET limite_diario = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [limite_diario, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Límite no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar límite' });
  }
};

// ==========================================
// VERIFICAR DISPONIBILIDAD PARA UNA FECHA Y TIPO
// ==========================================
export const verificarDisponibilidad = async (req: Request, res: Response) => {
  try {
    const { fecha, tipo_vehiculo } = req.query;

    if (!fecha || !tipo_vehiculo) {
      return res.status(400).json({ error: 'Fecha y tipo de vehículo son requeridos' });
    }

    // Obtener el límite para este tipo de vehículo
    const limiteResult = await pool.query(
      'SELECT limite_diario FROM limites_diarios WHERE tipo_vehiculo = $1',
      [tipo_vehiculo]
    );

    if (limiteResult.rows.length === 0) {
      return res.json({
        disponible: true,
        limite: 10,
        ocupados: 0,
        disponibles: 10
      });
    }

    const limite = parseInt(limiteResult.rows[0].limite_diario);

    // Contar citas ocupadas para esa fecha y tipo de vehículo
    const citasResult = await pool.query(
      `SELECT COUNT(*) as total 
       FROM citas c
       JOIN vehiculos v ON c.vehiculo_id = v.id
       WHERE c.fecha = $1 AND v.tipo = $2 AND c.estado NOT IN ('cancelada', 'terminada')`,
      [fecha, tipo_vehiculo]
    );

    const ocupados = parseInt(citasResult.rows[0].total);
    const disponibles = limite - ocupados;

    console.log(`📊 Límite: ${limite}, Ocupados: ${ocupados}, Disponibles: ${disponibles}`);

    res.json({
      disponible: disponibles > 0,
      limite,
      ocupados,
      disponibles
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al verificar disponibilidad' });
  }
};