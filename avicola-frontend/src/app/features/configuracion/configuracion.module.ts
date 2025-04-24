import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

// Material Modules
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

// Components
import { ConfiguracionComponent } from './configuracion.component';
import { ConfiguracionGeneralComponent } from './components/configuracion-general/configuracion-general.component';
import { RaceComponent } from './components/race/race.component';
import { AnimalConfigComponent } from './components/animal-config/animal-config.component';
import { AnimalFormComponent } from './components/animal-form/animal-form.component';

const routes: Routes = [
  {
    path: '',
    component: ConfiguracionComponent,
    children: [
      { path: '', redirectTo: 'general', pathMatch: 'full' },
      { path: 'general', component: ConfiguracionGeneralComponent },
      { path: 'razas', component: RaceComponent },
      { path: 'animal-config', component: AnimalConfigComponent },
      { path: 'animal-config/nuevo', component: AnimalFormComponent },
      { path: 'animal-config/editar/:id', component: AnimalFormComponent }
    ]
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    ReactiveFormsModule,
    HttpClientModule,
    // Material Modules
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatDividerModule,
    MatTooltipModule,
    // Components
    ConfiguracionComponent,
    ConfiguracionGeneralComponent,
    RaceComponent,
    AnimalConfigComponent,
    AnimalFormComponent
  ]
})
export class ConfiguracionModule { }