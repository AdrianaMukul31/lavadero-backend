import cron from 'node-cron';
import { actualizarEstadosAutomaticos } from '../controllers/citaController';

// ==========================================
// EJECUTAR CADA 5 MINUTOS
// ==========================================
export const iniciarCronJobs = () => {
  // Ejecutar cada 5 minutos
  cron.schedule('*/5 * * * *', async () => {
    console.log('⏰ Ejecutando actualización automática de estados...');
    try {
      await actualizarEstadosAutomaticos();
    } catch (error) {
      console.error('❌ Error en cron job:', error);
    }
  });

  console.log('✅ Cron job iniciado: actualización de estados cada 5 minutos');

  // Ejecutar al iniciar el servidor (después de 5 segundos)
  setTimeout(async () => {
    console.log('🔄 Ejecutando primera actualización de estados...');
    try {
      await actualizarEstadosAutomaticos();
    } catch (error) {
      console.error('❌ Error en primera actualización:', error);
    }
  }, 5000);
};