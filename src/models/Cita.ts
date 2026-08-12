export interface Cita {
  id: string;
  usuario_id: string;
  vehiculo_id: string;
  servicio_id: string;
  fecha: Date;
  hora: string;
  duracion_total_minutos: number;
  estado: 'pendiente' | 'confirmada' | 'en_proceso' | 'terminada' | 'cancelada';
  created_at: Date;
}