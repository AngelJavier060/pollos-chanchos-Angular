import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SystemStatusComponent } from './shared/components/system-status.component';
import { DebugButtonComponent } from './shared/components/debug-button/debug-button.component';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, SystemStatusComponent, DebugButtonComponent],
  templateUrl: './app.component.html'
})
export class AppComponent {
  title = 'avicola-frontend';
  showDebugTools = !environment.production;
}