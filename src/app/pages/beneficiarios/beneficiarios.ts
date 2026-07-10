import { Component, OnInit } from '@angular/core';
import { BeneficiarioService } from '../../services/beneficiario.service';
import { NotificationService } from '../../services/notification.service';
import { LoadingService } from '../../services/loading.service';
import { MatDialog } from '@angular/material/dialog';
import { Beneficiario } from '../../models';
import { BeneficiarioModal } from '../../components/beneficiario-modal';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../components/confirm-dialog';

@Component({
  selector: 'app-beneficiarios',
  template: `
    <div class="beneficiarios-container">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
        <div class="card-title-group" style="margin-bottom: 0;">
          <h2 class="card-title">Beneficiarios</h2>
          <p class="card-subtitle">Administración de beneficiarios del sistema</p>
        </div>
        <button class="btn btn-primary" (click)="onAddBeneficiario()">
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
              placeholder="Buscar por nombre, documento, correo o banco..." 
              [(ngModel)]="searchText" 
              (ngModelChange)="onSearchChange()">
          </div>

          <div class="filters-wrapper">
            <label style="font-size: 0.85rem; color: var(--color-text-secondary); font-weight: 500;">Filtrar:</label>
            <select class="filter-select" [(ngModel)]="statusFilter" (change)="onFilterChange()">
              <option value="Todos">Todos</option>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
        </div>

        <!-- Table Display -->
        <div class="table-responsive" *ngIf="paginatedBeneficiarios.length > 0; else noRecords">
          <table class="custom-table">
            <thead>
              <tr>
                <th style="cursor: pointer; user-select: none;" (click)="toggleSort('nombre')">
                  Nombre
                  <i class="material-icons" style="font-size: 1rem; vertical-align: middle; margin-left: 0.25rem;">
                    {{ getSortIcon('nombre') }}
                  </i>
                </th>
                <th>Identidad</th>
                <th>RFC/Documento</th>
                <th>Contacto</th>
                <th>Banco</th>
                <th>Estado</th>
                <th style="text-align: right;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let b of paginatedBeneficiarios">
                <td style="font-weight: 600;">{{ b.nombre }} {{ b.apellido }}</td>
                <td>
                  <div style="font-size: 0.85rem; color: var(--color-text-secondary);">{{ b.tipoDocumento }}</div>
                  <div style="font-size: 0.9rem; font-weight: 500;">{{ b.numeroDocumento }}</div>
                </td>
                <td style="font-family: monospace; font-size: 0.9rem; letter-spacing: 0.05em;">
                  {{ b.numeroDocumento }}
                </td>
                <td>
                  <div style="display: flex; align-items: center; gap: 0.25rem; font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 0.25rem;">
                    <i class="material-icons" style="font-size: 1rem;">phone</i>
                    {{ b.telefono }}
                  </div>
                  <div style="display: flex; align-items: center; gap: 0.25rem; font-size: 0.85rem; color: var(--color-text-secondary);">
                    <i class="material-icons" style="font-size: 1rem;">email</i>
                    {{ b.correo }}
                  </div>
                </td>
                <td>
                  <div style="display: flex; align-items: center; gap: 0.25rem; font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 0.25rem;">
                    <i class="material-icons" style="font-size: 1rem;">account_balance</i>
                    {{ b.banco }}
                  </div>
                  <div style="text-decoration: underline; font-family: monospace; font-size: 0.9rem;">
                    {{ b.cuentaBancaria }}
                  </div>
                </td>
                <td>
                  <span class="badge" [class.activo]="b.estado === 'Activo'" [class.inactivo]="b.estado === 'Inactivo'">
                    {{ b.estado }}
                  </span>
                </td>
                <td style="text-align: right;">
                  <button class="icon-btn edit" title="Editar" (click)="onEditBeneficiario(b)">
                    <i class="material-icons">edit</i>
                  </button>
                  <button class="icon-btn delete" title="Eliminar" (click)="onDeleteBeneficiario(b)">
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

        <ng-template #noRecords>
          <div class="no-records">
            <i class="material-icons">people</i>
            <p *ngIf="searchText || statusFilter !== 'Todos'">No se encontraron beneficiarios que coincidan con los filtros.</p>
            <p *ngIf="!searchText && statusFilter === 'Todos'">No hay beneficiarios registrados en el sistema.</p>
            <button *ngIf="!searchText && statusFilter === 'Todos'" class="btn btn-primary" (click)="onAddBeneficiario()" style="margin-top: 0.5rem;">
              Registrar Primer Beneficiario
            </button>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  standalone: false
})
export class BeneficiariosComponent implements OnInit {
  private beneficiarios: Beneficiario[] = [];
  public filteredBeneficiarios: Beneficiario[] = [];
  public paginatedBeneficiarios: Beneficiario[] = [];

  // Search, Filter & Sort State
  public searchText = '';
  public statusFilter = 'Todos';
  public sortKey = 'nombre';
  public sortDirection: 'asc' | 'desc' = 'asc';

  // Pagination State
  public currentPage = 1;
  public pageSize = 8;
  public totalItems = 0;
  public totalPages = 0;

  constructor(
    private beneficiarioService: BeneficiarioService,
    private notificationService: NotificationService,
    private loadingService: LoadingService,
    private dialog: MatDialog
  ) {}

  public async ngOnInit(): Promise<void> {
    await this.loadBeneficiarios();
  }

  private async loadBeneficiarios(): Promise<void> {
    try {
      this.beneficiarios = await this.beneficiarioService.getAll();
      this.applyFilters();
    } catch (err) {
      this.notificationService.error('Error al cargar la lista de beneficiarios.');
    }
  }

  public applyFilters(): void {
    let result = [...this.beneficiarios];

    // 1. Text Filter
    if (this.searchText.trim()) {
      const search = this.searchText.toLowerCase().trim();
      result = result.filter(b => 
        b.nombre.toLowerCase().includes(search) ||
        b.apellido.toLowerCase().includes(search) ||
        b.numeroDocumento.toLowerCase().includes(search) ||
        b.correo.toLowerCase().includes(search) ||
        b.banco.toLowerCase().includes(search)
      );
    }

    // 2. Status Filter
    if (this.statusFilter !== 'Todos') {
      result = result.filter(b => b.estado === this.statusFilter);
    }

    // 3. Sorting
    result.sort((a, b) => {
      let valA: any = a[this.sortKey as keyof Beneficiario] ?? '';
      let valB: any = b[this.sortKey as keyof Beneficiario] ?? '';

      if (this.sortKey === 'nombre') {
        valA = `${a.nombre} ${a.apellido}`.toLowerCase();
        valB = `${b.nombre} ${b.apellido}`.toLowerCase();
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    this.filteredBeneficiarios = result;
    this.totalItems = result.length;
    this.totalPages = Math.ceil(this.totalItems / this.pageSize) || 1;

    // Reset page if it exceeds range
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }

    // 4. Paginate
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedBeneficiarios = this.filteredBeneficiarios.slice(startIndex, startIndex + this.pageSize);
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
      this.sortDirection = 'asc';
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
  public onAddBeneficiario(): void {
    const dialogRef = this.dialog.open(BeneficiarioModal, {
      width: '600px',
      data: null,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(async (added) => {
      if (added) {
        await this.loadBeneficiarios();
      }
    });
  }

  public onEditBeneficiario(beneficiario: Beneficiario): void {
    const dialogRef = this.dialog.open(BeneficiarioModal, {
      width: '600px',
      data: beneficiario,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(async (updated) => {
      if (updated) {
        await this.loadBeneficiarios();
      }
    });
  }

  public onDeleteBeneficiario(beneficiario: Beneficiario): void {
    const dialogData: ConfirmDialogData = {
      title: '¿Eliminar Beneficiario?',
      message: `¿Está seguro de que desea eliminar permanentemente al beneficiario ${beneficiario.nombre} ${beneficiario.apellido}? Esto requiere que no tenga cheques asociados.`
    };

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(async (confirm) => {
      if (confirm) {
        this.loadingService.show();
        try {
          await this.beneficiarioService.delete(beneficiario.id!);
          this.notificationService.success('Beneficiario eliminado con éxito.');
          await this.loadBeneficiarios();
        } catch (err: any) {
          this.notificationService.error(err.message || 'Error al eliminar el beneficiario.');
        } finally {
          this.loadingService.hide();
        }
      }
    });
  }
}
