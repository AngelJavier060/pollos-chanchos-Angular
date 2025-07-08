import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  ValidacionResult, 
  CorreccionRequest, 
  PlanEjecucionHistorial, 
  ValidacionAlimentacion 
} from '../models/correccion.model';
import { PlanEjecucion } from '../models/plan-ejecucion.model';

@Injectable({
  providedIn: 'root'
})
export class CorreccionService {
  
  private readonly API_URL = 'http://localhost:8088/api/plan-ejecucion';

  constructor(private http: HttpClient) {}

  /**
   * Valida una cantidad antes de registrarla
   */
  validarCantidad(
    tipoAnimal: string, 
    etapa: string, 
    cantidadPorAnimal: number, 
    numeroAnimales: number
  ): Observable<ValidacionResult> {
    
    const params = new HttpParams()
      .set('tipoAnimal', tipoAnimal)
      .set('etapa', etapa)
      .set('cantidadPorAnimal', cantidadPorAnimal.toString())
      .set('numeroAnimales', numeroAnimales.toString());

    return this.http.post<ValidacionResult>(`${this.API_URL}/validar`, null, { params });
  }

  /**
   * Aplica una corrección a un registro
   */
  corregirRegistro(request: CorreccionRequest): Observable<PlanEjecucion> {
    return this.http.put<PlanEjecucion>(`${this.API_URL}/correccion/${request.registroId}`, request);
  }

  /**
   * Verifica si un registro puede ser corregido
   */
  puedeCorregir(registroId: number, usuarioId: number): Observable<boolean> {
    const params = new HttpParams().set('usuarioId', usuarioId.toString());
    return this.http.get<boolean>(`${this.API_URL}/puede-corregir/${registroId}`, { params });
  }

  /**
   * Obtiene el historial de cambios de un registro
   */
  obtenerHistorial(registroId: number): Observable<PlanEjecucionHistorial[]> {
    return this.http.get<PlanEjecucionHistorial[]>(`${this.API_URL}/historial/${registroId}`);
  }

  /**
   * Obtiene todas las validaciones de alimentación
   */
  obtenerValidaciones(): Observable<ValidacionAlimentacion[]> {
    return this.http.get<ValidacionAlimentacion[]>(`${this.API_URL}/validaciones`);
  }

  /**
   * Muestra un diálogo de confirmación basado en el resultado de validación
   */
  mostrarDialogoConfirmacion(resultado: ValidacionResult): Promise<boolean> {
    return new Promise((resolve) => {
      if (!resultado.requiereConfirmacion) {
        resolve(true);
        return;
      }

      const mensaje = `${resultado.mensaje}\n\n¿Desea continuar?`;
      
      if (resultado.tipoAlerta === 'warning') {
        const confirmar = confirm(`⚠️ ADVERTENCIA\n\n${mensaje}`);
        resolve(confirmar);
      } else if (resultado.tipoAlerta === 'error') {
        alert(`❌ ERROR\n\n${resultado.mensaje}`);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  }

  /**
   * Calcula si una cantidad está en el rango recomendado
   */
  calcularEstadoCantidad(
    cantidad: number, 
    minima: number, 
    maxima: number
  ): { estado: 'normal' | 'bajo' | 'alto', porcentaje: number } {
    
    const recomendada = (minima + maxima) / 2;
    const porcentaje = (cantidad / recomendada) * 100;

    let estado: 'normal' | 'bajo' | 'alto' = 'normal';
    
    if (cantidad < minima * 0.8) {
      estado = 'bajo';
    } else if (cantidad > maxima * 1.2) {
      estado = 'alto';
    }

    return { estado, porcentaje };
  }

  /**
   * Formatea un registro del historial para mostrar
   */
  formatearHistorial(historial: PlanEjecucionHistorial): string {
    const fecha = new Date(historial.fechaCambio).toLocaleString();
    return `${fecha}: ${historial.campoModificado} cambió de "${historial.valorAnterior}" a "${historial.valorNuevo}" - ${historial.motivo}`;
  }
}
