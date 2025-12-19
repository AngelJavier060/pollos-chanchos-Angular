import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { CostosSanidadService } from '../inventario/services/costos-sanidad.service';
import { AnalisisInventarioService, InventarioAnalisis } from '../../shared/services/analisis-inventario.service';
import { CostosIntegradosService } from '../../shared/services/costos-integrados.service';
import { VentasService } from '../../shared/services/ventas.service';
import { MortalidadBackendService } from '../../shared/services/mortalidad-backend.service';
import { MorbilidadService } from '../pollos/services/morbilidad.service';
import {
  MetodoProrrateo,
  ConfiguracionProrrateo,
  CostosIndirectosPeriodo,
  ResultadoProrrateo,
  AnalisisLoteCompleto,
  ComparativoLotes
} from '../../shared/models/analisis-financiero.model';

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

  // ===== NUEVAS PROPIEDADES: Análisis Financiero Completo =====
  metodoProrrateo: MetodoProrrateo = 'dias-animal';
  configuracionesProrrateo: ConfiguracionProrrateo[] = [
    { metodo: 'dias-animal', descripcion: 'Días-Animal (Recomendado): Considera tiempo y cantidad de animales' },
    { metodo: 'cantidad', descripcion: 'Por Cantidad: Reparte según número de animales' },
    { metodo: 'biomasa', descripcion: 'Por Biomasa: Considera el peso total de cada lote' }
  ];
  costosIndirectosPeriodo: CostosIndirectosPeriodo | null = null;
  resultadoProrrateo: ResultadoProrrateo | null = null;
  analisisCompletoPorLote: Map<string, AnalisisLoteCompleto> = new Map();
  loteDetalladoSeleccionado: AnalisisLoteCompleto | null = null;
  modalDetalleAbierto = false;
  periodoAnalisis = {
    inicio: this.obtenerPrimerDiaMes(),
    fin: this.obtenerUltimoDiaMes()
  };

  constructor(
    private analisisService: AnalisisInventarioService,
    private cSanidad: CostosSanidadService,
    private costosIntegrados: CostosIntegradosService,
    private ventasService: VentasService,
    private mortalidadService: MortalidadBackendService,
    private morbilidadService: MorbilidadService
  ) {}

  ngOnInit(): void {
    this.cargarAnalisisEspecies();
    this.cargarCostosIndirectos();
  }

  getCostoPromedioPorAnimalEspecieActual(): number {
    if (this.analisisCompletoPorLote.size === 0) return 0;
    let totalCosto = 0;
    let totalVivos = 0;
    this.analisisCompletoPorLote.forEach(a => {
      totalCosto += Number(a?.costoTotal || 0);
      totalVivos += Number(a?.animales?.vivos || 0);
    });
    if (totalVivos <= 0) return 0;
    return Math.round((totalCosto / totalVivos) * 100) / 100;
  }

  getNombreEspecieActual(): string {
    return this.especieSeleccionada === 1 ? 'Pollos' : 'Chanchos';
  }

  exportarDetalleCSV(): void {
    const filas: string[] = [];
    const encabezados = [
      'Lote','Especie','Dias','Iniciales','Enfermos','Muertos','Vendidos','Vivos',
      'CompraAnimales','Alimentacion','SanidadPreventiva','Morbilidad',
      'CI_Operacion','CI_ManoObra','CI_Fijos','CI_Logistica','CostoIndirectoTotal',
      'CostoTotal','UnitarioVivo','Ingresos','Ganancia','MargenPct'
    ];
    filas.push(encabezados.join(','));
    this.analisisCompletoPorLote.forEach((a, loteId) => {
      const row = [
        (a?.lote?.name || a?.lote?.codigo || `Lote ${loteId}`),
        (a?.lote?.race?.animal?.name || ''),
        String(a?.periodo?.dias || 0),
        String(a?.animales?.iniciales || 0),
        String(a?.animales?.enfermos || 0),
        String(a?.animales?.muertos || 0),
        String(a?.animales?.vendidos || 0),
        String(a?.animales?.vivos || 0),
        String(a?.costosDirectos?.compraAnimales || 0),
        String(a?.costosDirectos?.alimentacion || 0),
        String(a?.costosDirectos?.sanidadPreventiva || 0),
        String(a?.costosDirectos?.morbilidad || 0),
        String(a?.costosIndirectos?.operacion || 0),
        String(a?.costosIndirectos?.manoObra || 0),
        String(a?.costosIndirectos?.fijos || 0),
        String(a?.costosIndirectos?.logistica || 0),
        String(a?.costosIndirectos?.total || 0),
        String(a?.costoTotal || 0),
        String(a?.costos?.unitarioVivo || 0),
        String(a?.rentabilidad?.ingresoTotal || 0),
        String(a?.rentabilidad?.ganancia || 0),
        String(a?.rentabilidad?.margen || 0)
      ];
      filas.push(row.map(v => typeof v === 'string' && v.includes(',') ? `"${v}"` : v).join(','));
    });
    const csv = filas.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const desde = this.periodoAnalisis.inicio ? (this.periodoAnalisis.inicio as Date).toISOString().slice(0,10) : '';
    const hasta = this.periodoAnalisis.fin ? (this.periodoAnalisis.fin as Date).toISOString().slice(0,10) : '';
    a.href = url;
    a.download = `detalle_lotes_${this.getNombreEspecieActual()}_${desde}_a_${hasta}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportarDetallePDF(): void {
    const w = window.open('', '_blank');
    if (!w) return;
    const filasHtml: string[] = [];
    this.analisisCompletoPorLote.forEach((a, loteId) => {
      filasHtml.push(
        `<tr>
          <td>${a?.lote?.name || a?.lote?.codigo || `Lote ${loteId}`}</td>
          <td>${a?.lote?.race?.animal?.name || ''}</td>
          <td>${a?.periodo?.dias || 0}</td>
          <td>${a?.animales?.iniciales || 0}</td>
          <td>${a?.animales?.enfermos || 0}</td>
          <td>${a?.animales?.muertos || 0}</td>
          <td>${a?.animales?.vendidos || 0}</td>
          <td>${a?.animales?.vivos || 0}</td>
          <td>${a?.costosDirectos?.compraAnimales || 0}</td>
          <td>${a?.costosDirectos?.alimentacion || 0}</td>
          <td>${a?.costosDirectos?.sanidadPreventiva || 0}</td>
          <td>${a?.costosDirectos?.morbilidad || 0}</td>
          <td>${a?.costosIndirectos?.total || 0}</td>
          <td>${a?.costoTotal || 0}</td>
          <td>${a?.costos?.unitarioVivo || 0}</td>
          <td>${a?.rentabilidad?.ingresoTotal || 0}</td>
          <td>${a?.rentabilidad?.ganancia || 0}</td>
          <td>${a?.rentabilidad?.margen || 0}%</td>
        </tr>`
      );
    });
    const desde = this.periodoAnalisis.inicio ? (this.periodoAnalisis.inicio as Date).toISOString().slice(0,10) : '';
    const hasta = this.periodoAnalisis.fin ? (this.periodoAnalisis.fin as Date).toISOString().slice(0,10) : '';
    const html = `
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Detalle por Lote</title>
        <style>
          body { font-family: Arial, sans-serif; }
          h2 { margin: 0 0 12px 0; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ccc; padding: 6px 8px; font-size: 12px; }
          th { background: #f3f4f6; }
        </style>
      </head>
      <body>
        <h2>Detalle por Lote — ${this.getNombreEspecieActual()} (${desde} a ${hasta})</h2>
        <table>
          <thead>
            <tr>
              <th>Lote</th><th>Especie</th><th>Días</th><th>Iniciales</th><th>Enfermos</th><th>Muertos</th><th>Vendidos</th><th>Vivos</th>
              <th>Compra</th><th>Alimentación</th><th>Sanidad</th><th>Morbilidad</th><th>Indirectos</th><th>Costo Total</th><th>Unitario Vivo</th><th>Ingresos</th><th>Ganancia</th><th>Margen</th>
            </tr>
          </thead>
          <tbody>
            ${filasHtml.join('')}
          </tbody>
        </table>
        <script>window.onload = function(){ window.print(); }</script>
      </body>
      </html>`;
    w.document.open();
    w.document.write(html);
    w.document.close();
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
    const name = (row?.lote?.name || '').toString().trim();
    if (name) return name;
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
        const name = (row?.lote?.name || '').toString().toLowerCase();
        const code = (row?.lote?.codigo || '').toString().toLowerCase();
        const id = (row?.lote?.id || '').toString().toLowerCase();
        return name.includes(term) || code.includes(term) || id.includes(term);
      });
    }
    const dir = this.sortDir === 'asc' ? 1 : -1;
    return [...lista].sort((a: any, b: any) => {
      let va: any;
      let vb: any;
      if (this.sortKey === 'lote') {
        va = this.codigoLote(a);
        vb = this.codigoLote(b);
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

  // ============================================================
  // NUEVOS MÉTODOS: ANÁLISIS FINANCIERO COMPLETO
  // ============================================================

  /**
   * Obtiene el primer día del mes actual
   */
  obtenerPrimerDiaMes(): Date {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  }

  /**
   * Obtiene el último día del mes actual
   */
  obtenerUltimoDiaMes(): Date {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  }

  /**
   * Carga los costos indirectos y calcula el prorrateo
   */
  cargarCostosIndirectos(): void {
    const desde = this.periodoAnalisis.inicio;
    const hasta = this.periodoAnalisis.fin;

    this.costosIntegrados.obtenerCostosIndirectosPeriodo(desde, hasta).subscribe({
      next: (costos) => {
        this.costosIndirectosPeriodo = costos;
        this.calcularProrrateo();
      },
      error: (error) => {
        console.error('Error al cargar costos indirectos:', error);
        // Inicializar con valores en cero
        this.costosIndirectosPeriodo = {
          operacion: [],
          manoObra: [],
          fijos: [],
          logistica: [],
          totalOperacion: 0,
          totalManoObra: 0,
          totalFijos: 0,
          totalLogistica: 0,
          totalGeneral: 0
        };
      }
    });
  }

  /**
   * Calcula el prorrateo de costos indirectos entre lotes
   * ACTUALIZADO: Usa prorrateo detallado por tipo de costo
   */
  calcularProrrateo(): void {
    if (!this.costosIndirectosPeriodo || !this.analisisActual) return;

    const lotes = this.analisisActual.analisisPorLote.map(a => a.lote);
    
    // Mantener el prorrateo total para compatibilidad
    this.resultadoProrrateo = this.costosIntegrados.prorratearCostos(
      lotes,
      this.costosIndirectosPeriodo,
      this.metodoProrrateo,
      this.periodoAnalisis.inicio,
      this.periodoAnalisis.fin
    );

    // Calcular análisis completo por lote
    this.calcularAnalisisCompletoPorLote();
  }

  /**
   * Calcula el análisis completo para cada lote
   * ACTUALIZADO: Usa desglose detallado de costos indirectos por tipo
   */
  calcularAnalisisCompletoPorLote(): void {
    if (!this.analisisActual || !this.costosIndirectosPeriodo) return;

    this.analisisCompletoPorLote.clear();

    const lotes = this.analisisActual.analisisPorLote.map(a => a.lote);
    
    // Obtener prorrateo detallado por tipo de costo
    const prorrateoPorTipo = this.costosIntegrados.prorratearCostosPorTipo(
      lotes,
      this.costosIndirectosPeriodo,
      this.metodoProrrateo,
      this.periodoAnalisis.inicio,
      this.periodoAnalisis.fin
    );

    for (const analisisLote of this.analisisActual.analisisPorLote) {
      const lote = analisisLote.lote;
      const loteId = String(lote.id);

      // Obtener costos indirectos desglosados para este lote
      const costosIndirectosDesglosados = prorrateoPorTipo.get(loteId) || {
        operacion: 0,
        manoObra: 0,
        fijos: 0,
        logistica: 0,
        total: 0
      };

      // Cargar ventas y mortalidad del lote
      forkJoin({
        ventas: this.ventasService.listarVentasAnimalesPorLoteEmitidas(loteId),
        mortalidad: this.mortalidadService.obtenerRegistrosPorLote(loteId),
        morbilidad: this.morbilidadService.getRegistrosPorLote(Number(loteId))
      }).subscribe({
        next: ({ ventas, mortalidad, morbilidad }) => {
          const analisisCompleto = this.costosIntegrados.calcularAnalisisCompleto(
            lote,
            analisisLote.costoTotalLote,
            analisisLote.detalleAlimentos || [],
            this.sanidadRegistros,
            morbilidad || [],
            costosIndirectosDesglosados, // Ahora pasamos el desglose completo
            ventas,
            mortalidad,
            this.periodoAnalisis.inicio,
            this.periodoAnalisis.fin
          );

          this.analisisCompletoPorLote.set(loteId, analisisCompleto);
        },
        error: (error) => {
          console.error(`Error al calcular análisis completo del lote ${loteId}:`, error);
        }
      });
    }
  }

  /**
   * Cambia el método de prorrateo y recalcula
   */
  cambiarMetodoProrrateo(metodo: MetodoProrrateo): void {
    this.metodoProrrateo = metodo;
    this.calcularProrrateo();
  }

  /**
   * Abre el modal de detalle completo de un lote
   */
  abrirDetalleCompleto(loteId: string): void {
    const analisis = this.analisisCompletoPorLote.get(loteId);
    if (analisis) {
      this.loteDetalladoSeleccionado = analisis;
      this.modalDetalleAbierto = true;
    }
  }

  /**
   * Cierra el modal de detalle completo
   */
  cerrarDetalleCompleto(): void {
    this.modalDetalleAbierto = false;
    this.loteDetalladoSeleccionado = null;
  }

  /**
   * Obtiene el comparativo de lotes
   */
  obtenerComparativoLotes(): ComparativoLotes[] {
    const comparativo: ComparativoLotes[] = [];

    this.analisisCompletoPorLote.forEach((analisis, loteId) => {
      const iniciales = analisis.animales.iniciales;
      const vivos = analisis.animales.vivos;
      const vendidos = analisis.animales.vendidos;

      comparativo.push({
        loteId,
        loteCodigo: (analisis?.lote?.name && String(analisis.lote.name).trim()) ? String(analisis.lote.name).trim() : (analisis?.lote?.codigo || `Lote ${loteId}`),
        animalTipo: analisis.lote.race?.animal?.name || 'N/A',
        animales: `${iniciales}→${vivos + vendidos}`,
        costoAlimento: analisis.costosDirectos.alimentacion / Math.max(vivos + vendidos, 1),
        costoSanidad: analisis.costosDirectos.sanidadPreventiva / Math.max(vivos + vendidos, 1),
        costoMorbilidad: analisis.costosDirectos.morbilidad / Math.max(vivos + vendidos, 1),
        costosIndirectos: analisis.costosIndirectos.total / Math.max(vivos + vendidos, 1),
        costoUnitario: analisis.costos.unitarioVivo,
        margen: analisis.rentabilidad.margen,
        estado: analisis.rentabilidad.estado
      });
    });

    return comparativo.sort((a, b) => b.margen - a.margen);
  }

  /**
   * Obtiene la descripción del método de prorrateo actual
   */
  obtenerDescripcionMetodoProrrateo(): string {
    const config = this.configuracionesProrrateo.find(c => c.metodo === this.metodoProrrateo);
    return config?.descripcion || '';
  }

  /**
   * Determina si un costo está implementado (tiene datos reales)
   * ACTUALIZADO: Verifica si realmente hay datos registrados
   */
  esImplementado(concepto: 'morbilidad' | 'operacion' | 'manoObra' | 'fijos' | 'logistica'): boolean {
    if (concepto === 'morbilidad') {
      // Considerar implementado si hay algún costo de morbilidad > 0 calculado
      let total = 0;
      this.analisisCompletoPorLote.forEach(a => total += Number(a?.costosDirectos?.morbilidad || 0));
      return total > 0;
    }

    if (!this.costosIndirectosPeriodo) return false;

    switch (concepto) {
      case 'operacion':
        return this.costosIndirectosPeriodo.totalOperacion > 0;
      case 'manoObra':
        return this.costosIndirectosPeriodo.totalManoObra > 0;
      case 'fijos':
        return this.costosIndirectosPeriodo.totalFijos > 0;
      case 'logistica':
        return this.costosIndirectosPeriodo.totalLogistica > 0;
      default:
        return true;
    }
  }

  /**
   * Obtiene el total de costos indirectos del período
   */
  getTotalCostosIndirectos(): number {
    return this.costosIndirectosPeriodo?.totalGeneral || 0;
  }

  /**
   * Obtiene el total de costos directos de todos los lotes
   */
  getTotalCostosDirectos(): number {
    let total = 0;
    this.analisisCompletoPorLote.forEach(analisis => {
      total += analisis.costosDirectos.total;
    });
    return Math.round(total * 100) / 100;
  }

  /**
   * Obtiene el total general (directos + indirectos)
   */
  getTotalGeneral(): number {
    return this.getTotalCostosDirectos() + this.getTotalCostosIndirectos();
  }

  /**
   * Obtiene el margen promedio de todos los lotes
   */
  getMargenPromedio(): number {
    if (this.analisisCompletoPorLote.size === 0) return 0;
    
    let sumaMargen = 0;
    this.analisisCompletoPorLote.forEach(analisis => {
      sumaMargen += analisis.rentabilidad.margen;
    });
    
    return Math.round((sumaMargen / this.analisisCompletoPorLote.size) * 100) / 100;
  }

  /**
   * Obtiene el análisis completo de un lote específico
   */
  getAnalisisCompletoPorLoteId(loteId: string): AnalisisLoteCompleto | null {
    return this.analisisCompletoPorLote.get(loteId) || null;
  }

  /**
   * Actualiza el período de análisis y recarga datos
   */
  actualizarPeriodo(): void {
    this.cargarAnalisisEspecies();
  }

  // ===== Controles de período (UI) =====
  setPeriodoInicio(valor: string): void {
    try {
      this.periodoAnalisis.inicio = valor ? new Date(valor) : this.obtenerPrimerDiaMes();
    } catch {
      this.periodoAnalisis.inicio = this.obtenerPrimerDiaMes();
    }
    this.refrescarCompleto();
  }

  setPeriodoFin(valor: string): void {
    try {
      this.periodoAnalisis.fin = valor ? new Date(valor) : this.obtenerUltimoDiaMes();
    } catch {
      this.periodoAnalisis.fin = this.obtenerUltimoDiaMes();
    }
    this.refrescarCompleto();
  }

  /**
   * Override del método refrescar para incluir costos indirectos
   */
  refrescarCompleto(): void {
    this.refrescar();
    this.cargarCostosIndirectos();
  }

  /**
   * NUEVO: Obtiene el costo por animal de un tipo específico de costo indirecto
   */
  getCostoIndirectoPorAnimal(tipoCosto: 'operacion' | 'manoObra' | 'fijos' | 'logistica'): number {
    if (!this.costosIndirectosPeriodo || this.analisisCompletoPorLote.size === 0) return 0;

    let totalCosto = 0;
    let totalAnimales = 0;

    this.analisisCompletoPorLote.forEach(analisis => {
      const cantidad = analisis.animales.iniciales;
      totalAnimales += cantidad;

      switch (tipoCosto) {
        case 'operacion':
          totalCosto += analisis.costosIndirectos.operacion;
          break;
        case 'manoObra':
          totalCosto += analisis.costosIndirectos.manoObra;
          break;
        case 'fijos':
          totalCosto += analisis.costosIndirectos.fijos;
          break;
        case 'logistica':
          totalCosto += analisis.costosIndirectos.logistica;
          break;
      }
    });

    return totalAnimales > 0 ? Math.round((totalCosto / totalAnimales) * 100) / 100 : 0;
  }

  /**
   * NUEVO: Obtiene el total de costos indirectos por tipo
   */
  getTotalCostoIndirectoPorTipo(tipoCosto: 'operacion' | 'manoObra' | 'fijos' | 'logistica'): number {
    if (!this.costosIndirectosPeriodo) return 0;

    switch (tipoCosto) {
      case 'operacion':
        return this.costosIndirectosPeriodo.totalOperacion;
      case 'manoObra':
        return this.costosIndirectosPeriodo.totalManoObra;
      case 'fijos':
        return this.costosIndirectosPeriodo.totalFijos;
      case 'logistica':
        return this.costosIndirectosPeriodo.totalLogistica;
      default:
        return 0;
    }
  }

  /**
   * NUEVO: Obtiene análisis por especie (pollos o chanchos)
   */
  obtenerAnalisisPorEspecie(animalId: number): {
    lotes: AnalisisLoteCompleto[];
    totalAnimales: number;
    costosDirectos: number;
    costosIndirectos: number;
    costosIndirectosDetalle: { operacion: number; manoObra: number; fijos: number; logistica: number };
    costoTotal: number;
    costoPorAnimal: number;
  } {
    const lotesFiltrados: AnalisisLoteCompleto[] = [];
    let totalAnimales = 0;
    let costosDirectos = 0;
    let costosIndirectosTotal = 0;
    const costosIndirectosDetalle = {
      operacion: 0,
      manoObra: 0,
      fijos: 0,
      logistica: 0
    };

    this.analisisCompletoPorLote.forEach(analisis => {
      const loteAnimalId = analisis.lote?.race?.animal?.id || 0;
      if (loteAnimalId === animalId) {
        lotesFiltrados.push(analisis);
        totalAnimales += analisis.animales.iniciales;
        costosDirectos += analisis.costosDirectos.total;
        costosIndirectosTotal += analisis.costosIndirectos.total;
        costosIndirectosDetalle.operacion += analisis.costosIndirectos.operacion;
        costosIndirectosDetalle.manoObra += analisis.costosIndirectos.manoObra;
        costosIndirectosDetalle.fijos += analisis.costosIndirectos.fijos;
        costosIndirectosDetalle.logistica += analisis.costosIndirectos.logistica;
      }
    });

    const costoTotal = costosDirectos + costosIndirectosTotal;
    const costoPorAnimal = totalAnimales > 0 ? Math.round((costoTotal / totalAnimales) * 100) / 100 : 0;

    return {
      lotes: lotesFiltrados,
      totalAnimales,
      costosDirectos: Math.round(costosDirectos * 100) / 100,
      costosIndirectos: Math.round(costosIndirectosTotal * 100) / 100,
      costosIndirectosDetalle: {
        operacion: Math.round(costosIndirectosDetalle.operacion * 100) / 100,
        manoObra: Math.round(costosIndirectosDetalle.manoObra * 100) / 100,
        fijos: Math.round(costosIndirectosDetalle.fijos * 100) / 100,
        logistica: Math.round(costosIndirectosDetalle.logistica * 100) / 100
      },
      costoTotal: Math.round(costoTotal * 100) / 100,
      costoPorAnimal
    };
  }
}
