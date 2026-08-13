import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Banco, Concepto } from '../models';
import { BancoService } from '../services/banco.service';
import { ConceptoService } from '../services/concepto.service';
import { LoadingService } from '../services/loading.service';
import { NotificationService } from '../services/notification.service';
export interface CatalogoModalData { tipo: 'Banco'|'Concepto'; valor?: Banco|Concepto; }
@Component({selector:'app-catalogo-modal',standalone:false,template:`<div style="padding:1rem"><div class="modal-header"><h2 class="card-title">{{data.valor?'Editar':'Nuevo'}} {{data.tipo}}</h2><button class="icon-btn" (click)="cerrar()"><i class="material-icons">close</i></button></div><form [formGroup]="form" (ngSubmit)="guardar()"><div class="form-grid"><div class="form-field"><label class="form-label">Nombre</label><input class="form-input" formControlName="nombre"><div class="form-error" *ngIf="form.get('nombre')?.invalid">El nombre es requerido.</div></div><div class="form-field" *ngIf="data.tipo==='Banco'"><label class="form-label">Código</label><input class="form-input" formControlName="codigo"></div><div class="form-field"><label class="form-label">Estado</label><select class="form-select-native" formControlName="estado"><option>Activo</option><option>Inactivo</option></select></div></div><div class="modal-actions"><button type="button" class="btn btn-secondary" (click)="cerrar()">Cancelar</button><button class="btn btn-primary" [disabled]="form.invalid">Guardar</button></div></form></div>`})
export class CatalogoModal {
  form:FormGroup;
  constructor(private fb:FormBuilder, private bancos:BancoService, private conceptos:ConceptoService, private loading:LoadingService, private notice:NotificationService, public ref:MatDialogRef<CatalogoModal>, @Inject(MAT_DIALOG_DATA) public data:CatalogoModalData){const v:any=data.valor||{};this.form=fb.group({id:[v.id||null],nombre:[v.nombre||'',Validators.required],codigo:[v.codigo||''],estado:[v.estado||'Activo']});}
  cerrar(){this.ref.close(false);}
  async guardar(){if(this.form.invalid)return;this.loading.show();try{const v=this.form.value;const s:any=this.data.tipo==='Banco'?this.bancos:this.conceptos;v.id?await s.update(v):await s.create(v);this.notice.success(`${this.data.tipo} guardado con éxito.`);this.ref.close(true);}catch(e:any){this.notice.error(e.message||'No se pudo guardar.');}finally{this.loading.hide();}}
}
