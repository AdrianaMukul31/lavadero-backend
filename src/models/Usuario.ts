export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  password_hash: string;
  rol: 'cliente' | 'admin';
  created_at: Date;
}