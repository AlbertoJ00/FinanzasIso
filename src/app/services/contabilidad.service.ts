import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { Cheque, ContabilidadConfig, EnvioContable } from '../models';
import { DatabaseService } from './database.service';

const DEFAULT_ENDPOINT = 'https://sistema-contabilidad.onrender.com/api/entradas';

export interface ResultadoSincronizacion {
  enviados: number;
  errores: number;
  omitidos: number;
}

@Injectable({ providedIn: 'root' })
export class ContabilidadService {
  constructor(private db: DatabaseService, private http: HttpClient) {}

  public async getConfig(): Promise<ContabilidadConfig> {
    await this.db.ready();
    const row = this.db.select<Record<string, unknown>>(
      'SELECT * FROM contabilidad_config WHERE id = 1'
    )[0];

    if (!row) return this.defaultConfig();
    return {
      activo: Number(row['activo']) === 1,
      endpoint: String(row['endpoint']),
      auxiliarId: Number(row['auxiliarId']),
      emitidoCuentaDebitoId: Number(row['emitidoCuentaDebitoId']),
      emitidoCuentaCreditoId: Number(row['emitidoCuentaCreditoId']),
      recibidoCuentaDebitoId: Number(row['recibidoCuentaDebitoId']),
      recibidoCuentaCreditoId: Number(row['recibidoCuentaCreditoId']),
      actualizadoEn: String(row['actualizadoEn'])
    };
  }

  public async saveConfig(config: ContabilidadConfig): Promise<void> {
    await this.db.ready();
    this.validateConfig(config);
    await this.db.exec(
      `INSERT INTO contabilidad_config (
        id, activo, endpoint, auxiliarId,
        emitidoCuentaDebitoId, emitidoCuentaCreditoId,
        recibidoCuentaDebitoId, recibidoCuentaCreditoId, actualizadoEn
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        activo = excluded.activo,
        endpoint = excluded.endpoint,
        auxiliarId = excluded.auxiliarId,
        emitidoCuentaDebitoId = excluded.emitidoCuentaDebitoId,
        emitidoCuentaCreditoId = excluded.emitidoCuentaCreditoId,
        recibidoCuentaDebitoId = excluded.recibidoCuentaDebitoId,
        recibidoCuentaCreditoId = excluded.recibidoCuentaCreditoId,
        actualizadoEn = excluded.actualizadoEn`,
      [
        config.activo ? 1 : 0, config.endpoint.trim(), config.auxiliarId,
        config.emitidoCuentaDebitoId, config.emitidoCuentaCreditoId,
        config.recibidoCuentaDebitoId, config.recibidoCuentaCreditoId,
        new Date().toISOString()
      ]
    );
  }

  public async getEnvios(): Promise<EnvioContable[]> {
    await this.db.ready();
    return this.db.select<EnvioContable>(`
      SELECT e.*, c.numeroCheque
      FROM contabilidad_envios e
      LEFT JOIN cheques c ON c.id = e.chequeId
      ORDER BY e.id DESC
    `);
  }

  public async probarConexion(endpoint?: string): Promise<void> {
    const config = await this.getConfig();
    const cuentasUrl = this.getCuentasUrl(endpoint || config.endpoint);
    await firstValueFrom(
      this.http.get(this.requestUrl(cuentasUrl), { responseType: 'text' }).pipe(timeout(65000))
    );
  }

  public getCuentasUrl(endpoint: string): string {
    try {
      return new URL('/cuentas', endpoint).href;
    } catch {
      return 'https://sistema-contabilidad.onrender.com/cuentas';
    }
  }

  public async encolarCheque(cheque: Cheque): Promise<boolean> {
    if (!cheque.id || cheque.estado !== 'Cobrado') return false;
    const config = await this.getConfig();
    if (!config.activo) return false;
    this.validateConfig(config);

    const cuentaDebitoId = cheque.tipo === 'Emitido'
      ? config.emitidoCuentaDebitoId
      : config.recibidoCuentaDebitoId;
    const cuentaCreditoId = cheque.tipo === 'Emitido'
      ? config.emitidoCuentaCreditoId
      : config.recibidoCuentaCreditoId;
    const descripcion = `Cheque ${cheque.numeroCheque}: ${cheque.concepto}`;

    await this.db.exec(
      `INSERT INTO contabilidad_envios (
        chequeId, tipo, auxiliarId, cuentaDebitoId, cuentaCreditoId,
        descripcion, monto, estado, intentos, respuesta, error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Pendiente', 0, '', '')
      ON CONFLICT(chequeId) DO UPDATE SET
        tipo = excluded.tipo,
        auxiliarId = excluded.auxiliarId,
        cuentaDebitoId = excluded.cuentaDebitoId,
        cuentaCreditoId = excluded.cuentaCreditoId,
        descripcion = excluded.descripcion,
        monto = excluded.monto,
        estado = CASE
          WHEN contabilidad_envios.estado = 'Enviado' THEN 'Enviado'
          ELSE 'Pendiente'
        END,
        error = CASE
          WHEN contabilidad_envios.estado = 'Enviado' THEN contabilidad_envios.error
          ELSE ''
        END`,
      [
        cheque.id, cheque.tipo, config.auxiliarId, cuentaDebitoId,
        cuentaCreditoId, descripcion, cheque.monto
      ]
    );

    const envio = this.db.select<EnvioContable>(
      'SELECT * FROM contabilidad_envios WHERE chequeId = ?', [cheque.id]
    )[0];
    return envio?.estado !== 'Enviado';
  }

