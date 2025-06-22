import { ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { provideClientHydration, withNoHttpTransferCache } from '@angular/platform-browser';
import { appConfig } from './app.config';
import { routes } from './app.routes';
import { provideRouter } from '@angular/router';

export const config: ApplicationConfig = {
  providers: [
    ...appConfig.providers,
    provideRouter(routes),
    provideServerRendering(),
    provideClientHydration(withNoHttpTransferCache())
  ]
};