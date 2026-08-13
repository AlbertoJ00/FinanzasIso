import { Injectable } from '@angular/core';
import { Concepto } from '../models';
import { DatabaseService } from './database.service';
import { AuditoriaService } from './auditoria.service';
@Injectable({ providedIn: 'root' })
export class ConceptoService {
  constructor(private db: DatabaseService, private audit: AuditoriaService) {}
  async getAll(): Promise<Concepto[]> { await this.db.ready(); return this.db.select<Concepto>('SELECT * FROM conceptos ORDER BY nombre ASC'); }
  async getById(id:number): Promise<Concepto|null> { await this.db.ready(); return this.db.select<Concepto>('SELECT * FROM conceptos WHERE id = ?', [id])[0] || null; }
  private async validar(c:Concepto):Promise<void>{ if((await this.getAll()).some(x=>x.nombre.trim().toLowerCase()===c.nombre.trim().toLowerCase()&&x.id!==c.id)) throw new Error('El nombre del concepto ya está registrado.'); }
  async create(c:Concepto):Promise<void>{await this.validar(c);await this.db.exec('INSERT INTO conceptos (nombre, estado) VALUES (?, ?)',[c.nombre.trim(),c.estado]);const x=(await this.getAll()).find(v=>v.nombre===c.nombre.trim())!;await this.audit.registrar('Concepto',x.id!,'Crear',c.nombre);}
  async update(c:Concepto):Promise<void>{if(!c.id)throw new Error('ID requerido para actualizar.');await this.validar(c);await this.db.exec('UPDATE conceptos SET nombre = ?, estado = ? WHERE id = ?',[c.nombre.trim(),c.estado,c.id]);await this.audit.registrar('Concepto',c.id,'Editar',c.nombre);}
  async delete(id:number):Promise<void>{const c=await this.getById(id);await this.db.exec('DELETE FROM conceptos WHERE id = ?',[id]);await this.audit.registrar('Concepto',id,'Eliminar',c?.nombre||'');}
}
