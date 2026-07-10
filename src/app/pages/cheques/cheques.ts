import { Component, OnInit } from '@angular/core';
import { ChequeService } from '../../services/cheque.service';
import { NotificationService } from '../../services/notification.service';
import { LoadingService } from '../../services/loading.service';
import { MatDialog } from '@angular/material/dialog';
import { Cheque } from '../../models';
import { ChequeModal } from '../../components/cheque-modal';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../components/confirm-dialog';

@Component({
  selector: 'app-cheques',
  template: `
    <div class="cheques-container">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
        <div class="card-title-group" style="margin-bottom: 0;">
          <h2 class="card-title">Cheques</h2>
          <p class="card-subtitle">Administración y control de cheques</p>
        </div>
        <button class="btn btn-primary" (click)="onAddCheque()">
          <i class="material-icons">add_circle</i>
          Agregar
        </button>
      </div>

      <div class="card-panel">
        <!-- Search & Filter Controls -->
        <div class="controls-row">
          <div class="search-wrapper">
            <i class="material-icons">search</i>
            <input 
              type="text" 
              class="search-input" 
              placeholder="Buscar por número, beneficiario o concepto..." 
              [(ngModel)]="searchText" 
              (ngModelChange)="onSearchChange()">
          </div>

          <div class="filters-wrapper">
            <label style="font-size: 0.85rem; color: var(--color-text-secondary); font-weight: 500;">Filtrar:</label>
            <select class="filter-select" [(ngModel)]="statusFilter" (change)="onFilterChange()">
              <option value="Todos">Todos</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Cobrado">Cobrado</option>
              <option value="Anulado">Anulado</option>
            </select>
          </div>
        </div>

        <!-- Table Display -->
        <div class="table-responsive" *ngIf="paginatedCheques.length > 0; else noCheques">
          <table class="custom-table">
            <thead>
              <tr>
                <th style="cursor: pointer; user-select: none;" (click)="toggleSort('numeroCheque')">
                  N.º Cheque
                  <i class="material-icons" style="font-size: 1rem; vertical-align: middle; margin-left: 0.25rem;">
                    {{ getSortIcon('numeroCheque') }}
                  </i>
                </th>
                <th>Tipo</th>
                <th style="cursor: pointer; user-select: none;" (click)="toggleSort('beneficiarioNombre')">
                  Beneficiario
                  <i class="material-icons" style="font-size: 1rem; vertical-align: middle; margin-left: 0.25rem;">
                    {{ getSortIcon('beneficiarioNombre') }}
                  </i>
                </th>
                <th>Concepto</th>
                <th>Estado</th>
                <th style="cursor: pointer; user-select: none;" (click)="toggleSort('monto')">
                  Monto
                  <i class="material-icons" style="font-size: 1rem; vertical-align: middle; margin-left: 0.25rem;">
                    {{ getSortIcon('monto') }}
                  </i>
                </th>
                <th style="cursor: pointer; user-select: none;" (click)="toggleSort('fecha')">
                  Fecha
                  <i class="material-icons" style="font-size: 1rem; vertical-align: middle; margin-left: 0.25rem;">
                    {{ getSortIcon('fecha') }}
                  </i>
                </th>
                <th style="text-align: right;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let c of paginatedCheques">
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

          <!-- Pagination Controls -->
          <div class="pagination-controls">
            <span>
              Mostrando {{ startItem() }} - {{ endItem() }} de {{ totalItems }} registros
            </span>
            <div class="pagination-buttons">
              <button class="pagination-btn" [disabled]="currentPage === 1" (click)="goToPage(currentPage - 1)">
                <i class="material-icons" style="font-size: 1.25rem;">chevron_left</i>
              </button>
              
              <button 
                class="pagination-btn" 
                *ngFor="let p of getPagesArray()" 
                [style.font-weight]="currentPage === p ? '600' : '400'"
                [style.border-color]="currentPage === p ? 'var(--color-primary)' : 'var(--color-border)'"
                (click)="goToPage(p)">
                {{ p }}
              </button>
              
              <button class="pagination-btn" [disabled]="currentPage === totalPages" (click)="goToPage(currentPage + 1)">
                <i class="material-icons" style="font-size: 1.25rem;">chevron_right</i>
              </button>
            </div>
          </div>
        </div>

        <ng-template #noCheques>
          <div class="no-records">
            <i class="material-icons">payments</i>
            <p *ngIf="searchText || statusFilter !== 'Todos'">No se encontraron cheques que coincidan con los filtros.</p>
            <p *ngIf="!searchText && statusFilter === 'Todos'">No hay cheques registrados.</p>
            <button *ngIf="!searchText && statusFilter === 'Todos'" class="btn btn-primary" (click)="onAddCheque()" style="margin-top: 0.5rem;">
              Registrar Primer Cheque
            </button>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  standalone: false
})
export class ChequesComponent implements OnInit {
  private cheques: Cheque[] = [];
  public filteredCheques: Cheque[] = [];
  public paginatedCheques: Cheque[] = [];

  // Search, Filter & Sort State
  public searchText = '';
  public statusFilter = 'Todos';
  public sortKey = 'fecha';
  public sortDirection: 'asc' | 'desc' = 'desc';

  // Pagination State
  public currentPage = 1;
  public pageSize = 8;
  public totalItems = 0;
  public totalPages = 0;

  constructor(
    private chequeService: ChequeService,
    private notificationService: NotificationService,
    private loadingService: LoadingService,
    private dialog: MatDialog
  ) {}

  public async ngOnInit(): Promise<void> {
    await this.loadCheques();
  }

  private async loadCheques(): Promise<void> {
    try {
      this.cheques = await this.chequeService.getAll();
      this.applyFilters();
    } catch (err) {
      this.notificationService.error('Error al cargar los cheques.');
    }
  }

  public applyFilters(): void {
    let result = [...this.cheques];

    // 1. Text Filter
    if (this.searchText.trim()) {
      const search = this.searchText.toLowerCase().trim();
      result = result.filter(c => 
        c.numeroCheque.toLowerCase().includes(search) ||
        (c.beneficiarioNombre && c.beneficiarioNombre.toLowerCase().includes(search)) ||
        c.concepto.toLowerCase().includes(search)
      );
    }

    // 2. Status Filter
    if (this.statusFilter !== 'Todos') {
      result = result.filter(c => c.estado === this.statusFilter);
    }

    // 3. Sorting
    result.sort((a, b) => {
      let valA: any = a[this.sortKey as keyof Cheque] ?? '';
      let valB: any = b[this.sortKey as keyof Cheque] ?? '';

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    this.filteredCheques = result;
    this.totalItems = result.length;
    this.totalPages = Math.ceil(this.totalItems / this.pageSize) || 1;

    // Reset page if it exceeds range
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }

    // 4. Paginate
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedCheques = this.filteredCheques.slice(startIndex, startIndex + this.pageSize);
  }

  public onSearchChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  public onFilterChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  public toggleSort(key: string): void {
    if (this.sortKey === key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDirection = 'desc'; // default sort descending
    }
    this.applyFilters();
  }

  public getSortIcon(key: string): string {
    if (this.sortKey !== key) return 'import_export';
    return this.sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  // Pagination Helpers
  public startItem(): number {
    if (this.totalItems === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  public endItem(): number {
    const end = this.currentPage * this.pageSize;
    return end > this.totalItems ? this.totalItems : end;
  }

  public getPagesArray(): number[] {
    const pages = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  public goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.applyFilters();
  }

  // Actions
  public onAddCheque(): void {
    const dialogRef = this.dialog.open(ChequeModal, {
      width: '650px',
      data: null,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(async (added) => {
      if (added) {
        await this.loadCheques();
      }
    });
  }

  public onEditCheque(cheque: Cheque): void {
    const dialogRef = this.dialog.open(ChequeModal, {
      width: '650px',
      data: cheque,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(async (updated) => {
      if (updated) {
        await this.loadCheques();
      }
    });
  }

  public onDeleteCheque(cheque: Cheque): void {
    const dialogData: ConfirmDialogData = {
      title: '¿Eliminar Cheque?',
      message: `¿Está seguro de que desea eliminar permanentemente el cheque número ${cheque.numeroCheque} por un monto de RD$ ${cheque.monto.toLocaleString()}?`
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
          await this.loadCheques();
        } catch (err: any) {
          this.notificationService.error(err.message || 'Error al eliminar el cheque.');
        } finally {
          this.loadingService.hide();
        }
      }
    });
  }
}
