import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { Cheque } from '../models';
import { AuditoriaService } from './auditoria.service';
import { ContabilidadService } from './contabilidad.service';

@Injectable({
  providedIn: 'root'
})
export class ChequeService {
  constructor(
    private dbService: DatabaseService,
    private audit: AuditoriaService,
    private contabilidad: ContabilidadService
  ) {}

  public async getAll(): Promise<Cheque[]> {
    await this.dbService.ready();
    return this.dbService.select<Cheque>(`
      SELECT c.*,
        COALESCE((b.nombre || ' ' || b.apellido), 'Sin beneficiario') as beneficiarioNombre,
        ce.estado as contabilidadEstado
      FROM cheques c
      LEFT JOIN beneficiarios b ON c.beneficiarioId = b.id
      LEFT JOIN contabilidad_envios ce ON ce.chequeId = c.id
      ORDER BY c.fecha DESC, c.id DESC
    `);
  }

  public async getById(id: number): Promise<Cheque | null> {
    await this.dbService.ready();
    const r = this.dbService.select<Cheque>('SELECT * FROM cheques WHERE id = ?', [id]);
    return r[0] ?? null;
  }

  public async isNumeroChequeUnique(numeroCheque: string, excludeId?: number): Promise<boolean> {
    await this.dbService.ready();
    let query = 'SELECT COUNT(*) as count FROM cheques WHERE numeroCheque = ?';
    const params: any[] = [numeroCheque];
    if (excludeId !== undefined) { query += ' AND id != ?'; params.push(excludeId); }
    const r = this.dbService.select<{ count: number }>(query, params);
    return (r[0]?.count ?? 1) === 0;
  }

  public async create(cheque: Cheque): Promise<void> {
    await this.dbService.ready();
    if (cheque.monto <= 0) throw new Error('El monto debe ser mayor que cero.');
    const numUnique = await this.isNumeroChequeUnique(cheque.numeroCheque);
    if (!numUnique) throw new Error(`El número de cheque '${cheque.numeroCheque}' ya existe.`);

    await this.dbService.exec(
      `INSERT INTO cheques (numeroCheque, tipo, beneficiarioId, monto, concepto, estado, fecha, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cheque.numeroCheque, cheque.tipo, cheque.beneficiarioId,
        cheque.monto, cheque.concepto, cheque.estado,
        cheque.fecha, cheque.observaciones || ''
      ]
    );
    const creado = (await this.getAll()).find(c => c.numeroCheque === cheque.numeroCheque);
    if (creado?.id) {
      await this.audit.registrar('Cheque', creado.id, 'Crear', creado.numeroCheque);
      const encolado = await this.contabilidad.encolarCheque(creado);
      if (encolado) this.contabilidad.procesarEnSegundoPlano(creado.id);
    }
  }

  public async update(cheque: Cheque): Promise<void> {
    await this.dbService.ready();
    if (cheque.id === undefined) throw new Error('ID requerido para actualizar.');
    if (cheque.monto <= 0) throw new Error('El monto debe ser mayor que cero.');
    const numUnique = await this.isNumeroChequeUnique(cheque.numeroCheque, cheque.id);
    if (!numUnique) throw new Error(`El número de cheque '${cheque.numeroCheque}' ya existe.`);

    await this.dbService.exec(
      `UPDATE cheques SET numeroCheque = ?, tipo = ?, beneficiarioId = ?, monto = ?, concepto = ?, estado = ?, fecha = ?, observaciones = ? WHERE id = ?`,
      [
        cheque.numeroCheque, cheque.tipo, cheque.beneficiarioId,
        cheque.monto, cheque.concepto, cheque.estado,
        cheque.fecha, cheque.observaciones || '',
        cheque.id
      ]
    );
    await this.audit.registrar('Cheque', cheque.id, cheque.estado === 'Anulado' ? 'Anular' : 'Editar', cheque.numeroCheque);
    const encolado = await this.contabilidad.encolarCheque(cheque);
    if (encolado) this.contabilidad.procesarEnSegundoPlano(cheque.id);
  }

  public async delete(id: number): Promise<void> {
    await this.dbService.ready();
    await this.dbService.exec('DELETE FROM cheques WHERE id = ?', [id]);
    await this.audit.registrar('Cheque', id, 'Eliminar');
  }
}
