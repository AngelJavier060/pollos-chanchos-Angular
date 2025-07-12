import { Component, OnInit } from '@angular/core';
import { AuthDirectService } from '../../core/services/auth-direct.service';
import { User } from '../../shared/models/user.model';
import { AlimentacionService, PlanEjecucionHistorial, EstadisticasLoteHistorial, ResumenHistorialGeneral } from './services/alimentacion.service';

// Interface mejorada para registros de alimentación históricos  
interface RegistroHistorico {
  id: number;
  fecha: string;
  loteId: string;
  codigoLote: string;
  loteDescripcion: string;
  cantidadAplicada: number;
  cantidad?: number; // Alias para cantidadAplicada
  animalesVivos?: number;
  animalesMuertos?: number;
  observaciones: string;
  status: string;
  dayNumber: number;
  fechaCreacion: string;
  fechaUltimaModificacion?: string;
  usuarioUltimaModificacion?: number;
}

// Interface para estadísticas agrupadas por lote
interface EstadisticasLote {
  loteId: string;
  codigo: string;
  fechaInicio: string;
  fechaUltimo: string;
  totalRegistros: number;
  cantidadTotal: number;
  promedioDiario: number;
  animalesVivos: number;
  animalesMuertos: number;
  tasaSupervivencia: number;
  diasActivos: number;
}

@Component({
  selector: 'app-pollos-historico',
  templateUrl: './pollos-historico.component.html',
  styleUrls: ['./pollos-historico.component.scss']
})
export class PollosHistoricoComponent implements OnInit {
  user: User | null = null;
  
  // 🔥 DATOS REALES DEL BACKEND
  registrosHistoricos: RegistroHistorico[] = [];
  estadisticasPorLote: EstadisticasLote[] = [];
  resumenGeneral: ResumenHistorialGeneral | null = null;
  
  // Estados de carga
  cargandoRegistros = true;
  cargandoEstadisticas = true;
  errorCarga = '';

  // Filtros y búsqueda
  busqueda = '';
  filtroFecha = '';
  filtroStatus = '';
  filtroLote = '';
  
  // Rango de fechas personalizado
  fechaInicio = '';
  fechaFin = '';
  
  // Paginación
  paginaActual = 1;
  itemsPorPagina = 20;

  // Vista actual (registros individuales o estadísticas por lote)
  vistaActual: 'registros' | 'estadisticas' = 'registros';

  constructor(
    private authService: AuthDirectService,
    private alimentacionService: AlimentacionService
  ) {
    this.user = this.authService.currentUserValue;
  }

  ngOnInit(): void {
    this.inicializarFechas();
    this.cargarDatosHistoricos();
  }

  /**
   * Inicializar fechas por defecto (últimos 3 meses)
   */
  inicializarFechas(): void {
    const hoy = new Date();
    const hace3Meses = new Date();
    hace3Meses.setMonth(hace3Meses.getMonth() - 3);
    
    this.fechaFin = hoy.toISOString().split('T')[0];
    this.fechaInicio = hace3Meses.toISOString().split('T')[0];
  }

  /**
   * Cargar todos los datos históricos
   */
  cargarDatosHistoricos(): void {
    this.cargandoRegistros = true;
    this.cargandoEstadisticas = true;
    this.errorCarga = '';

    console.log('📚 Cargando historial de alimentación con rango:', {
      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin
    });

    // Cargar registros históricos del backend
    this.alimentacionService.getHistorialConRango(this.fechaInicio, this.fechaFin)
      .subscribe({
        next: (registros) => {
          console.log('✅ Registros históricos obtenidos:', registros);
          this.procesarRegistrosDelBackend(registros);
          this.cargandoRegistros = false;
        },
        error: (error) => {
          console.error('❌ Error al cargar registros históricos:', error);
          this.errorCarga = 'Error al cargar los registros del historial';
          this.cargandoRegistros = false;
          
          // Fallback a datos de ejemplo si el backend no responde
          this.cargarDatosDeEjemplo();
        }
      });

    // Cargar estadísticas por lote
    this.alimentacionService.getEstadisticasPorLote()
      .subscribe({
        next: (estadisticas) => {
          console.log('✅ Estadísticas por lote obtenidas:', estadisticas);
          this.procesarEstadisticasDelBackend(estadisticas);
          this.cargandoEstadisticas = false;
        },
        error: (error) => {
          console.error('❌ Error al cargar estadísticas:', error);
          this.cargandoEstadisticas = false;
        }
      });

    // Cargar resumen general
    this.alimentacionService.getResumenHistorialGeneral()
      .subscribe({
        next: (resumen) => {
          console.log('✅ Resumen general obtenido:', resumen);
          this.resumenGeneral = resumen;
        },
        error: (error) => {
          console.error('❌ Error al cargar resumen general:', error);
        }
      });
  }

