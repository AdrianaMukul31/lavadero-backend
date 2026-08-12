import dotenv from 'dotenv';
import twilio from 'twilio';

dotenv.config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function testWhatsApp() {
  console.log('📱 Probando envío de WhatsApp...');

  try {
    // ✅ NÚMERO DE PRUEBA
    const telefonoPrueba = '9911041591';
    
    const telefonoLimpio = telefonoPrueba.replace(/\D/g, '');
    
    if (telefonoLimpio.length !== 10) {
      console.error(`❌ Teléfono inválido: ${telefonoLimpio}`);
      return;
    }

    const mensaje = `🚗 *Prueba de WhatsApp*\n\nHola, este es un mensaje de prueba desde tu sistema de lavado de coches.\n\n✅ Si recibes esto, ¡todo funciona correctamente!`;

    console.log(`📱 Enviando a: ${telefonoLimpio}`);

    const mensajeWhatsApp = await client.messages.create({
      body: mensaje,
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: `whatsapp:+52${telefonoLimpio}`
    });

    console.log('✅ Mensaje enviado correctamente!');
    console.log(`📋 SID: ${mensajeWhatsApp.sid}`);
    console.log(`📊 Estado: ${mensajeWhatsApp.status}`);
  } catch (error) {
    console.error('❌ Error al enviar mensaje:');
    console.error(`📝 Mensaje: ${error.message}`);
  }
}

testWhatsApp();