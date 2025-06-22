import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

/**
 * Inicialización de la aplicación Angular
 * Se ha añadido forzado de hidratación aquí para solucionar el error NG0505
 * Si la hidratación causa problemas, se puede volver a la versión anterior
 */
bootstrapApplication(AppComponent, appConfig)
  .catch(err => {
    console.error('Error al iniciar la aplicación:', err);
    
    // Si hay errores de hidratación, lo reportamos claramente
    if (err.message && err.message.includes('hydration')) {
      console.warn('⚠️ Detectado problema de hidratación. Esto puede afectar el rendimiento inicial.');
    }
  });
