import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ServicesComponent } from './services.component';

const routes = [
  { path: '', component: ServicesComponent }
];

@NgModule({
  imports: [
    ServicesComponent,
    RouterModule.forChild(routes)
  ],
  exports: [
    ServicesComponent
  ]
})
export class ServicesModule { }