import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { CostosSanidadService } from '../inventario/services/costos-sanidad.service';
import { AnalisisInventarioService, InventarioAnalisis } from '../../shared/services/analisis-inventario.service';

@Component({
  selector: 'app-analisis-financiero',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './analisis-financiero.component.html'
})
export class AnalisisFinancieroComponent implements OnInit {
  especieSeleccionada: 1 | 2 = 1; // 1 = Pollos, 2 = Chanchos
  analisisPollos: InventarioAnalisis | null = null;
  analisisChanchos: InventarioAnalisis | null = null;
  analisisActual: InventarioAnalisis | null = null;
  cargando = false;
  sortKey: 'lote' | 'pollosVivos' | 'pollosMuertos' | 'vendidos' | 'ingresosTotal' | 'costoTotalLote' | 'costoPorPollo' | 'rendimiento' | 'rentabilidad' = 'lote';
  sortDir: 'asc' | 'desc' = 'asc';
  mortalidadEstimadaPct: number = 2; // % por defecto (editable en UI)
  filtroCodigo: string = '';
  modoTablaAlimentos: 'horizontal' | 'vertical' = 'horizontal';
  expanded: Record<string, boolean> = {};
  autoSwitchLoteThreshold = 12;
  // ===== Sanidad y Cuidado Animal =====
  sanidadRegistros: any[] = [];
  sanidadResumen: Array<{ concepto: string; detalle: string; costo: number }>= [];
  sanidadPorLote: Array<{ loteId: string; loteCodigo: string; vacunas: number; antibVit: number; material: number; servicios: number; total: number; costoPorAnimal: number }>= [];
  sanidadDetalleAbierto = false;
  conceptoDetalle: string | null = null;
  sanidadTab: 'registros' | 'lotes' = 'registros';
  // ===== Detalle Costo Inicial =====
  costoInicialDetalleAbierto = false;
  loteCostoInicialDetalle: any | null = null;

  constructor(private analisisService: AnalisisInventarioService, private cSanidad: CostosSanidadService) {}

  ngOnInit(): void {
    this.cargarAnalisisEspecies();
  }

  // ===== SANIDAD: Carga y agregaciones =====
  private cargarSanidad(): void {
    const lotesActuales = (this.analisisActual?.analisisPorLote || []).map(l => String(l?.lote?.id || ''));
    if (lotesActuales.length === 0) {
      this.sanidadRegistros = [];
      this.sanidadResumen = [];
      this.sanidadPorLote = [];
      return;
    }
    this.cSanidad.listar().subscribe({
      next: (rows) => {
        // Filtrar solo los registros de los lotes visibles en la especie actual
        const filtrados = (rows || []).filter(r => lotesActuales.includes(String(r?.lote?.id || r?.loteId || '')));
        this.sanidadRegistros = filtrados;
        this.sanidadResumen = this.calcularResumenSanidad(filtrados);
        this.sanidadPorLote = this.calcularSanidadPorLote(filtrados);
      },
      error: () => {
        this.sanidadRegistros = [];
        this.sanidadResumen = [];
        this.sanidadPorLote = [];
      }
    });
  }

  private categoriaSanidad(nombre: string): 'Vacunas' | 'Antibióticos y vitaminas' | 'Material sanitario' | 'Servicios veterinarios' {
    const s = (nombre || '').toLowerCase();
    if (s.includes('vacun')) return 'Vacunas';
    if (s.includes('veterin')) return 'Servicios veterinarios';
    if (s.includes('jering') || s.includes('guant') || s.includes('material') || s.includes('kit') || s.includes('insumo') || s.includes('algod') || s.includes('alcohol')) return 'Material sanitario';
    if (s.includes('antib') || s.includes('medic') || s.includes('vitamin')) return 'Antibióticos y vitaminas';
    return 'Antibióticos y vitaminas';
  }

