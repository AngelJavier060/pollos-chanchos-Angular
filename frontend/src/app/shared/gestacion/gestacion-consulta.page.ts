import { Component } from '@angular/core';
import { GestacionChanchasViewComponent } from './gestacion-chanchas-view.component';

@Component({
  selector: 'app-gestacion-consulta-page',
  standalone: true,
  imports: [GestacionChanchasViewComponent],
  template: `<app-gestacion-chanchas-view modo="consulta" tema="chanchos"></app-gestacion-chanchas-view>`
})
export class GestacionConsultaPage {}
