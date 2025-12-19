import { Component, OnInit } from '@angular/core';
import { AuthDirectService } from '../../core/services/auth-direct.service';
import { User } from '../../shared/models/user.model';
import { AlimentacionService, PlanEjecucionHistorial, EstadisticasLoteHistorial, ResumenHistorialGeneral } from '../pollos/services/alimentacion.service';
import { Lote } from '../lotes/interfaces/lote.interface';
import { LoteService } from '../lotes/services/lote.service';
import { InventarioService, ProductoConsumido } from '../pollos/services/inventario.service';

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
  selector: 'app-chanchos-historico',
  templateUrl: './chanchos-historico.component.html',
  styleUrls: ['./chanchos-historico.component.scss']
})
export class ChanchosHistoricoComponent implements OnInit {
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
  fechaInicio = '';
  fechaFin = '';
  paginaActual = 1;
  itemsPorPagina = 20;
  vistaActual: 'registros' | 'estadisticas' = 'registros';
  lotesChanchos: Lote[] = [];
  mostrarDetalleAlimento = false;
  detalleAlimentos: { nombre: string; total: number }[] = [];

  // Variables para el modal de detalles
  mostrarModalDetalles = false;
  registroSeleccionado: RegistroHistorico | null = null;
  productosConsumidos: { nombre: string; cantidad: number; porAnimal?: number }[] = [];

  // Opciones de visualización
  stickyHeader = false;
  modoCompacto = false;

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
    this.cargarDatosHistoricos();
    this.cargarLotesChanchos();
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

    this.alimentacionService.getHistorialConRango(this.fechaInicio, this.fechaFin)
      .subscribe({
        next: (registros) => {
          this.procesarRegistrosDelBackend(registros);
          this.enriquecerRegistrosConLote();
          this.cargandoRegistros = false;
        },
        error: () => {
          this.errorCarga = 'Error al cargar los registros del historial';
          this.cargandoRegistros = false;
          this.cargarDatosDeEjemplo();
        }
      });

    this.alimentacionService.getEstadisticasPorLote()
      .subscribe({
        next: (estadisticas) => {
          this.procesarEstadisticasDelBackend(estadisticas);
          this.cargandoEstadisticas = false;
        },
        error: () => {
          this.cargandoEstadisticas = false;
        }
      });

