import { Component, OnInit } from '@angular/core';
import { DashboardService, DashboardStats } from '../../services/dashboard.service';
import { ChequeService } from '../../services/cheque.service';
import { NotificationService } from '../../services/notification.service';
import { LoadingService } from '../../services/loading.service';
import { MatDialog } from '@angular/material/dialog';
import { Cheque } from '../../models';
import { ChequeModal } from '../../components/cheque-modal';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../components/confirm-dialog';

@Component({
  selector: 'app-dashboard',
  template: `
    <div class="dashboard-container">
      <div class="card-title-group">
        <h2 class="card-title">Dashboard</h2>
        <p class="card-subtitle">Resumen general del sistema de cheques</p>
      </div>

      <div class="dashboard-top-section">
        <!-- Left: 2x2 grid of KPI cards -->
        <div class="kpi-grid-2x2">
          
          <!-- 1. Total cheques -->
          <div class="kpi-card">
            <div class="kpi-info">
              <span class="kpi-label">Total Cheques</span>
              <span class="kpi-value">{{ stats.totalCheques }}</span>
            </div>
            <div class="kpi-icon-wrapper blue">
              <i class="material-icons">description</i>
            </div>
          </div>

          <!-- 2. Monto total -->
          <div class="kpi-card">
            <div class="kpi-info">
              <span class="kpi-label">Monto Total</span>
              <span class="kpi-value">RD$ {{ stats.montoTotal | number:'1.2-2' }}</span>
            </div>
            <div class="kpi-icon-wrapper green">
              <i class="material-icons">trending_up</i>
            </div>
          </div>

          <!-- 3. Por cobrar -->
          <div class="kpi-card">
            <div class="kpi-info">
              <span class="kpi-label">Por Cobrar</span>
              <span class="kpi-value">RD$ {{ stats.montoPendiente | number:'1.2-2' }}</span>
            </div>
            <div class="kpi-icon-wrapper orange">
              <i class="material-icons">schedule</i>
            </div>
          </div>

          <!-- 4. Beneficiarios -->
          <div class="kpi-card">
            <div class="kpi-info">
              <span class="kpi-label">Beneficiarios</span>
              <span class="kpi-value">{{ stats.totalBeneficiarios }}</span>
            </div>
            <div class="kpi-icon-wrapper grey">
              <i class="material-icons">people</i>
            </div>
          </div>
          
        </div>

        <!-- Right: Resumen Financiero card -->
        <div class="card-panel" style="margin-bottom: 0;">
          <h3 class="kpi-label" style="margin-bottom: 1.5rem; font-size: 0.85rem;">Resumen Financiero</h3>
          
          <div class="resumen-row">
            <span class="resumen-label">Total emitidos</span>
            <span class="resumen-value">RD$ {{ stats.resumen.totalEmitidos | number:'1.2-2' }}</span>
          </div>
          
          <div class="resumen-row">
            <span class="resumen-label">Total recibidos</span>
            <span class="resumen-value">RD$ {{ stats.resumen.totalRecibidos | number:'1.2-2' }}</span>
          </div>
          
          <div class="resumen-divider"></div>
          
          <div class="resumen-row" style="margin-top: 0.5rem;">
            <span class="resumen-label">Cobrado</span>
            <span class="resumen-value green">RD$ {{ stats.resumen.cobrado | number:'1.2-2' }}</span>
          </div>
          
          <div class="resumen-row">
            <span class="resumen-label">Pendiente de cobro</span>
            <span class="resumen-value orange">RD$ {{ stats.resumen.pendienteDeCobro | number:'1.2-2' }}</span>
          </div>
        </div>
      </div>

      <!-- Recent Cheques Table Card -->
      <div class="card-panel">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <div>
            <h3 class="card-title" style="font-size: 1.25rem;">Cheques Recientes</h3>
            <p class="card-subtitle">Últimos cheques registrados</p>
          </div>
          <a routerLink="/cheques" style="color: var(--color-primary); font-size: 0.85rem; font-weight: 600; text-decoration: none; display: flex; align-items: center; gap: 0.25rem;">
            Ver todos
            <i class="material-icons" style="font-size: 1rem;">chevron_right</i>
          </a>
        </div>

        <div class="table-responsive" *ngIf="stats.recentCheques.length > 0; else noRecent">
          <table class="custom-table">
            <thead>
              <tr>
                <th>N.º Cheque</th>
                <th>Tipo</th>
                <th>Beneficiario</th>
                <th>Concepto</th>
                <th>Estado</th>
                <th>Monto</th>
                <th>Fecha</th>
                <th style="text-align: right;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let c of stats.recentCheques">
                <td style="font-weight: 600;">{{ c.numeroCheque }}</td>
                <td>
                  <span class="badge" [class.tipo-emitido]="c.tipo === 'Emitido'" [class.tipo-recibido]="c.tipo === 'Recibido'">
                    {{ c.tipo }}
                  </span>
                </td>
                <td>{{ c.beneficiarioNombre }}</td>
                <td>{{ c.concepto }}</td>
                <td>
                  <span class="badge" 
                    [class.estado-pendiente]="c.estado === 'Pendiente'" 
                    [class.estado-cobrado]="c.estado === 'Cobrado'" 
                    [class.estado-anulado]="c.estado === 'Anulado'">
                    {{ c.estado }}
                  </span>
                </td>
                <td style="font-weight: 600; color: #ffffff;">RD$ {{ c.monto | number:'1.2-2' }}</td>
                <td style="color: var(--color-text-secondary); font-size: 0.8rem;">{{ c.fecha }}</td>
                <td style="text-align: right;">
                  <button class="icon-btn edit" title="Editar" (click)="onEditCheque(c)">
                    <i class="material-icons">edit</i>
                  </button>
                  <button class="icon-btn delete" title="Eliminar" (click)="onDeleteCheque(c)">
                    <i class="material-icons">delete</i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <ng-template #noRecent>
          <div class="no-records">
            <i class="material-icons">payments</i>
            <p>No hay cheques registrados en el sistema.</p>
            <a routerLink="/cheques" class="btn btn-primary" style="margin-top: 0.5rem; font-size: 0.85rem; padding: 0.5rem 1.25rem;">
              Registrar Primer Cheque
            </a>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  standalone: false
})
export class DashboardComponent implements OnInit {
  public stats: DashboardStats = {
    totalCheques: 0,
    montoTotal: 0,
    montoPendiente: 0,
    montoCobrado: 0,
    totalBeneficiarios: 0,
    resumen: {
      totalEmitidos: 0,
      totalRecibidos: 0,
      cobrado: 0,
      pendienteDeCobro: 0
    },
    recentCheques: []
  };

  constructor(
    private dashboardService: DashboardService,
    private chequeService: ChequeService,
    private notificationService: NotificationService,
    private loadingService: LoadingService,
    private dialog: MatDialog
  ) {}

  public async ngOnInit(): Promise<void> {
    await this.loadStats();
  }

  private async loadStats(): Promise<void> {
    try {
      this.stats = await this.dashboardService.getStats();
    } catch (err) {
      this.notificationService.error('Error al cargar métricas del Dashboard.');
    }
  }

  public onEditCheque(cheque: Cheque): void {
    const dialogRef = this.dialog.open(ChequeModal, {
      width: '650px',
      data: cheque,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(async (updated) => {
      if (updated) {
        await this.loadStats();
      }
    });
  }

  public onDeleteCheque(cheque: Cheque): void {
    const dialogData: ConfirmDialogData = {
      title: '¿Eliminar Cheque?',
      message: `¿Está seguro de que desea eliminar el cheque ${cheque.numeroCheque} por un monto de RD$ ${cheque.monto.toLocaleString()}?`
    };

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(async (confirm) => {
      if (confirm) {
        this.loadingService.show();
        try {
          await this.chequeService.delete(cheque.id!);
          this.notificationService.success('Cheque eliminado con éxito.');
          await this.loadStats();
        } catch (err: any) {
          this.notificationService.error(err.message || 'Error al eliminar el cheque.');
        } finally {
          this.loadingService.hide();
        }
      }
    });
  }
}
