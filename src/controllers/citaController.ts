import { Request, Response } from 'express';
import pool from '../config/database';
import { enviarWhatsApp, mensajeConfirmacionCita } from '../services/whatsappService';

// ==========================================
// OBTENER CITAS DE UN USUARIO
// ==========================================
export const getMisCitas = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId;
    
    const result = await pool.query(
      `SELECT c.*, s.nombre as servicio_nombre, s.precio, v.tipo as vehiculo_tipo
       FROM citas c
       JOIN servicios s ON c.servicio_id = s.id
       JOIN vehiculos v ON c.vehiculo_id = v.id
       WHERE c.usuario_id = $1
       ORDER BY c.fecha DESC, c.hora DESC`,
      [userId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener citas' });
  }
};

// ==========================================
// OBTENER TODAS LAS CITAS (SOLO ADMIN)
// ==========================================
export const getAllCitas = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT c.*, 
        u.nombre as cliente_nombre, 
        u.apellido as cliente_apellido, 
        u.telefono as cliente_telefono,
        u.email, 
        s.nombre as servicio_nombre, 
        s.precio,
        v.tipo as vehiculo_tipo
       FROM citas c
       JOIN usuarios u ON c.usuario_id = u.id
       JOIN servicios s ON c.servicio_id = s.id
       JOIN vehiculos v ON c.vehiculo_id = v.id
       ORDER BY c.fecha DESC, c.hora DESC`
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener citas' });
  }
};

// ==========================================
// CREAR UNA CITA (CON WHATSAPP)
// ==========================================
export const createCita = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId;
    const { vehiculo_id, servicio_id, fecha, hora } = req.body;

    if (!vehiculo_id || !servicio_id || !fecha || !hora) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    const hoy = new Date().toISOString().split('T')[0];
    if (fecha < hoy) {
      return res.status(400).json({ error: 'No se pueden agendar citas en fechas pasadas' });
    }

    const horaNum = parseInt(hora.split(':')[0]);
    const minutoNum = parseInt(hora.split(':')[1]);
    
    if (horaNum < 10 || (horaNum === 18 && minutoNum > 0) || horaNum >= 18) {
      return res.status(400).json({ 
        error: 'El horario de atención es de 10:00 AM a 6:00 PM.' 
      });
    }

    if (minutoNum !== 0 && minutoNum !== 30) {
      return res.status(400).json({ 
        error: 'Las citas se agendan cada 30 minutos (ejemplo: 10:00, 10:30, 11:00...)' 
      });
    }

    const servicio = await pool.query('SELECT * FROM servicios WHERE id = $1', [servicio_id]);
    if (servicio.rows.length === 0) {
      return res.status(400).json({ error: 'Servicio no válido' });
    }

    const vehiculo = await pool.query(
      'SELECT tipo FROM vehiculos WHERE id = $1 AND usuario_id = $2',
      [vehiculo_id, userId]
    );
    if (vehiculo.rows.length === 0) {
      return res.status(400).json({ error: 'Vehículo no válido' });
    }

    const servicioData = servicio.rows[0];
    const duracionTotal = servicioData.tiempo_base_minutos;

    const conflicto = await pool.query(
      `SELECT * FROM citas 
       WHERE fecha = $1 AND estado NOT IN ('cancelada', 'terminada')
       AND (
         (hora <= $2 AND hora + interval '1 minute' * duracion_total_minutos > $2) OR
         (hora >= $2 AND hora < $2 + interval '1 minute' * $3)
       )`,
      [fecha, hora, duracionTotal]
    );

    if (conflicto.rows.length > 0) {
      return res.status(400).json({ error: 'Horario no disponible. Ya hay una cita agendada en ese horario.' });
    }

    const result = await pool.query(
      `INSERT INTO citas 
       (usuario_id, vehiculo_id, servicio_id, fecha, hora, duracion_total_minutos) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [userId, vehiculo_id, servicio_id, fecha, hora, duracionTotal]
    );

    const citaCreada = result.rows[0];

    // WhatsApp
    try {
      const clienteResult = await pool.query(
        'SELECT nombre, telefono FROM usuarios WHERE id = $1',
        [userId]
      );
      
      if (clienteResult.rows.length > 0) {
        const cliente = clienteResult.rows[0];
        
        if (cliente.telefono && cliente.telefono.length === 10) {
          const fechaObj = new Date(fecha);
          const fechaFormateada = fechaObj.toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          });
          
          const mensaje = mensajeConfirmacionCita(
            cliente.nombre,
            servicioData.nombre,
            fechaFormateada,
            hora
          );
          
          await enviarWhatsApp({
            telefono: cliente.telefono,
            mensaje: mensaje
          });
          
          console.log(`📱 WhatsApp de confirmación enviado a ${cliente.telefono}`);
        }
      }
    } catch (whatsappError) {
      console.error('❌ Error al enviar WhatsApp:', whatsappError);
    }

    res.status(201).json(citaCreada);
  } catch (error) {
    console.error('Error en createCita:', error);
    res.status(500).json({ error: 'Error al crear cita' });
  }
};

// ==========================================
// ACTUALIZAR ESTADO DE CITA (MANUAL - ADMIN)
// ==========================================
export const updateCitaEstado = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    
    const estadosValidos = ['pendiente', 'en_proceso', 'terminada', 'cancelada'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: 'Estado no válido' });
    }
    
    const result = await pool.query(
      'UPDATE citas SET estado = $1 WHERE id = $2 RETURNING *',
      [estado, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar cita' });
  }
};

// ==========================================
// CANCELAR CITA CON MOTIVO
// ==========================================
export const cancelarCita = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    // @ts-ignore
    const userId = req.userId;
    
    const citaCheck = await pool.query(
      'SELECT * FROM citas WHERE id = $1 AND usuario_id = $2 AND estado != $3',
      [id, userId, 'cancelada']
    );

    if (citaCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Cita no encontrada o ya cancelada' });
    }

    const result = await pool.query(
      `UPDATE citas 
       SET estado = 'cancelada', 
           motivo_cancelacion = $1, 
           fecha_cancelacion = CURRENT_TIMESTAMP 
       WHERE id = $2 AND usuario_id = $3 
       RETURNING *`,
      [motivo || 'Sin motivo especificado', id, userId]
    );
    
    res.json({
      mensaje: 'Cita cancelada correctamente',
      cita: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al cancelar cita' });
  }
};

// ==========================================
// CALIFICAR SERVICIO
// ==========================================
export const calificarServicio = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { calificacion } = req.body;
    // @ts-ignore
    const userId = req.userId;

    if (!calificacion || calificacion < 1 || calificacion > 5) {
      return res.status(400).json({ error: 'Calificación debe ser entre 1 y 5' });
    }

    const citaCheck = await pool.query(
      'SELECT * FROM citas WHERE id = $1 AND usuario_id = $2 AND estado = $3',
      [id, userId, 'terminada']
    );

    if (citaCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Cita no encontrada o no se puede calificar' });
    }

    await pool.query(
      `ALTER TABLE citas ADD COLUMN IF NOT EXISTS calificacion INTEGER`
    );

    const result = await pool.query(
      'UPDATE citas SET calificacion = $1 WHERE id = $2 RETURNING *',
      [calificacion, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error en calificarServicio:', error);
    res.status(500).json({ error: 'Error al calificar servicio' });
  }
};

// ==========================================
// OBTENER CITAS DE UN CLIENTE (ADMIN)
// ==========================================
export const getCitasByCliente = async (req: Request, res: Response) => {
  try {
    const { clienteId } = req.params;
    
    const result = await pool.query(
      `SELECT c.*, s.nombre as servicio_nombre, s.precio, v.tipo as vehiculo_tipo
       FROM citas c
       JOIN servicios s ON c.servicio_id = s.id
       JOIN vehiculos v ON c.vehiculo_id = v.id
       WHERE c.usuario_id = $1
       ORDER BY c.fecha DESC, c.hora DESC`,
      [clienteId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener citas del cliente' });
  }
};

// ==========================================
// ✅ NUEVO: ACTUALIZAR ESTADOS AUTOMÁTICAMENTE
// ==========================================
export const actualizarEstadosAutomaticos = async () => {
  try {
    const ahora = new Date();
    const hoy = ahora.toISOString().split('T')[0];
    const horaActual = ahora.toTimeString().slice(0, 8);

    console.log(`🔄 Actualizando estados de citas - ${hoy} ${horaActual}`);

    // 1. Actualizar citas que deberían estar "en_proceso"
    const enProceso = await pool.query(
      `UPDATE citas 
       SET estado = 'en_proceso' 
       WHERE fecha = $1 
       AND hora <= $2 
       AND estado = 'pendiente'
       AND estado != 'cancelada'
       AND estado != 'terminada'
       RETURNING *`,
      [hoy, horaActual]
    );

    if (enProceso.rows.length > 0) {
      console.log(`✅ ${enProceso.rows.length} citas cambiaron a "en_proceso"`);
    }

    // 2. Actualizar citas que deberían estar "terminadas"
    const terminadas = await pool.query(
      `UPDATE citas 
       SET estado = 'terminada' 
       WHERE fecha = $1 
       AND (hora::time + (duracion_total_minutos || ' minutes')::interval) <= $2::time
       AND estado IN ('pendiente', 'en_proceso')
       AND estado != 'cancelada'
       AND estado != 'terminada'
       RETURNING *`,
      [hoy, horaActual]
    );

    if (terminadas.rows.length > 0) {
      console.log(`✅ ${terminadas.rows.length} citas cambiaron a "terminada"`);
    }

    // 3. Si la fecha es menor a hoy y no está cancelada/terminada -> terminada
    const pasadas = await pool.query(
      `UPDATE citas 
       SET estado = 'terminada' 
       WHERE fecha < $1 
       AND estado NOT IN ('cancelada', 'terminada')
       RETURNING *`,
      [hoy]
    );

    if (pasadas.rows.length > 0) {
      console.log(`✅ ${pasadas.rows.length} citas pasadas cambiaron a "terminada"`);
    }

    return {
      enProceso: enProceso.rows.length,
      terminadas: terminadas.rows.length,
      pasadas: pasadas.rows.length
    };
  } catch (error) {
    console.error('❌ Error al actualizar estados automáticos:', error);
    return { error: 'Error al actualizar estados' };
  }
};