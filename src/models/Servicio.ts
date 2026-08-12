export interface Servicio {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  tiempo_base_minutos: number;
  tiempo_extra_camioneta: number;
  tiempo_extra_furgoneta: number;
  created_at: Date;
}