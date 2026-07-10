import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { Beneficiario } from '../models';

@Injectable({
  providedIn: 'root'
})
export class BeneficiarioService {
  constructor(private dbService: DatabaseService) {}

  public async getAll(): Promise<Beneficiario[]> {
    await this.dbService.ready();
    return this.dbService.select<Beneficiario>('SELECT * FROM beneficiarios ORDER BY nombre ASC, apellido ASC');
  }

  public async getById(id: number): Promise<Beneficiario | null> {
    await this.dbService.ready();
    const results = this.dbService.select<Beneficiario>('SELECT * FROM beneficiarios WHERE id = ?', [id]);
    return results.length > 0 ? results[0] : null;
  }

  public async isDocumentoUnique(numeroDocumento: string, excludeId?: number): Promise<boolean> {
    await this.dbService.ready();
    let query = 'SELECT COUNT(*) as count FROM beneficiarios WHERE numeroDocumento = ?';
    const params: any[] = [numeroDocumento];
    
    if (excludeId !== undefined) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    
    const results = this.dbService.select<{ count: number }>(query, params);
    return results.length > 0 ? results[0].count === 0 : true;
  }

  public async isCuentaBancariaUnique(cuentaBancaria: string, excludeId?: number): Promise<boolean> {
    await this.dbService.ready();
    let query = 'SELECT COUNT(*) as count FROM beneficiarios WHERE cuentaBancaria = ?';
    const params: any[] = [cuentaBancaria];
    
    if (excludeId !== undefined) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    
    const results = this.dbService.select<{ count: number }>(query, params);
    return results.length > 0 ? results[0].count === 0 : true;
  }

  public async create(beneficiario: Beneficiario): Promise<void> {
    await this.dbService.ready();
    
    // Proactive unique validations
    const docUnique = await this.isDocumentoUnique(beneficiario.numeroDocumento);
    if (!docUnique) {
      throw new Error(`El número de documento '${beneficiario.numeroDocumento}' ya está registrado.`);
    }

    const cuentaUnique = await this.isCuentaBancariaUnique(beneficiario.cuentaBancaria);
    if (!cuentaUnique) {
      throw new Error(`La cuenta bancaria '${beneficiario.cuentaBancaria}' ya está registrada.`);
    }

    this.dbService.exec(
      `INSERT INTO beneficiarios (nombre, apellido, tipoDocumento, numeroDocumento, telefono, correo, banco, cuentaBancaria, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        beneficiario.nombre,
        beneficiario.apellido,
        beneficiario.tipoDocumento,
        beneficiario.numeroDocumento,
        beneficiario.telefono || '',
        beneficiario.correo || '',
        beneficiario.banco || '',
        beneficiario.cuentaBancaria,
        beneficiario.estado
      ]
    );
  }

  public async update(beneficiario: Beneficiario): Promise<void> {
    await this.dbService.ready();
    if (beneficiario.id === undefined) {
      throw new Error('No se puede actualizar un beneficiario sin ID.');
    }

    // Proactive unique validations
    const docUnique = await this.isDocumentoUnique(beneficiario.numeroDocumento, beneficiario.id);
    if (!docUnique) {
      throw new Error(`El número de documento '${beneficiario.numeroDocumento}' ya está registrado.`);
    }

    const cuentaUnique = await this.isCuentaBancariaUnique(beneficiario.cuentaBancaria, beneficiario.id);
    if (!cuentaUnique) {
      throw new Error(`La cuenta bancaria '${beneficiario.cuentaBancaria}' ya está registrada.`);
    }

    this.dbService.exec(
      `UPDATE beneficiarios 
       SET nombre = ?, apellido = ?, tipoDocumento = ?, numeroDocumento = ?, telefono = ?, correo = ?, banco = ?, cuentaBancaria = ?, estado = ?
       WHERE id = ?`,
      [
        beneficiario.nombre,
        beneficiario.apellido,
        beneficiario.tipoDocumento,
        beneficiario.numeroDocumento,
        beneficiario.telefono || '',
        beneficiario.correo || '',
        beneficiario.banco || '',
        beneficiario.cuentaBancaria,
        beneficiario.estado,
        beneficiario.id
      ]
    );
  }

  public async delete(id: number): Promise<void> {
    await this.dbService.ready();
    
    // Check if beneficiary has registered cheques
    const checkCheques = this.dbService.select<{ count: number }>(
      'SELECT COUNT(*) as count FROM cheques WHERE beneficiarioId = ?',
      [id]
    );
    
    if (checkCheques.length > 0 && checkCheques[0].count > 0) {
      throw new Error('No se puede eliminar el beneficiario porque tiene cheques asociados.');
    }

    this.dbService.exec('DELETE FROM beneficiarios WHERE id = ?', [id]);
  }
}
