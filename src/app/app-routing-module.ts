import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { ChequesComponent } from './pages/cheques/cheques';
import { BeneficiariosComponent } from './pages/beneficiarios/beneficiarios';

const routes: Routes = [
  { path: 'dashboard', component: DashboardComponent },
  { path: 'cheques', component: ChequesComponent },
  { path: 'beneficiarios', component: BeneficiariosComponent },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: '/dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
