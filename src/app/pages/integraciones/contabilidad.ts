import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ContabilidadConfig, EnvioContable } from '../../models';
import { ContabilidadService } from '../../services/contabilidad.service';
import { LoadingService } from '../../services/loading.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-contabilidad',
  standalone: false,
  template: `
    <div class="integration-header">
      <div class="card-title-group">
        <h2 class="card-title">Integración con Contabilidad</h2>
        <p class="card-subtitle">Configura las cuentas y supervisa el envío de asientos.</p>
      </div>
      <span class="badge" [class.estado-cobrado]="form.value.activo" [class.estado-anulado]="!form.value.activo">
        {{ form.value.activo ? 'Activa' : 'Inactiva' }}
      </span>
    </div>

    <div class="card-panel">
      <form [formGroup]="form" (ngSubmit)="guardar()">
        <label class="toggle-row">
          <input type="checkbox" formControlName="activo">
          <span><b>Enviar cheques cobrados</b><small>Los cheques pendientes o anulados no generan asientos.</small></span>
        </label>

        <div class="form-grid integration-grid">
          <div class="form-field form-full-width">
            <label class="form-label">Endpoint de entradas</label>
            <input class="form-input" formControlName="endpoint">
            <div class="form-error" *ngIf="form.get('endpoint')?.invalid">Ingrese una URL válida.</div>
          </div>
          <div class="form-field">
            <label class="form-label">Auxiliar ID</label>
            <input type="number" min="1" class="form-input" formControlName="auxiliarId">
            <small class="field-help">5 corresponde a Otros Auxiliares.</small>
          </div>
          <div class="form-field accounts-link">
            <label class="form-label">Catálogo contable</label>
            <a class="btn btn-secondary" [href]="cuentasUrl" target="_blank" rel="noopener">
              <i class="material-icons">open_in_new</i> Consultar cuentas
            </a>
          </div>
        </div>

        <div class="account-sections">
          <section class="mapping-card">
            <h3><i class="material-icons">north_east</i> Cheques emitidos</h3>
            <div class="form-field">
              <label class="form-label">Cuenta débito ID</label>
              <input type="number" min="0" class="form-input" formControlName="emitidoCuentaDebitoId">
            </div>
            <div class="form-field">
              <label class="form-label">Cuenta crédito ID</label>
              <input type="number" min="0" class="form-input" formControlName="emitidoCuentaCreditoId">
            </div>
          </section>
          <section class="mapping-card">
            <h3><i class="material-icons">south_west</i> Cheques recibidos</h3>
            <div class="form-field">
              <label class="form-label">Cuenta débito ID</label>
              <input type="number" min="0" class="form-input" formControlName="recibidoCuentaDebitoId">
            </div>
            <div class="form-field">
              <label class="form-label">Cuenta crédito ID</label>
              <input type="number" min="0" class="form-input" formControlName="recibidoCuentaCreditoId">
            </div>
          </section>
        </div>

        <div class="integration-actions">
          <button type="button" class="btn btn-secondary" (click)="probar()">
            <i class="material-icons">wifi_tethering</i> Probar conexión
          </button>
          <button type="submit" class="btn btn-primary" [disabled]="form.invalid">
            <i class="material-icons">save</i> Guardar configuración
          </button>
        </div>
      </form>
    </div>

    <div class="card-panel">
      <div class="queue-header">
        <div>
          <h2 class="card-title">Cola contable</h2>
          <p class="card-subtitle">Cada cheque se envía una sola vez. Los errores se conservan para reintento.</p>
        </div>
        <div class="queue-actions">
          <button class="btn btn-secondary" (click)="reintentar()" [disabled]="!hayPendientes">
            <i class="material-icons">refresh</i> Reintentar
          </button>
          <button class="btn btn-primary" (click)="sincronizar()">
            <i class="material-icons">sync</i> Sincronizar cobrados
          </button>
        </div>
      </div>

      <div class="table-responsive" *ngIf="envios.length; else sinEnvios">
        <table class="custom-table">
          <thead><tr><th>Cheque</th><th>Tipo</th><th>Cuentas</th><th>Monto</th><th>Estado</th><th>Intentos</th><th>Último intento</th><th></th></tr></thead>
          <tbody>
            <tr *ngFor="let envio of envios">
              <td>{{ envio.numeroCheque || ('#' + envio.chequeId) }}</td>
              <td>{{ envio.tipo }}</td>
              <td>{{ envio.cuentaDebitoId }} → {{ envio.cuentaCreditoId }}</td>
              <td>RD$ {{ envio.monto | number:'1.2-2' }}</td>
              <td><span class="badge" [ngClass]="estadoClass(envio)">{{ envio.estado }}</span></td>
              <td>{{ envio.intentos }}</td>
              <td [title]="envio.error || envio.respuesta || ''">{{ envio.ultimoIntento ? (envio.ultimoIntento | date:'short') : '—' }}</td>
              <td><button *ngIf="envio.estado !== 'Enviado'" class="icon-btn edit" title="Reintentar" (click)="reintentarUno(envio)"><i class="material-icons">replay</i></button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <ng-template #sinEnvios><div class="no-records"><i class="material-icons">receipt_long</i><p>No hay asientos en la cola.</p></div></ng-template>
    </div>
  `,
  styles: [`
    .integration-header,.queue-header,.integration-actions,.queue-actions{display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap}
    .toggle-row{display:flex;align-items:center;gap:.8rem;padding:1rem;border:1px solid var(--color-border);border-radius:var(--border-radius-md);margin-bottom:1.5rem;cursor:pointer}
    .toggle-row input{width:20px;height:20px;accent-color:var(--color-primary)}
    .toggle-row span{display:flex;flex-direction:column;gap:.2rem}.toggle-row small,.field-help{color:var(--color-text-secondary)}
    .integration-grid{margin-bottom:1.5rem}.accounts-link{justify-content:flex-end}.accounts-link .btn{align-self:flex-start}
    .account-sections{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem}
    .mapping-card{padding:1.25rem;border:1px solid var(--color-border);border-radius:var(--border-radius-md);display:grid;gap:1rem}
    .mapping-card h3{display:flex;align-items:center;gap:.5rem;font-size:1rem}.mapping-card h3 i{color:var(--color-primary)}
    .queue-header{margin-bottom:1.5rem}.integration-actions{justify-content:flex-end;border-top:1px solid var(--color-border);padding-top:1.5rem}
    .estado-error{background:var(--color-danger-bg);color:#fca5a5}.estado-enviado{background:var(--color-success-bg);color:#34d399}.estado-pendiente{background:rgba(217,119,6,.15);color:#fcd34d}
    @media(max-width:768px){.account-sections{grid-template-columns:1fr}.integration-actions,.queue-actions{width:100%}.integration-actions .btn,.queue-actions .btn{flex:1}}
  `]
})
export class ContabilidadComponent implements OnInit {
  public envios: EnvioContable[] = [];
  public cuentasUrl = 'https://sistema-contabilidad.onrender.com/cuentas';
  public form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private contabilidad: ContabilidadService,
    private notice: NotificationService,
    private loading: LoadingService
  ) {
    this.form = this.fb.group({
      activo: [false],
      endpoint: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/i)]],
      auxiliarId: [5, [Validators.required, Validators.min(1)]],
      emitidoCuentaDebitoId: [0, [Validators.required, Validators.min(0)]],
      emitidoCuentaCreditoId: [0, [Validators.required, Validators.min(0)]],
      recibidoCuentaDebitoId: [0, [Validators.required, Validators.min(0)]],
      recibidoCuentaCreditoId: [0, [Validators.required, Validators.min(0)]]
    });
    this.form.get('endpoint')?.valueChanges.subscribe((endpoint) => {
      this.cuentasUrl = this.contabilidad.getCuentasUrl(endpoint || '');
    });
  }

  public async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  public get hayPendientes(): boolean {
    return this.envios.some((envio) => envio.estado !== 'Enviado');
  }

  public async guardar(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.show();
    try {
      await this.contabilidad.saveConfig(this.form.getRawValue() as ContabilidadConfig);
      this.notice.success('Configuración contable guardada.');
      await this.cargar();
    } catch (error) {
      this.notice.error(this.message(error));
    } finally {
      this.loading.hide();
    }
  }

  public async probar(): Promise<void> {
    this.loading.show();
    try {
      await this.contabilidad.probarConexion(this.form.value.endpoint || undefined);
      this.notice.success('Conexión con Contabilidad verificada.');
    } catch (error) {
      this.notice.error(this.message(error));
    } finally {
      this.loading.hide();
    }
  }

  public async sincronizar(): Promise<void> {
    await this.ejecutarSincronizacion(() => this.contabilidad.sincronizarCobrados());
  }

  public async reintentar(): Promise<void> {
    await this.ejecutarSincronizacion(() => this.contabilidad.reintentarErrores());
  }

  public async reintentarUno(envio: EnvioContable): Promise<void> {
    this.loading.show();
    try {
      await this.contabilidad.enviarCheque(envio.chequeId);
      this.notice.success('Asiento enviado correctamente.');
    } catch (error) {
      this.notice.error(this.message(error));
    } finally {
      await this.cargarEnvios();
      this.loading.hide();
    }
  }

  public estadoClass(envio: EnvioContable): string {
    return `estado-${envio.estado.toLowerCase()}`;
  }

  private async cargar(): Promise<void> {
    const config = await this.contabilidad.getConfig();
    this.form.patchValue(config);
    this.cuentasUrl = this.contabilidad.getCuentasUrl(config.endpoint);
    await this.cargarEnvios();
  }

  private async cargarEnvios(): Promise<void> {
    this.envios = await this.contabilidad.getEnvios();
  }

  private async ejecutarSincronizacion(
    operation: () => ReturnType<ContabilidadService['sincronizarCobrados']>
  ): Promise<void> {
    this.loading.show();
    try {
      const result = await operation();
      const message = `${result.enviados} enviados, ${result.errores} con error, ${result.omitidos} omitidos.`;
      result.errores ? this.notice.warn(message) : this.notice.success(message);
    } catch (error) {
      this.notice.error(this.message(error));
    } finally {
      await this.cargarEnvios();
      this.loading.hide();
    }
  }

  private message(error: unknown): string {
    return error instanceof Error ? error.message : 'No se pudo completar la operación.';
  }
}
