import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { 
  RegistroMortalidad, 
  EstadisticasMortalidad, 
  AlertaMortalidad,
  CausaMortalidad 
} from '../models/mortalidad.model';

@Injectable({
  providedIn: 'root'
})
export class MortalidadService {
  private readonly API_URL = `${environment.apiUrl}/api/mortalidad`;
  
  private mortalidadSubject = new BehaviorSubject<RegistroMortalidad[]>([]);
  public mortalidad$ = this.mortalidadSubject.asObservable();
  
  // Cache para alertas
  private alertasCache: AlertaMortalidad[] = [];
  private alertasSubject = new BehaviorSubject<AlertaMortalidad[]>([]);
  public alertas$ = this.alertasSubject.asObservable();
  
  // Cache para registros
  private registrosCache: RegistroMortalidad[] = [];

  constructor(private http: HttpClient) {}

  /**
   * Obtener todos los registros de mortalidad
   */
  getRegistrosMortalidad(filtros?: any): Observable<RegistroMortalidad[]> {
    return this.http.get<{data: RegistroMortalidad[], success: boolean, count: number}>(`${this.API_URL}/registros`, { params: filtros })
      .pipe(map(response => response.data || []));
  }

  /**
   * Obtener registros de mortalidad por lote
   */
  getRegistrosPorLote(loteId: string): Observable<RegistroMortalidad[]> {
    return this.http.get<{data: RegistroMortalidad[], success: boolean}>(`${this.API_URL}/lote/${loteId}`)
      .pipe(map(response => response.data || []));
  }

  /**
   * Contar mortalidad total por lote
   */
  contarMortalidadPorLote(loteId: string): Observable<number> {
    return this.http.get<{data: number, success: boolean}>(`${this.API_URL}/lote/${loteId}/contar`)
      .pipe(map(response => response.data || 0));
  }

  /**
   * Registrar nueva mortalidad
   */
  registrarMortalidad(registro: RegistroMortalidad): Observable<RegistroMortalidad> {
    return this.http.post<{data: RegistroMortalidad, success: boolean, message: string}>(`${this.API_URL}/registrar`, registro)
      .pipe(map(response => response.data));
  }

  /**
   * Registrar nueva mortalidad con causaId
   */
  registrarMortalidadConCausa(registro: any): Observable<RegistroMortalidad> {
    return this.http.post<{data: RegistroMortalidad, success: boolean, message: string}>(`${this.API_URL}/registrar-con-causa`, registro)
      .pipe(map(response => response.data));
  }

  /**
   * Actualizar registro de mortalidad
   */
  actualizarRegistro(id: number, registro: Partial<RegistroMortalidad>): Observable<RegistroMortalidad> {
    return this.http.put<RegistroMortalidad>(`${this.API_URL}/${id}`, registro);
  }

  /**
   * Confirmar registro de mortalidad
   */
  confirmarRegistro(id: number): Observable<boolean> {
    return this.http.patch<boolean>(`${this.API_URL}/${id}/confirmar`, {});
  }

