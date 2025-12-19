import { Component, OnInit } from '@angular/core';
import { AuthDirectService } from '../../core/services/auth-direct.service';
import { User } from '../../shared/models/user.model';
import { AlimentacionService, PlanEjecucionHistorial, EstadisticasLoteHistorial, ResumenHistorialGeneral } from './services/alimentacion.service';
import { InventarioService, ProductoConsumido } from './services/inventario.service';
import { Lote } from '../lotes/interfaces/lote.interface';
import { LoteService } from '../lotes/services/lote.service';

interface RegistroHistorico {
  id: number;
  fecha: string;
  loteId: string;
  codigoLote: string;
  loteDescripcion: string;
  cantidadAplicada: number;
  animalesVivos?: number;
  animalesMuertos?: number;
  observaciones: string;
  status: string;
  dayNumber: number;
  fechaCreacion: string;
  fechaUltimaModificacion?: string;
  usuarioUltimaModificacion?: number;
  // Producto consumido
  productoNombre?: string;
  productoId?: number;
}

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
  registrosHistoricos: RegistroHistorico[] = [];
  estadisticasPorLote: EstadisticasLote[] = [];
  resumenGeneral: ResumenHistorialGeneral | null = null;
  
  cargandoRegistros = true;
  cargandoEstadisticas = true;
  errorCarga = '';

  busqueda = '';
  filtroFecha = '';
  filtroStatus = '';
  filtroLote = '';
  // Nuevo: filtros por fecha y hora (fecha de creación)
  filtroFechaHoraInicio = '';
  filtroFechaHoraFin = '';
  
  fechaInicio = '';
  fechaFin = '';
  
  paginaActual = 1;
  itemsPorPagina = 20;
  vistaActual: 'registros' | 'estadisticas' = 'registros';
  stickyHeader = false;
  modoCompacto = false;

  lotesPollos: Lote[] = [];
  mostrarDetalleAlimento = false;
  detalleAlimentos: { nombre: string; total: number }[] = [];

  mostrarModalDetalles = false;
  registroSeleccionado: RegistroHistorico | null = null;
  productosConsumidos: { nombre: string; cantidad: number; porAnimal?: number }[] = [];

  constructor(
    private authService: AuthDirectService,
    private alimentacionService: AlimentacionService,
    private loteService: LoteService,
    private inventarioService: InventarioService
  ) {
    this.user = this.authService.currentUserValue;
  }

  ngOnInit(): void {
    this.inicializarFechas();
    // Cargar lotes PRIMERO, luego datos históricos
    this.cargarLotesPollos();
    this.cargarDatosHistoricos();
  }

  inicializarFechas(): void {
    const hoy = new Date();
    const hace3Meses = new Date();
    hace3Meses.setMonth(hace3Meses.getMonth() - 3);
    this.fechaFin = hoy.toISOString().split('T')[0];
    this.fechaInicio = hace3Meses.toISOString().split('T')[0];
  }

  cargarDatosHistoricos(): void {
    this.cargandoRegistros = true;
    this.cargandoEstadisticas = true;
    this.errorCarga = '';

    // 🐔 IMPORTANTE: Filtrar solo registros de POLLOS
    this.alimentacionService.getHistorialConRango(this.fechaInicio, this.fechaFin, 'pollos')
      .subscribe({
        next: (registros) => {
          console.log('Registros históricos obtenidos:', registros.length);
          // Log primer registro para debug de observaciones
          if (registros.length > 0) {
            console.log('[Histórico] Ejemplo de observaciones:', registros[0].observations);
          }
          this.procesarRegistrosDelBackend(registros);
          // Enriquecer con lotes si ya están cargados
          if (this.lotesPollos.length > 0) {
            this.enriquecerRegistrosConLote();
          }
          this.cargandoRegistros = false;
        },
        error: (error) => {
          console.error('Error al cargar registros históricos:', error);
          this.errorCarga = 'Error al cargar los registros del historial';
          this.cargandoRegistros = false;
          this.cargarDatosDeEjemplo();
        }
      });

    this.alimentacionService.getEstadisticasPorLote()
      .subscribe({
        next: (estadisticas) => {
          console.log('Estadísticas por lote obtenidas:', estadisticas);
          this.procesarEstadisticasDelBackend(estadisticas);
          this.cargandoEstadisticas = false;
        },
        error: (error) => {
          console.error('Error al cargar estadísticas:', error);
          this.cargandoEstadisticas = false;
        }
      });

    this.alimentacionService.getResumenHistorialGeneral()
      .subscribe({
        next: (resumen) => {
          console.log('Resumen general obtenido:', resumen);
          this.resumenGeneral = resumen;
        },
        error: (error) => {
          console.error('Error al cargar resumen general:', error);
        }
      });
  }

  procesarRegistrosDelBackend(registros: PlanEjecucionHistorial[]): void {
    this.registrosHistoricos = registros.map(registro => {
      const obs = registro.observations || '';
      
      // Extraer nombre y código del lote desde observaciones
      const nombreLoteObs = this.parseNombreLoteDesdeObservaciones(obs);
      const codigoLoteObs = this.parseCodigoLoteDesdeObservaciones(obs);
      
      // Determinar valores finales
      const esManual = !registro.loteId || registro.loteId === 'LOT-MANUAL' || 
                       registro.loteCodigo === 'MANUAL' || 
                       (registro.loteDescripcion || '').toLowerCase().includes('manual');
      
      let loteIdFinal = registro.loteId || 'N/A';
      let codigoLoteFinal = registro.loteCodigo || registro.loteId || 'N/A';
      let loteDescripcionFinal = registro.loteDescripcion || 'Lote sin descripción';
      
      // Si es registro manual, usar datos de observaciones
      if (esManual) {
        if (codigoLoteObs) {
          loteIdFinal = codigoLoteObs;
          codigoLoteFinal = codigoLoteObs;
        }
        if (nombreLoteObs) {
          loteDescripcionFinal = nombreLoteObs;
        }
        console.log(`[Histórico] Registro manual procesado: ${loteDescripcionFinal} (${codigoLoteFinal})`);
      }
      
      const m: RegistroHistorico = {
        id: registro.id,
        fecha: registro.executionDate,
        loteId: loteIdFinal,
        codigoLote: codigoLoteFinal,
        loteDescripcion: loteDescripcionFinal,
        cantidadAplicada: registro.quantityApplied,
        animalesVivos: registro.animalesVivos,
        animalesMuertos: registro.animalesMuertos,
        observaciones: obs,
        status: registro.status,
        dayNumber: registro.dayNumber,
        fechaCreacion: registro.createDate,
        productoNombre: registro.productoNombre,
        productoId: registro.productoId
      };
      
      const a = this.parseAnimales(m.observaciones);
      if (a.vivos != null && (m.animalesVivos == null || isNaN(m.animalesVivos as any))) m.animalesVivos = a.vivos;
      if (a.muertos != null && (m.animalesMuertos == null || isNaN(m.animalesMuertos as any))) m.animalesMuertos = a.muertos;
      
      return m;
    });
    this.generarEstadisticasPorLote();
  }

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
      if (new Date(registro.fecha) < new Date(stat.fechaInicio)) stat.fechaInicio = registro.fecha;
      if (new Date(registro.fecha) > new Date(stat.fechaUltimo)) stat.fechaUltimo = registro.fecha;
      if (registro.animalesVivos !== undefined) stat.animalesVivos = registro.animalesVivos;
      if (registro.animalesMuertos !== undefined) stat.animalesMuertos = registro.animalesMuertos;
    });
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
        diasActivos
      };
    });
  }

  calcularDiasEntreFechas(fecha1: string, fecha2: string): number {
    const date1 = new Date(fecha1);
    const date2 = new Date(fecha2);
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  cargarDatosDeEjemplo(): void {
    this.registrosHistoricos = [{
      id: 1, fecha: '2024-12-01', loteId: '1', codigoLote: 'LOT-001',
      loteDescripcion: 'Lote de Pollos Broiler - Ejemplo', cantidadAplicada: 4.2,
      animalesVivos: 18, animalesMuertos: 2, observaciones: 'Registro normal',
      status: 'EJECUTADO', dayNumber: 5, fechaCreacion: '2024-12-01T08:00:00'
    }];
    this.generarEstadisticasPorLote();
  }

  private cargarLotesPollos(): void {
    this.loteService.getLotes().subscribe({
      next: (lotes) => {
        console.log('Total de lotes disponibles:', lotes.length);
        try {
          this.lotesPollos = this.loteService.filterLotesByAnimalType(lotes, 'pollo');
        } catch {
          this.lotesPollos = lotes.filter(l => (l.race?.animal?.name || '').toLowerCase().includes('pollo'));
        }
        console.log('[Histórico] Lotes pollos filtrados:', this.lotesPollos.length);
        // Re-enriquecer registros si ya están cargados
        if (this.registrosHistoricos.length > 0) {
          this.enriquecerRegistrosConLote();
        }
      },
      error: (err) => {
        console.error('[Histórico] Error cargando lotes:', err);
      }
    });
  }

  private enriquecerRegistrosConLote(): void {
    if (!this.registrosHistoricos?.length || !this.lotesPollos?.length) return;
    console.log('[Histórico] Enriqueciendo registros con lotes disponibles:', this.lotesPollos.map(l => ({ id: l.id, codigo: l.codigo, name: l.name })));
    
    this.registrosHistoricos = this.registrosHistoricos.map(r => {
      // Si ya tiene descripción válida (no manual), no cambiar
      const descActual = (r.loteDescripcion || '').toLowerCase();
      const esDescManual = descActual.includes('manual') || descActual.includes('sin descripción') || !r.loteDescripcion;
      
      // Intentar resolver lote por múltiples vías
      const codigoObs = this.parseCodigoLoteDesdeObservaciones(r.observaciones);
      const nombreObs = this.parseNombreLoteDesdeObservaciones(r.observaciones);
      
      // Buscar lote por: loteId, codigoLote, código de obs, nombre de obs
      let lote = this.resolverLoteDesdeIdOCodigo(r.loteId) 
              || this.resolverLoteDesdeIdOCodigo(r.codigoLote)
              || this.resolverLoteDesdeIdOCodigo(codigoObs)
              || this.resolverLoteDesdeIdOCodigo(nombreObs);
      
      if (lote) {
        console.log(`[Histórico] Lote resuelto para registro #${r.id}: ${lote.name} (${lote.codigo})`);
        return {
          ...r,
          loteId: String(lote.id || r.loteId),
          loteDescripcion: lote.name || r.loteDescripcion,
          codigoLote: lote.codigo || r.codigoLote
        };
      }
      
      // Si no se encontró lote pero hay nombre en observaciones, usarlo
      if (esDescManual && nombreObs) {
        console.log(`[Histórico] Usando nombre de obs para registro #${r.id}: ${nombreObs}`);
        return { ...r, loteDescripcion: nombreObs, codigoLote: codigoObs || r.codigoLote };
      }
      
      return r;
    });
  }

  private parseAnimales(obs: string): { vivos?: number; muertos?: number } {
    const res: { vivos?: number; muertos?: number } = {};
    const mv = /Animales\s+vivos:\s*(\d+)/i.exec(obs || '');
    const mm = /Mortalidad\s+registrada:\s*(\d+)/i.exec(obs || '');
    if (mv && mv[1]) res.vivos = parseInt(mv[1], 10);
    if (mm && mm[1]) res.muertos = parseInt(mm[1], 10);
    return res;
  }

  private parseLoteDesdeObservaciones(obs: string): string | null {
    const m = /Lote:\s*([^|]+)/i.exec(obs || '');
    if (m && m[1]) return m[1].trim();
    return null;
  }

  private parseCodigoLoteDesdeObservaciones(obs: string): string | null {
    const m = /Lote:\s*[^()]*\(([^)]+)\)/i.exec(obs || '');
    if (m && m[1]) return m[1].trim();
    return null;
  }

  private parseNombreLoteDesdeObservaciones(obs: string): string | null {
    const m = /Lote:\s*([^(|]+)/i.exec(obs || '');
    if (m && m[1]) return m[1].trim();
    return null;
  }

  private sanitizeKey(s?: string | null): string {
    return (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private parseProductoDesdeObservaciones(obs: string): { nombre?: string; porAnimal?: number; vivos?: number; total?: number } {
    const o = obs || '';
    const nombre = (/Producto:\s*([^|]+)/i.exec(o) || [])[1]?.trim();
    const porAnimalS = (/porAnimal:\s*([0-9.,]+)/i.exec(o) || [])[1];
    const vivosS = (/vivos:\s*(\d+)/i.exec(o) || [])[1];
    const totalS = (/total:\s*([0-9.,]+)/i.exec(o) || [])[1];
    const toNum = (s?: string) => (s ? parseFloat(s.replace(',', '.')) : undefined);
    return { nombre, porAnimal: toNum(porAnimalS), vivos: vivosS ? parseInt(vivosS, 10) : undefined, total: toNum(totalS) };
  }

  private obtenerLoteIdPreferido(r: RegistroHistorico): string | null {
    const lid = (r?.loteId || '').trim();
    if (lid && lid !== 'LOT-MANUAL' && lid !== 'MANUAL') return lid;
    const obs = r?.observaciones || '';
    const code = this.parseCodigoLoteDesdeObservaciones(obs);
    if (code) return code;
    const parsed = this.parseLoteDesdeObservaciones(obs) || '';
    return parsed || null;
  }

  private resolverLoteDesdeIdOCodigo(idOCodigo?: string | null): Lote | undefined {
    const key = (idOCodigo || '').trim();
    if (!key) return undefined;
    let lote = this.lotesPollos.find(l => String(l.id) === key || (l.codigo || '') === key);
    if (lote) return lote;
    const cleanKey = this.sanitizeKey(key);
    lote = this.lotesPollos.find(l => {
      const idC = this.sanitizeKey(String(l.id || ''));
      const codC = this.sanitizeKey(String(l.codigo || ''));
      const nameC = this.sanitizeKey(String(l.name || ''));
      return idC === cleanKey || codC === cleanKey || nameC === cleanKey || (nameC && cleanKey.includes(nameC)) || (nameC && nameC.includes(cleanKey));
    });
    return lote;
  }

  private normalizarRegistroConLote(r: RegistroHistorico): RegistroHistorico {
    const prefer = this.obtenerLoteIdPreferido(r);
    const lote = this.resolverLoteDesdeIdOCodigo(prefer) || this.resolverLoteDesdeIdOCodigo(r.codigoLote);
    if (lote) {
      return { ...r, loteDescripcion: lote.name, codigoLote: lote.codigo || r.codigoLote, loteId: String(lote.id || r.loteId) };
    }
    return r;
  }

  private esMismaFecha(a: RegistroHistorico, b: RegistroHistorico): boolean {
    return (a?.fecha || '').slice(0, 10) === (b?.fecha || '').slice(0, 10);
  }

  private esMismoLote(a: RegistroHistorico, b: RegistroHistorico): boolean {
    const aPref = this.obtenerLoteIdPreferido(a) || a.codigoLote;
    const bPref = this.obtenerLoteIdPreferido(b) || b.codigoLote;
    return this.sanitizeKey(aPref) === this.sanitizeKey(bPref);
  }

  private inferirProducto(texto: string): string | undefined {
    const t = (texto || '').toLowerCase();
    if (/ma[ií]z|corn/.test(t)) return 'Maíz';
    if (/trigo|wheat/.test(t)) return 'Trigo';
    if (/soya|soja/.test(t)) return 'Soya';
    if (/vitam/.test(t)) return 'Vitaminas';
    if (/insumo|medic|antibi/.test(t)) return 'Insumo';
    return undefined;
  }

  private esAlimento(nombre?: string): boolean {
    const n = (nombre || '').toLowerCase();
    if (!n) return false;
    if (/(vitam|insumo|medic|antibi)/.test(n)) return false;
    return true;
  }

  // === Métodos públicos para el template ===

  exportarDatos(): void {
    console.log('Exportar historial (pendiente de implementación real)');
  }

  actualizarRangoFechas(): void {
    if (this.fechaInicio && this.fechaFin) {
      this.cargarDatosHistoricos();
      this.paginaActual = 1;
    }
  }

  cambiarVista(vista: 'registros' | 'estadisticas'): void {
    this.vistaActual = vista;
    this.paginaActual = 1;
  }

  trackByRegistro(index: number, registro: RegistroHistorico): number {
    return registro.id || index;
  }

  getRegistrosFiltrados(): RegistroHistorico[] {
    let registrosFiltrados = [...this.registrosHistoricos];
    if (this.busqueda.trim()) {
      registrosFiltrados = registrosFiltrados.filter(registro =>
        registro.codigoLote.toLowerCase().includes(this.busqueda.toLowerCase()) ||
        registro.observaciones.toLowerCase().includes(this.busqueda.toLowerCase()) ||
        registro.loteId.includes(this.busqueda)
      );
    }
    if (this.filtroFecha) {
      registrosFiltrados = registrosFiltrados.filter(registro => registro.fecha >= this.filtroFecha);
    }
    // Filtro por fecha/hora de creación (rango)
    if (this.filtroFechaHoraInicio) {
      const ini = new Date(this.filtroFechaHoraInicio).getTime();
      registrosFiltrados = registrosFiltrados.filter(r => new Date(r.fechaCreacion).getTime() >= ini);
    }
    if (this.filtroFechaHoraFin) {
      const fin = new Date(this.filtroFechaHoraFin).getTime();
      registrosFiltrados = registrosFiltrados.filter(r => new Date(r.fechaCreacion).getTime() <= fin);
    }
    if (this.filtroStatus) {
      registrosFiltrados = registrosFiltrados.filter(registro => registro.status === this.filtroStatus);
    }
    if (this.filtroLote) {
      registrosFiltrados = registrosFiltrados.filter(registro => registro.loteId === this.filtroLote);
    }
    return registrosFiltrados.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }

  aplicarFiltroFechaHora(): void {
    this.paginaActual = 1;
  }

  getRegistrosPaginados(): RegistroHistorico[] {
    const registrosFiltrados = this.getRegistrosFiltrados();
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    return registrosFiltrados.slice(inicio, fin);
  }

  getTotalPaginas(): number {
    return Math.ceil(this.getRegistrosFiltrados().length / this.itemsPorPagina);
  }

  getEstadisticasGenerales() {
    const registros = this.getRegistrosFiltrados();
    return {
      totalRegistros: registros.length,
      totalLotes: new Set(registros.map(r => r.loteId)).size,
      cantidadTotal: registros.reduce((total, r) => total + r.cantidadAplicada, 0),
      promedioGeneral: registros.length > 0 ? registros.reduce((t, r) => t + r.cantidadAplicada, 0) / registros.length : 0,
      fechaUltimo: registros.length > 0 ? registros[0].fecha : '',
      registrosHoy: registros.filter(r => r.fecha === new Date().toISOString().split('T')[0]).length
    };
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  formatearFechaHora(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  getLotesUnicos(): { loteId: string; loteDescripcion: string; codigoLote: string }[] {
    const lotesMap = new Map<string, { loteId: string; loteDescripcion: string; codigoLote: string }>();
    this.registrosHistoricos.forEach(r => {
      if (!lotesMap.has(r.loteId)) {
        lotesMap.set(r.loteId, { loteId: r.loteId, loteDescripcion: r.loteDescripcion || r.codigoLote || r.loteId, codigoLote: r.codigoLote || r.loteId });
      }
    });
    return Array.from(lotesMap.values()).sort((a, b) => a.loteDescripcion.localeCompare(b.loteDescripcion));
  }

  getStatusUnicos(): string[] {
    const statusSet = new Set<string>();
    this.registrosHistoricos.forEach(r => {
      if (r.status) statusSet.add(r.status);
    });
    return Array.from(statusSet).sort();
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.filtroFecha = '';
    this.filtroStatus = '';
    this.filtroLote = '';
    this.paginaActual = 1;
  }

  cerrarModalDetalles(): void {
    this.mostrarModalDetalles = false;
    this.registroSeleccionado = null;
    this.productosConsumidos = [];
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.getTotalPaginas()) {
      this.paginaActual = pagina;
    }
  }

  getPaginasArray(): number[] {
    const total = this.getTotalPaginas();
    const paginas: number[] = [];
    const rango = 2;
    let inicio = Math.max(1, this.paginaActual - rango);
    let fin = Math.min(total, this.paginaActual + rango);
    if (fin - inicio < rango * 2) {
      if (inicio === 1) fin = Math.min(total, inicio + rango * 2);
      else if (fin === total) inicio = Math.max(1, fin - rango * 2);
    }
    for (let i = inicio; i <= fin; i++) paginas.push(i);
    return paginas;
  }

  getColorStatus(status: string): string {
    switch (status?.toUpperCase()) {
      case 'EJECUTADO':
      case 'COMPLETADO':
        return 'bg-green-100 text-green-800';
      case 'PENDIENTE':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELADO':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getIconoStatus(status: string): string {
    switch (status?.toUpperCase()) {
      case 'EJECUTADO':
      case 'COMPLETADO':
        return 'fas fa-check-circle';
      case 'PENDIENTE':
        return 'fas fa-clock';
      case 'CANCELADO':
        return 'fas fa-times-circle';
      default:
        return 'fas fa-question-circle';
    }
  }

  editarRegistro(registro: RegistroHistorico): void {
    console.log('Editar registro:', registro);
    alert('Funcionalidad de edición en desarrollo');
  }

  abrirDetalleAlimento(registro: RegistroHistorico): void {
    const mismos = this.registrosHistoricos.filter(r => this.esMismoLote(r, registro) && this.esMismaFecha(r, registro));
    const maniana = mismos.filter(r => this.getJornada(r) === 'Mañana');
    const mapa = new Map<string, number>();
    maniana.forEach(r => {
      const p = this.parseProductoDesdeObservaciones(r.observaciones || '');
      const nombre = (p.nombre || this.inferirProducto(r.observaciones || '') || '').trim();
      if (!this.esAlimento(nombre)) return;
      if (!nombre) return;
      const totalActual = mapa.get(nombre) || 0;
      mapa.set(nombre, totalActual + (r.cantidadAplicada || 0));
    });
    this.detalleAlimentos = Array.from(mapa.entries()).map(([nombre, total]) => ({ nombre, total })).sort((a, b) => a.nombre.localeCompare(b.nombre));
    this.mostrarDetalleAlimento = true;
  }

  cerrarDetalleAlimento(): void {
    this.mostrarDetalleAlimento = false;
    this.detalleAlimentos = [];
  }

  getTotalManiana(base: RegistroHistorico): number {
    const mismos = this.registrosHistoricos.filter(r => this.esMismoLote(r, base) && this.esMismaFecha(r, base));
    const maniana = mismos.filter(r => this.getJornada(r) === 'Mañana');
    let total = 0;
    maniana.forEach(r => {
      const p = this.parseProductoDesdeObservaciones(r.observaciones || '');
      const nombre = (p.nombre || this.inferirProducto(r.observaciones || '') || '').trim();
      if (!this.esAlimento(nombre)) return;
      total += r.cantidadAplicada || 0;
    });
    return Number(total.toFixed(2));
  }

  getVivosDelDia(base: RegistroHistorico): number | undefined {
    const mismos = this.registrosHistoricos.filter(r => this.esMismoLote(r, base) && this.esMismaFecha(r, base));
    const maniana = mismos.filter(r => this.getJornada(r) === 'Mañana');
    const fuente = maniana.find(r => r.animalesVivos !== undefined) || mismos.find(r => r.animalesVivos !== undefined) ||
      maniana.find(r => this.parseAnimales(r.observaciones || '').vivos !== undefined) || mismos.find(r => this.parseAnimales(r.observaciones || '').vivos !== undefined);
    if (!fuente) return undefined;
    const parsed = this.parseAnimales(fuente.observaciones || '');
    return fuente.animalesVivos ?? parsed.vivos ?? undefined;
  }

  getMuertosDelDia(base: RegistroHistorico): number | undefined {
    const mismos = this.registrosHistoricos.filter(r => this.esMismoLote(r, base) && this.esMismaFecha(r, base));
    const maniana = mismos.filter(r => this.getJornada(r) === 'Mañana');
    const fuente = maniana.find(r => r.animalesMuertos !== undefined) || mismos.find(r => r.animalesMuertos !== undefined) ||
      maniana.find(r => this.parseAnimales(r.observaciones || '').muertos !== undefined) || mismos.find(r => this.parseAnimales(r.observaciones || '').muertos !== undefined);
    if (!fuente) return 0;
    const parsed = this.parseAnimales(fuente.observaciones || '');
    return fuente.animalesMuertos ?? parsed.muertos ?? 0;
  }

  getEtiquetaTipoConsumo(registro: any): string {
    const obs = (registro?.observaciones || '').toLowerCase();
    if (obs.includes('vitam')) return 'Vitaminas';
    if (obs.includes('insumo') || obs.includes('medic') || obs.includes('antibi')) return 'Insumo';
    return 'Alimento';
  }

  getIconoTipoConsumo(registro: any): string {
    const label = this.getEtiquetaTipoConsumo(registro);
    if (label === 'Vitaminas') return 'fas fa-capsules text-purple-600';
    if (label === 'Insumo') return 'fas fa-box-open text-amber-600';
    return 'fas fa-seedling text-green-600';
  }

  verDetalles(registro: RegistroHistorico): void {
    const normalizado = this.normalizarRegistroConLote(registro);
    this.registroSeleccionado = normalizado;
    this.productosConsumidos = [];
    this.mostrarModalDetalles = true;
    
    // Obtener el loteId real (UUID) para consultar consumos
    const loteIdParaConsulta = normalizado.loteId || registro.loteId;
    
    if (!loteIdParaConsulta || loteIdParaConsulta === 'LOT-MANUAL' || loteIdParaConsulta === 'N/A') {
      console.log('[Histórico] No hay loteId válido para consultar consumos');
      return;
    }
    
    // Obtener la fecha/hora de creación completa para filtrar solo los productos de ESTE registro
    const fechaHoraCreacion = normalizado.fechaCreacion || registro.fechaCreacion;
    console.log('[Histórico] Consultando productos consumidos para lote:', loteIdParaConsulta, 'fechaHora:', fechaHoraCreacion);
    
    // Consultar productos consumidos desde el backend (tabla movimientos_inventario_producto)
    // Enviamos la fecha/hora completa para obtener SOLO los productos de este registro específico
    this.inventarioService.obtenerConsumosDetallePorLote(loteIdParaConsulta, fechaHoraCreacion).subscribe({
      next: (productos: ProductoConsumido[]) => {
        console.log('[Histórico] Productos consumidos recibidos:', productos);
        
        if (productos && productos.length > 0) {
          this.productosConsumidos = productos.map(p => ({
            nombre: p.nombre,
            cantidad: Number((p.cantidad || 0).toFixed(2))
          }));
        } else {
          console.log('[Histórico] No se encontraron productos consumidos en el inventario para fecha:', fechaHoraCreacion);
          // Fallback: Intentar parsear de observaciones
          this.intentarParsearProductosDeObservaciones(normalizado);
        }
      },
      error: (err) => {
        console.error('[Histórico] Error consultando productos consumidos:', err);
        // Fallback: Intentar parsear de observaciones
        this.intentarParsearProductosDeObservaciones(normalizado);
      }
    });
  }
  
  private intentarParsearProductosDeObservaciones(registro: RegistroHistorico): void {
    // Fallback: Intentar parsear producto de observaciones
    const propio = this.parseProductoDesdeObservaciones(registro.observaciones || '');
    if (propio?.nombre && this.esAlimento(propio.nombre)) {
      this.productosConsumidos = [{
        nombre: propio.nombre.trim(),
        cantidad: propio.total ?? Number((registro.cantidadAplicada || 0).toFixed(3)),
        porAnimal: propio.porAnimal
      }];
    }
  }

  // Calcular la suma de los productos consumidos para mostrar en el modal
  getTotalProductosConsumidos(): number {
    if (!this.productosConsumidos || this.productosConsumidos.length === 0) {
      return this.registroSeleccionado?.cantidadAplicada || 0;
    }
    return this.productosConsumidos.reduce((sum, p) => sum + (p.cantidad || 0), 0);
  }

  getJornada(registro: any): string {
    const f = registro?.fechaCreacion || registro?.fecha;
    const d = f ? new Date(f) : new Date();
    const h = d.getHours();
    return h < 12 ? 'Mañana' : 'Tarde';
  }

  eliminarRegistro(registro: any): void {
    const confirmacion = confirm(`⚠️ ¿Estás seguro de eliminar el registro #${registro.id}?\n\nEsta acción NO se puede deshacer.`);
    if (!confirmacion) return;
    const motivoEliminacion = prompt('Motivo de la eliminación:', 'Registro erróneo');
    if (!motivoEliminacion) {
      alert('❌ Debes proporcionar un motivo para la eliminación');
      return;
    }
    this.eliminarRegistroDelSistema(registro.id, motivoEliminacion);
  }

  private eliminarRegistroDelSistema(registroId: number, motivo: string): void {
    console.log('🗑️ Eliminando registro:', { registroId, motivo });
    const index = this.registrosHistoricos.findIndex(r => r.id === registroId);
    if (index !== -1) {
      this.registrosHistoricos.splice(index, 1);
      alert('✅ Registro eliminado correctamente');
      this.cargarDatosHistoricos();
    }
  }
}
