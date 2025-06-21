import { Routes } from '@angular/router';
import { DiagnosticoComponent } from './diagnostico.component';
import { AuthDiagnosticoComponent } from './features/diagnostico/auth-diagnostico.component';

export const diagnosticRoutes: Routes = [
  { 
    path: 'diagnostico', 
    component: DiagnosticoComponent,
    title: 'Diagnóstico del Sistema'
  },
  {
    path: 'diagnostico/auth',
    component: AuthDiagnosticoComponent,
    title: 'Diagnóstico de Autenticación'
  }
];
