import { Component } from '@angular/core';
import { GestacionChanchasViewComponent } from '../../shared/gestacion/gestacion-chanchas-view.component';

@Component({
  selector: 'app-chanchos-gestacion',
  standalone: true,
  imports: [GestacionChanchasViewComponent],
  template: `<app-gestacion-chanchas-view modo="consulta" tema="chanchos"></app-gestacion-chanchas-view>`
})
export class ChanchosGestacionComponent {}
