import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Cheque, Beneficiario } from '../models';
import { ChequeService } from '../services/cheque.service';
import { BeneficiarioService } from '../services/beneficiario.service';
import { NotificationService } from '../services/notification.service';
import { LoadingService } from '../services/loading.service';
import { ConceptoService } from '../services/concepto.service';
import { Concepto } from '../models';

@Component({
  selector: 'app-cheque-modal',
  template: `
    <div style="padding: 1rem 0.5rem; max-width: 650px; width: 100%;">
      <div class="modal-header">
        <h2 class="card-title">{{ isEdit ? 'Editar Cheque' : 'Nuevo Cheque' }}</h2>
        <button type="button" class="icon-btn" (click)="onCancel()">
          <i class="material-icons">close</i>
        </button>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="form-grid">
          
          <div class="form-field form-full-width">
            <label class="form-label">Tipo de Cheque</label>
            <div class="type-toggle-container">
              <button 
                type="button" 
                class="type-toggle-btn"
                [class.active]="form.get('tipo')?.value === 'Emitido'"
                [class.emitido]="form.get('tipo')?.value === 'Emitido'"
                (click)="setTipo('Emitido')">
                Emitido
              </button>
              <button 
                type="button" 
                class="type-toggle-btn"
                [class.active]="form.get('tipo')?.value === 'Recibido'"
                [class.recibido]="form.get('tipo')?.value === 'Recibido'"
                (click)="setTipo('Recibido')">
                Recibido
              </button>
            </div>
          </div>

          <div class="form-field">
            <label class="form-label">N.º Cheque</label>
            <input type="text" class="form-input" formControlName="numeroCheque" placeholder="CHQ-001" [class.invalid]="isFieldInvalid('numeroCheque')">
            <div class="form-error" *ngIf="isFieldInvalid('numeroCheque')">El número de cheque es requerido.</div>
          </div>

          <div class="form-field">
            <label class="form-label">Beneficiario</label>
            <select class="form-select-native" formControlName="beneficiarioId" [class.invalid]="isFieldInvalid('beneficiarioId')">
              <option [value]="null" disabled selected>Seleccione un beneficiario</option>
              <option *ngFor="let b of beneficiarios" [value]="b.id">
                {{ b.nombre }} {{ b.apellido }} ({{ b.estado }})
              </option>
            </select>
            <div class="form-error" *ngIf="isFieldInvalid('beneficiarioId')">El beneficiario es requerido.</div>
          </div>

          <div class="form-field">
            <label class="form-label">Cantidad (Monto)</label>
            <div style="position: relative; display: flex; align-items: center;">
              <span style="position: absolute; left: 1rem; color: var(--color-text-secondary);">$</span>
              <input type="number" step="0.01" class="form-input" style="padding-left: 2rem;" formControlName="monto" placeholder="0.00" [class.invalid]="isFieldInvalid('monto')">
            </div>
            <div class="form-error" *ngIf="isFieldInvalid('monto')">
              <span *ngIf="form.get('monto')?.hasError('required')">El monto es requerido.</span>
              <span *ngIf="form.get('monto')?.hasError('min')">El monto debe ser mayor a 0.</span>
            </div>
          </div>

          <div class="form-field">
            <label class="form-label">Estado</label>
            <select class="form-select-native" formControlName="estado">
              <option value="Pendiente">Pendiente</option>
              <option value="Cobrado">Cobrado</option>
              <option value="Anulado">Anulado</option>
            </select>
          </div>

          <div class="form-field form-full-width">
            <label class="form-label">Concepto (Descripción)</label>
            <select class="form-select-native" formControlName="concepto" [class.invalid]="isFieldInvalid('concepto')">
              <option value="" disabled>Seleccione un concepto</option>
              <option *ngIf="conceptoExistente" [value]="conceptoExistente">{{ conceptoExistente }} (existente)</option>
              <option *ngFor="let concepto of conceptos" [value]="concepto.nombre">{{ concepto.nombre }}</option>
              <option value="Otro">Otro (texto libre)</option>
            </select>
            <input *ngIf="form.get('concepto')?.value === 'Otro'" type="text" class="form-input" style="margin-top:.5rem" [(ngModel)]="otroConcepto" [ngModelOptions]="{standalone:true}" placeholder="Especifique el concepto">
            <div class="form-error" *ngIf="isFieldInvalid('concepto')">El concepto es requerido.</div>
          </div>

          <div class="form-field form-full-width">
            <label class="form-label">Observaciones (Opcional)</label>
            <input type="text" class="form-input" formControlName="observaciones" placeholder="Detalles adicionales">
          </div>

        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.2); background-color: rgba(239, 68, 68, 0.05);" (click)="onCancel()">
            Cancelar
          </button>
          <button type="submit" class="btn btn-primary" [disabled]="form.invalid">
            Guardar
          </button>
        </div>
      </form>
    </div>
  `,
  standalone: false
})
export class ChequeModal implements OnInit {
  public form!: FormGroup;
  public isEdit = false;
  public beneficiarios: Beneficiario[] = [];
  public conceptos: Concepto[] = [];
  public otroConcepto = '';

