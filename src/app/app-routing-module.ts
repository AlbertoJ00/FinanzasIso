import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { ChequesComponent } from './pages/cheques/cheques';
import { BeneficiariosComponent } from './pages/beneficiarios/beneficiarios';
import { BancosComponent, ConceptosComponent } from './pages/catalogos/catalogos';
import { LoginComponent, DetalleChequeComponent, DetalleBeneficiarioComponent, AuditoriaComponent, ReportesComponent, NotFoundComponent, UsuariosComponent } from './pages/extras/extras';
import { ContabilidadComponent } from './pages/integraciones/contabilidad';

const routes: Routes = [
  { path: 'dashboard', component: DashboardComponent },
  { path: 'cheques', component: ChequesComponent },
  { path: 'beneficiarios', component: BeneficiariosComponent },
  { path: 'cheques/:id', component: DetalleChequeComponent },
  { path: 'beneficiarios/:id', component: DetalleBeneficiarioComponent },
  { path: 'bancos', component: BancosComponent },
  { path: 'conceptos', component: ConceptosComponent },
  { path: 'integraciones/contabilidad', component: ContabilidadComponent },
  { path: 'login', component: LoginComponent },
  { path: 'reportes', component: ReportesComponent },
  { path: 'auditoria', component: AuditoriaComponent },
  { path: 'usuarios', component: UsuariosComponent },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: '**', component: NotFoundComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
