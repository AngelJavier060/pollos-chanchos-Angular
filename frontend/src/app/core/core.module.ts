import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { AuthGuard } from './guards/auth.guard';
import { AuthService } from './services/auth.service';

/**
 * NOTA: El interceptor AuthInterceptor se registra en app.config.ts,
 * no lo registramos aquí para evitar que se aplique dos veces.
 */
@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    HttpClientModule
  ],
  providers: [
    AuthService,
    AuthGuard
    // El interceptor se registra en app.config.ts
  ]
})
export class CoreModule {
  constructor() {
    console.log('CoreModule inicializado');
  }
}