  constructor(
    private fb: FormBuilder,
    private chequeService: ChequeService,
    private beneficiarioService: BeneficiarioService,
    private notificationService: NotificationService,
    private loadingService: LoadingService,
    public dialogRef: MatDialogRef<ChequeModal>, private conceptoService: ConceptoService,
    @Inject(MAT_DIALOG_DATA) public data: Cheque | null
  ) {}

  public async ngOnInit(): Promise<void> {
    this.isEdit = !!this.data;
    this.initForm();
    await this.loadBeneficiarios();
    this.conceptos = (await this.conceptoService.getAll()).filter(c => c.estado === 'Activo');
  }

  private initForm(): void {
    // Generate default cheque number for convenience if creating new
    const defaultNum = this.data?.numeroCheque || `CHQ-${Math.floor(1000 + Math.random() * 9000)}`;

    this.form = this.fb.group({
      id: [this.data?.id || null],
      numeroCheque: [defaultNum, [Validators.required]],
      tipo: [this.data?.tipo || 'Emitido', [Validators.required]],
      beneficiarioId: [this.data?.beneficiarioId || null, [Validators.required]],
      monto: [this.data?.monto || null, [Validators.required, Validators.min(0.01)]],
      concepto: [this.data?.concepto || '', [Validators.required]],
      estado: [this.data?.estado || 'Pendiente', [Validators.required]],
      observaciones: [this.data?.observaciones || '']
    });
  }

  private async loadBeneficiarios(): Promise<void> {
    try {
      this.beneficiarios = await this.beneficiarioService.getAll();
    } catch (err) {
      this.notificationService.error('Error al cargar la lista de beneficiarios.');
    }
  }

  public setTipo(tipo: 'Emitido' | 'Recibido'): void {
    this.form.get('tipo')?.setValue(tipo);
  }

  public isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  public onCancel(): void {
    this.dialogRef.close(false);
  }

  public async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      return;
    }

    this.loadingService.show();
    try {
      const formVal = this.form.value;
      const formattedDate = this.isEdit && this.data ? this.data.fecha : this.getFormattedDate();
      
      const chequeData: Cheque = {
        ...formVal,
        concepto: formVal.concepto === 'Otro' ? this.otroConcepto.trim() : formVal.concepto,
        beneficiarioId: Number(formVal.beneficiarioId),
        fecha: formattedDate
      };

      if (this.isEdit) {
        await this.chequeService.update(chequeData);
        this.notificationService.success('Cheque actualizado con éxito.');
      } else {
        await this.chequeService.create(chequeData);
        this.notificationService.success('Cheque registrado con éxito.');
      }
      this.dialogRef.close(true);
    } catch (err: any) {
      this.notificationService.error(err.message || 'Error al procesar el cheque.');
    } finally {
      this.loadingService.hide();
    }
  }

  public conceptoDisponible(nombre: string): boolean { return this.conceptos.some(c => c.nombre === nombre); }
  public get conceptoExistente(): string { const nombre = this.data?.concepto || ''; return nombre && !this.conceptoDisponible(nombre) ? nombre : ''; }

  private getFormattedDate(): string {
    const date = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();
    
    let hours = date.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // hour 0 should be 12
    const min = pad(date.getMinutes());
    const sec = pad(date.getSeconds());
    
    return `${day}-${month}-${year} ${pad(hours)}:${min}:${sec} ${ampm}`;
  }
}
