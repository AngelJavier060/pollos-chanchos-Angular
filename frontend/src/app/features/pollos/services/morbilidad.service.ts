import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { 
  RegistroMorbilidad, 
  EstadisticasMorbilidad, 
  AlertaMorbilidad,
  ENFERMEDADES_COMUNES,
  ESTADOS_ENFERMEDAD,
  TRATAMIENTOS_DISPONIBLES,
  Enfermedad,
  EstadoEnfermedad,
  Tratamiento
} from '../models/morbilidad.model';

@Injectable({
  providedIn: 'root'
})
export class MorbilidadService {
  private readonly API_URL = `${environment.apiUrl}/morbilidad`;
  
  // Subjects para data en tiempo real
  private morbilidadSubject = new BehaviorSubject<RegistroMorbilidad[]>([]);
  private alertasSubject = new BehaviorSubject<AlertaMorbilidad[]>([]);
  private estadisticasSubject = new BehaviorSubject<EstadisticasMorbilidad | null>(null);

  // Observables públicos
  public morbilidad$ = this.morbilidadSubject.asObservable();
  public alertas$ = this.alertasSubject.asObservable();
  public estadisticas$ = this.estadisticasSubject.asObservable();

  // Cache temporal para simulación
  private registrosCache: RegistroMorbilidad[] = [];
  private alertasCache: AlertaMorbilidad[] = [];

  constructor(private http: HttpClient) {
    this.inicializarDatosSimulados();
  }

  /**
   * Obtener todos los registros de morbilidad
   */
  getRegistrosMorbilidad(filtros?: any): Observable<RegistroMorbilidad[]> {
    return this.http.get<RegistroMorbilidad[]>(`${this.API_URL}/registros`, { params: filtros });
  }

  /**
   * Obtener registros activos (no recuperados ni fallecidos)
   */
  getRegistrosActivos(): Observable<RegistroMorbilidad[]> {
    return this.http.get<RegistroMorbilidad[]>(`${this.API_URL}/activos`);
  }

  /**
   * Obtener registros por lote
   */
  getRegistrosPorLote(loteId: number): Observable<RegistroMorbilidad[]> {
    return this.http.get<RegistroMorbilidad[]>(`${this.API_URL}/lote/${loteId}`);
  }

  /**
   * Registrar nueva morbilidad
   */
  registrarMorbilidad(registro: RegistroMorbilidad): Observable<RegistroMorbilidad> {
    return this.http.post<RegistroMorbilidad>(`${this.API_URL}/registrar`, registro);
  }

  /**
   * Actualizar registro de morbilidad
   */
  actualizarRegistro(id: number, registro: Partial<RegistroMorbilidad>): Observable<RegistroMorbilidad> {
    return this.http.put<RegistroMorbilidad>(`${this.API_URL}/${id}`, registro);
  }

  /**
   * Cambiar estado de un registro
   */
  cambiarEstado(id: number, nuevoEstado: EstadoEnfermedad, observaciones?: string): Observable<RegistroMorbilidad> {
    return this.http.patch<RegistroMorbilidad>(`${this.API_URL}/${id}/estado`, {
      estado: nuevoEstado,
      observaciones
    });
  }

  /**
   * Asignar tratamiento a un registro
   */
  asignarTratamiento(id: number, tratamiento: Tratamiento): Observable<RegistroMorbilidad> {
    return this.http.patch<RegistroMorbilidad>(`${this.API_URL}/${id}/tratamiento`, {
      tratamiento
    });
  }

