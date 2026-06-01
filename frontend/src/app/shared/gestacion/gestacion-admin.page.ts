import { Component } from '@angular/core';
import { GestacionChanchasViewComponent } from './gestacion-chanchas-view.component';

@Component({
  selector: 'app-gestacion-admin-page',
  standalone: true,
  imports: [GestacionChanchasViewComponent],
  template: `<app-gestacion-chanchas-view modo="edicion" tema="admin"></app-gestacion-chanchas-view>`
})
export class GestacionAdminPage {}
