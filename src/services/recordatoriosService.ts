import pool from '../config/database';
import { enviarWhatsApp, mensajeRecordatorio } from './whatsappService';

// ==========================================
// ENVIAR RECORDATORIOS DE CITAS DEL DÍA
// ==========================================
export const enviarRecordatorios = async () => {
  try {
    const hoy = new Date().toISOString().split('T')[0];
    
    console.log(`📱 Iniciando envío de recordatorios para: ${hoy}`);

    const citasResult = await pool.query(
      `SELECT c.*, u.nombre as cliente_nombre, u.telefono, s.nombre as servicio_nombre
       FROM citas c
       JOIN usuarios u ON c.usuario_id = u.id
       JOIN servicios s ON c.servicio_id = s.id
       WHERE c.fecha = $1 
       AND c.estado = 'pendiente'
       AND u.telefono IS NOT NULL
       AND u.telefono != ''`,
      [hoy]
    );

    console.log(`📊 Encontradas ${citasResult.rows.length} citas para hoy`);

    if (citasResult.rows.length === 0) {
      console.log('📝 No hay citas para hoy');
      return;
    }

    let enviados = 0;
    let errores = 0;

    for (const cita of citasResult.rows) {
      try {
        const fechaObj = new Date(cita.fecha);
        const fechaFormateada = fechaObj.toLocaleDateString('es-ES', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });

        const mensaje = mensajeRecordatorio(
          cita.cliente_nombre,
          cita.servicio_nombre,
          fechaFormateada,
          cita.hora
        );

        const resultado = await enviarWhatsApp({
          telefono: cita.telefono,
          mensaje: mensaje
        });

        if (resultado.success) {
          enviados++;
          console.log(`✅ Recordatorio enviado a ${cita.telefono}`);
        } else {
          errores++;
          console.error(`❌ Error al enviar a ${cita.telefono}: ${resultado.error}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        errores++;
        console.error(`❌ Error al enviar recordatorio para cita ${cita.id}:`, error);
      }
    }

    console.log(`📱 Recordatorios procesados: ${enviados} enviados, ${errores} errores`);
  } catch (error) {
    console.error('❌ Error en enviarRecordatorios:', error);
  }
};

// ==========================================
// EJECUTAR DESDE TERMINAL
// ==========================================
if (require.main === module) {
  enviarRecordatorios().then(() => {
    console.log('✅ Proceso completado');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}