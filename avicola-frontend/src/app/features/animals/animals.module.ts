import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PollosComponent } from './pages/pollos/pollos.component';
import { ChanchosComponent } from './pages/chanchos/chanchos.component';
import { AnimalListComponent } from './components/animal-list/animal-list.component';

const routes: Routes = [
  { path: 'pollos', component: PollosComponent },
  { path: 'chanchos', component: ChanchosComponent }
];

@NgModule({
  declarations: [
    PollosComponent,
    ChanchosComponent,
    AnimalListComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class AnimalsModule { }