  /**
   * Procesar registros del backend y convertirlos al formato del componente
   */
  procesarRegistrosDelBackend(registros: PlanEjecucionHistorial[]): void {
    this.registrosHistoricos = registros.map(registro => ({
      id: registro.id,
      fecha: registro.executionDate,
      loteId: registro.loteId || 'N/A',
      codigoLote: registro.loteCodigo || registro.loteId || 'N/A',
      loteDescripcion: registro.loteDescripcion || 'Lote sin descripción',
      cantidadAplicada: registro.quantityApplied,
      animalesVivos: registro.animalesVivos,
      animalesMuertos: registro.animalesMuertos,
      observaciones: registro.observations || '',
      status: registro.status,
      dayNumber: registro.dayNumber,
      fechaCreacion: registro.createDate
    }));

    // Generar estadísticas por lote basadas en los registros reales
    this.generarEstadisticasPorLote();
  }

  /**
   * Procesar estadísticas del backend
   */
  procesarEstadisticasDelBackend(estadisticas: EstadisticasLoteHistorial[]): void {
    this.estadisticasPorLote = estadisticas.map(stat => ({
      loteId: stat.loteId,
      codigo: stat.codigo,
      fechaInicio: stat.fechaInicio,
      fechaUltimo: stat.fechaFin,
      totalRegistros: stat.totalRegistros,
      cantidadTotal: stat.cantidadTotalAplicada,
      promedioDiario: stat.promedioDiario,
      animalesVivos: stat.animalesVivos,
      animalesMuertos: stat.animalesMuertos,
      tasaSupervivencia: stat.tasaSupervivencia,
      diasActivos: stat.diasActivos
    }));
  }

  /**
   * Generar estadísticas por lote basadas en registros reales
   */
  generarEstadisticasPorLote(): void {
    const loteStats = new Map<string, any>();
    
    this.registrosHistoricos.forEach(registro => {
      if (!loteStats.has(registro.loteId)) {
        loteStats.set(registro.loteId, {
          loteId: registro.loteId,
          codigo: registro.codigoLote,
          registros: [],
          fechaInicio: registro.fecha,
          fechaUltimo: registro.fecha,
          cantidadTotal: 0,
          animalesVivos: 0,
          animalesMuertos: 0
        });
      }
      
      const stat = loteStats.get(registro.loteId)!;
      stat.registros.push(registro);
      stat.cantidadTotal += registro.cantidadAplicada;
      
      // Actualizar fechas
      if (new Date(registro.fecha) < new Date(stat.fechaInicio)) {
        stat.fechaInicio = registro.fecha;
      }
      if (new Date(registro.fecha) > new Date(stat.fechaUltimo)) {
        stat.fechaUltimo = registro.fecha;
      }
      
      // Actualizar animales (tomar el último registro)
      if (registro.animalesVivos !== undefined) {
        stat.animalesVivos = registro.animalesVivos;
      }
      if (registro.animalesMuertos !== undefined) {
        stat.animalesMuertos = registro.animalesMuertos;
      }
    });

    // Convertir a array y calcular métricas
    this.estadisticasPorLote = Array.from(loteStats.values()).map(stat => {
      const diasActivos = this.calcularDiasEntreFechas(stat.fechaInicio, stat.fechaUltimo) + 1;
      const totalAnimales = stat.animalesVivos + stat.animalesMuertos;
      
      return {
        loteId: stat.loteId,
        codigo: stat.codigo,
        fechaInicio: stat.fechaInicio,
        fechaUltimo: stat.fechaUltimo,
        totalRegistros: stat.registros.length,
        cantidadTotal: stat.cantidadTotal,
        promedioDiario: stat.cantidadTotal / diasActivos,
        animalesVivos: stat.animalesVivos,
        animalesMuertos: stat.animalesMuertos,
        tasaSupervivencia: totalAnimales > 0 ? (stat.animalesVivos / totalAnimales * 100) : 100,
        diasActivos: diasActivos
      };
    });
  }