    this.alimentacionService.getResumenHistorialGeneral()
      .subscribe({
        next: (resumen) => {
          this.resumenGeneral = resumen;
        },
        error: () => {}
      });
  }

  procesarRegistrosDelBackend(registros: PlanEjecucionHistorial[]): void {
    this.registrosHistoricos = registros.map(registro => {
      const m: RegistroHistorico = {
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
      };

      const a = this.parseAnimales(m.observaciones);
      if (a.vivos != null && (m.animalesVivos == null || isNaN(m.animalesVivos as any))) m.animalesVivos = a.vivos;
      if (a.muertos != null && (m.animalesMuertos == null || isNaN(m.animalesMuertos as any))) m.animalesMuertos = a.muertos;

      if ((!m.loteId || m.loteId === 'LOT-MANUAL' || m.codigoLote === 'MANUAL')) {
        const lid = this.parseLoteDesdeObservaciones(m.observaciones);
        if (lid) m.loteId = lid;
      }
      return m;
    });

    this.generarEstadisticasPorLote();
  }

  private cargarLotesChanchos(): void {
    this.loteService.getLotes().subscribe({
      next: (lotes) => {
        try {
          this.lotesChanchos = lotes.filter(l => (l.race?.animal?.name || '').toLowerCase().includes('chancho') || (l.race?.animal?.name || '').toLowerCase().includes('cerdo'));
        } catch {
          this.lotesChanchos = lotes.filter(l => (l.race?.animal?.name || '').toLowerCase().includes('cerdo'));
        }
        this.enriquecerRegistrosConLote();
      },
      error: () => {}
    });
  }

  private enriquecerRegistrosConLote(): void {
    if (!this.registrosHistoricos?.length || !this.lotesChanchos?.length) return;
    const enriquecidos: RegistroHistorico[] = [];
    this.registrosHistoricos.forEach(r => {
      const rid = String(r.loteId || '');
      const rcod = String(r.codigoLote || '');
      const digRid = (rid.match(/\d+/g) || []).join('');
      const digCod = (rcod.match(/\d+/g) || []).join('');
      let lote = this.lotesChanchos.find(l => {
        const lc = String(l.codigo || '');
        const digLc = (lc.match(/\d+/g) || []).join('');
        if (String(l.id) === rid || lc === rcod) return true;
        if (digLc) {
          if (digLc === digRid || digLc === digCod) return true;
          const nLc = parseInt(digLc, 10);
          const nRid = digRid ? parseInt(digRid, 10) : NaN;
          const nCod = digCod ? parseInt(digCod, 10) : NaN;
          if (!isNaN(nLc) && (!isNaN(nRid) && nLc === nRid || !isNaN(nCod) && nLc === nCod)) return true;
          if (digRid && (digRid.endsWith(digLc) || digLc.endsWith(digRid))) return true;
          if (digCod && (digCod.endsWith(digLc) || digLc.endsWith(digCod))) return true;
        }
        return false;
      });
      if (!lote) {
        const lidObs = this.parseLoteDesdeObservaciones(r.observaciones || '');
        const dObs = (String(lidObs || '').match(/\d+/g) || []).join('');
        lote = this.lotesChanchos.find(l => {
          const lc = String(l.codigo || '');
          const digLc = (lc.match(/\d+/g) || []).join('');
          if (String(l.id) === lidObs || lc === lidObs) return true;
          if (dObs && digLc) {
            if (digLc === dObs) return true;
            const nLc = parseInt(digLc, 10);
            const nObs = parseInt(dObs, 10);
            if (!isNaN(nLc) && !isNaN(nObs) && nLc === nObs) return true;
            if (dObs.endsWith(digLc) || digLc.endsWith(dObs)) return true;
          }
          return false;
        });
        if (lote && (!r.loteId || r.loteId === 'LOT-MANUAL')) r.loteId = String(lote.id);
      }
      if (lote) {
        enriquecidos.push({ ...r, loteDescripcion: lote.name, codigoLote: lote.codigo || r.codigoLote });
      }
    });
    this.registrosHistoricos = enriquecidos;
  }

  private obtenerLoteIdPreferido(r: RegistroHistorico): string | null {
    const lid = (r?.loteId || '').trim();
    if (lid && lid !== 'LOT-MANUAL' && lid !== 'MANUAL' && lid !== 'N/A') return lid;
    const obs = r?.observaciones || '';
    const code = this.parseCodigoLoteDesdeObservaciones(obs);
    if (code) return code;
    const parsed = this.parseLoteDesdeObservaciones(obs) || '';
    return parsed || null;
  }

  private resolverLoteDesdeIdOCodigo(idOCodigo?: string | null): Lote | undefined {
    const key = (idOCodigo || '').trim();
    if (!key) return undefined;
    let lote = this.lotesChanchos.find(l => String(l.id) === key || (l.codigo || '') === key);
    if (lote) return lote;
    const cleanKey = this.sanitizeKey(key);
    lote = this.lotesChanchos.find(l => {
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

  private intentarParsearProductosDeObservaciones(registro: RegistroHistorico): void {
    const propio = this.parseProductoDesdeObservaciones(registro.observaciones || '');
    if (propio?.nombre && this.esAlimento(propio.nombre)) {
      this.productosConsumidos = [{
        nombre: propio.nombre.trim(),
        cantidad: propio.total ?? Number((registro.cantidadAplicada || 0).toFixed(3)),
        porAnimal: propio.porAnimal
      }];
    }
  }

  private parsePesoPromedio(obs: string): number | undefined {
    const o = obs || '';
    const m = /peso\s*animal\s*promedio:\s*([0-9]+(?:[.,][0-9]+)?)\s*kg/i.exec(o);
    if (m && m[1]) return parseFloat(m[1].replace(',', '.'));
    return undefined;
  }

  getPesoPromedio(registro: RegistroHistorico): number | undefined {
    const p = this.parsePesoPromedio(registro?.observaciones || '');
    if (p == null || isNaN(p as any)) return undefined;
    return Number(p.toFixed(2));
  }

  private esMismaFecha(a: RegistroHistorico, b: RegistroHistorico): boolean {
    return (a?.fecha || '').slice(0, 10) === (b?.fecha || '').slice(0, 10);
  }

  private esMismoLote(a: RegistroHistorico, b: RegistroHistorico): boolean {
    return String(a?.loteId || '') === String(b?.loteId || '');
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
    const fuente = (maniana.find(r => r.animalesVivos !== undefined)
      || mismos.find(r => r.animalesVivos !== undefined)
      || maniana.find(r => this.parseAnimales(r.observaciones || '').vivos !== undefined)
      || mismos.find(r => this.parseAnimales(r.observaciones || '').vivos !== undefined));
    if (!fuente) return undefined;
    const parsed = this.parseAnimales(fuente.observaciones || '');
    return fuente.animalesVivos ?? parsed.vivos ?? undefined;
  }

  getMuertosDelDia(base: RegistroHistorico): number | undefined {
    const mismos = this.registrosHistoricos.filter(r => this.esMismoLote(r, base) && this.esMismaFecha(r, base));
    const maniana = mismos.filter(r => this.getJornada(r) === 'Mañana');
    const fuente = (maniana.find(r => r.animalesMuertos !== undefined)
      || mismos.find(r => r.animalesMuertos !== undefined)
      || maniana.find(r => this.parseAnimales(r.observaciones || '').muertos !== undefined)
      || mismos.find(r => this.parseAnimales(r.observaciones || '').muertos !== undefined));
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

  getJornada(registro: any): string {
    const f = registro?.fechaCreacion || registro?.fecha;
    const d = f ? new Date(f) : new Date();
    const h = d.getHours();
    return h < 12 ? 'Mañana' : 'Tarde';
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
        diasActivos: diasActivos
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
    this.registrosHistoricos = [
      { id: 1, fecha: '2024-12-01', loteId: '1', codigoLote: 'CH-001', loteDescripcion: 'Lote de Cerdos - Ejemplo', cantidadAplicada: 5.2, animalesVivos: 15, animalesMuertos: 1, observaciones: 'Registro normal', status: 'EJECUTADO', dayNumber: 5, fechaCreacion: '2024-12-01T08:00:00' },
      { id: 2, fecha: '2024-12-02', loteId: '1', codigoLote: 'CH-001', loteDescripcion: 'Lote de Cerdos - Ejemplo', cantidadAplicada: 5.0, animalesVivos: 15, animalesMuertos: 0, observaciones: 'Todo normal', status: 'EJECUTADO', dayNumber: 6, fechaCreacion: '2024-12-02T08:00:00' }
    ];
    this.generarEstadisticasPorLote();
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
    if (this.filtroStatus) {
      registrosFiltrados = registrosFiltrados.filter(registro => registro.status === this.filtroStatus);
    }
    if (this.filtroLote) {
      registrosFiltrados = registrosFiltrados.filter(registro => registro.loteId === this.filtroLote);
    }
    return registrosFiltrados.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
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

  cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina >= 1 && nuevaPagina <= this.getTotalPaginas()) {
      this.paginaActual = nuevaPagina;
    }
  }

  cambiarVista(vista: 'registros' | 'estadisticas'): void {
    this.vistaActual = vista;
    this.paginaActual = 1;
  }

  actualizarRangoFechas(): void {
    if (this.fechaInicio && this.fechaFin) {
      this.cargarDatosHistoricos();
      this.paginaActual = 1;
    }
  }

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

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  formatearFechaHora(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  getColorStatus(status: string): string {
    switch(status.toUpperCase()) {
      case 'EJECUTADO': return 'text-green-600 bg-green-100';
      case 'PENDIENTE': return 'text-yellow-600 bg-yellow-100';
      case 'OMITIDO': return 'text-red-600 bg-red-100';
      case 'CORREGIDO': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }

  getIconoStatus(status: string): string {
    switch(status.toUpperCase()) {
      case 'EJECUTADO': return 'fas fa-check-circle';
      case 'PENDIENTE': return 'fas fa-clock';
      case 'OMITIDO': return 'fas fa-times-circle';
      case 'CORREGIDO': return 'fas fa-edit';
      default: return 'fas fa-question-circle';
    }
  }

  exportarDatos(): void {
    alert('Función de exportación en desarrollo');
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.filtroFecha = '';
    this.filtroStatus = '';
    this.filtroLote = '';
    this.paginaActual = 1;
  }

  getLotesUnicos(): {loteId: string, codigoLote: string, loteDescripcion: string}[] {
    const lotesMap = new Map<string, {loteId: string, codigoLote: string, loteDescripcion: string}>();
    this.registrosHistoricos.forEach(registro => {
      if (registro.loteId && registro.loteId !== 'N/A') {
        if (!lotesMap.has(registro.loteId)) {
          lotesMap.set(registro.loteId, { loteId: registro.loteId, codigoLote: registro.codigoLote, loteDescripcion: registro.loteDescripcion });
        }
      }
    });
    return Array.from(lotesMap.values()).sort((a, b) => a.loteDescripcion.localeCompare(b.loteDescripcion));
  }

  getStatusUnicos(): string[] {
    return Array.from(new Set(this.registrosHistoricos.map(r => r.status))).filter(status => status).sort();
  }

  editarRegistro(registro: any): void {
    const confirmacion = confirm(`¿Deseas editar el registro #${registro.id}?`);
    if (!confirmacion) return;
    const cantidadActual = registro.cantidadAplicada || registro.cantidad || 0;
    const nuevaCantidad = prompt(`Cantidad actual: ${cantidadActual} kg\nIngresa la nueva cantidad:`, cantidadActual.toString());
    if (nuevaCantidad === null) return;
    const cantidadNumerica = parseFloat(nuevaCantidad);
    if (isNaN(cantidadNumerica) || cantidadNumerica <= 0) { alert('La cantidad debe ser un número válido mayor a 0'); return; }
    const nuevasObservaciones = prompt(`Observaciones actuales: ${registro.observaciones || 'Sin observaciones'}\nNuevas observaciones:`, registro.observaciones || '');
    if (nuevasObservaciones === null) return;
    const datosCorreccion = { registroId: registro.id, cantidadAnterior: cantidadActual, cantidadNueva: cantidadNumerica, observacionesAnteriores: registro.observaciones, observacionesNuevas: nuevasObservaciones, motivoCorreccion: prompt('Motivo de la corrección:', 'Corrección de datos') || 'Corrección de datos', usuarioCorreccion: this.user?.id || 0 };
    this.aplicarCorreccion(datosCorreccion);
  }

  eliminarRegistro(registro: any): void {
    const confirmacion = confirm(`¿Estás seguro de eliminar el registro #${registro.id}?\n\nEsta acción NO se puede deshacer.`);
    if (!confirmacion) return;
    const motivoEliminacion = prompt('Motivo de la eliminación:', 'Registro erróneo');
    if (!motivoEliminacion) { alert('Debes proporcionar un motivo para la eliminación'); return; }
    this.eliminarRegistroDelSistema(registro.id, motivoEliminacion);
  }

  verDetalles(registro: RegistroHistorico): void {
    const normalizado = this.normalizarRegistroConLote(registro);
    this.registroSeleccionado = normalizado;
    this.productosConsumidos = [];
    this.mostrarModalDetalles = true;
    
    const loteIdParaConsulta = normalizado.loteId || registro.loteId;
    
    if (!loteIdParaConsulta || loteIdParaConsulta === 'LOT-MANUAL' || loteIdParaConsulta === 'N/A') {
      console.log('[Chanchos Histórico] No hay loteId válido para consultar consumos');
      return;
    }
    
    const fechaHoraCreacion = normalizado.fechaCreacion || registro.fechaCreacion;
    console.log('[Chanchos Histórico] Consultando productos consumidos para lote:', loteIdParaConsulta, 'fechaHora:', fechaHoraCreacion);
    
    this.inventarioService.obtenerConsumosDetallePorLote(loteIdParaConsulta, fechaHoraCreacion).subscribe({
      next: (productos: ProductoConsumido[]) => {
        console.log('[Chanchos Histórico] Productos consumidos recibidos:', productos);
        
        if (productos && productos.length > 0) {
          this.productosConsumidos = productos.map(p => ({
            nombre: p.nombre,
            cantidad: Number((p.cantidad || 0).toFixed(2))
          }));
        } else {
          this.intentarParsearProductosDeObservaciones(normalizado);
        }
      },
      error: (err) => {
        console.error('[Chanchos Histórico] Error consultando productos consumidos:', err);
        this.intentarParsearProductosDeObservaciones(normalizado);
      }
    });
  }

  cerrarModalDetalles(): void {
    this.mostrarModalDetalles = false;
    this.registroSeleccionado = null;
    this.productosConsumidos = [];
  }

  getTotalProductosConsumidos(): number {
    if (!this.productosConsumidos || this.productosConsumidos.length === 0) {
      return this.registroSeleccionado?.cantidadAplicada || 0;
    }
    return this.productosConsumidos.reduce((sum, p) => sum + (p.cantidad || 0), 0);
  }

  private aplicarCorreccion(datosCorreccion: any): void {
    const registro = this.registrosHistoricos.find(r => r.id === datosCorreccion.registroId);
    if (registro) {
      registro.cantidadAplicada = datosCorreccion.cantidadNueva;
      registro.observaciones = datosCorreccion.observacionesNuevas;
      registro.fechaUltimaModificacion = new Date().toISOString();
      registro.usuarioUltimaModificacion = datosCorreccion.usuarioCorreccion;
      alert('Registro actualizado correctamente');
      this.cargarDatosHistoricos();
    }
  }

  private eliminarRegistroDelSistema(registroId: number, motivo: string): void {
    const index = this.registrosHistoricos.findIndex(r => r.id === registroId);
    if (index !== -1) {
      this.registrosHistoricos.splice(index, 1);
      alert('Registro eliminado correctamente');
      this.cargarDatosHistoricos();
    }
  }
}