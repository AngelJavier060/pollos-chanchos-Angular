import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { 
  RegistroMortalidad, 
  EstadisticasMortalidad, 
  AlertaMortalidad,
  CAUSAS_MORTALIDAD,
  CausaMortalidad 
} from '../models/mortalidad.model';

@Injectable({
  providedIn: 'root'
})
export class MortalidadService {
  private readonly API_URL = `${environment.apiUrl}/mortalidad`;
  
  // Subjects para data en tiempo real
  private mortalidadSubject = new BehaviorSubject<RegistroMortalidad[]>([]);
  private alertasSubject = new BehaviorSubject<AlertaMortalidad[]>([]);
  private estadisticasSubject = new BehaviorSubject<EstadisticasMortalidad | null>(null);

  // Observables públicos
  public mortalidad$ = this.mortalidadSubject.asObservable();
  public alertas$ = this.alertasSubject.asObservable();
  public estadisticas$ = this.estadisticasSubject.asObservable();

  // Cache temporal para simulación
  private registrosCache: RegistroMortalidad[] = [];
  private alertasCache: AlertaMortalidad[] = [];

  constructor(private http: HttpClient) {
    this.inicializarDatosSimulados();
  }

  /**
   * Obtener todos los registros de mortalidad
   */
  getRegistrosMortalidad(filtros?: any): Observable<RegistroMortalidad[]> {
    return this.http.get<RegistroMortalidad[]>(`${this.API_URL}/registros`, { params: filtros });
  }

  /**
   * Obtener registros de mortalidad por lote
   */
  getRegistrosPorLote(loteId: number): Observable<RegistroMortalidad[]> {
    return this.http.get<RegistroMortalidad[]>(`${this.API_URL}/lote/${loteId}`);
  }

  /**
   * Registrar nueva mortalidad
   */
  registrarMortalidad(registro: RegistroMortalidad): Observable<RegistroMortalidad> {
    return this.http.post<RegistroMortalidad>(`${this.API_URL}/registrar`, registro);
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
   * Obtener estadísticas de mortalidad
   */
  getEstadisticas(fechaInicio?: Date, fechaFin?: Date): Observable<EstadisticasMortalidad> {
    const params: any = {};
    if (fechaInicio) params.fechaInicio = fechaInicio.toISOString().split('T')[0];
    if (fechaFin) params.fechaFin = fechaFin.toISOString().split('T')[0];
    
    return this.http.get<EstadisticasMortalidad>(`${this.API_URL}/estadisticas`, { params });
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
    return this.http.get<CausaMortalidad[]>(`${this.API_URL}/causas`);
  }

  /**
   * Obtener mortalidad del día actual
   */
  getMortalidadHoy(): Observable<number> {
    const hoy = new Date().toISOString().split('T')[0];
    return this.http.get<number>(`${this.API_URL}/mortalidad-hoy?fecha=${hoy}`);
  }

  /**
   * Inicializar datos simulados para desarrollo
   */
  private inicializarDatosSimulados(): void {
    // Generar registros de los últimos 7 días
    for (let i = 0; i < 7; i++) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      
      // 1-3 registros por día
      const numRegistros = Math.floor(Math.random() * 3) + 1;
      
      for (let j = 0; j < numRegistros; j++) {
        const registro: RegistroMortalidad = {
          id: this.registrosCache.length + 1,
          loteId: Math.floor(Math.random() * 5) + 1,
          loteName: `Lote ${Math.floor(Math.random() * 5) + 1}`,
          fechaRegistro: fecha,
          cantidadMuertos: Math.floor(Math.random() * 3) + 1,
          causa: CAUSAS_MORTALIDAD[Math.floor(Math.random() * CAUSAS_MORTALIDAD.length)],
          observaciones: this.generarObservacionAleatoria(),
          usuarioRegistro: 'Sistema',
          peso: Math.random() * 2 + 1, // 1-3 kg
          edad: Math.floor(Math.random() * 60) + 7, // 7-67 días
          ubicacion: `Galpon ${Math.floor(Math.random() * 3) + 1}`,
          confirmado: Math.random() > 0.3 // 70% confirmados
        };
        
        this.registrosCache.unshift(registro);
      }
    }

    this.mortalidadSubject.next([...this.registrosCache]);
    this.generarAlertasIniciales();
  }

  /**
   * Generar observación aleatoria para simulación
   */
  private generarObservacionAleatoria(): string {
    const observaciones = [
      'Animal encontrado sin signos previos de enfermedad',
      'Presentaba síntomas respiratorios desde ayer',
      'Se observó decaimiento general en las últimas horas',
      'Posible estrés por cambio de temperatura',
      'Animal separado del grupo, sin apetito',
      'Síntomas digestivos evidentes',
      'Muerte súbita durante la noche'
    ];
    
    return observaciones[Math.floor(Math.random() * observaciones.length)];
  }

  /**
   * Calcular estadísticas basadas en registros actuales
   */
  private calcularEstadisticas(): EstadisticasMortalidad {
    const totalMuertes = this.registrosCache.reduce((total, r) => total + r.cantidadMuertos, 0);
    
    // Simular población total (esto debería venir del servicio de lotes)
    const poblacionTotal = 1000; // Placeholder
    const porcentajeMortalidad = (totalMuertes / poblacionTotal) * 100;
    
    // Agrupar por causa
    const muertesPorCausa = new Map<string, number>();
    this.registrosCache.forEach(r => {
      const actual = muertesPorCausa.get(r.causa.nombre) || 0;
      muertesPorCausa.set(r.causa.nombre, actual + r.cantidadMuertos);
    });
    
    const causaMasFrecuente = Array.from(muertesPorCausa.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    
    // Generar datos para gráficos (últimos 7 días)
    const muertesPorDia = this.generarMuertesPorDia();
    const muertesPorCausaArray = Array.from(muertesPorCausa.entries()).map(([causa, cantidad]) => ({
      causa,
      cantidad,
      porcentaje: (cantidad / totalMuertes) * 100
    }));

    return {
      totalMuertes,
      porcentajeMortalidad: Math.round(porcentajeMortalidad * 100) / 100,
      causaMasFrecuente,
      tendencia: this.calcularTendencia(),
      muertesPorDia,
      muertesPorCausa: muertesPorCausaArray
    };
  }

  /**
   * Generar datos de muertes por día para gráficos
   */
  private generarMuertesPorDia(): { fecha: string; cantidad: number }[] {
    const datos: { fecha: string; cantidad: number }[] = [];
    
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
        cantidad: muertesDia
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
    const promedio = ultimosDias.reduce((sum, d) => sum + d.cantidad, 0) / ultimosDias.length;
    const ultimo = ultimosDias[ultimosDias.length - 1].cantidad;
    
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
  private crearAlerta(tipo: 'critica' | 'advertencia' | 'informativa', titulo: string, mensaje: string, loteAfectado?: number, accion?: string): void {
    const nuevaAlerta: AlertaMortalidad = {
      id: this.alertasCache.length + 1,
      tipo,
      titulo,
      mensaje,
      loteAfectado,
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
