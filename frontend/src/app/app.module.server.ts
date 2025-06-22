import { NgModule } from '@angular/core';
import { ServerModule } from '@angular/platform-server';

import { AppComponent } from './app.component';

/**
 * Módulo del servidor para la aplicación Angular.
 * Este archivo es necesario para la compilación de Angular Universal (SSR)
 * aunque actualmente no estemos usando SSR activamente en esta aplicación.
 */
@NgModule({
  imports: [
    ServerModule
  ],
  bootstrap: [AppComponent],
})
export class AppServerModule {}
