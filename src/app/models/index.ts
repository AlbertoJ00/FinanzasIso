export interface Beneficiario {
  id?: number;
  nombre: string;
  apellido: string;
  tipoDocumento: string; // e.g. 'Cedula', 'Rnc', 'Pasaporte'
  numeroDocumento: string; // unique
  telefono: string;
  correo: string;
  banco: string;
  cuentaBancaria: string; // unique
  estado: 'Activo' | 'Inactivo';
}

export interface Cheque {
  id?: number;
  numeroCheque: string; // unique
  tipo: 'Emitido' | 'Recibido';
  beneficiarioId: number;
  monto: number; // > 0
  concepto: string;
  estado: 'Pendiente' | 'Cobrado' | 'Anulado';
  fecha: string; // ISO string or formatted date
  observaciones?: string;
  // Denormalized field for listing UI
  beneficiarioNombre?: string;
}
