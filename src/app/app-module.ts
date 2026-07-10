import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule, provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

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

@NgModule({
  declarations: [
    App,
    DashboardComponent,
    ChequesComponent,
    BeneficiariosComponent,
    ConfirmDialogComponent,
    ChequeModal,
    BeneficiarioModal
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
    provideClientHydration(withEventReplay())
  ],
  bootstrap: [App]
})
export class AppModule { }
