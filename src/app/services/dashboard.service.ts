import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { Cheque } from '../models';

export interface DashboardStats {
  totalCheques: number;
  montoTotal: number;
  montoPendiente: number;
  montoCobrado: number;
  totalBeneficiarios: number;
  resumen: {
    totalEmitidos: number;
    totalRecibidos: number;
    cobrado: number;
    pendienteDeCobro: number;
  };
  recentCheques: Cheque[];
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  constructor(private dbService: DatabaseService) {}

  public async getStats(): Promise<DashboardStats> {
    await this.dbService.ready();

    const totalCheques =
      this.dbService.select<{ count: number }>('SELECT COUNT(*) as count FROM cheques')[0]?.count ?? 0;

    const montoTotal =
      this.dbService.select<{ total: number }>('SELECT IFNULL(SUM(monto), 0) as total FROM cheques')[0]?.total ?? 0;

    const montoPendiente =
      this.dbService.select<{ total: number }>(
        "SELECT IFNULL(SUM(monto), 0) as total FROM cheques WHERE estado = ?", ['Pendiente']
      )[0]?.total ?? 0;

    const montoCobrado =
      this.dbService.select<{ total: number }>(
        "SELECT IFNULL(SUM(monto), 0) as total FROM cheques WHERE estado = ?", ['Cobrado']
      )[0]?.total ?? 0;

    const totalBeneficiarios =
      this.dbService.select<{ count: number }>('SELECT COUNT(*) as count FROM beneficiarios')[0]?.count ?? 0;

    const totalEmitidos =
      this.dbService.select<{ total: number }>(
        "SELECT IFNULL(SUM(monto), 0) as total FROM cheques WHERE tipo = ?", ['Emitido']
      )[0]?.total ?? 0;

    const totalRecibidos =
      this.dbService.select<{ total: number }>(
        "SELECT IFNULL(SUM(monto), 0) as total FROM cheques WHERE tipo = ?", ['Recibido']
      )[0]?.total ?? 0;

    const recentCheques = this.dbService.select<Cheque>(`
      SELECT c.*, COALESCE((b.nombre || ' ' || b.apellido), 'Sin beneficiario') as beneficiarioNombre
      FROM cheques c
      LEFT JOIN beneficiarios b ON c.beneficiarioId = b.id
      ORDER BY c.id DESC
      LIMIT 5
    `);

    return {
      totalCheques,
      montoTotal,
      montoPendiente,
      montoCobrado,
      totalBeneficiarios,
      resumen: { totalEmitidos, totalRecibidos, cobrado: montoCobrado, pendienteDeCobro: montoPendiente },
      recentCheques
    };
  }
}
