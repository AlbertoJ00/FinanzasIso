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
  contabilidadEstado?: EstadoEnvioContable | null;
}

export interface Banco { id?: number; nombre: string; codigo?: string; estado: 'Activo' | 'Inactivo'; }
export interface Concepto { id?: number; nombre: string; estado: 'Activo' | 'Inactivo'; }
export interface Usuario {
  id?: number; nombreUsuario: string; nombreCompleto: string; correo: string;
  rol: 'Administrador' | 'Operador' | 'Consulta'; estado: 'Activo' | 'Inactivo'; passwordHash: string;
}
export interface Auditoria {
  id?: number; fecha: string; usuario: string;
  entidad: 'Cheque' | 'Beneficiario' | 'Banco' | 'Concepto' | 'Usuario'; entidadId: number;
  accion: 'Crear' | 'Editar' | 'Eliminar' | 'Anular'; detalle?: string;
}

export type EstadoEnvioContable = 'Pendiente' | 'Enviado' | 'Error';

export interface ContabilidadConfig {
  activo: boolean;
  endpoint: string;
  auxiliarId: number;
  emitidoCuentaDebitoId: number;
  emitidoCuentaCreditoId: number;
  recibidoCuentaDebitoId: number;
  recibidoCuentaCreditoId: number;
  actualizadoEn?: string;
}

export interface EnvioContable {
  id?: number;
  chequeId: number;
  numeroCheque?: string;
  tipo: Cheque['tipo'];
  auxiliarId: number;
  cuentaDebitoId: number;
  cuentaCreditoId: number;
  descripcion: string;
  monto: number;
  estado: EstadoEnvioContable;
  intentos: number;
  ultimoIntento?: string;
  enviadoEn?: string;
  respuesta?: string;
  error?: string;
}
