import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Componentes
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { UsuariosComponent } from './features/usuarios/usuarios.component';
import { LotesComponent } from './features/lotes/lotes.component';
import { InventarioComponent } from './features/inventario/inventario.component';
import { PlanNutricionalComponent } from './features/plan-nutricional/plan-nutricional.component';
import { ReportesComponent } from './features/reportes/reportes.component';
import { ConfiguracionComponent } from './features/configuracion/configuracion.component';
import { AdminComponent } from './features/admin/admin.component';
import { LoginComponent } from './features/auth/login/login.component';
import { LayoutComponent } from './shared/components/layout/layout.component';

// Guards y servicios de autenticación
// import { AuthGuard } from './core/guards/auth.guard';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { 
    path: '', 
    component: LayoutComponent,
    // canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'usuarios', component: UsuariosComponent },
      { path: 'lotes', component: LotesComponent },
      { path: 'inventario', component: InventarioComponent },
      { path: 'plan-nutricional', component: PlanNutricionalComponent },
      { path: 'reportes', component: ReportesComponent },
      { path: 'configuracion', component: ConfiguracionComponent },
      { path: 'admin', component: AdminComponent }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { } 