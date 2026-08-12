import { Request, Response } from 'express';
import pool from '../config/database';

// ==========================================
// OBTENER SERVICIOS (CON FILTRO POR VEHÍCULO)
// ==========================================
export const getServicios = async (req: Request, res: Response) => {
  try {
    const { tipo_vehiculo } = req.query;
    
    let query = 'SELECT * FROM servicios';
    const values = [];
    
    if (tipo_vehiculo && tipo_vehiculo !== 'todos') {
      query += ' WHERE tipo_vehiculo = $1 OR tipo_vehiculo = $2';
      values.push(tipo_vehiculo, 'todos');
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener servicios' });
  }
};

export const getServicioById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM servicios WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener servicio' });
  }
};

export const createServicio = async (req: Request, res: Response) => {
  try {
    const { 
      nombre, 
      descripcion, 
      precio, 
      tiempo_base_minutos, 
      tipo_vehiculo
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO servicios 
       (nombre, descripcion, precio, tiempo_base_minutos, tipo_vehiculo) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [nombre, descripcion, precio, tiempo_base_minutos, tipo_vehiculo || 'todos']
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear servicio' });
  }
};

export const updateServicio = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      nombre, 
      descripcion, 
      precio, 
      tiempo_base_minutos, 
      tipo_vehiculo
    } = req.body;
    
    const result = await pool.query(
      `UPDATE servicios 
       SET nombre = $1, descripcion = $2, precio = $3, 
           tiempo_base_minutos = $4, tipo_vehiculo = $5
       WHERE id = $6 
       RETURNING *`,
      [nombre, descripcion, precio, tiempo_base_minutos, tipo_vehiculo || 'todos', id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar servicio' });
  }
};

export const deleteServicio = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM servicios WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    
    res.json({ message: 'Servicio eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar servicio' });
  }
};