  /**
   * Eliminar registro de morbilidad
   */
  eliminarRegistro(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtener estadísticas de morbilidad
   */
  getEstadisticas(fechaInicio?: Date, fechaFin?: Date): Observable<EstadisticasMorbilidad> {
    const params: any = {};
    if (fechaInicio) params.fechaInicio = fechaInicio.toISOString().split('T')[0];
    if (fechaFin) params.fechaFin = fechaFin.toISOString().split('T')[0];
    
    return this.http.get<EstadisticasMorbilidad>(`${this.API_URL}/estadisticas`, { params });
  }

  /**
   * Obtener alertas de morbilidad
   */
  getAlertas(): Observable<AlertaMorbilidad[]> {
    return this.http.get<AlertaMorbilidad[]>(`${this.API_URL}/alertas`);
  }

  /**
   * Marcar alerta como leída
   */
  marcarAlertaLeida(id: number): Observable<boolean> {
    return this.http.patch<boolean>(`${this.API_URL}/alertas/${id}/leer`, {});
  }

  /**
   * Obtener enfermedades disponibles
   */
  getEnfermedades(): Observable<Enfermedad[]> {
    return this.http.get<Enfermedad[]>(`${this.API_URL}/enfermedades`);
  }

  /**
   * Obtener estados de enfermedad disponibles
   */
  getEstados(): Observable<EstadoEnfermedad[]> {
    return of(ESTADOS_ENFERMEDAD);
  }

  /**
   * Obtener tratamientos disponibles
   */
  getTratamientos(): Observable<Tratamiento[]> {
    return this.http.get<Tratamiento[]>(`${this.API_URL}/medicamentos`);
  }

  /**
   * Obtener morbilidad activa (casos no resueltos)
   */
  getMorbilidadActiva(): Observable<number> {
    return this.http.get<number>(`${this.API_URL}/activos/count`);
  }

  /**
   * Transferir registro a mortalidad (cuando un enfermo muere)
   */
  transferirAMortalidad(id: number): Observable<any> {
    return this.http.post(`${this.API_URL}/${id}/transferir-mortalidad`, {});
  }

  /**
   * Inicializar datos simulados para desarrollo
   */
  private inicializarDatosSimulados(): void {
    // Generar registros de los últimos 10 días
    for (let i = 0; i < 10; i++) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      
      // 0-2 registros por día
      const numRegistros = Math.floor(Math.random() * 3);
      
      for (let j = 0; j < numRegistros; j++) {
        const enfermedad = ENFERMEDADES_COMUNES[Math.floor(Math.random() * ENFERMEDADES_COMUNES.length)];
        const estado = ESTADOS_ENFERMEDAD[Math.floor(Math.random() * ESTADOS_ENFERMEDAD.length)];
        const severidad = ['leve', 'moderada', 'grave', 'critica'][Math.floor(Math.random() * 4)] as 'leve' | 'moderada' | 'grave' | 'critica';
        
        const registro: RegistroMorbilidad = {
          id: this.registrosCache.length + 1,
          loteId: Math.floor(Math.random() * 5) + 1,
          loteName: `Lote ${Math.floor(Math.random() * 5) + 1}`,
          fechaRegistro: fecha,
          cantidadEnfermos: Math.floor(Math.random() * 8) + 1,
          enfermedad,
          sintomas: this.seleccionarSintomasAleatorios(enfermedad.sintomasComunes),
          estado,
          observaciones: this.generarObservacionAleatoria(),
          usuarioRegistro: 'Sistema',
          severidad,
          ubicacion: `Galpon ${Math.floor(Math.random() * 3) + 1}`,
          aislado: enfermedad.requiereAislamiento && Math.random() > 0.3,
          derivadoAMortalidad: estado.id === 6
        };
        
        // Asignar tratamiento si está en tratamiento
        if (estado.id === 1) {
          registro.tratamiento = TRATAMIENTOS_DISPONIBLES[Math.floor(Math.random() * TRATAMIENTOS_DISPONIBLES.length)];
        }
        
        // Establecer fechas según el estado
        if (estado.id === 4) { // Recuperado
          registro.fechaRecuperacion = new Date(fecha.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000);
        } else if (estado.id === 6) { // Fallecido
          registro.fechaMuerte = new Date(fecha.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000);
        }
        
        this.registrosCache.push(registro);
      }
    }

    this.morbilidadSubject.next([...this.registrosCache]);
    this.generarAlertasIniciales();
  }

  /**
   * Seleccionar síntomas aleatorios de una lista
   */
  private seleccionarSintomasAleatorios(sintomas: string[]): string[] {
    const cantidad = Math.min(Math.floor(Math.random() * 3) + 1, sintomas.length);
    const seleccionados: string[] = [];
    const sintomasDisponibles = [...sintomas];
    
    for (let i = 0; i < cantidad; i++) {
      const index = Math.floor(Math.random() * sintomasDisponibles.length);
      const sintoma = sintomasDisponibles.splice(index, 1)[0];
      if (sintoma) {
        seleccionados.push(sintoma);
      }
    }
    
    return seleccionados;
  }

  /**
   * Generar observación aleatoria para simulación
   */
  private generarObservacionAleatoria(): string {
    const observaciones = [
      'Síntomas detectados durante inspección rutinaria',
      'Animal separado para observación',
      'Mejora gradual con el tratamiento actual',
      'Requiere monitoreo constante',
      'Respuesta positiva al medicamento',
      'Síntomas persistentes, evaluar cambio de tratamiento',
      'Animal aislado para evitar contagio'
    ];
    
    return observaciones[Math.floor(Math.random() * observaciones.length)];
  }

