import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiUrlService {
  
  /**
   * Genera la URL completa para un endpoint
   * @param endpoint - El endpoint sin prefijo (ej: 'animal', 'stage', 'provider')
   * @returns URL completa considerando el entorno
   */
  buildUrl(endpoint: string): string {
    // Remover cualquier prefijo /api existente del endpoint
    const cleanEndpoint = endpoint.replace(/^\/api\//, '').replace(/^\//, '');
    
    // El backend SIEMPRE usa /api, tanto local como producción
    return `${environment.apiUrl}/api/${cleanEndpoint}`;
  }
  
  /**
   * Para mantener compatibilidad con servicios existentes
   */
  getBaseUrl(): string {
    return environment.apiUrl;
  }
  
  /**
   * Verificar si estamos en modo producción
   */
  isProduction(): boolean {
    return environment.production;
  }
}