  public procesarEnSegundoPlano(chequeId: number): void {
    void this.enviarCheque(chequeId).catch((error) => {
      console.warn('[Contabilidad] El asiento quedó disponible para reintento.', error);
    });
  }

  public async enviarCheque(chequeId: number): Promise<void> {
    await this.db.ready();
    const envio = this.db.select<EnvioContable>(
      'SELECT * FROM contabilidad_envios WHERE chequeId = ?', [chequeId]
    )[0];
    if (!envio || envio.estado === 'Enviado') return;

    const config = await this.getConfig();
    if (!config.activo) throw new Error('La integración contable está desactivada.');
    this.validateConfig(config);
    const ahora = new Date().toISOString();

    await this.db.exec(
      `UPDATE contabilidad_envios
       SET estado = 'Pendiente', intentos = intentos + 1, ultimoIntento = ?, error = ''
       WHERE chequeId = ?`,
      [ahora, chequeId]
    );

    const payload = {
      auxiliarId: envio.auxiliarId,
      cuentaDebitoId: envio.cuentaDebitoId,
      cuentaCreditoId: envio.cuentaCreditoId,
      descripcion: envio.descripcion,
      monto: envio.monto
    };

    try {
      const response = await firstValueFrom(
        this.http.post(this.requestUrl(config.endpoint), payload, {
          observe: 'response', responseType: 'text'
        }).pipe(timeout(65000))
      );
      await this.db.exec(
        `UPDATE contabilidad_envios
         SET estado = 'Enviado', enviadoEn = ?, respuesta = ?, error = ''
         WHERE chequeId = ?`,
        [new Date().toISOString(), response.body || `HTTP ${response.status}`, chequeId]
      );
    } catch (error) {
      const message = this.errorMessage(error);
      await this.db.exec(
        `UPDATE contabilidad_envios SET estado = 'Error', error = ? WHERE chequeId = ?`,
        [message, chequeId]
      );
      throw new Error(message);
    }
  }

  public async sincronizarCobrados(): Promise<ResultadoSincronizacion> {
    await this.db.ready();
    const cheques = this.db.select<Cheque>(
      "SELECT * FROM cheques WHERE estado = 'Cobrado' ORDER BY id ASC"
    );
    const resultado: ResultadoSincronizacion = { enviados: 0, errores: 0, omitidos: 0 };

    for (const cheque of cheques) {
      const debeEnviar = await this.encolarCheque(cheque);
      if (!debeEnviar) {
        resultado.omitidos++;
        continue;
      }
      try {
        await this.enviarCheque(cheque.id!);
        resultado.enviados++;
      } catch {
        resultado.errores++;
      }
    }
    return resultado;
  }

  public async reintentarErrores(): Promise<ResultadoSincronizacion> {
    const pendientes = (await this.getEnvios()).filter((envio) => envio.estado !== 'Enviado');
    const resultado: ResultadoSincronizacion = { enviados: 0, errores: 0, omitidos: 0 };
    for (const envio of pendientes) {
      try {
        await this.enviarCheque(envio.chequeId);
        resultado.enviados++;
      } catch {
        resultado.errores++;
      }
    }
    return resultado;
  }

  private defaultConfig(): ContabilidadConfig {
    return {
      activo: false,
      endpoint: DEFAULT_ENDPOINT,
      auxiliarId: 5,
      emitidoCuentaDebitoId: 0,
      emitidoCuentaCreditoId: 0,
      recibidoCuentaDebitoId: 0,
      recibidoCuentaCreditoId: 0
    };
  }

  private requestUrl(endpoint: string): string {
    try {
      const url = new URL(endpoint);
      if (url.hostname === 'sistema-contabilidad.onrender.com') {
        return `/api/contabilidad${url.pathname}${url.search}`;
      }
    } catch {
      // Validation reports malformed endpoints before a request is attempted.
    }
    return endpoint;
  }

  private validateConfig(config: ContabilidadConfig): void {
    try {
      const url = new URL(config.endpoint);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error();
    } catch {
      throw new Error('El endpoint de Contabilidad no es una URL válida.');
    }
    if (config.auxiliarId <= 0) throw new Error('El auxiliar contable es requerido.');
    if (config.activo) {
      const cuentas = [
        config.emitidoCuentaDebitoId, config.emitidoCuentaCreditoId,
        config.recibidoCuentaDebitoId, config.recibidoCuentaCreditoId
      ];
      if (cuentas.some((cuenta) => cuenta <= 0)) {
        throw new Error('Debe configurar todas las cuentas antes de activar la integración.');
      }
    }
  }

  private errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'No se pudo conectar con Contabilidad. Revise la red o la configuración CORS.';
      }
      const detail = typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
      return `Contabilidad respondió HTTP ${error.status}${detail ? `: ${detail}` : ''}`;
    }
    if (error instanceof Error && error.name === 'TimeoutError') {
      return 'Contabilidad tardó más de 65 segundos en responder.';
    }
    return error instanceof Error ? error.message : 'Error desconocido al enviar el asiento.';
  }
}
