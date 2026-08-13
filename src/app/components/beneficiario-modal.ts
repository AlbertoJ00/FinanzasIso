import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Beneficiario } from '../models';
import { BeneficiarioService } from '../services/beneficiario.service';
import { NotificationService } from '../services/notification.service';
import { LoadingService } from '../services/loading.service';
import { BancoService } from '../services/banco.service';
import { Banco } from '../models';

@Component({
  selector: 'app-beneficiario-modal',
  template: `
    <div style="padding: 1rem 0.5rem; max-width: 600px;">
      <div class="modal-header">
        <h2 class="card-title">{{ isEdit ? 'Editar Beneficiario' : 'Nuevo Beneficiario' }}</h2>
        <button type="button" class="icon-btn" (click)="onCancel()">
          <i class="material-icons">close</i>
        </button>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="form-grid">
          
          <div class="form-field">
            <label class="form-label">Tipo de documento</label>
            <select class="form-select-native" formControlName="tipoDocumento" [class.invalid]="isFieldInvalid('tipoDocumento')">
              <option value="Cedula">Cedula</option>
              <option value="Rnc">Rnc</option>
              <option value="Pasaporte">Pasaporte</option>
            </select>
            <div class="form-error" *ngIf="isFieldInvalid('tipoDocumento')">El tipo de documento es requerido.</div>
          </div>

          <div class="form-field">
            <label class="form-label">Número de documento</label>
            <input type="text" class="form-input" formControlName="numeroDocumento" placeholder="000-000000-0" [class.invalid]="isFieldInvalid('numeroDocumento')">
            <div class="form-error" *ngIf="isFieldInvalid('numeroDocumento')">El documento es requerido.</div>
          </div>

          <div class="form-field">
            <label class="form-label">Nombre</label>
            <input type="text" class="form-input" formControlName="nombre" placeholder="Juan José" [class.invalid]="isFieldInvalid('nombre')">
            <div class="form-error" *ngIf="isFieldInvalid('nombre')">El nombre es requerido.</div>
          </div>

          <div class="form-field">
            <label class="form-label">Apellido</label>
            <input type="text" class="form-input" formControlName="apellido" placeholder="Pérez" [class.invalid]="isFieldInvalid('apellido')">
            <div class="form-error" *ngIf="isFieldInvalid('apellido')">El apellido es requerido.</div>
          </div>

          <div class="form-field">
            <label class="form-label">Teléfono</label>
            <input type="text" class="form-input" formControlName="telefono" placeholder="809 - 123 - 4567" [class.invalid]="isFieldInvalid('telefono')">
            <div class="form-error" *ngIf="isFieldInvalid('telefono')">El teléfono es requerido.</div>
          </div>

          <div class="form-field">
            <label class="form-label">Correo</label>
            <input type="email" class="form-input" formControlName="correo" placeholder="juan@gmail.com" [class.invalid]="isFieldInvalid('correo')">
            <div class="form-error" *ngIf="isFieldInvalid('correo')">
              <span *ngIf="form.get('correo')?.hasError('required')">El correo es requerido.</span>
              <span *ngIf="form.get('correo')?.hasError('email')">Formato de correo inválido.</span>
            </div>
          </div>

          <div class="form-field">
            <label class="form-label">Banco</label>
            <select class="form-select-native" formControlName="banco" [class.invalid]="isFieldInvalid('banco')">
              <option value="" disabled>Seleccione un banco</option>
              <option *ngIf="bancoExistente" [value]="bancoExistente">{{ bancoExistente }} (existente)</option>
              <option *ngFor="let banco of bancos" [value]="banco.nombre">{{ banco.nombre }}</option>
            </select>
            <div class="form-error" *ngIf="isFieldInvalid('banco')">El banco es requerido.</div>
          </div>

          <div class="form-field">
            <label class="form-label">Cuenta</label>
            <input type="text" class="form-input" formControlName="cuentaBancaria" placeholder="12314124124" [class.invalid]="isFieldInvalid('cuentaBancaria')">
            <div class="form-error" *ngIf="isFieldInvalid('cuentaBancaria')">La cuenta es requerida.</div>
          </div>

          <div class="form-field form-full-width">
            <label class="form-label">Estado</label>
            <select class="form-select-native" formControlName="estado">
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
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
export class BeneficiarioModal implements OnInit {
  public form!: FormGroup;
  public isEdit = false;
  public bancos: Banco[] = [];

  constructor(
    private fb: FormBuilder,
    private beneficiarioService: BeneficiarioService,
    private notificationService: NotificationService,
    private loadingService: LoadingService,
    public dialogRef: MatDialogRef<BeneficiarioModal>, private bancoService: BancoService,
    @Inject(MAT_DIALOG_DATA) public data: Beneficiario | null
  ) {}

  public async ngOnInit(): Promise<void> {
    this.isEdit = !!this.data;
    this.initForm();
    this.bancos = (await this.bancoService.getAll()).filter(b => b.estado === 'Activo');
  }

  public bancoDisponible(nombre: string): boolean { return this.bancos.some(b => b.nombre === nombre); }
  public get bancoExistente(): string { const nombre = this.data?.banco || ''; return nombre && !this.bancoDisponible(nombre) ? nombre : ''; }

  private initForm(): void {
    this.form = this.fb.group({
      id: [this.data?.id || null],
      nombre: [this.data?.nombre || '', [Validators.required]],
      apellido: [this.data?.apellido || '', [Validators.required]],
      tipoDocumento: [this.data?.tipoDocumento || 'Cedula', [Validators.required]],
      numeroDocumento: [this.data?.numeroDocumento || '', [Validators.required]],
      telefono: [this.data?.telefono || '', [Validators.required]],
      correo: [this.data?.correo || '', [Validators.required, Validators.email]],
      banco: [this.data?.banco || '', [Validators.required]],
      cuentaBancaria: [this.data?.cuentaBancaria || '', [Validators.required]],
      estado: [this.data?.estado || 'Activo', [Validators.required]]
    });
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
      const data = this.form.value as Beneficiario;
      if (this.isEdit) {
        await this.beneficiarioService.update(data);
        this.notificationService.success('Beneficiario actualizado con éxito.');
      } else {
        await this.beneficiarioService.create(data);
        this.notificationService.success('Beneficiario creado con éxito.');
      }
      this.dialogRef.close(true);
    } catch (err: any) {
      this.notificationService.error(err.message || 'Error al procesar el beneficiario.');
    } finally {
      this.loadingService.hide();
    }
  }
}