  private calcularResumenSanidad(rows: any[]): Array<{ concepto: string; detalle: string; costo: number }>{
    const map = new Map<string, number>();
    for (const r of rows) {
      const cat = this.categoriaSanidad(r?.nombreGasto || '');
      const total = Number(r?.total ?? (Number(r?.cantidad || 0) * Number(r?.costoUnitario || 0)));
      const prev = map.get(cat) || 0;
      map.set(cat, prev + (isNaN(total) ? 0 : total));
    }
    const detallePorConcepto: Record<string, string> = {
      'Vacunas': 'Aplicadas según el plan sanitario',
      'Antibióticos y vitaminas': 'Por lote',
      'Material sanitario': 'Jeringas y guantes',
      'Servicios veterinarios': 'Consultas o asistencia'
    };
    const res: Array<{ concepto: string; detalle: string; costo: number }> = [];
    ['Vacunas','Antibióticos y vitaminas','Material sanitario','Servicios veterinarios'].forEach(c => {
      const v = Math.round((map.get(c) || 0) * 100) / 100;
      res.push({ concepto: c, detalle: detallePorConcepto[c] || '', costo: v });
    });
    return res;
  }

  private calcularSanidadPorLote(rows: any[]): Array<{ loteId: string; loteCodigo: string; vacunas: number; antibVit: number; material: number; servicios: number; total: number; costoPorAnimal: number }>{
    const lotes = this.getLotesActuales();
    const vivosPorLote = new Map<string, number>();
    const codigoPorLote = new Map<string, string>();
    lotes.forEach(l => {
      const id = String(l?.lote?.id || '');
      vivosPorLote.set(id, Number(l?.pollosVivos || 0));
      codigoPorLote.set(id, this.codigoLote(l));
    });
    const map: Record<string, { vacunas: number; antibVit: number; material: number; servicios: number }>= {} as any;
    for (const r of rows) {
      const lid = String(r?.lote?.id || r?.loteId || '');
      if (!map[lid]) map[lid] = { vacunas: 0, antibVit: 0, material: 0, servicios: 0 };
      const total = Number(r?.total ?? (Number(r?.cantidad || 0) * Number(r?.costoUnitario || 0)));
      const cat = this.categoriaSanidad(r?.nombreGasto || '');
      if (cat === 'Vacunas') map[lid].vacunas += isNaN(total) ? 0 : total;
      else if (cat === 'Servicios veterinarios') map[lid].servicios += isNaN(total) ? 0 : total;
      else if (cat === 'Material sanitario') map[lid].material += isNaN(total) ? 0 : total;
      else map[lid].antibVit += isNaN(total) ? 0 : total;
    }
    const res: Array<{ loteId: string; loteCodigo: string; vacunas: number; antibVit: number; material: number; servicios: number; total: number; costoPorAnimal: number }>= [];
    Object.keys(map).forEach(lid => {
      const d = map[lid];
      const total = d.vacunas + d.antibVit + d.material + d.servicios;
      const vivos = Number(vivosPorLote.get(lid) || 0);
      const costoPorAnimal = vivos > 0 ? Math.round((total / vivos) * 100) / 100 : 0;
      res.push({
        loteId: lid,
        loteCodigo: codigoPorLote.get(lid) || `Lote ${lid}`,
        vacunas: Math.round(d.vacunas * 100) / 100,
        antibVit: Math.round(d.antibVit * 100) / 100,
        material: Math.round(d.material * 100) / 100,
        servicios: Math.round(d.servicios * 100) / 100,
        total: Math.round(total * 100) / 100,
        costoPorAnimal
      });
    });
    // Ordenar por código de lote
    return res.sort((a, b) => a.loteCodigo.localeCompare(b.loteCodigo));
  }

  abrirDetalle(concepto: string): void {
    this.conceptoDetalle = concepto;
    this.sanidadTab = 'registros';
    this.sanidadDetalleAbierto = true;
  }

  cerrarDetalle(): void {
    this.sanidadDetalleAbierto = false;
    this.conceptoDetalle = null;
  }

  getRegistrosSanidadPorConcepto(): any[] {
    if (!this.conceptoDetalle) return [];
    return (this.sanidadRegistros || []).filter(r => this.categoriaSanidad(r?.nombreGasto || '') === this.conceptoDetalle);
  }

