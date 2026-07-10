import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  template: `
    <div style="padding: 1rem 0.5rem;">
      <h3 class="confirm-title">{{ data.title }}</h3>
      <p class="confirm-message">{{ data.message }}</p>
      <div class="modal-actions">
        <button class="btn btn-secondary" (click)="onCancel()">
          {{ data.cancelText || 'Cancelar' }}
        </button>
        <button class="btn btn-danger" (click)="onConfirm()">
          {{ data.confirmText || 'Eliminar' }}
        </button>
      </div>
    </div>
  `,
  standalone: false
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  public onCancel(): void {
    this.dialogRef.close(false);
  }

  public onConfirm(): void {
    this.dialogRef.close(true);
  }
}
