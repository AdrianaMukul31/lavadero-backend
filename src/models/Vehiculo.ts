export interface Vehiculo {
  id: string;
  usuario_id: string;
  tipo: 'coche' | 'camioneta' | 'motocicleta' | 'furgoneta';
  created_at: Date;
}