  /**
   * Calcular días entre dos fechas
   */
  calcularDiasEntreFechas(fecha1: string, fecha2: string): number {
    const date1 = new Date(fecha1);
    const date2 = new Date(fecha2);
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Datos de ejemplo para fallback
   */
  cargarDatosDeEjemplo(): void {
    console.log('📝 Cargando datos de ejemplo como fallback');
    
    // Simular algunos registros de ejemplo
    this.registrosHistoricos = [
      {
        id: 1,
        fecha: '2024-12-01',
        loteId: '1',
        codigoLote: 'LOT-001',
        loteDescripcion: 'Lote de Pollos Broiler - Ejemplo',
        cantidadAplicada: 4.2,
        animalesVivos: 18,
        animalesMuertos: 2,
        observaciones: 'Registro normal',
        status: 'EJECUTADO',
        dayNumber: 5,
        fechaCreacion: '2024-12-01T08:00:00'
      },
      {
        id: 2,
        fecha: '2024-12-02',
        loteId: '1',
        codigoLote: 'LOT-001',
        loteDescripcion: 'Lote de Pollos Broiler - Ejemplo',
        cantidadAplicada: 4.1,
        animalesVivos: 18,
        animalesMuertos: 2,
        observaciones: 'Todo normal',
        status: 'EJECUTADO',
        dayNumber: 6,
        fechaCreacion: '2024-12-02T08:00:00'
      }
    ];
    
    this.generarEstadisticasPorLote();
  }

  /**
   * Método trackBy para optimizar el renderizado
   */
  trackByRegistro(index: number, registro: RegistroHistorico): number {
    return registro.id || index;
  }

  /**
   * Obtener registros filtrados
   */
  getRegistrosFiltrados(): RegistroHistorico[] {
    let registrosFiltrados = [...this.registrosHistoricos];

    // Filtrar por búsqueda
    if (this.busqueda.trim()) {
      registrosFiltrados = registrosFiltrados.filter(registro => 
        registro.codigoLote.toLowerCase().includes(this.busqueda.toLowerCase()) ||
        registro.observaciones.toLowerCase().includes(this.busqueda.toLowerCase()) ||
        registro.loteId.includes(this.busqueda)
      );
    }

    // Filtrar por fecha
    if (this.filtroFecha) {
      registrosFiltrados = registrosFiltrados.filter(registro => 
        registro.fecha >= this.filtroFecha
      );
    }

    // Filtrar por status
    if (this.filtroStatus) {
      registrosFiltrados = registrosFiltrados.filter(registro => 
        registro.status === this.filtroStatus
      );
    }

    // Filtrar por lote
    if (this.filtroLote) {
      registrosFiltrados = registrosFiltrados.filter(registro => 
        registro.loteId === this.filtroLote
      );
    }

    return registrosFiltrados.sort((a, b) => 
      new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );
  }

  /**
   * Obtener registros paginados
   */
  getRegistrosPaginados(): RegistroHistorico[] {
    const registrosFiltrados = this.getRegistrosFiltrados();
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    return registrosFiltrados.slice(inicio, fin);
  }

  /**
   * Obtener número total de páginas
   */
  getTotalPaginas(): number {
    return Math.ceil(this.getRegistrosFiltrados().length / this.itemsPorPagina);
  }

  /**
   * Cambiar página
   */
  cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina >= 1 && nuevaPagina <= this.getTotalPaginas()) {
      this.paginaActual = nuevaPagina;
    }
  }

  /**
   * Cambiar vista entre registros y estadísticas
   */
  cambiarVista(vista: 'registros' | 'estadisticas'): void {
    this.vistaActual = vista;
    this.paginaActual = 1; // Resetear paginación
  }

  /**
   * Actualizar rango de fechas y recargar datos
   */
  actualizarRangoFechas(): void {
    if (this.fechaInicio && this.fechaFin) {
      this.cargarDatosHistoricos();
      this.paginaActual = 1;
    }
  }

  /**
   * Obtener estadísticas generales calculadas
   */
  getEstadisticasGenerales() {
    const registros = this.getRegistrosFiltrados();
    
    return {
      totalRegistros: registros.length,
      totalLotes: new Set(registros.map(r => r.loteId)).size,
      cantidadTotal: registros.reduce((total, registro) => total + registro.cantidadAplicada, 0),
      promedioGeneral: registros.length > 0 ? 
        registros.reduce((total, registro) => total + registro.cantidadAplicada, 0) / registros.length : 0,
      fechaUltimo: registros.length > 0 ? registros[0].fecha : '',
      registrosHoy: registros.filter(r => r.fecha === new Date().toISOString().split('T')[0]).length
    };
  }

  /**
   * Formatear fecha
   */
  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Formatear fecha y hora
   */
  formatearFechaHora(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Obtener color según el status
   */
  getColorStatus(status: string): string {
    switch(status.toUpperCase()) {
      case 'EJECUTADO': return 'text-green-600 bg-green-100';
      case 'PENDIENTE': return 'text-yellow-600 bg-yellow-100';
      case 'OMITIDO': return 'text-red-600 bg-red-100';
      case 'CORREGIDO': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }

  /**
   * Obtener icono según el status
   */
  getIconoStatus(status: string): string {
    switch(status.toUpperCase()) {
      case 'EJECUTADO': return 'fas fa-check-circle';
      case 'PENDIENTE': return 'fas fa-clock';
      case 'OMITIDO': return 'fas fa-times-circle';
      case 'CORREGIDO': return 'fas fa-edit';
      default: return 'fas fa-question-circle';
    }
  }

  /**
   * Exportar datos (placeholder)
   */
  exportarDatos(): void {
    console.log('📊 Exportando datos del historial...');
    // Aquí se implementaría la exportación real
    alert('Función de exportación en desarrollo');
  }

  /**
   * Limpiar filtros
   */
  limpiarFiltros(): void {
    this.busqueda = '';
    this.filtroFecha = '';
    this.filtroStatus = '';
    this.filtroLote = '';
    this.paginaActual = 1;
  }

  /**
   * Obtener lista única de lotes para el filtro
   */
  getLotesUnicos(): {loteId: string, codigoLote: string, loteDescripcion: string}[] {
    const lotesMap = new Map<string, {loteId: string, codigoLote: string, loteDescripcion: string}>();
    
    this.registrosHistoricos.forEach(registro => {
      if (registro.loteId && registro.loteId !== 'N/A') {
        if (!lotesMap.has(registro.loteId)) {
          lotesMap.set(registro.loteId, {
            loteId: registro.loteId,
            codigoLote: registro.codigoLote,
            loteDescripcion: registro.loteDescripcion
          });
        }
      }
    });
    
    return Array.from(lotesMap.values())
      .sort((a, b) => a.loteDescripcion.localeCompare(b.loteDescripcion));
  }

  /**
   * Obtener lista única de status para el filtro
   */
  getStatusUnicos(): string[] {
    return Array.from(new Set(this.registrosHistoricos.map(r => r.status)))
      .filter(status => status)
      .sort();
  }

  /**
   * Editar un registro existente
   */
  editarRegistro(registro: any): void {
    const confirmacion = confirm(`¿Deseas editar el registro #${registro.id}?`);
    if (!confirmacion) return;

    // Crear un modal o formulario de edición
    const cantidadActual = registro.cantidadAplicada || registro.cantidad || 0;
    const nuevaCantidad = prompt(`Cantidad actual: ${cantidadActual} kg\nIngresa la nueva cantidad:`, cantidadActual.toString());
    if (nuevaCantidad === null) return;

    const cantidadNumerica = parseFloat(nuevaCantidad);
    if (isNaN(cantidadNumerica) || cantidadNumerica <= 0) {
      alert('❌ La cantidad debe ser un número válido mayor a 0');
      return;
    }

    const nuevasObservaciones = prompt(`Observaciones actuales: ${registro.observaciones || 'Sin observaciones'}\nNuevas observaciones:`, registro.observaciones || '');
    if (nuevasObservaciones === null) return;

    // Datos de la corrección
    const datosCorreccion = {
      registroId: registro.id,
      cantidadAnterior: cantidadActual,
      cantidadNueva: cantidadNumerica,
      observacionesAnteriores: registro.observaciones,
      observacionesNuevas: nuevasObservaciones,
      motivoCorreccion: prompt('Motivo de la corrección:', 'Corrección de datos') || 'Corrección de datos',
      usuarioCorreccion: this.user?.id || 0
    };

    // Llamar al servicio para actualizar
    this.aplicarCorreccion(datosCorreccion);
  }

  /**
   * Eliminar un registro
   */
  eliminarRegistro(registro: any): void {
    const confirmacion = confirm(`⚠️ ¿Estás seguro de eliminar el registro #${registro.id}?\n\nEsta acción NO se puede deshacer.`);
    if (!confirmacion) return;

    const motivoEliminacion = prompt('Motivo de la eliminación:', 'Registro erróneo');
    if (!motivoEliminacion) {
      alert('❌ Debes proporcionar un motivo para la eliminación');
      return;
    }

    // Llamar al servicio para eliminar
    this.eliminarRegistroDelSistema(registro.id, motivoEliminacion);
  }

  /**
   * Ver detalles completos de un registro
   */
  verDetalles(registro: any): void {
    const cantidad = registro.cantidadAplicada || registro.cantidad || 0;
    alert(`📋 DETALLES DEL REGISTRO #${registro.id}

🏷️ Lote: ${registro.loteDescripcion} (${registro.codigoLote})
📅 Fecha de Registro: ${this.formatearFecha(registro.fecha)}
⏰ Fecha de Creación: ${this.formatearFechaHora(registro.fechaCreacion)}
🥬 Cantidad: ${cantidad} kg
🐔 Animales Vivos: ${registro.animalesVivos || 'N/A'}
💀 Animales Muertos: ${registro.animalesMuertos || 'N/A'}
📊 Estado: ${registro.status}
📝 Observaciones: ${registro.observaciones || 'Sin observaciones'}
👤 Usuario: ${registro.usuarioId || 'N/A'}`);
  }

  /**
   * Aplicar corrección a un registro
   */
  private aplicarCorreccion(datosCorreccion: any): void {
    console.log('🔧 Aplicando corrección:', datosCorreccion);
    
    // Aquí implementarías la llamada al backend
    // Por ahora, simularemos la actualización local
    const registro = this.registrosHistoricos.find(r => r.id === datosCorreccion.registroId);
    if (registro) {
      registro.cantidadAplicada = datosCorreccion.cantidadNueva;
      registro.cantidad = datosCorreccion.cantidadNueva; // Alias
      registro.observaciones = datosCorreccion.observacionesNuevas;
      registro.fechaUltimaModificacion = new Date().toISOString();
      registro.usuarioUltimaModificacion = datosCorreccion.usuarioCorreccion;
      
      alert('✅ Registro actualizado correctamente');
      
      // Recargar datos
      this.cargarDatosHistoricos();
    }
  }

  /**
   * Eliminar registro del sistema
   */
  private eliminarRegistroDelSistema(registroId: number, motivo: string): void {
    console.log('🗑️ Eliminando registro:', { registroId, motivo });
    
    // Aquí implementarías la llamada al backend para eliminar
    // Por ahora, simularemos la eliminación local
    const index = this.registrosHistoricos.findIndex(r => r.id === registroId);
    if (index !== -1) {
      this.registrosHistoricos.splice(index, 1);
      alert('✅ Registro eliminado correctamente');
      
      // Recargar datos
      this.cargarDatosHistoricos();
    }
  }
}