  getSanidadPorLotePorConcepto(): Array<{ loteCodigo: string; total: number; costoPorAnimal: number }>{
    if (!this.conceptoDetalle) return [];
    const lotes = this.getLotesActuales();
    const vivosPorLote = new Map<string, number>();
    const codigoPorLote = new Map<string, string>();
    lotes.forEach(l => {
      const id = String(l?.lote?.id || '');
      vivosPorLote.set(id, Number(l?.pollosVivos || 0));
      codigoPorLote.set(id, this.codigoLote(l));
    });
    const map = new Map<string, number>();
    for (const r of (this.sanidadRegistros || [])) {
      const cat = this.categoriaSanidad(r?.nombreGasto || '');
      if (cat !== this.conceptoDetalle) continue;
      const lid = String(r?.lote?.id || r?.loteId || '');
      const total = Number(r?.total ?? (Number(r?.cantidad || 0) * Number(r?.costoUnitario || 0)));
      const prev = map.get(lid) || 0;
      map.set(lid, prev + (isNaN(total) ? 0 : total));
    }
    const res: Array<{ loteCodigo: string; total: number; costoPorAnimal: number }> = [];
    map.forEach((total, lid) => {
      const vivos = Number(vivosPorLote.get(lid) || 0);
      res.push({
        loteCodigo: codigoPorLote.get(lid) || `Lote ${lid}`,
        total: Math.round(total * 100) / 100,
        costoPorAnimal: vivos > 0 ? Math.round((total / vivos) * 100) / 100 : 0
      });
    });
    return res.sort((a, b) => a.loteCodigo.localeCompare(b.loteCodigo));
  }

  cargarAnalisisEspecies(): void {
    this.cargando = true;
    forkJoin([
      this.analisisService.getAnalisisInventario(1),
      this.analisisService.getAnalisisInventario(2)
    ]).subscribe({
      next: ([pollos, chanchos]) => {
        this.analisisPollos = pollos;
        this.analisisChanchos = chanchos;
        this.setAnalisisActual();
        this.cargarSanidad();
        this.cargando = false;
      },
      error: () => {
        this.analisisPollos = null;
        this.analisisChanchos = null;
        this.analisisActual = null;
        this.cargando = false;
      }
    });
  }

  // ===== Cálculos de Costo Inicial del Animal =====
  private baseAnimales(row: any): number {
    const qOrig = Number(row?.lote?.quantityOriginal ?? 0);
    if (qOrig && qOrig > 0) return qOrig;
    const vivos = Number(row?.pollosVivos ?? 0);
    const vend = Number(row?.vendidos ?? 0);
    const muertos = Number(row?.pollosMuertos ?? 0);
    return vivos + vend + muertos;
  }

  private precioUnitario(row: any): number {
    const total = Number(row?.lote?.cost ?? 0);
    const base = this.baseAnimales(row);
    if (base > 0) return Math.round((total / base) * 100) / 100;
    return 0;
  }

  getCostoTotalCompra(row: any): number {
    return Math.round((Number(row?.lote?.cost ?? 0)) * 100) / 100;
  }

  getMortalidadEstimadaCantidad(row: any): number {
    const muertos = Number(row?.pollosMuertos ?? 0);
    if (!isNaN(muertos) && muertos > 0) return muertos;
    const base = this.baseAnimales(row);
    const pct = Number(this.mortalidadEstimadaPct || 0) / 100;
    return Math.round(base * pct);
  }

  getAnimalesViables(row: any): number {
    return Number(row?.pollosVivos ?? row?.lote?.quantity ?? 0) || 0;
  }

  getCostoRealUnitarioVivo(row: any): number {
    const vivos = this.getAnimalesViables(row);
    if (vivos <= 0) return 0;
    return Math.round((this.getCostoTotalCompra(row) / vivos) * 100) / 100;
  }

  getDiferenciaUnitario(row: any): number {
    return Math.round((this.getCostoRealUnitarioVivo(row) - this.precioUnitario(row)) * 100) / 100;
  }

  // Expuesto para el template: precio unitario de compra
  getPrecioUnitarioCompra(row: any): number {
    return this.precioUnitario(row);
  }

  getLotesActuales(): any[] {
    return this.analisisActual?.analisisPorLote || [];
  }

  getLotesOrdenados(): any[] {
    const arr = this.getLotesActuales();
    return [...arr].sort((a: any, b: any) => this.codigoLote(a).localeCompare(this.codigoLote(b)));
  }

