import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule, provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { provideHttpClient } from '@angular/common/http';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';

// Pages
import { DashboardComponent } from './pages/dashboard/dashboard';
import { ChequesComponent } from './pages/cheques/cheques';
import { BeneficiariosComponent } from './pages/beneficiarios/beneficiarios';

// Components
import { ConfirmDialogComponent } from './components/confirm-dialog';
import { ChequeModal } from './components/cheque-modal';
import { BeneficiarioModal } from './components/beneficiario-modal';
import { CatalogoModal } from './components/catalogo-modal';
import { BancosComponent, ConceptosComponent } from './pages/catalogos/catalogos';
import { LoginComponent, DetalleChequeComponent, DetalleBeneficiarioComponent, HistorialComponent, AuditoriaComponent, ReportesComponent, NotFoundComponent, UsuariosComponent } from './pages/extras/extras';
import { ContabilidadComponent } from './pages/integraciones/contabilidad';

@NgModule({
  declarations: [
    App,
    DashboardComponent,
    ChequesComponent,
    BeneficiariosComponent,
    ConfirmDialogComponent,
    ChequeModal,
    BeneficiarioModal, CatalogoModal, BancosComponent, ConceptosComponent, LoginComponent,
    DetalleChequeComponent, DetalleBeneficiarioComponent, HistorialComponent, AuditoriaComponent, ReportesComponent, NotFoundComponent, UsuariosComponent,
    ContabilidadComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideClientHydration(withEventReplay()),
    provideHttpClient()
  ],
  bootstrap: [App]
})
export class AppModule { }
