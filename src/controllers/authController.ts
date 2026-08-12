import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import dotenv from 'dotenv';

dotenv.config();

// ==========================================
// REGISTRO DE USUARIO
// ==========================================
export const register = async (req: Request, res: Response) => {
  try {
    const { nombre, apellido, email, password, telefono, rol = 'cliente' } = req.body;
    
    // Validar campos obligatorios
    if (!nombre || !apellido || !email || !password) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    const userExists = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO usuarios (nombre, apellido, email, password_hash, telefono, rol) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, nombre, apellido, email, telefono, rol, created_at`,
      [nombre, apellido, email, password_hash, telefono || null, rol]
    );

    const token = jwt.sign(
      { id: result.rows[0].id, rol: result.rows[0].rol },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.status(201).json({ 
      user: result.rows[0], 
      token 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
};

// ==========================================
// INICIO DE SESIÓN
// ==========================================
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, rol: user.rol },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        telefono: user.telefono,
        rol: user.rol,
        created_at: user.created_at
      },
      token
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};

// ==========================================
// OBTENER PERFIL
// ==========================================
export const getProfile = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId;
    const result = await pool.query(
      'SELECT id, nombre, apellido, email, telefono, rol, created_at FROM usuarios WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
};

// ==========================================
// ACTUALIZAR PERFIL ✅ NUEVO
// ==========================================
export const updatePerfil = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId;
    const { nombre, apellido, telefono, password } = req.body;

    // Construir query dinámica
    let query = 'UPDATE usuarios SET updated_at = CURRENT_TIMESTAMP';
    const values = [];
    let paramCount = 1;

    if (nombre !== undefined) {
      query += `, nombre = $${paramCount}`;
      values.push(nombre);
      paramCount++;
    }
    if (apellido !== undefined) {
      query += `, apellido = $${paramCount}`;
      values.push(apellido);
      paramCount++;
    }
    if (telefono !== undefined) {
      query += `, telefono = $${paramCount}`;
      values.push(telefono);
      paramCount++;
    }
    if (password !== undefined && password.length > 0) {
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);
      query += `, password_hash = $${paramCount}`;
      values.push(password_hash);
      paramCount++;
    }

    query += ` WHERE id = $${paramCount} RETURNING id, nombre, apellido, email, telefono, rol, created_at`;
    values.push(userId);

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
};