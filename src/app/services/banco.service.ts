import { Injectable } from '@angular/core';
import { Banco } from '../models';
import { DatabaseService } from './database.service';
import { AuditoriaService } from './auditoria.service';
@Injectable({ providedIn: 'root' })
export class BancoService {
  constructor(private db: DatabaseService, private audit: AuditoriaService) {}
  async getAll(): Promise<Banco[]> { await this.db.ready(); return this.db.select<Banco>('SELECT * FROM bancos ORDER BY nombre ASC'); }
  async getById(id: number): Promise<Banco | null> { await this.db.ready(); return this.db.select<Banco>('SELECT * FROM bancos WHERE id = ?', [id])[0] || null; }
  private async validar(b: Banco): Promise<void> { const all = await this.getAll(); if (all.some(x => x.nombre.trim().toLowerCase() === b.nombre.trim().toLowerCase() && x.id !== b.id)) throw new Error('El nombre del banco ya está registrado.'); }
  async create(b: Banco): Promise<void> { await this.validar(b); await this.db.exec('INSERT INTO bancos (nombre, codigo, estado) VALUES (?, ?, ?)', [b.nombre.trim(), b.codigo || '', b.estado]); const x=(await this.getAll()).find(v=>v.nombre===b.nombre.trim())!; await this.audit.registrar('Banco', x.id!, 'Crear', b.nombre); }
  async update(b: Banco): Promise<void> { if (!b.id) throw new Error('ID requerido para actualizar.'); await this.validar(b); await this.db.exec('UPDATE bancos SET nombre = ?, codigo = ?, estado = ? WHERE id = ?', [b.nombre.trim(), b.codigo || '', b.estado, b.id]); await this.audit.registrar('Banco', b.id, 'Editar', b.nombre); }
  async delete(id: number): Promise<void> { const b=await this.getById(id); const usados=this.db.select<{count:number}>('SELECT COUNT(*) as count FROM beneficiarios WHERE banco = ?', [b?.nombre || '']); if ((usados[0]?.count||0)>0) throw new Error('No se puede eliminar el banco porque está en uso por beneficiarios.'); await this.db.exec('DELETE FROM bancos WHERE id = ?', [id]); await this.audit.registrar('Banco', id, 'Eliminar', b?.nombre || ''); }
}