  /**
   * Eliminar registro de mortalidad
   */
  eliminarRegistro(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtener estadísticas de mortalidad desde el backend
   */
  getEstadisticas(fechaInicio?: Date, fechaFin?: Date): Observable<any> {
    const params: any = {};
    if (fechaInicio) params.fechaInicio = fechaInicio.toISOString().split('T')[0];
    if (fechaFin) params.fechaFin = fechaFin.toISOString().split('T')[0];
    
    return this.http.get<{data: any, success: boolean}>(`${this.API_URL}/estadisticas`, { params })
      .pipe(map(response => response.data || {}));
  }

  /**
   * Obtener alertas de mortalidad
   */
  getAlertas(): Observable<AlertaMortalidad[]> {
    return this.http.get<AlertaMortalidad[]>(`${this.API_URL}/alertas`);
  }

  /**
   * Marcar alerta como leída
   */
  marcarAlertaLeida(id: number): Observable<boolean> {
    return this.http.patch<boolean>(`${this.API_URL}/alertas/${id}/leer`, {});
  }

  /**
   * Obtener causas de mortalidad disponibles
   */
  getCausas(): Observable<CausaMortalidad[]> {
    return this.http.get<{data: CausaMortalidad[], success: boolean}>(`${this.API_URL}/causas`)
      .pipe(map(response => response.data || []));
  }

  /**
   * Crear causa de mortalidad
   */
  createCausa(causa: Partial<CausaMortalidad>): Observable<CausaMortalidad> {
    return this.http.post<{data: CausaMortalidad, success: boolean}>(`${this.API_URL}/causas`, causa)
      .pipe(map(response => response.data));
  }

  /**
   * Obtener mortalidad del día actual
   */
  getMortalidadHoy(): Observable<number> {
    const hoy = new Date().toISOString().split('T')[0];
    return this.http.get<number>(`${this.API_URL}/mortalidad-hoy?fecha=${hoy}`);
  }

  /**
   * Calcular estadísticas de mortalidad
   */
  private calcularEstadisticas(): EstadisticasMortalidad {
    const totalMuertes = this.registrosCache.reduce((sum, r) => sum + r.cantidadMuertos, 0);
    const porcentajeMortalidad = totalMuertes / (this.registrosCache.length > 0 ? this.registrosCache[0].edad : 1);
    const muertesPorCausaArray = this.registrosCache.reduce((acc, r) => {
      const index = acc.findIndex(a => a.causa === r.causa.nombre);
      if (index >= 0) {
        acc[index].muertes += r.cantidadMuertos;
      } else {
        acc.push({
          causa: r.causa.nombre,
          muertes: r.cantidadMuertos,
          porcentaje: 0
        });
      }
      return acc;
    }, [] as { causa: string; muertes: number; porcentaje: number }[]);

    // Calcular porcentajes
    const total = muertesPorCausaArray.reduce((sum, a) => sum + a.muertes, 0);
    muertesPorCausaArray.forEach(a => {
      a.porcentaje = (a.muertes / total) * 100;
    });

    // Encontrar causa más frecuente
    const causaMasFrecuente = muertesPorCausaArray.reduce((prev, curr) => 
      prev.muertes > curr.muertes ? prev : curr
    ).causa;

    return {
      totalMuertes,
      porcentajeMortalidad: Math.round(porcentajeMortalidad * 100) / 100,
      causaMasFrecuente,
      tendencia: this.calcularTendencia(),
      muertesPorDia: this.generarMuertesPorDia(),
      muertesPorCausa: muertesPorCausaArray,
      totalLotes: new Set(this.registrosCache.map(r => r.loteId)).size,
      tasaPromedioMortalidad: Math.round((totalMuertes / (this.registrosCache.length > 0 ? this.registrosCache[0].edad : 1)) * 100) / 100,
      alertas: this.alertasCache,
      principalesCausas: muertesPorCausaArray.sort((a, b) => b.muertes - a.muertes).slice(0, 5),
      tendenciaSemanal: this.generarMuertesPorDia()
    };
  }

  /**
   * Generar datos de muertes por día para gráficos
   */
  private generarMuertesPorDia(): { fecha: string; muertes: number }[] {
    const datos: { fecha: string; muertes: number }[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      
      const muertesDia = this.registrosCache
        .filter(r => {
          const fechaRegistro = new Date(r.fechaRegistro);
          return fechaRegistro.toDateString() === fecha.toDateString();
        })
        .reduce((total, r) => total + r.cantidadMuertos, 0);
      
      datos.push({
        fecha: fecha.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
        muertes: muertesDia
      });
    }
    
    return datos;
  }

  /**
   * Calcular tendencia de mortalidad
   */
  private calcularTendencia(): 'subiendo' | 'bajando' | 'estable' {
    const muertesPorDia = this.generarMuertesPorDia();
    
    if (muertesPorDia.length < 2) return 'estable';
    
    const ultimosDias = muertesPorDia.slice(-3);
    const promedio = ultimosDias.reduce((sum, d) => sum + d.muertes, 0) / ultimosDias.length;
    const ultimo = ultimosDias[ultimosDias.length - 1].muertes;
    
    if (ultimo > promedio * 1.2) return 'subiendo';
    if (ultimo < promedio * 0.8) return 'bajando';
    return 'estable';
  }

  /**
   * Evaluar si se debe generar una alerta basada en un nuevo registro
   */
  private evaluarGeneracionAlertas(registro: RegistroMortalidad): void {
    // Alerta por alta mortalidad en un día
    if (registro.cantidadMuertos >= 5) {
      this.crearAlerta('critica', 
        'Alta Mortalidad Detectada', 
        `Se registraron ${registro.cantidadMuertos} muertes en el lote ${registro.loteName}`, 
        registro.loteId,
        'Investigar causa inmediatamente y tomar medidas preventivas'
      );
    }
    
    // Alerta por enfermedad contagiosa
    if (registro.causa.esContagiosa) {
      this.crearAlerta('advertencia',
        'Enfermedad Contagiosa Detectada',
        `Caso de ${registro.causa.nombre} en lote ${registro.loteName}`,
        registro.loteId,
        'Evaluar aislamiento y tratamiento preventivo'
      );
    }
  }

  /**
   * Crear nueva alerta
   */
  private crearAlerta(tipo: 'critica' | 'advertencia' | 'informativa', titulo: string, mensaje: string, loteId?: string, accion?: string): void {
    const nuevaAlerta: AlertaMortalidad = {
      id: this.alertasCache.length + 1,
      tipo,
      titulo,
      mensaje,
      loteId,
      fechaCreacion: new Date(),
      leida: false,
      accionRequerida: accion
    };
    
    this.alertasCache.unshift(nuevaAlerta);
    this.alertasSubject.next([...this.alertasCache]);
  }

  /**
   * Generar alertas iniciales para simulación
   */
  private generarAlertasIniciales(): void {
    this.crearAlerta('advertencia', 
      'Tendencia al Alza', 
      'La mortalidad ha aumentado 15% en los últimos 3 días',
      undefined,
      'Revisar condiciones ambientales y plan sanitario'
    );
    
    this.crearAlerta('informativa',
      'Reporte Semanal',
      'Mortalidad dentro de parámetros normales esta semana',
      undefined
    );
  }
}
