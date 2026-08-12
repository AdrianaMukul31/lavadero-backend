import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

// ==========================================
// ENVIAR MENSAJE DE WHATSAPP
// ==========================================
export const enviarWhatsApp = async ({ telefono, mensaje }: { telefono: string; mensaje: string }) => {
  try {
    // ✅ LIMPIAR EL NÚMERO (10 DÍGITOS)
    const telefonoLimpio = telefono.replace(/\D/g, '');
    
    if (telefonoLimpio.length !== 10) {
      console.error('❌ Teléfono inválido:', telefono);
      return { success: false, error: 'Teléfono inválido' };
    }

    console.log(`📱 Enviando WhatsApp a: ${telefonoLimpio}`);

    // ✅ ENVIAR MENSAJE A `+52${telefonoLimpio}`
    const mensajeWhatsApp = await client.messages.create({
      body: mensaje,
      from: process.env.TWILIO_WHATSAPP_NUMBER!,
      to: `whatsapp:+52${telefonoLimpio}`
    });

    console.log(`✅ WhatsApp enviado: ${mensajeWhatsApp.sid}`);
    return { success: true, sid: mensajeWhatsApp.sid };
  } catch (error: any) {
    console.error('❌ Error al enviar WhatsApp:', error.message);
    return { success: false, error: error.message };
  }
};

// ==========================================
// MENSAJE DE CONFIRMACIÓN DE CITA
// ==========================================
export const mensajeConfirmacionCita = (cliente: string, servicio: string, fecha: string, hora: string) => {
  return `🚗 *Lavado de Coches*

✅ *¡Cita Confirmada!*

Hola *${cliente}*, tu cita ha sido agendada exitosamente.

📋 *Servicio:* ${servicio}
📅 *Fecha:* ${fecha}
⏰ *Hora:* ${hora}

📍 Te esperamos en nuestro lavadero.

*¡Gracias por confiar en nosotros!* 🙌`;
};

// ==========================================
// MENSAJE DE RECORDATORIO DE CITA
// ==========================================
export const mensajeRecordatorio = (cliente: string, servicio: string, fecha: string, hora: string) => {
  return `🚗 *Lavado de Coches*

⏰ *Recordatorio de Cita*

Hola *${cliente}*, te recordamos que tienes una cita programada.

📋 *Servicio:* ${servicio}
📅 *Fecha:* ${fecha}
⏰ *Hora:* ${hora}

📍 Te esperamos en nuestro lavadero.

*¡No faltes!* 😊`;
};