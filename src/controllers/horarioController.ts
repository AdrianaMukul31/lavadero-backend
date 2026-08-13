import { Request, Response } from 'express';
import pool from '../config/database';

// ==========================================
// OBTENER TODOS LOS HORARIOS
// ==========================================
export const getHorarios = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM horarios ORDER BY dia_semana'
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener horarios' });
  }
};

// ==========================================
// ACTUALIZAR UN HORARIO (CON VALIDACIÓN DE UUID)
// ==========================================
export const updateHorario = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { hora_apertura, hora_cierre, intervalo_minutos, activo } = req.body;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ error: 'ID de horario no válido' });
    }

    let query = 'UPDATE horarios SET updated_at = CURRENT_TIMESTAMP';
    const values = [];
    let paramCount = 1;

    if (hora_apertura !== undefined) {
      query += `, hora_apertura = $${paramCount}`;
      values.push(hora_apertura);
      paramCount++;
    }
    if (hora_cierre !== undefined) {
      query += `, hora_cierre = $${paramCount}`;
      values.push(hora_cierre);
      paramCount++;
    }
    if (intervalo_minutos !== undefined) {
      query += `, intervalo_minutos = $${paramCount}`;
      values.push(intervalo_minutos);
      paramCount++;
    }
    if (activo !== undefined) {
      query += `, activo = $${paramCount}`;
      values.push(activo);
      paramCount++;
    }

    query += ` WHERE id = $${paramCount} RETURNING *`;
    values.push(id);

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Horario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error en updateHorario:', error);
    res.status(500).json({ error: 'Error al actualizar horario' });
  }
};

// ==========================================
// ACTUALIZAR TODOS LOS HORARIOS DE UNA VEZ
// ==========================================
export const updateAllHorarios = async (req: Request, res: Response) => {
  try {
    const { dias } = req.body;

    if (!dias || !Array.isArray(dias)) {
      return res.status(400).json({ error: 'Se requiere un array de días' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const dia of dias) {
        await client.query(
          `UPDATE horarios 
           SET activo = $1, 
               hora_apertura = $2, 
               hora_cierre = $3, 
               intervalo_minutos = $4, 
               updated_at = CURRENT_TIMESTAMP
           WHERE dia_semana = $5`,
          [dia.activo, dia.hora_apertura, dia.hora_cierre, dia.intervalo_minutos || 30, dia.dia_semana]
        );
      }

      await client.query('COMMIT');
      
      const result = await pool.query('SELECT * FROM horarios ORDER BY dia_semana');
      res.json(result.rows);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en transacción:', error);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error en updateAllHorarios:', error);
    res.status(500).json({ error: 'Error al actualizar horarios' });
  }
};

// ==========================================
// OBTENER DÍAS FESTIVOS
// ==========================================
export const getDiasFestivos = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM dias_festivos ORDER BY fecha DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener días festivos' });
  }
};

// ==========================================
// CREAR DÍA FESTIVO
// ==========================================
export const createDiaFestivo = async (req: Request, res: Response) => {
  try {
    const { fecha, descripcion, cerrado = true } = req.body;

    const result = await pool.query(
      'INSERT INTO dias_festivos (fecha, descripcion, cerrado) VALUES ($1, $2, $3) RETURNING *',
      [fecha, descripcion, cerrado]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear día festivo' });
  }
};

// ==========================================
// ELIMINAR DÍA FESTIVO
// ==========================================
export const deleteDiaFestivo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM dias_festivos WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Día festivo no encontrado' });
    }

    res.json({ message: 'Día festivo eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar día festivo' });
  }
};