  codigoLote(row: any): string {
    const cod = (row?.lote?.codigo || '').toString().trim();
    if (cod) return cod;
    const id = (row?.lote?.id || '').toString();
    return id ? `Lote ${id}` : 'Lote';
  }

  toggleDetalle(row: any): void {
    const key = (row?.lote?.id ?? this.codigoLote(row));
    const k = String(key);
    this.expanded[k] = !this.expanded[k];
  }

  getTiposAlimento(): string[] {
    const set = new Set<string>();
    for (const row of this.getLotesActuales()) {
      const det = row?.detalleAlimentos || [];
      for (const d of det) set.add(d.typeFood);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  getUnidadPorTipo(tipo: string): string {
    for (const row of this.getLotesActuales()) {
      const d = (row?.detalleAlimentos || []).find((x: any) => x.typeFood === tipo);
      if (d?.unidad) return d.unidad;
    }
    return 'kg';
  }

  getPrecioUnitarioPromedioPorTipo(tipo: string): number {
    let c = 0; let q = 0;
    for (const row of this.getLotesActuales()) {
      const d = (row?.detalleAlimentos || []).find((x: any) => x.typeFood === tipo);
      if (d && d.consumoKg > 0) { c += Number(d.costoParcial || 0); q += Number(d.consumoKg || 0); }
    }
    if (q <= 0) return 0;
    return Math.round((c / q) * 100) / 100;
  }

  getConsumoPorTipo(row: any, tipo: string): number {
    const d = (row?.detalleAlimentos || []).find((x: any) => x.typeFood === tipo);
    return Number(d?.consumoKg || 0);
  }

  getCostoParcialPorTipo(row: any, tipo: string): number {
    const d = (row?.detalleAlimentos || []).find((x: any) => x.typeFood === tipo);
    return Math.round(Number(d?.costoParcial || 0) * 100) / 100;
  }

  getTotalGeneralPorTipoCosto(tipo: string): number {
    let s = 0;
    for (const row of this.getLotesActuales()) s += this.getCostoParcialPorTipo(row, tipo);
    return Math.round(s * 100) / 100;
  }

  getCostoTotalAlimentacionPorLote(row: any): number {
    const det = row?.detalleAlimentos || [];
    if (det.length === 0) return Math.round(Number(row?.costos?.alimentacion || row?.costoTotalLote || 0) * 100) / 100;
    const s = det.reduce((acc: number, d: any) => acc + Number(d?.costoParcial || 0), 0);
    return Math.round(s * 100) / 100;
  }

  getPromedioCostoPorAnimal(): number {
    const lotes = this.getLotesActuales();
    let totalCosto = 0; let totalViables = 0;
    for (const row of lotes) {
      const vivos = this.getAnimalesViables(row);
      totalViables += vivos;
      totalCosto += this.getCostoTotalAlimentacionPorLote(row);
    }
    if (totalViables <= 0) return 0;
    return Math.round((totalCosto / totalViables) * 100) / 100;
  }

  // Accesores públicos para la tabla de costo por animal
  getAnimalesIniciales(row: any): number {
    return this.baseAnimales(row);
  }

  getCostoPorAnimal(row: any): number {
    const vivos = this.getAnimalesViables(row);
    if (vivos <= 0) return 0;
    return Math.round((this.getCostoTotalAlimentacionPorLote(row) / vivos) * 100) / 100;
  }

  getConsumoTotalAlimentacionKgPorLote(row: any): number {
    const det = row?.detalleAlimentos || [];
    if (det.length === 0) return Number(row?.consumoTotalKg || 0);
    const s = det.reduce((acc: number, d: any) => acc + Number(d?.consumoKg || 0), 0);
    return Math.round(s * 100) / 100;
  }

  getCostoTotalAlimentacionGeneral(): number {
    const lotes = this.getLotesActuales();
    let total = 0;
    for (const l of lotes) {
      total += this.getCostoTotalAlimentacionPorLote(l);
    }
    return Math.round(total * 100) / 100;
  }

  refrescar(): void {
    this.cargarAnalisisEspecies();
  }

  onEspecieChange(id: 1 | 2): void {
    this.especieSeleccionada = id;
    this.setAnalisisActual();
    this.cargarSanidad();
  }

  private setAnalisisActual(): void {
    this.analisisActual = this.especieSeleccionada === 1 ? this.analisisPollos : this.analisisChanchos;
    // Auto switch de modo según cantidad de lotes
    const n = this.getLotesActuales().length;
    this.modoTablaAlimentos = n > this.autoSwitchLoteThreshold ? 'vertical' : 'horizontal';
  }

  formatearNumero(n: number | null | undefined): string {
    const v = Number(n ?? 0);
    return v.toLocaleString('es-ES', { maximumFractionDigits: 2 });
  }

  ordenarPor(key: 'lote' | 'pollosVivos' | 'pollosMuertos' | 'vendidos' | 'ingresosTotal' | 'costoTotalLote' | 'costoPorPollo' | 'rendimiento' | 'rentabilidad'): void {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
  }

  getPorLoteOrdenado(): any[] {
    let lista = this.analisisActual?.analisisPorLote || [];
    const term = (this.filtroCodigo || '').trim().toLowerCase();
    if (term) {
      lista = lista.filter((row: any) => {
        const code = (row?.lote?.codigo || row?.lote?.id || '').toString().toLowerCase();
        return code.includes(term);
      });
    }
    const dir = this.sortDir === 'asc' ? 1 : -1;
    return [...lista].sort((a: any, b: any) => {
      let va: any;
      let vb: any;
      if (this.sortKey === 'lote') {
        va = a?.lote?.codigo || a?.lote?.id || '';
        vb = b?.lote?.codigo || b?.lote?.id || '';
      } else {
        va = a?.[this.sortKey] ?? 0;
        vb = b?.[this.sortKey] ?? 0;
      }
      if (typeof va === 'string' && typeof vb === 'string') {
        return va.localeCompare(vb) * dir;
      }
      const na = Number(va);
      const nb = Number(vb);
      if (isNaN(na) && isNaN(nb)) return 0;
      if (isNaN(na)) return -1 * dir;
      if (isNaN(nb)) return 1 * dir;
      return (na - nb) * dir;
    });
  }

  // ===== SANIDAD: total general del resumen
  getTotalSanidad(): number {
    const total = (this.sanidadResumen || []).reduce((acc, r) => acc + Number(r?.costo || 0), 0);
    return Math.round(total * 100) / 100;
  }

  // ===== Helpers Costo Inicial del Animal (resumen principal) =====
  getAnimalesBaseTotales(): number {
    const lotes = this.getLotesActuales();
    let s = 0;
    for (const row of lotes) s += this.baseAnimales(row);
    return s;
  }

  getCostoInicialTotalCompraGeneral(): number {
    const lotes = this.getLotesActuales();
    let s = 0;
    for (const row of lotes) s += this.getCostoTotalCompra(row);
    return Math.round(s * 100) / 100;
  }

  getMortalidadEstimadaTotal(): number {
    const base = this.getAnimalesBaseTotales();
    const pct = Number(this.mortalidadEstimadaPct || 0) / 100;
    return Math.round(base * pct);
  }

  getAnimalesViablesTotales(): number {
    const lotes = this.getLotesActuales();
    let s = 0;
    for (const row of lotes) s += this.getAnimalesViables(row);
    return s;
  }

  getPrecioUnitarioCompraPromedio(): number {
    const base = this.getAnimalesBaseTotales();
    const total = this.getCostoInicialTotalCompraGeneral();
    if (base <= 0) return 0;
    return Math.round((total / base) * 100) / 100;
  }

  getCostoUnitarioViableGeneral(): number {
    const vivos = this.getAnimalesViablesTotales();
    const total = this.getCostoInicialTotalCompraGeneral();
    if (vivos <= 0) return 0;
    return Math.round((total / vivos) * 100) / 100;
  }

  abrirDetalleCostoInicial(row: any): void {
    this.loteCostoInicialDetalle = row;
    this.costoInicialDetalleAbierto = true;
  }
  cerrarDetalleCostoInicial(): void {
    this.costoInicialDetalleAbierto = false;
    this.loteCostoInicialDetalle = null;
  }

  getTipoAnimalDeRow(row: any): string {
    return row?.lote?.race?.animal?.name || '-';
  }
}
