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

    // 1. Total cheques count
    const totalChequesRes = this.dbService.select<{ count: number }>(
      'SELECT COUNT(*) as count FROM cheques'
    );
    const totalCheques = totalChequesRes.length > 0 ? totalChequesRes[0].count : 0;

    // 2. Monto total
    const montoTotalRes = this.dbService.select<{ total: number }>(
      'SELECT IFNULL(SUM(monto), 0) as total FROM cheques'
    );
    const montoTotal = montoTotalRes.length > 0 ? montoTotalRes[0].total : 0;

    // 3. Monto pendiente (Por Cobrar)
    const montoPendienteRes = this.dbService.select<{ total: number }>(
      "SELECT IFNULL(SUM(monto), 0) as total FROM cheques WHERE estado = 'Pendiente'"
    );
    const montoPendiente = montoPendienteRes.length > 0 ? montoPendienteRes[0].total : 0;

    // 4. Monto cobrado
    const montoCobradoRes = this.dbService.select<{ total: number }>(
      "SELECT IFNULL(SUM(monto), 0) as total FROM cheques WHERE estado = 'Cobrado'"
    );
    const montoCobrado = montoCobradoRes.length > 0 ? montoCobradoRes[0].total : 0;

    // 5. Total beneficiarios
    const totalBeneficiariosRes = this.dbService.select<{ count: number }>(
      'SELECT COUNT(*) as count FROM beneficiarios'
    );
    const totalBeneficiarios = totalBeneficiariosRes.length > 0 ? totalBeneficiariosRes[0].count : 0;

    // 6. Resumen financiero: Emitidos vs Recibidos
    const totalEmitidosRes = this.dbService.select<{ total: number }>(
      "SELECT IFNULL(SUM(monto), 0) as total FROM cheques WHERE tipo = 'Emitido'"
    );
    const totalEmitidos = totalEmitidosRes.length > 0 ? totalEmitidosRes[0].total : 0;

    const totalRecibidosRes = this.dbService.select<{ total: number }>(
      "SELECT IFNULL(SUM(monto), 0) as total FROM cheques WHERE tipo = 'Recibido'"
    );
    const totalRecibidos = totalRecibidosRes.length > 0 ? totalRecibidosRes[0].total : 0;

    // 7. Recent cheques (limit 5)
    const recentCheques = this.dbService.select<Cheque>(`
      SELECT c.*, (b.nombre || ' ' || b.apellido) as beneficiarioNombre 
      FROM cheques c 
      JOIN beneficiarios b ON c.beneficiarioId = b.id 
      ORDER BY c.fecha DESC, c.id DESC 
      LIMIT 5
    `);

    return {
      totalCheques,
      montoTotal,
      montoPendiente,
      montoCobrado,
      totalBeneficiarios,
      resumen: {
        totalEmitidos,
        totalRecibidos,
        cobrado: montoCobrado,
        pendienteDeCobro: montoPendiente
      },
      recentCheques
    };
  }
}