  /**
   * Calcular estadísticas basadas en registros actuales
   */
  private calcularEstadisticas(): EstadisticasMorbilidad {
    const totalEnfermos = this.registrosCache.reduce((total, r) => total + r.cantidadEnfermos, 0);
    
    // Simular población total (esto debería venir del servicio de lotes)
    const poblacionTotal = 1000; // Placeholder
    const porcentajeMorbilidad = (totalEnfermos / poblacionTotal) * 100;
    
    // Agrupar por enfermedad
    const enfermosPorEnfermedad = new Map<string, number>();
    this.registrosCache.forEach(r => {
      const actual = enfermosPorEnfermedad.get(r.enfermedad.nombre) || 0;
      enfermosPorEnfermedad.set(r.enfermedad.nombre, actual + r.cantidadEnfermos);
    });
    
    const enfermedadMasFrecuente = Array.from(enfermosPorEnfermedad.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    
    // Calcular tasas de recuperación y mortalidad
    const recuperados = this.registrosCache.filter(r => r.estado.id === 4).length;
    const fallecidos = this.registrosCache.filter(r => r.estado.id === 6).length;
    const resueltos = recuperados + fallecidos;
    
    const tasaRecuperacion = resueltos > 0 ? (recuperados / resueltos) * 100 : 0;
    const tasaMortalidad = resueltos > 0 ? (fallecidos / resueltos) * 100 : 0;
    
    // Generar datos para gráficos
    const enfermosPorDia = this.generarEnfermosPorDia();
    const enfermosPorEnfermedadArray = Array.from(enfermosPorEnfermedad.entries()).map(([enfermedad, cantidad]) => ({
      enfermedad,
      cantidad,
      porcentaje: (cantidad / totalEnfermos) * 100
    }));

    return {
      totalEnfermos,
      porcentajeMorbilidad: Math.round(porcentajeMorbilidad * 100) / 100,
      enfermedadMasFrecuente,
      tendencia: this.calcularTendencia(),
      enfermosPorDia,
      enfermosPorEnfermedad: enfermosPorEnfermedadArray,
      tasaRecuperacion: Math.round(tasaRecuperacion * 100) / 100,
      tasaMortalidad: Math.round(tasaMortalidad * 100) / 100
    };
  }

  /**
   * Generar datos de enfermos por día para gráficos
   */
  private generarEnfermosPorDia(): { fecha: string; cantidad: number }[] {
    const datos: { fecha: string; cantidad: number }[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      
      const enfermosDia = this.registrosCache
        .filter(r => {
          const fechaRegistro = new Date(r.fechaRegistro);
          return fechaRegistro.toDateString() === fecha.toDateString();
        })
        .reduce((total, r) => total + r.cantidadEnfermos, 0);
      
      datos.push({
        fecha: fecha.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
        cantidad: enfermosDia
      });
    }
    
    return datos;
  }

  /**
   * Calcular tendencia de morbilidad
   */
  private calcularTendencia(): 'subiendo' | 'bajando' | 'estable' {
    const enfermosPorDia = this.generarEnfermosPorDia();
    
    if (enfermosPorDia.length < 2) return 'estable';
    
    const ultimosDias = enfermosPorDia.slice(-3);
    const promedio = ultimosDias.reduce((sum, d) => sum + d.cantidad, 0) / ultimosDias.length;
    const ultimo = ultimosDias[ultimosDias.length - 1].cantidad;
    
    if (ultimo > promedio * 1.2) return 'subiendo';
    if (ultimo < promedio * 0.8) return 'bajando';
    return 'estable';
  }

  /**
   * Evaluar si se debe generar una alerta basada en un nuevo registro
   */
  private evaluarGeneracionAlertas(registro: RegistroMorbilidad): void {
    // Alerta por alta morbilidad
    if (registro.cantidadEnfermos >= 10) {
      this.crearAlerta('brote', 'alta',
        'Posible Brote Detectado', 
        `Se registraron ${registro.cantidadEnfermos} casos de ${registro.enfermedad.nombre} en el lote ${registro.loteName}`, 
        registro.loteId,
        'Implementar protocolo de emergencia sanitaria'
      );
    }
    
    // Alerta por enfermedad contagiosa
    if (registro.enfermedad.esContagiosa && !registro.aislado) {
      this.crearAlerta('aislamiento', 'media',
        'Aislamiento Requerido',
        `Caso de ${registro.enfermedad.nombre} sin aislamiento en lote ${registro.loteName}`,
        registro.loteId,
        'Aislar animales afectados inmediatamente'
      );
    }
    
    // Alerta por severidad crítica
    if (registro.severidad === 'critica') {
      this.crearAlerta('tratamiento', 'alta',
        'Condición Crítica',
        `Casos críticos de ${registro.enfermedad.nombre} requieren atención urgente`,
        registro.loteId,
        'Evaluar tratamiento intensivo o sacrificio humanitario'
      );
    }
  }

  /**
   * Crear nueva alerta
   */
  private crearAlerta(tipo: 'brote' | 'aislamiento' | 'tratamiento' | 'seguimiento', prioridad: 'alta' | 'media' | 'baja', titulo: string, mensaje: string, loteAfectado?: number, accion?: string): void {
    const nuevaAlerta: AlertaMorbilidad = {
      id: this.alertasCache.length + 1,
      tipo,
      titulo,
      mensaje,
      loteAfectado,
      fechaCreacion: new Date(),
      leida: false,
      prioridad,
      accionRequerida: accion
    };
    
    this.alertasCache.unshift(nuevaAlerta);
    this.alertasSubject.next([...this.alertasCache]);
  }

  /**
   * Generar alertas iniciales para simulación
   */
  private generarAlertasIniciales(): void {
    this.crearAlerta('seguimiento', 'media',
      'Tratamientos Pendientes', 
      'Hay 3 casos que requieren seguimiento de tratamiento',
      undefined,
      'Revisar evolución y ajustar medicación si es necesario'
    );
    
    this.crearAlerta('tratamiento', 'baja',
      'Reporte Semanal',
      'Tasa de recuperación del 85% en la última semana',
      undefined
    );
  }
}
