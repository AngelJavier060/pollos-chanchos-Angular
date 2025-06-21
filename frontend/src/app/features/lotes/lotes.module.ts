import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { LotesComponent } from './lotes.component';

const routes: Routes = [
  { path: '', component: LotesComponent }
];

@NgModule({
  declarations: [LotesComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ],
  exports: [LotesComponent]
})
export class LotesModule { }
