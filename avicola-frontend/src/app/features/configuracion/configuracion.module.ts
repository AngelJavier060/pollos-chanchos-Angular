import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { ConfiguracionComponent } from './configuracion.component';
import { ConfiguracionGeneralComponent } from './components/configuracion-general/configuracion-general.component';
import { CredencialesComponent } from './components/credenciales/credenciales.component';
import { AnimalConfigComponent } from './components/animal-config/animal-config.component';

const routes: Routes = [
  {
    path: '',
    component: ConfiguracionComponent,
    children: [
      { path: '', redirectTo: 'general', pathMatch: 'full' },
      { path: 'general', component: ConfiguracionGeneralComponent },
      { path: 'credenciales', component: CredencialesComponent },
      { path: 'animal-config', component: AnimalConfigComponent }
    ]
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    ConfiguracionComponent,
    ConfiguracionGeneralComponent,
    CredencialesComponent
  ]
})
export class ConfiguracionModule { }