// ==========================================
// OBTENER HORARIOS DISPONIBLES
// ==========================================
export const getHorariosDisponibles = async (req: Request, res: Response) => {
  try {
    const { fecha } = req.query;

    if (!fecha) {
      return res.status(400).json({ error: 'La fecha es requerida' });
    }

    const fechaObj = new Date(fecha as string);
    const diaSemana = fechaObj.getDay();

    const festivoCheck = await pool.query(
      'SELECT * FROM dias_festivos WHERE fecha = $1 AND cerrado = true',
      [fecha]
    );

    if (festivoCheck.rows.length > 0) {
      return res.json({ disponible: false, mensaje: 'Día festivo, cerrado' });
    }

    const horarioResult = await pool.query(
      'SELECT * FROM horarios WHERE dia_semana = $1 AND activo = true',
      [diaSemana]
    );

    if (horarioResult.rows.length === 0) {
      return res.json({ disponible: false, mensaje: 'No hay atención este día' });
    }

    const horario = horarioResult.rows[0];
    
    const horasDisponibles = [];
    const apertura = horario.hora_apertura;
    const cierre = horario.hora_cierre;
    const intervalo = horario.intervalo_minutos;

    const citasOcupadas = await pool.query(
      'SELECT hora FROM citas WHERE fecha = $1 AND estado NOT IN ($2, $3)',
      [fecha, 'cancelada', 'terminada']
    );

    const horasOcupadas = citasOcupadas.rows.map(row => row.hora);

    let horaActual = new Date(`2000-01-01T${apertura}`);
    const horaCierre = new Date(`2000-01-01T${cierre}`);

    while (horaActual < horaCierre) {
      const horaStr = horaActual.toTimeString().slice(0, 5);
      
      if (!horasOcupadas.includes(horaStr)) {
        horasDisponibles.push(horaStr);
      }
      
      horaActual = new Date(horaActual.getTime() + intervalo * 60000);
    }

    res.json({
      disponible: true,
      horasDisponibles
    });
  } catch (error) {
    console.error('Error en getHorariosDisponibles:', error);
    res.status(500).json({ error: 'Error al obtener horarios disponibles' });
  }
};

// ==========================================
// OBTENER DÍAS DISPONIBLES DEL MES (CORREGIDO)
// ==========================================
export const getDiasDisponibles = async (req: Request, res: Response) => {
  try {
    const { mes, año } = req.query;

    if (!mes || !año) {
      return res.status(400).json({ error: 'Mes y año son requeridos' });
    }

    const añoNum = parseInt(año as string);
    const mesNum = parseInt(mes as string);

    // Obtener todos los horarios activos
    const horarios = await pool.query(
      'SELECT dia_semana, hora_apertura, hora_cierre FROM horarios WHERE activo = true'
    );

    const diasActivos = horarios.rows.map((h) => h.dia_semana);

    // Obtener días festivos del mes
    const festivos = await pool.query(
      `SELECT fecha FROM dias_festivos 
       WHERE EXTRACT(YEAR FROM fecha) = $1 AND EXTRACT(MONTH FROM fecha) = $2`,
      [añoNum, mesNum]
    );

    // ✅ Variable `f` = cada fila de festivos
    const fechasFestivas = festivos.rows.map((f) => f.fecha.toISOString().split('T')[0]);

    const diasDisponibles = [];
    const diasEnMes = new Date(añoNum, mesNum, 0).getDate();

    for (let dia = 1; dia <= diasEnMes; dia++) {
      const fecha = new Date(añoNum, mesNum - 1, dia);
      const diaSemana = fecha.getDay();
      const fechaStr = fecha.toISOString().split('T')[0];

      if (diasActivos.includes(diaSemana) && !fechasFestivas.includes(fechaStr)) {
        // ✅ Variable `h` = cada fila de horarios
        const horarioDia = horarios.rows.find((h) => h.dia_semana === diaSemana);
        
        if (horarioDia) {
          const horasDisponibles = [];
          let horaActual = new Date(`2000-01-01T${horarioDia.hora_apertura}`);
          const horaCierre = new Date(`2000-01-01T${horarioDia.hora_cierre}`);

          while (horaActual < horaCierre) {
            horasDisponibles.push(horaActual.toTimeString().slice(0, 5));
            horaActual = new Date(horaActual.getTime() + 30 * 60000);
          }

          const citasOcupadas = await pool.query(
            `SELECT hora FROM citas 
             WHERE fecha = $1 AND estado NOT IN ('cancelada', 'terminada')`,
            [fechaStr]
          );

          const horasOcupadas = citasOcupadas.rows.map((row) => row.hora);
          const horasLibres = horasDisponibles.filter((hora) => !horasOcupadas.includes(hora));

          diasDisponibles.push({
            fecha: fechaStr,
            dia: dia,
            diaSemana: diaSemana,
            horasDisponibles: horasLibres
          });
        }
      }
    }

    res.json(diasDisponibles);
  } catch (error) {
    console.error('Error en getDiasDisponibles:', error);
    res.status(500).json({ error: 'Error al obtener días disponibles' });
  }
};