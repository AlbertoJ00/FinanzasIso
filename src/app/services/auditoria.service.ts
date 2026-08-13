import { Injectable } from '@angular/core';
import { Auditoria } from '../models';
import { DatabaseService } from './database.service';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  constructor(private db: DatabaseService, private session: SessionService) {}
  async registrar(entidad: Auditoria['entidad'], entidadId: number, accion: Auditoria['accion'], detalle = ''): Promise<void> {
    await this.db.ready();
    await this.db.exec('INSERT INTO auditoria (fecha, usuario, entidad, entidadId, accion, detalle) VALUES (?, ?, ?, ?, ?, ?)',
      [new Date().toISOString(), this.session.usuarioActivo?.nombreUsuario || 'Sistema', entidad, entidadId, accion, detalle]);
  }
  async getAll(): Promise<Auditoria[]> { await this.db.ready(); return this.db.select<Auditoria>('SELECT * FROM auditoria ORDER BY id DESC'); }
  async getByEntidad(entidad: Auditoria['entidad'], entidadId: number): Promise<Auditoria[]> {
    await this.db.ready(); return this.db.select<Auditoria>('SELECT * FROM auditoria WHERE entidad = ? AND entidadId = ? ORDER BY id DESC', [entidad, entidadId]);
  }
}
