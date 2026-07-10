import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { Cheque } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ChequeService {
  constructor(private dbService: DatabaseService) {}

  public async getAll(): Promise<Cheque[]> {
    await this.dbService.ready();
    return this.dbService.select<Cheque>(`
      SELECT c.*, (b.nombre || ' ' || b.apellido) as beneficiarioNombre 
      FROM cheques c 
      JOIN beneficiarios b ON c.beneficiarioId = b.id 
      ORDER BY c.fecha DESC, c.id DESC
    `);
  }

  public async getById(id: number): Promise<Cheque | null> {
    await this.dbService.ready();
    const results = this.dbService.select<Cheque>('SELECT * FROM cheques WHERE id = ?', [id]);
    return results.length > 0 ? results[0] : null;
  }

  public async isNumeroChequeUnique(numeroCheque: string, excludeId?: number): Promise<boolean> {
    await this.dbService.ready();
    let query = 'SELECT COUNT(*) as count FROM cheques WHERE numeroCheque = ?';
    const params: any[] = [numeroCheque];
    
    if (excludeId !== undefined) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    
    const results = this.dbService.select<{ count: number }>(query, params);
    return results.length > 0 ? results[0].count === 0 : true;
  }

  public async create(cheque: Cheque): Promise<void> {
    await this.dbService.ready();

    if (cheque.monto <= 0) {
      throw new Error('El monto del cheque debe ser mayor que cero.');
    }

    const numUnique = await this.isNumeroChequeUnique(cheque.numeroCheque);
    if (!numUnique) {
      throw new Error(`El número de cheque '${cheque.numeroCheque}' ya está registrado.`);
    }

    this.dbService.exec(
      `INSERT INTO cheques (numeroCheque, tipo, beneficiarioId, monto, concepto, estado, fecha, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cheque.numeroCheque,
        cheque.tipo,
        cheque.beneficiarioId,
        cheque.monto,
        cheque.concepto,
        cheque.estado,
        cheque.fecha,
        cheque.observaciones || ''
      ]
    );
  }

  public async update(cheque: Cheque): Promise<void> {
    await this.dbService.ready();
    if (cheque.id === undefined) {
      throw new Error('No se puede actualizar un cheque sin ID.');
    }

    if (cheque.monto <= 0) {
      throw new Error('El monto del cheque debe ser mayor que cero.');
    }

    const numUnique = await this.isNumeroChequeUnique(cheque.numeroCheque, cheque.id);
    if (!numUnique) {
      throw new Error(`El número de cheque '${cheque.numeroCheque}' ya está registrado.`);
    }

    this.dbService.exec(
      `UPDATE cheques 
       SET numeroCheque = ?, tipo = ?, beneficiarioId = ?, monto = ?, concepto = ?, estado = ?, fecha = ?, observaciones = ?
       WHERE id = ?`,
      [
        cheque.numeroCheque,
        cheque.tipo,
        cheque.beneficiarioId,
        cheque.monto,
        cheque.concepto,
        cheque.estado,
        cheque.fecha,
        cheque.observaciones || '',
        cheque.id
      ]
    );
  }

  public async delete(id: number): Promise<void> {
    await this.dbService.ready();
    this.dbService.exec('DELETE FROM cheques WHERE id = ?', [id]);
  }
}
