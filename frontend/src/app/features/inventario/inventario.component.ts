import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ProductService } from '../../shared/services/product.service';
import { AnalisisInventarioService, InventarioAnalisis } from '../../shared/services/analisis-inventario.service';
import { InventarioService, InventarioAlimento, MovimientoInventario } from '../pollos/services/inventario.service';
import { InventarioProductoFrontService, InventarioProductoFront, MovimientoProductoRequest, MovimientoProductoResponse } from '../../shared/services/inventario-producto.service';
import { InventarioEntradasService, InventarioEntrada, CrearEntradaRequest } from '../../shared/services/inventario-entradas.service';
import { 
  Product, Provider, TypeFood, UnitMeasurement, Animal, Stage, NombreProducto, Subcategory 
} from '../../shared/models/product.model';
import { WebsocketService } from '../../shared/services/websocket.service';
import { forkJoin } from 'rxjs';
import { NotificacionesInventarioService, AlertaInventario } from '../../shared/services/notificaciones-inventario.service';
import { CerdosBotiquinComponent } from './cerdos-botiquin.component';
import { PollosBotiquinComponent } from './pollos-botiquin.component';

@Component({
  selector: 'app-inventario',
  templateUrl: './inventario.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, HttpClientModule, DragDropModule, CerdosBotiquinComponent, PollosBotiquinComponent],
  providers: [WebsocketService]
})
export class InventarioComponent implements OnInit {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  providers: Provider[] = [];
  typeFoods: TypeFood[] = [];
  unitMeasurements: UnitMeasurement[] = [];
  animals: Animal[] = [];
  stages: Stage[] = [];
  // Catálogo administrado de nombres de producto
  nombreProductos: NombreProducto[] = [];
  // Subcategorías dinámicas por tipo de alimento
  subcategories: Subcategory[] = [];
  showMedicamentos: boolean = false;
  showAlimentos: boolean = false;
  subcategoryInfo: string = '';

  // Análisis de inventario
  analisisInventario: InventarioAnalisis | null = null;
  analisisPollos: InventarioAnalisis | null = null;
  analisisChanchos: InventarioAnalisis | null = null;
  cargandoAnalisis = false;

  // Inventario automático con disminución
  inventarioAlimentos: InventarioAlimento[] = [];
  inventariosStockBajo: InventarioAlimento[] = [];
  movimientosSeleccionados: MovimientoInventario[] = [];

  // Inventario real por producto (mapa productId -> cantidadStock)
  inventarioProductoMap: Map<number, number> = new Map();
  // Vencimientos por producto (en unidad base)
  stockVencidoMap: Map<number, number> = new Map();
  stockPorVencerMap: Map<number, number> = new Map();
  // Stock válido (no vencido) calculado desde entradas por producto
  stockValidoMap: Map<number, number> = new Map();
  // Disminución acumulada (consumos) por producto
  disminucionAcumuladaMap: Map<number, number> = new Map();
  invProductoSeleccionado: InventarioProductoFront | null = null;

  // Vista actual (por defecto en Productos)
  vistaActual: 'productos' | 'analisis' | 'stock-real' | 'entradas' | 'alertas' = 'productos';
  // Modo Botiquín: mostrar solo productos marcados para botiquín
  botiquinOnly: boolean = false;
  // Estado UI Botiquín
  botSearch: string = '';
  botFiltroCategoria: string = 'todos';
  botFiltroEstado: 'todos' | 'ok' | 'alerta' | 'bajo' | 'agotado' = 'todos';
  // Recomendados Botiquín
  showRecCerdosModal: boolean = false;
  showRecPollosModal: boolean = false;
  recommendedCerdos: string[] = [
    'Difenhidramina',
    'Clorfeniramina',
    'Dexametasona',
    'Oxitocina',
    'Gluconato de Calcio 20%',
    'Dextrosa 50%',
    'Meloxicam 2% inyectable',
    'Flunixin Meglumine',
    'Shotapen LA',
    'Oxitetraciclina LA',
    'Clortetraciclina 12.5%',
    'Hierro Dextrano 200 mg/ml',
    'Ivermectina 1% inyectable',
    'Levamisol',
    'Fenbendazol',
    'Complejo B inyectable',
    'ADE inyectable',
    'Electrolitos orales',
    'Sulfato de Neomicina',
    'Clorhexidina',
    'Yodo povidona 10%',
    'Amonio cuaternario',
    'Sulfato de plata',
    'Reverin',
    'Terramicina spray',
    'Cipermetrina',
    'Permetrina',
    'Alcohol 70%'
  ];
  faltantesCerdos: string[] = [];

  // Resumen de cantidad real por Tipo de Alimento (para pestaña Productos -> Cantidad Real)
  resumenCantidadReal: Array<{
    typeFoodId: number;
    typeFoodName: string;
    cantidadOriginal: number;
    cantidadActual: number;
    consumido: number;
    unidadMedida: string;
  }> = [];

  productForm: FormGroup;
  searchForm: FormGroup;
  entradaForm: FormGroup;
  // Edición de entradas
  editEntradaForm: FormGroup;
  showEditEntradaModal: boolean = false;
  editingEntradaId: number | null = null;
  // Vista del listado global en pestaña Entradas
  entradasListadoVista: 'activos' | 'historico' = 'activos';
  entradasGlobales: InventarioEntrada[] = [];
  loadingEntradasGlobal = false;

  selectedProduct: Product | null = null;
  isLoading = false;
  showForm = false;
  isEditMode = false;

  // Referencia a Math para usarlo en el template
  Math = Math;

  // Entradas por producto (UI Entradas)
  selectedProductIdEntradas: number | null = null;
  productoEntradasBloqueado: boolean = false; // Bloquear selector cuando se viene desde "Reponer"
  mostrarFormularioEntrada: boolean = false; // Controla visibilidad del formulario de entrada
  entradasProducto: InventarioEntrada[] = [];
  todasLasEntradas: InventarioEntrada[] = []; // Todas las entradas para mostrar en listado principal
  movimientosProducto: MovimientoProductoResponse[] = [];
  filtroProductoEntradas: string = ''; // Filtro para buscar por producto
  filtroEstadoEntradas: 'vigentes' | 'finalizados' | 'todos' = 'vigentes'; // Filtro por estado
  // Expandibles por producto (vista Productos)
  private expandedEntradas: Set<number> = new Set<number>();
  private expandedMovimientos: Set<number> = new Set<number>();
  private entradasByProduct: Map<number, InventarioEntrada[]> = new Map<number, InventarioEntrada[]>();
  private movimientosByProduct: Map<number, MovimientoProductoResponse[]> = new Map<number, MovimientoProductoResponse[]>();
  // Solicitudes de recarga (desde flujo de alimentación)
  rechargeRequests: Array<{ productId?: number; name: string; requestedAt: string; loteCodigo?: string; cantidadRequerida: number; cantidadDisponible: number }> = [];
  private rechargeById: Map<number, any> = new Map();
  private rechargeByName: Map<string, any> = new Map();
  pendingRechargeRequests: any[] = [];
  resolvedRechargeRequests: any[] = [];

  // Alertas (UI Alertas)
  alertasPorVencer: InventarioEntrada[] = [];
  alertasVencidas: InventarioEntrada[] = [];
  diasAlertaPorVencer: number = 15;
  
  animalIdAnalisis: number | null = 1;

  constructor(
    private productService: ProductService,
    private analisisService: AnalisisInventarioService,
    private inventarioService: InventarioService,
    private invProductoService: InventarioProductoFrontService,
    private entradasService: InventarioEntradasService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private websocketService: WebsocketService,
    private notificacionesService: NotificacionesInventarioService
  ) {
    this.productForm = this.fb.group({
      id: [null],
      name: ['', [Validators.required, Validators.maxLength(45)]],
      description: [''],
      quantity: [0, [Validators.required, Validators.min(0)]],
      price_unit: [0, [Validators.required, Validators.min(0)]],
      number_facture: [0],
      date_compra: [null],
      level_min: [0],
      level_max: [0],
      provider_id: [null],
      typeFood_id: [null, [Validators.required]],
      unitMeasurement_id: [null, [Validators.required]],
      animal_id: [null, [Validators.required]],
      stage_id: [null, [Validators.required]],
      // Nuevos campos
      subcategory_id: [null],
      incluirEnBotiquin: [false],
      usoPrincipal: [''],
      dosisRecomendada: [''],
      viaAdministracion: [''],
      tiempoRetiro: [null],
      fechaVencimiento: [null],
      observacionesMedicas: [''],
      presentacion: [''],
      infoNutricional: ['']
    });

    this.searchForm = this.fb.group({
      name: [''],
      providerId: [null],
      typeFoodId: [null],
      animalId: [null],
      stageId: [null]
    });

    // Formulario de creación de entradas
    this.entradaForm = this.fb.group({
      productId: [null, [Validators.required]],
      unidadControl: ['saco'],
      contenidoPorUnidadBase: [null, [Validators.required, Validators.min(0.001)]],
      cantidadUnidades: [1, [Validators.required, Validators.min(0.001)]],
      codigoLote: [''],
      fechaIngreso: [null],
      fechaVencimiento: [null],
      observaciones: [''],
      providerId: [null, [Validators.required]],
      costoUnitarioBase: [null, [Validators.required, Validators.min(0)]],
      costoPorUnidadControl: [null, [Validators.min(0)]]
    });
    // Formulario de edición de entradas (solo metadata)
    this.editEntradaForm = this.fb.group({
      codigoLote: [''],
      unidadControl: [''],
      fechaIngreso: [null],
      fechaVencimiento: [null],
      contenidoPorUnidadBase: [null],
      cantidadUnidades: [null],
      observaciones: [''],
      providerId: [null],
      costoUnitarioBase: [null],
      costoPorUnidadControl: [null]
    });
    this.recalcularResumenCantidadReal();
  }

  // ==============================
  // Listados globales en pestaña Entradas
  // ==============================
  getProductosActivosEntradas(): Product[] {
    const arr = (this.products || []).filter(p => this.getCantidadRealProducto(p) > 0);
    return arr.sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));
  }

  getProductosHistoricoEntradas(): Product[] {
    const arr = (this.products || []).filter(p => this.getCantidadRealProducto(p) <= 0 && (this.inventarioProductoMap.has(p.id!) || this.disminucionAcumuladaMap.has(p.id!)));
    return arr.sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));
  }

  seleccionarProductoEntradas(p: Product): void {
    if (!p?.id) return;
    this.selectedProductIdEntradas = p.id;
    this.entradaForm.patchValue({ productId: p.id });
    const provId = (p as any)?.provider?.id ?? (p as any)?.provider_id ?? null;
    if (provId) this.entradaForm.patchValue({ providerId: provId });
    this.cargarInventarioProductoSeleccionado(p.id);
    this.cargarEntradasPorProducto(p.id);
    this.cargarMovimientosPorProducto(p.id);
  }

  setEntradasVista(v: 'activos' | 'historico'): void {
    this.entradasListadoVista = v;
  }

  getProductosListadoEntradas(): Product[] {
    return this.entradasListadoVista === 'activos' ? this.getProductosActivosEntradas() : this.getProductosHistoricoEntradas();
  }

  cargarEntradasGlobales(): void {
    if (!this.products || this.products.length === 0) {
      this.entradasGlobales = [];
      return;
    }
    this.loadingEntradasGlobal = true;
    const calls = this.products
      .filter(p => p?.id != null)
      .map(p => this.entradasService.listarPorProducto(p.id!));
    if (calls.length === 0) { this.entradasGlobales = []; this.loadingEntradasGlobal = false; return; }
    forkJoin(calls).subscribe({
      next: (listas) => {
        const flat: InventarioEntrada[] = [];
        for (const lst of (listas || [])) {
          for (const e of (lst || [])) flat.push(e);
        }
        this.entradasGlobales = flat;
        this.loadingEntradasGlobal = false;
      },
      error: () => { this.entradasGlobales = []; this.loadingEntradasGlobal = false; }
    });
  }

  // ==============================
  // Botiquín recomendado (Cerdos/Pollos)
  // ==============================
  openRecCerdosModal(): void {
    this.calcularFaltantesCerdos();
    this.showRecCerdosModal = true;
  }

  closeRecCerdosModal(): void {
    this.showRecCerdosModal = false;
  }

  openRecPollosModal(): void {
    // Placeholder: se implementará con la guía de pollos
    this.showRecPollosModal = true;
  }

  closeRecPollosModal(): void {
    this.showRecPollosModal = false;
  }

  private esProductoCerdo(p: Product): boolean {
    const nombreAnimal = this.normalizarTexto(p?.animal?.name);
    return nombreAnimal.includes('chancho') || nombreAnimal.includes('cerd') || nombreAnimal.includes('porc');
  }

  private getPigAnimalId(): number | null {
    const a = (this.animals || []).find(x => {
      const n = this.normalizarTexto(x?.name);
      return n.includes('chancho') || n.includes('cerd') || n.includes('porc');
    });
    return a?.id ?? null;
  }

  private calcularFaltantesCerdos(): void {
    const existentes = (this.products || [])
      .filter(p => (p as any)?.incluirEnBotiquin === true && this.esProductoCerdo(p))
      .map(p => this.normalizarTexto(p?.name));

    const faltantes: string[] = [];
    for (const rec of this.recommendedCerdos) {
      const target = this.normalizarTexto(rec);
      const yaExiste = existentes.some(n => n.includes(target) || target.includes(n));
      if (!yaExiste) faltantes.push(rec);
    }
    this.faltantesCerdos = faltantes;
  }

  agregarRecomendadoAlBotiquin(nombre: string, especie: 'cerdos' | 'pollos'): void {
    // Prefill de producto para crear rápidamente
    this.openForm(false);
    const patch: any = { name: nombre, incluirEnBotiquin: true };
    if (especie === 'cerdos') {
      const pigId = this.getPigAnimalId();
      if (pigId) patch.animal_id = pigId;
    }
    this.productForm.patchValue(patch);
  }

  getEntradasGlobalFiltradas(): InventarioEntrada[] {
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const esVigente = (e: any) => this.esEntradaVigente(e, hoy);
    const src = this.entradasGlobales || [];
    const out = src.filter(e => this.entradasListadoVista === 'activos' ? esVigente(e) : !esVigente(e));
    return out.sort((a: any, b: any) => (a?.product?.name || '').localeCompare(b?.product?.name || ''));
  }

  esEntradaVigente(e: InventarioEntrada, hoyRef?: Date): boolean {
    const hoy = hoyRef ? new Date(hoyRef) : new Date(); hoy.setHours(0,0,0,0);
    const activo = (e as any)?.activo !== false;
    const fv = (e as any)?.fechaVencimiento ? new Date((e as any).fechaVencimiento) : null; if (fv) fv.setHours(0,0,0,0);
    const vigente = !fv || fv >= hoy;
    const restante = Number((e as any)?.stockBaseRestante || 0) > 0;
    return activo && vigente && restante;
  }

  getNombreProductoEntrada(e: InventarioEntrada): string {
    return ((e as any)?.product?.name || 'Producto');
  }

  private classifyRechargeRequests(): void {
    try {
      const current = this.rechargeRequests || [];
      const byName = new Map<string, Product>();
      for (const p of this.products || []) {
        byName.set(this.normalizarTexto(p?.name || ''), p);
      }
      const pending: any[] = [];
      const resolved: any[] = [];
      for (const r of current) {
        let pid = Number((r as any)?.productId);
        let disp = 0;
        if (Number.isFinite(pid)) {
          disp = Number(this.stockValidoMap.get(pid) ?? 0);
        } else {
          const prod = byName.get(this.normalizarTexto(r?.name || ''));
          if (prod?.id != null) {
            pid = Number(prod.id);
            disp = Number(this.stockValidoMap.get(pid) ?? 0);
          }
        }
        if (disp > 0.0001) resolved.push(r); else pending.push(r);
      }
      this.pendingRechargeRequests = pending;
      this.resolvedRechargeRequests = resolved;
    } catch {
      this.pendingRechargeRequests = [];
      this.resolvedRechargeRequests = [];
    }
  }
  
  /**
   * Navega a la pestaña Productos y abre el formulario preconfigurado para Botiquín
   */
  goToProductosFormBotiquin(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: 'productos', openForm: 'botiquin' },
      queryParamsHandling: 'merge'
    });
  }
  
  getStockMinimoProductoSeleccionado(): number {
    const invMin = Number(this.invProductoSeleccionado?.stockMinimo ?? 0);
    if (invMin && !isNaN(invMin) && invMin > 0) return invMin;
    const pid = this.selectedProductIdEntradas;
    if (!pid) return 0;
    const p = this.products.find(x => x.id === pid);
    const min = Number((p as any)?.level_min ?? 0);
    return isNaN(min) ? 0 : min;
  }

  getTotalBaseCalculado(): number {
    const c = Number(this.entradaForm?.get('contenidoPorUnidadBase')?.value ?? 0);
    const u = Number(this.entradaForm?.get('cantidadUnidades')?.value ?? 0);
    const total = (isNaN(c) ? 0 : c) * (isNaN(u) ? 0 : u);
    return Math.round((total + Number.EPSILON) * 1000) / 1000;
  }

  // Nombres de productos asociados a un tipo de alimento (máx 2 y resumen)
  getNombresProductosPorTipo(inventario: InventarioAlimento, max: number = 2): string {
    const typeId = inventario?.tipoAlimento?.id;
    if (!typeId) return inventario?.tipoAlimento?.name || 'Producto';
    const nombres = Array.from(new Set(
      (this.products || [])
        .filter(p => (p?.typeFood?.id ?? p?.typeFood_id) === typeId)
        .map(p => p?.name)
        .filter(Boolean)
    ));
    if (nombres.length === 0) return inventario?.tipoAlimento?.name || 'Producto';
    if (nombres.length <= max) return nombres.join(', ');
    const visibles = nombres.slice(0, max).join(', ');
    const restantes = nombres.length - max;
    return `${visibles} (+${restantes} más)`;
  }

  // Umbral mínimo consolidado: usa el valor del backend si existe; caso contrario suma de mínimos por producto del tipo
  getStockMinimoPorTipo(inventario: InventarioAlimento): number {
    const backendMin = Number(inventario?.stockMinimo ?? 0);
    if (backendMin && !isNaN(backendMin) && backendMin > 0) return backendMin;
    if (!inventario?.tipoAlimento?.id) return backendMin || 0;
    const typeId = inventario.tipoAlimento.id;
    let sumaMin = 0;
    for (const p of this.products || []) {
      const pid = p?.typeFood?.id ?? p?.typeFood_id;
      if (pid === typeId) {
        const min = Number((p as any)?.level_min ?? 0);
        if (!isNaN(min)) sumaMin += min;
      }
    }
    return sumaMin || backendMin || 0;
  }

  // Utilidad: convertir distintas formas de fecha del backend a Date válido
  toDate(value: any): Date | null {
    if (!value) return null;
    // Si viene como array [yyyy,MM,dd,HH,mm,ss,nanos]
    if (Array.isArray(value)) {
      const [y, mo, d, h, mi, s, nanos] = value;
      return new Date(y, (mo || 1) - 1, d || 1, h || 0, mi || 0, s || 0, Math.floor((nanos || 0) / 1e6));
    }
    if (typeof value === 'string') {
      const v = value.trim();
      if (v.includes(',')) {
        const parts = v.split(',').map(p => parseInt(p.trim(), 10));
        const [y, mo, d, h, mi, s, nanos] = parts;
        return new Date(y, (mo || 1) - 1, d || 1, h || 0, mi || 0, s || 0, Math.floor((nanos || 0) / 1e6));
      }
      const dIso = new Date(v);
      return isNaN(dIso.getTime()) ? null : dIso;
    }
    if (typeof value === 'number') {
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    }
    // Objeto con propiedades year/month/day (por si acaso)
    if (typeof value === 'object') {
      const y = (value as any).year;
      const mo = (value as any).month || (value as any).monthValue;
      const d = (value as any).day || (value as any).dayOfMonth;
      const h = (value as any).hour;
      const mi = (value as any).minute;
      const s = (value as any).second;
      const nanos = (value as any).nano || (value as any).nanos;
      if (y && mo && d) return new Date(y, mo - 1, d, h || 0, mi || 0, s || 0, Math.floor((nanos || 0) / 1e6));
    }
    return null;
  }

  // Convertir a 'yyyy-MM-dd' para inputs date
  dateToInput(value: any): string {
    const d = this.toDate(value);
    return d ? d.toISOString().split('T')[0] : '';
  }

  /**
   * Cargar inventario por producto desde backend (tabla inventario_producto)
{{ ... }}
   */
  private cargarInventarioPorProducto(): void {
    this.invProductoService.listar().subscribe({
      next: (lista: InventarioProductoFront[]) => {
        const map = new Map<number, number>();
        for (const inv of lista) {
          if (inv?.product?.id != null) {
            map.set(inv.product.id, Number(inv.cantidadStock || 0));
          }
        }
        this.inventarioProductoMap = map;
        console.log('📦 Inventario por producto cargado:', this.inventarioProductoMap);
      },
      error: (err) => {
        console.error('❌ Error cargando inventario por producto:', err);
        this.inventarioProductoMap = new Map();
      }
    });
  }

  // Helpers de filtrado para la vista Entradas
  getEntradasVigentesSeleccionado(): InventarioEntrada[] {
    const lista = this.entradasProducto || [];
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    return lista.filter((e: any) => {
      const activo = (e?.activo !== false);
      const fv = e?.fechaVencimiento ? new Date(e.fechaVencimiento) : null; if (fv) fv.setHours(0,0,0,0);
      const vigente = !fv || fv >= hoy;
      const restante = Number(e?.stockBaseRestante || 0) > 0;
      return activo && vigente && restante;
    });
  }

  getEntradasHistoricoSeleccionado(): InventarioEntrada[] {
    const lista = this.entradasProducto || [];
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    return lista.filter((e: any) => {
      const activo = (e?.activo !== false);
      const fv = e?.fechaVencimiento ? new Date(e.fechaVencimiento) : null; if (fv) fv.setHours(0,0,0,0);
      const vigente = !fv || fv >= hoy;
      const restante = Number(e?.stockBaseRestante || 0) > 0;
      return !activo || !vigente || !restante;
    });
  }

  // Recalcular stock válido (no vencido) para un producto usando sus entradas
  private recalcStockValidoLocal(productId: number): void {
    if (!Number.isFinite(productId)) return;
    this.entradasService.listarPorProducto(Number(productId)).subscribe({
      next: (lista) => {
        const hoy = new Date();
        hoy.setHours(0,0,0,0);
        const total = (lista || []).filter((e: any) => {
          const activo = (e?.activo !== false);
          const fv = e?.fechaVencimiento ? new Date(e.fechaVencimiento) : null;
          if (fv) fv.setHours(0,0,0,0);
          const vigente = !fv || fv >= hoy;
          return activo && vigente;
        }).reduce((sum, e: any) => sum + Number(e?.stockBaseRestante || 0), 0);
        this.stockValidoMap.set(Number(productId), Number(total || 0));
        this.classifyRechargeRequests();
      },
      error: () => {}
    });
  }

  // ==========================
  // Edición / Eliminación de entradas
  // ==========================
  openEditEntrada(e: InventarioEntrada): void {
    this.editingEntradaId = e.id;
    this.showEditEntradaModal = true;
    let contenidoBase: number | null = (e as any)?.contenidoPorUnidad != null ? Number((e as any).contenidoPorUnidad) : null;
    let cantUnidades: number | null = (e as any)?.cantidadUnidades != null ? Number((e as any).cantidadUnidades) : null;
    const sbr = (e as any)?.stockBaseRestante != null ? Number((e as any).stockBaseRestante) : null;
    const sur = (e as any)?.stockUnidadesRestantes != null ? Number((e as any).stockUnidadesRestantes) : null;
    if (contenidoBase == null || isNaN(contenidoBase)) {
      if (sbr != null && sur != null && sur > 0) {
        contenidoBase = sbr / sur;
      } else if (sbr != null) {
        contenidoBase = sbr;
      }
    }
    if (cantUnidades == null || isNaN(cantUnidades)) {
      if (sur != null && sur > 0) {
        cantUnidades = sur;
      } else {
        cantUnidades = 1;
      }
    }
    this.editEntradaForm.reset({
      codigoLote: e.codigoLote || '',
      unidadControl: e.unidadControl || '',
      fechaIngreso: e.fechaIngreso ? this.dateToInput(e.fechaIngreso) : null,
      fechaVencimiento: e.fechaVencimiento ? this.dateToInput(e.fechaVencimiento) : null,
      contenidoPorUnidadBase: contenidoBase,
      cantidadUnidades: cantUnidades,
      observaciones: e.observaciones || '',
      providerId: (e as any)?.provider?.id || null,
      costoUnitarioBase: e.costoUnitarioBase ?? null,
      costoPorUnidadControl: e.costoPorUnidadControl ?? null
    });
  }

  closeEditEntrada(): void {
    this.showEditEntradaModal = false;
    this.editingEntradaId = null;
    this.editEntradaForm.reset();
  }

  saveEditEntrada(): void {
    if (!this.editingEntradaId) return;
    const v = this.editEntradaForm.value;
    const req: any = {
      codigoLote: v.codigoLote || undefined,
      unidadControl: v.unidadControl || undefined,
      fechaIngreso: v.fechaIngreso || undefined,       // yyyy-MM-dd
      fechaVencimiento: v.fechaVencimiento || undefined,
      contenidoPorUnidadBase: v.contenidoPorUnidadBase != null ? Number(v.contenidoPorUnidadBase) : undefined,
      cantidadUnidades: v.cantidadUnidades != null ? Number(v.cantidadUnidades) : undefined,
      observaciones: v.observaciones || undefined,
      providerId: v.providerId != null ? Number(v.providerId) : undefined,
      costoUnitarioBase: v.costoUnitarioBase != null ? Number(v.costoUnitarioBase) : undefined,
      costoPorUnidadControl: v.costoPorUnidadControl != null ? Number(v.costoPorUnidadControl) : undefined
    };
    this.entradasService.actualizarEntrada(this.editingEntradaId, req).subscribe({
      next: () => {
        alert('Entrada actualizada');
        this.closeEditEntrada();
        if (this.selectedProductIdEntradas) this.cargarEntradasPorProducto(this.selectedProductIdEntradas);
        this.cargarInventarioPorProducto();
        this.cargarValidosParaProductos();
        this.cargarDisminuciones();
      },
      error: (err) => {
        console.error('Error al actualizar entrada', err);
        alert('No se pudo actualizar la entrada');
      }
    });
  }

  eliminarEntrada(e: InventarioEntrada): void {
    if (!e?.id) return;
    const ok = confirm('¿Eliminar esta entrada? Esta acción es reversible reactivándola manualmente en BD. No ajustará el stock consolidado.');
    if (!ok) return;
    this.entradasService.eliminarEntrada(e.id, 'Eliminada desde UI').subscribe({
      next: () => {
        alert('Entrada eliminada (soft delete)');
        if (this.selectedProductIdEntradas) this.cargarEntradasPorProducto(this.selectedProductIdEntradas);
        this.cargarInventarioPorProducto();
        this.cargarValidosParaProductos();
        this.cargarDisminuciones();
      },
      error: (err) => {
        console.error('Error al eliminar entrada', err);
        alert('No se pudo eliminar la entrada');
      }
    });
  }

  // ==============================================
  // UI: Alertas de Entradas (por vencer / vencidas)
  // ==============================================
  cargarAlertasEntradas(dias: number = 15): void {
    this.diasAlertaPorVencer = dias;
    this.entradasService.porVencer(undefined, dias).subscribe({
      next: (lista) => this.alertasPorVencer = lista || [],
      error: () => this.alertasPorVencer = []
    });
    this.entradasService.vencidas().subscribe({
      next: (lista) => this.alertasVencidas = lista || [],
      error: () => this.alertasVencidas = []
    });
  }

  // Cargar disminución (consumo acumulado) por producto sumando SALIDA y CONSUMO_LOTE
  private cargarDisminuciones(): void {
    // Optimizado: una sola llamada al backend que retorna mapa productId -> disminución
    this.invProductoService.disminucionAgrupada().subscribe({
      next: (mapa) => {
        const m = new Map<number, number>();
        if (mapa) {
          Object.keys(mapa).forEach(k => {
            const id = Number(k);
            const v = Number((mapa as any)[k] ?? 0);
            if (!isNaN(id)) m.set(id, isNaN(v) ? 0 : v);
          });
        }
        this.disminucionAcumuladaMap = m;
      },
      error: () => this.disminucionAcumuladaMap = new Map<number, number>()
    });
  }

  private cargarValidosParaProductos(): void {
    // Optimizado: una sola llamada al backend que retorna mapa productId -> stock válido
    this.entradasService.stockValidoAgrupado().subscribe({
      next: (mapa) => {
        const m = new Map<number, number>();
        if (mapa) {
          Object.keys(mapa).forEach(k => {
            const id = Number(k);
            const v = Number((mapa as any)[k] ?? 0);
            if (!isNaN(id)) m.set(id, isNaN(v) ? 0 : v);
          });
        }
        this.stockValidoMap = m;
        (this as any).stockValidoLoaded = true;
        // Clasificar solicitudes en pendientes/atendidas según stock vigente
        this.classifyRechargeRequests();
        this.calcularAlertasProductos();
      },
      error: () => { this.stockValidoMap = new Map<number, number>(); (this as any).stockValidoLoaded = true; this.classifyRechargeRequests(); this.calcularAlertasProductos(); }
    });
  }

  ngOnInit(): void {
    const tabParamInit = (this.route.snapshot.queryParamMap.get('tab') || '').trim();
    this.botiquinOnly = tabParamInit === 'botiquin';
    if (this.botiquinOnly) {
      this.vistaActual = 'productos';
    }

    this.loadRelatedEntities();
    this.loadProducts();
    this.loadRechargeRequestsFromStorage();
    if (!this.botiquinOnly) {
      this.cargarStockReal();
      this.cargarInventarioPorProducto();
      this.cargarVencimientos();
      this.cargarDisminuciones();
    }
    this.cargarValidosParaProductos();

    // ✅ NUEVA FUNCIONALIDAD: Actualizar inventario automáticamente cada 30 segundos
    // cuando se está viendo la vista de inventario automático
    this.setupAutoRefresh();

    // ✅ Suscripción WebSocket: refrescar inventario en tiempo real ante cambios
    this.websocketService.connect().subscribe({
      next: () => {
        console.log('🔔 WS /topic/inventory-update recibido -> refrescando inventario');
        if (this.botiquinOnly) {
          this.loadProducts();
          this.cargarValidosParaProductos();
          this.loadRechargeRequestsFromStorage();
        } else {
          this.cargarStockReal();
          this.cargarInventarioPorProducto();
          this.cargarVencimientos();
          this.cargarValidosParaProductos();
          this.cargarDisminuciones();
          this.loadRechargeRequestsFromStorage();
        }
      }
    });

    // ✅ Leer la pestaña desde query params (?tab=productos|stock-real|entradas|alertas|botiquin)
    this.route.queryParamMap.subscribe(params => {
      const tabParam = (params.get('tab') || '').trim();
      const validTabs = ['productos', 'stock-real', 'entradas', 'alertas', 'botiquin'];
      const isBotiquin = tabParam === 'botiquin';
      const target = validTabs.includes(tabParam) ? (isBotiquin ? 'productos' : tabParam) : 'productos';
      this.botiquinOnly = isBotiquin;
      if (this.vistaActual !== (target as any)) this.cambiarVista(target as any);
      // Si ya tenemos productos cargados, aplicar filtro botiquín
      if (this.vistaActual === 'productos' && this.products && this.products.length > 0) {
        this.filteredProducts = this.botiquinOnly
          ? this.products.filter(p => (p as any)?.incluirEnBotiquin === true)
          : this.products;
      }

      // Abrir formulario de botiquín si viene indicado por query param
      const openFormParam = (params.get('openForm') || '').trim();
      if (openFormParam === 'botiquin') {
        // Asegurar que la vista objetivo es productos y luego abrir el formulario especializado
        setTimeout(() => this.openBotiquinForm());
        // Limpiar el query param para evitar reaperturas accidentales
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { openForm: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
      }
    });

    // Reaccionar al cambio de tipo de alimento para cargar subcategorías y toggles
    this.productForm.get('typeFood_id')?.valueChanges.subscribe((val) => this.onTypeFoodChange(val));
  }

  /**
   * Configurar actualización automática del inventario
   */
  private setupAutoRefresh(): void {
    // Actualizar cada 30 segundos en vistas relevantes
    setInterval(() => {
      if (!this.botiquinOnly && (this.vistaActual === 'stock-real' || this.vistaActual === 'productos')) {
        console.log('🔄 Auto-refresh: Actualizando stock real automáticamente...');
        this.cargarStockReal();
        this.cargarInventarioPorProducto();
        this.cargarVencimientos();
        this.cargarValidosParaProductos();
        this.cargarDisminuciones();
      } else if (this.botiquinOnly) {
        this.cargarValidosParaProductos();
      }
    }, 30000); // 30 segundos
  }

  loadProducts(): void {
    this.isLoading = true;
    this.productService.getProducts().subscribe({
      next: (data) => {
        console.log('Productos cargados:', data);
        this.products = data;
        this.filteredProducts = this.botiquinOnly
          ? data.filter(p => (p as any)?.incluirEnBotiquin === true)
          : data;
        this.isLoading = false;
        this.recalcularResumenCantidadReal();
        this.cargarInventarioPorProducto();
        this.cargarValidosParaProductos();
        this.loadRechargeRequestsFromStorage();
      },
      error: (error) => {
        console.error('Error al cargar productos:', error);
        this.isLoading = false;
      }
    });
  }

  loadRelatedEntities(): void {
    this.isLoading = true;

    // Cargar proveedores
    this.productService.getProviders().subscribe({
      next: (data) => {
        console.log('Proveedores cargados:', data);
        this.providers = data;
      },
      error: (err) => console.error('Error al cargar proveedores:', err)
    });

    // Cargar tipos de alimentos
    this.productService.getTypeFoods().subscribe({
      next: (data) => {
        console.log('Tipos de alimentos cargados:', data);
        this.typeFoods = data;
      },
      error: (err) => console.error('Error al cargar tipos de alimentos:', err)
    });

    // Cargar unidades de medida
    this.productService.getUnitMeasurements().subscribe({
      next: (data) => {
        console.log('Unidades de medida cargadas:', data);
        this.unitMeasurements = data;
      },
      error: (err) => console.error('Error al cargar unidades de medida:', err)
    });

    // Cargar animales
    this.productService.getAnimals().subscribe({
      next: (data) => {
        console.log('Animales cargados:', data);
        this.animals = data;
      },
      error: (err) => console.error('Error al cargar animales:', err)
    });

    // Cargar etapas
    this.productService.getStages().subscribe({
      next: (data) => {
        console.log('Etapas cargadas:', data);
        this.stages = data;
      },
      error: (err) => {
        console.error('Error al cargar etapas:', err);
      }
    });

    // Cargar catálogo de nombres de productos (configuración general)
    this.productService.getNombreProductos().subscribe({
      next: (data) => {
        console.log('Nombre de productos cargados:', data);
        this.nombreProductos = data || [];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error al cargar nombres de productos:', err);
        this.nombreProductos = [];
        this.isLoading = false;
      }
    });
  }

  /**
   * Cargar análisis de inventario
   */
  cargarAnalisisInventario(): void {
    this.cargandoAnalisis = true;
    const animalId = this.animalIdAnalisis ?? 1;
    this.analisisService.getAnalisisInventario(animalId).subscribe({
      next: (analisis) => {
        this.analisisInventario = analisis;
        this.cargandoAnalisis = false;
        console.log('Análisis de inventario cargado:', analisis);
      },
      error: (error) => {
        console.error('Error al cargar análisis de inventario:', error);
        this.cargandoAnalisis = false;
      }
    });
  }

  private cargarAnalisisComparativo(): void {
    // Cargar análisis para Pollos (1) y Chanchos (2) en paralelo
    this.analisisService.getAnalisisInventario(1).subscribe({
      next: (a) => this.analisisPollos = a,
      error: () => this.analisisPollos = null
    });
    this.analisisService.getAnalisisInventario(2).subscribe({
      next: (a) => this.analisisChanchos = a,
      error: () => this.analisisChanchos = null
    });
  }

  onAnimalAnalisisChange(): void {
    this.cargarAnalisisInventario();
  }
  
  /**
   * Cambiar entre vistas
   */
  cambiarVista(vista: 'productos' | 'analisis' | 'stock-real' | 'entradas' | 'alertas'): void {
    this.vistaActual = vista;
    // Desbloquear selector de producto al cambiar de vista
    if (vista !== 'entradas') {
      this.productoEntradasBloqueado = false;
    }
    // La vista de análisis fue trasladada a 'Análisis Financiero'
    if (vista === 'stock-real') {
      this.cargarStockReal();
      this.cargarInventarioPorProducto();
      this.cargarVencimientos();
      this.cargarValidosParaProductos();
      this.cargarDisminuciones();
    }
    if (vista === 'productos') {
      // Al entrar a Productos, refrescar productos e inventario real inmediatamente
      this.loadProducts();
      this.cargarInventarioPorProducto();
      this.cargarVencimientos();
      this.cargarValidosParaProductos();
      this.cargarDisminuciones();
    }
    if (vista === 'entradas') {
      // Preparar listas de productos si aún no
      if (!this.products || this.products.length === 0) this.loadProducts();
      // Ocultar formulario por defecto al entrar a la pestaña
      this.mostrarFormularioEntrada = false;
      // Cargar todas las entradas para el listado principal
      this.cargarTodasLasEntradas();
      // Asegurar que 'Cantidad Real' esté actualizada
      this.cargarValidosParaProductos();
    }
    if (vista === 'alertas') {
      this.cargarAlertasEntradas(this.diasAlertaPorVencer);
      // Cargar inventarios con stock bajo para panel de Alertas
      this.inventarioService.obtenerInventariosStockBajo().subscribe({
        next: (stockBajo) => this.inventariosStockBajo = stockBajo,
        error: () => this.inventariosStockBajo = []
      });
    }
  }
  
  /**
   * Obtener indicador de tendencia
   */
  getTendencia(valores: number[]): 'up' | 'down' | 'stable' {
    if (valores.length < 2) return 'stable';
    
    const ultimo = valores[valores.length - 1];
    const penultimo = valores[valores.length - 2];
    
    if (ultimo > penultimo) return 'up';
    if (ultimo < penultimo) return 'down';
    return 'stable';
  }
  
  /**
   * Formatear número con separadores de miles
   */
  formatearNumero(numero: number): string {
    return numero.toLocaleString('es-ES', { maximumFractionDigits: 2 });
  }

  getTotalesCostosCategorias(): { alimentacion: number; sanidad: number; variables: number; manoObra: number; logistica: number; fijos: number; total: number } {
    const base = { alimentacion: 0, sanidad: 0, variables: 0, manoObra: 0, logistica: 0, fijos: 0, total: 0 };
    const lista = this.analisisInventario?.analisisPorLote || [];
    for (const item of lista) {
      const c = (item as any)?.costos || {};
      base.alimentacion += Number(c.alimentacion || 0);
      base.sanidad += Number(c.sanidad || 0);
      base.variables += Number(c.variables || 0);
      base.manoObra += Number(c.manoObra || 0);
      base.logistica += Number(c.logistica || 0);
      base.fijos += Number(c.fijos || 0);
    }
    base.total = base.alimentacion + base.sanidad + base.variables + base.manoObra + base.logistica + base.fijos;
    const r = (n: number) => Math.round(n * 100) / 100;
    return { alimentacion: r(base.alimentacion), sanidad: r(base.sanidad), variables: r(base.variables), manoObra: r(base.manoObra), logistica: r(base.logistica), fijos: r(base.fijos), total: r(base.total) };
  }
  
  /**
   * Obtener clase CSS para el estado del lote
   */
  getClaseEstado(estado: string): string {
    return estado === 'activo' ? 'text-green-600' : 'text-red-600';
  }
  
  /**
   * Obtener color para el rendimiento
   */
  getColorRendimiento(rendimiento: number): string {
    if (rendimiento >= 80) return 'text-green-600';
    if (rendimiento >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }
  
  /**
   * Obtener color para la rentabilidad
   */
  getColorRentabilidad(rentabilidad: number): string {
    if (rentabilidad >= 20) return 'text-green-600';
    if (rentabilidad >= 10) return 'text-yellow-600';
    return 'text-red-600';
  }
  
  // ============================================================================
  // MÉTODOS PARA INVENTARIO AUTOMÁTICO CON DISMINUCIÓN
  // ============================================================================
  
  getStockOriginalPorTipo(inventario: InventarioAlimento): number {
    if (!inventario?.tipoAlimento?.id) return Number(inventario?.cantidadOriginal ?? 0);
    const typeId = inventario.tipoAlimento.id;
    let suma = 0;
    for (const p of this.products || []) {
      const pid = p?.typeFood?.id ?? p?.typeFood_id;
      if (pid === typeId) {
        suma += Number(p?.quantity ?? 0);
      }
    }
    return suma > 0 ? suma : Number(inventario?.cantidadOriginal ?? 0);
  }

  getStockActualPorTipo(inventario: InventarioAlimento): number {
    if (!inventario?.tipoAlimento?.id) return Number(inventario?.cantidadStock ?? 0);
    const typeId = inventario.tipoAlimento.id;
    let suma = 0;
    for (const p of this.products || []) {
      const pid = p?.typeFood?.id ?? p?.typeFood_id;
      if (pid === typeId && p?.id != null) {
        const val = this.stockValidoMap.get(p.id);
        suma += Number(val ?? 0);
      }
    }
    return suma > 0 ? suma : Number(inventario?.cantidadStock ?? 0);
  }

  getConsumido(inventario: InventarioAlimento): number {
    const original = this.getStockOriginalPorTipo(inventario);
    const actual = this.getStockActualPorTipo(inventario);
    const diff = Number(original) - Number(actual);
    return diff > 0 ? diff : 0;
  }

  // Total consumido por tipo (sumando movimientos de SALIDA/CONSUMO_LOTE por producto)
  getConsumidoPorTipo(inventario: InventarioAlimento): number {
    if (!inventario?.tipoAlimento?.id) return this.getConsumido(inventario);
    const typeId = inventario.tipoAlimento.id;
    let suma = 0;
    for (const p of this.products || []) {
      const pidType = p?.typeFood?.id ?? p?.typeFood_id;
      if (pidType === typeId && p?.id != null) {
        const val = Number(this.disminucionAcumuladaMap.get(p.id) ?? 0);
        if (!isNaN(val)) suma += val;
      }
    }
    // Fallback a diferencia si no hay movimientos cargados
    if (suma === 0) return this.getConsumido(inventario);
    return suma;
  }
  
  /**
   * Cargar Stock Real usando datos FEFO (fuente de verdad: entradas vigentes)
   */
  cargarStockReal(): void {
    console.log('📊 Cargando Stock Real (FEFO)...');
    
    // El stock real se calcula desde entradas vigentes (stockValidoMap)
    // No usamos la tabla obsoleta inventario_alimento
    this.cargarValidosParaProductos();
    this.cargarDisminuciones();
    
    // Cargar inventarios con stock bajo (para alertas)
    this.inventarioService.obtenerInventariosStockBajo().subscribe({
      next: (stockBajo) => {
        console.log('⚠️ Inventarios con stock bajo:', stockBajo);
        this.inventariosStockBajo = stockBajo;
      },
      error: (error) => {
        console.error('❌ Error cargando stock bajo:', error);
        this.inventariosStockBajo = [];
      }
    });
    
    // Recalcular alertas de productos
    this.calcularAlertasProductos();
  }

  // Productos con stock agotado (cantidad real = 0)
  productosAgotados: Product[] = [];
  // Productos con stock crítico (< mínimo pero > 0)
  productosCriticos: Product[] = [];
  // Peticiones de reposición atendidas (historial)
  peticionesAtendidas: Array<{ producto: string; cantidad: number; fecha: Date; usuario: string }> = [];

  /**
   * Calcular alertas de productos basado en stock FEFO real
   */
  calcularAlertasProductos(): void {
    const agotados: Product[] = [];
    const criticos: Product[] = [];
    
    for (const p of this.products || []) {
      if (!p?.id) continue;
      const stockReal = this.getCantidadRealProducto(p);
      const stockMinimo = Number(p.level_min ?? 0);
      
      if (stockReal <= 0.001) {
        agotados.push(p);
      } else if (stockMinimo > 0 && stockReal <= stockMinimo) {
        criticos.push(p);
      }
    }
    
    this.productosAgotados = agotados;
    this.productosCriticos = criticos;
    console.log(`📊 Alertas: ${agotados.length} agotados, ${criticos.length} críticos`);
    const alertas: AlertaInventario[] = [
      ...agotados.map(p => ({
        tipo: 'agotado' as const,
        producto: p.name || 'Producto',
        productId: p.id,
        mensaje: `${p.name || 'Producto'} sin stock`,
        prioridad: 'alta' as const,
        stockActual: 0,
        stockMinimo: Number(p.level_min ?? 0)
      })),
      ...criticos.map(p => ({
        tipo: 'critico' as const,
        producto: p.name || 'Producto',
        productId: p.id,
        mensaje: `${p.name || 'Producto'} con stock crítico`,
        prioridad: 'media' as const,
        stockActual: this.getCantidadRealProducto(p),
        stockMinimo: Number(p.level_min ?? 0)
      }))
    ];
    this.notificacionesService.actualizarContadoresStock(agotados.length, criticos.length, alertas);
  }

  /**
   * Obtener el estado del stock de un producto
   */
  getEstadoStockProducto(product: Product): 'NORMAL' | 'BAJO' | 'AGOTADO' {
    if (!product?.id) return 'NORMAL';
    const stockReal = this.getCantidadRealProducto(product);
    const stockMinimo = Number(product.level_min ?? 0);
    
    if (stockReal <= 0.001) return 'AGOTADO';
    if (stockMinimo > 0 && stockReal <= stockMinimo) return 'BAJO';
    return 'NORMAL';
  }

  /**
   * Calcular porcentaje de stock disponible por producto
   */
  getPorcentajeStockProducto(product: Product): number {
    if (!product?.id) return 0;
    const stockReal = this.getCantidadRealProducto(product);
    const stockOriginal = Number(product.quantity ?? 0);
    if (stockOriginal <= 0) return stockReal > 0 ? 100 : 0;
    return Math.min(100, Math.round((stockReal / stockOriginal) * 100));
  }

  /**
   * Obtener cantidad sugerida para reponer (hasta alcanzar stock mínimo * 1.5)
   */
  getCantidadSugerida(product: Product): number {
    if (!product?.id) return 0;
    const stockReal = this.getCantidadRealProducto(product);
    const stockMinimo = Number(product.level_min ?? 0);
    if (stockMinimo <= 0) return 50; // Valor por defecto si no hay mínimo
    const objetivo = stockMinimo * 1.5; // Objetivo: 150% del mínimo
    const faltante = objetivo - stockReal;
    return Math.max(0, Math.round(faltante * 100) / 100);
  }

  /**
   * Obtener producto por ID (útil para templates)
   */
  getProductoById(productId: number | null): Product | null {
    if (!productId) return null;
    return this.products.find(p => p.id === productId) || null;
  }

  /**
   * Crear datos de ejemplo para el inventario (para pruebas)
   */
  crearDatosEjemplo(): void {
    console.log('🔧 Creando datos de ejemplo...');
    
    this.inventarioService.crearDatosEjemplo().subscribe({
      next: (response) => {
        console.log('✅ Datos de ejemplo creados:', response);
        alert('Datos de ejemplo creados exitosamente. Actualizando inventario...');
        
        // Recargar el inventario después de crear los datos
        this.cargarStockReal();
      },
      error: (error) => {
        console.error('❌ Error creando datos de ejemplo:', error);
        alert('Error al crear datos de ejemplo. Verifique la consola para más detalles.');
      }
    });
  }
  
  /**
   * Ver movimientos de un producto específico
   */
  verMovimientos(inventario: InventarioAlimento): void {
    console.log('📋 Consultando movimientos para:', inventario.tipoAlimento.name);
    
    // En este caso necesitamos los movimientos por tipo de alimento, no por lote
    // Por ahora mostramos la información básica
    this.movimientosSeleccionados = [];
    
    alert(`Producto: ${inventario.tipoAlimento.name}\nStock Actual: ${inventario.cantidadStock} ${inventario.unidadMedida}\nStock Mínimo: ${inventario.stockMinimo} ${inventario.unidadMedida}`);
  }
  
  /**
   * Calcular porcentaje de stock usado
   */
  calcularPorcentajeUsado(inventario: InventarioAlimento): number {
    if (!inventario.cantidadOriginal || inventario.cantidadOriginal === 0) {
      return 0;
    }
    
    const usado = inventario.cantidadOriginal - inventario.cantidadStock;
    return (usado / inventario.cantidadOriginal) * 100;
  }
  
  /**
   * Obtener color del indicador de stock
   */
  getColorStock(inventario: InventarioAlimento): string {
    const actual = this.getStockActualPorTipo(inventario);
    const minimo = this.getStockMinimoPorTipo(inventario) || 1;
    const porcentajeVsMin = (actual / minimo) * 100;
    if (porcentajeVsMin <= 100) return 'bg-red-500'; // Stock crítico
    if (porcentajeVsMin <= 150) return 'bg-yellow-500'; // Stock bajo
    return 'bg-green-500'; // Stock normal
  }
  
  /**
   * Obtener estado del stock
   */
  getEstadoStock(inventario: InventarioAlimento): string {
    const actual = this.getStockActualPorTipo(inventario);
    const minimo = this.getStockMinimoPorTipo(inventario);
    if (actual <= minimo) {
      return 'CRÍTICO';
    } else if (actual <= minimo * 1.5) {
      return 'BAJO';
    }
    return 'NORMAL';
  }
  
  searchProducts(): void {
    const filter = this.searchForm.value;
    
    // Si no hay filtros, mostrar todos los productos
    if (!filter.name && !filter.providerId && !filter.typeFoodId && 
        !filter.animalId && !filter.stageId) {
      this.filteredProducts = this.products;
      return;
    }
    
    // Filtrar localmente si ya tenemos los productos cargados
    this.filteredProducts = this.products.filter(product => {
      let matches = true;
      
      if (filter.name && !product.name.toLowerCase().includes(filter.name.toLowerCase())) {
        matches = false;
      }
      
      if (filter.providerId && product.provider?.id !== parseInt(filter.providerId)) {
        matches = false;
      }
      
      if (filter.typeFoodId && product.typeFood?.id !== parseInt(filter.typeFoodId)) {
        matches = false;
      }
      
      if (filter.animalId && product.animal?.id !== parseInt(filter.animalId)) {
        matches = false;
      }
      
      if (filter.stageId && product.stage?.id !== parseInt(filter.stageId)) {
        matches = false;
      }
      
      return matches;
    });
  }
  
  openForm(isEdit: boolean = false, product?: Product): void {
    this.isEditMode = isEdit;
    this.showForm = true;
    
    if (isEdit && product) {
      this.selectedProduct = product;
      this.productForm.patchValue({
        id: product.id,
        name: product.name,
        description: (product as any)?.description || '',
        quantity: product.quantity,
        price_unit: product.price_unit,
        number_facture: product.number_facture,
        date_compra: product.date_compra ? new Date(product.date_compra).toISOString().split('T')[0] : null,
        level_min: product.level_min,
        level_max: product.level_max,
        provider_id: product.provider?.id || product.provider_id,
        typeFood_id: product.typeFood?.id || product.typeFood_id,
        unitMeasurement_id: product.unitMeasurement?.id || product.unitMeasurement_id,
        animal_id: product.animal?.id || product.animal_id,
        stage_id: product.stage?.id || product.stage_id,
        subcategory_id: (product as any)?.subcategory?.id || (product as any)?.subcategory_id || null,
        incluirEnBotiquin: (product as any)?.incluirEnBotiquin || false,
        usoPrincipal: (product as any)?.usoPrincipal || '',
        dosisRecomendada: (product as any)?.dosisRecomendada || '',
        viaAdministracion: (product as any)?.viaAdministracion || '',
        tiempoRetiro: (product as any)?.tiempoRetiro ?? null,
        fechaVencimiento: (product as any)?.fechaVencimiento ? this.dateToInput((product as any).fechaVencimiento) : null,
        observacionesMedicas: (product as any)?.observacionesMedicas || '',
        presentacion: (product as any)?.presentacion || '',
        infoNutricional: (product as any)?.infoNutricional || ''
      });
      // Ajustar UI de subcategorías y toggles
      this.onTypeFoodChange(this.productForm.get('typeFood_id')?.value);
    } else {
      this.selectedProduct = null;
      this.productForm.reset();
      this.subcategories = [];
      this.showMedicamentos = false;
      this.showAlimentos = false;
    }
  }

  // Función específica para abrir el formulario en modo botiquín
  openBotiquinForm(): void {
    this.isEditMode = false;
    this.showForm = true;
    this.selectedProduct = null;
    
    // Reset del formulario
    this.productForm.reset();
    this.subcategories = [];
    
    // Pre-configurar para productos de botiquín
    this.productForm.patchValue({
      incluirEnBotiquin: true,
      date_compra: new Date().toISOString().split('T')[0], // Fecha actual
      quantity: 1, // Cantidad inicial
      level_min: 1, // Nivel mínimo por defecto
    });
    
    // Activar la sección de medicamentos por defecto
    this.showMedicamentos = true;
    this.showAlimentos = false;
    
    // Pre-seleccionar categoría "Medicinas" si existe
    const medicinaCategory = this.typeFoods.find(tf => 
      tf.name?.toLowerCase().includes('medicina') || 
      tf.name?.toLowerCase().includes('medicamento') ||
      tf.name?.toLowerCase().includes('veterinario')
    );
    
    if (medicinaCategory) {
      this.productForm.patchValue({
        typeFood_id: medicinaCategory.id
      });
      this.onTypeFoodChange(medicinaCategory.id);
    }
    
    console.log('🏥 Formulario abierto en modo Botiquín - incluirEnBotiquin: true, sección medicamentos activada');
  }
  
  closeForm(): void {
    this.showForm = false;
    this.productForm.reset();
    this.selectedProduct = null;
  }
  
  saveProduct(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      console.log('Formulario inválido:', this.productForm.value);
      console.log('Errores:', this.getFormValidationErrors());
      return;
    }
    
    const productData = this.productForm.value;
    
    // Verificar datos críticos antes de enviar
    if (!productData.name || productData.name.trim() === '') {
      console.error('El nombre del producto es obligatorio');
      alert('Por favor, ingrese un nombre para el producto');
      return;
    }
    
    this.isLoading = true;
    
    if (this.isEditMode && this.selectedProduct) {
      // Para editar, se necesita el ID del producto
      productData.id = this.selectedProduct.id;
      
      // Asegurarse de que los tipos de datos son correctos
      this.convertFormDataTypes(productData);
      
      this.productService.updateProduct(productData).subscribe({
        next: () => {
          this.loadProducts();
          this.closeForm();
        },
        error: (err) => {
          console.error('Error al actualizar producto', err);
          this.isLoading = false;
          alert('Error al actualizar producto: ' + (err.error || 'Ocurrió un error inesperado'));
        }
      });
    } else {
      // Asegurarse de que los tipos de datos son correctos
      this.convertFormDataTypes(productData);
      
      // Logging especial para productos de botiquín
      if (productData.incluirEnBotiquin) {
        console.log('🏥 Creando producto para Botiquín:', {
          nombre: productData.name,
          categoria: productData.typeFood_id,
          usoPrincipal: productData.usoPrincipal,
          incluirEnBotiquin: productData.incluirEnBotiquin
        });
      }
      
      console.log('Enviando producto:', productData);
      
      this.productService.createProduct(productData).subscribe({
        next: () => {
          // Mensaje específico para productos de botiquín
          if (productData.incluirEnBotiquin) {
            console.log('✅ Producto agregado exitosamente al Botiquín');
            // Mostrar mensaje de éxito específico para botiquín
            if (this.botiquinOnly) {
              alert('🏥 ¡Producto agregado exitosamente al Botiquín Veterinario!\n\nEl producto ya está disponible para uso en emergencias.');
            }
          }
          this.loadProducts();
          this.closeForm();
        },
        error: (err) => {
          console.error('Error al crear producto', err);
          this.isLoading = false;
          alert('Error al crear producto: ' + (err.error || 'Ocurrió un error inesperado'));
        }
      });
    }
  }
  
  // Método para asegurar los tipos de datos correctos antes de enviar al backend
  convertFormDataTypes(product: any): void {
    product.quantity = Number(product.quantity);
    product.price_unit = Number(product.price_unit);
    product.number_facture = Number(product.number_facture);
    product.level_min = Number(product.level_min);
    product.level_max = Number(product.level_max);
    product.provider_id = Number(product.provider_id);
    product.typeFood_id = Number(product.typeFood_id);
    product.unitMeasurement_id = Number(product.unitMeasurement_id);
    product.animal_id = Number(product.animal_id);
    product.stage_id = Number(product.stage_id);
    if (product.subcategory_id != null) product.subcategory_id = Number(product.subcategory_id);
    product.incluirEnBotiquin = !!product.incluirEnBotiquin;
    if (product.tiempoRetiro != null && product.tiempoRetiro !== '') product.tiempoRetiro = Number(product.tiempoRetiro);
    
    // Si la fecha viene como string, convertirla a Date
    if (product.date_compra && typeof product.date_compra === 'string') {
      product.date_compra = new Date(product.date_compra);
    }
    if (product.fechaVencimiento && typeof product.fechaVencimiento === 'string') {
      product.fechaVencimiento = new Date(product.fechaVencimiento);
    }
  }

  private onTypeFoodChange(typeFoodId: any): void {
    const id = Number(typeFoodId);
    if (!id || isNaN(id)) {
      this.subcategories = [];
      this.productForm.patchValue({ subcategory_id: null });
      this.showMedicamentos = false;
      this.showAlimentos = false;
      this.subcategoryInfo = '';
      return;
    }
    // Cargar subcategorías
    this.productService.getSubcategoriesByTypeFood(id).subscribe({
      next: (subs) => this.subcategories = subs || [],
      error: () => this.subcategories = []
    });
    // Toggles por nombre del tipo
    const tfName = (this.typeFoods.find(t => t.id === id)?.name || '').toLowerCase();
    this.showMedicamentos = tfName.includes('medic') || tfName.includes('sanid') || tfName.includes('farm');
    this.showAlimentos = tfName.includes('alimen') || tfName.includes('balance');

    // Reglas de validación para campos de medicamentos
    const setRequired = (ctrl: string, required: boolean) => {
      const c = this.productForm.get(ctrl);
      if (!c) return;
      if (required) c.addValidators([Validators.required]); else c.clearValidators();
      c.updateValueAndValidity({ emitEvent: false });
    };
    const meds = this.showMedicamentos;
    setRequired('usoPrincipal', meds);
    setRequired('dosisRecomendada', meds);
    setRequired('viaAdministracion', meds);
    setRequired('tiempoRetiro', meds);
    setRequired('fechaVencimiento', meds);
    this.subcategoryInfo = meds ? '💊 Campos adicionales para medicamentos' : (this.showAlimentos ? '🌾 Puede agregar información nutricional' : '');
  }
  
  // Método auxiliar para depuración de errores de validación
  getFormValidationErrors() {
    const result: any = {};
    Object.keys(this.productForm.controls).forEach(key => {
      const control = this.productForm.get(key);
      if (control && control.errors) {
        result[key] = control.errors;
      }
    });
    return result;
  }
  
  deleteProduct(id: number): void {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      this.isLoading = true;
      this.productService.deleteProduct(id).subscribe({
        next: () => {
          this.loadProducts();
        },
        error: (err) => {
          console.error('Error al eliminar producto', err);
          this.isLoading = false;
        }
      });
    }
  }
  
  // Helpers para mostrar nombres en lugar de IDs - actualizados para manejar valores indefinidos
  getProviderName(id: number | undefined): string {
    if (!id) return 'No disponible';
    const provider = this.providers.find(p => p.id === id);
    return provider ? provider.name : 'No disponible';
  }
  
  getTypeFoodName(id: number | undefined): string {
    if (!id) return 'No disponible';
    const typeFood = this.typeFoods.find(t => t.id === id);
    return typeFood ? typeFood.name : 'No disponible';
  }
  
  getUnitMeasurementName(id: number | undefined): string {
    if (!id) return 'No disponible';
    const unit = this.unitMeasurements.find(u => u.id === id);
    return unit ? unit.name : 'No disponible';
  }
  
  // Unidad base del producto seleccionado para guiar el ingreso de contenido por unidad
  getUnidadBaseProducto(productId: number | null): string {
    if (!productId) return 'unidad';
    const p = this.products.find(x => x.id === productId);
    const nombre = p?.unitMeasurement?.name || (p?.unitMeasurement_id ? this.getUnitMeasurementName(p.unitMeasurement_id) : null);
    return nombre || 'unidad';
  }
  
  getAnimalName(id: number | undefined): string {
    if (!id) return 'No disponible';
    const animal = this.animals.find(a => a.id === id);
    return animal ? animal.name : 'No disponible';
  }
  
  getStageName(id: number | undefined): string {
    if (!id) return 'No disponible';
    const stage = this.stages.find(s => s.id === id);
    return stage ? stage.name : 'No disponible';
  }

  // ==============================
  // Botiquín: helpers y estadísticas
  // ==============================
  getProductosBotiquin(): Product[] {
    return (this.products || []).filter(p => (p as any)?.incluirEnBotiquin === true);
  }

  private normalizarTexto(v: any): string {
    return (v ?? '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  getBotEstado(p: Product): 'ok' | 'alerta' | 'bajo' | 'agotado' {
    const actual = this.getCantidadRealProducto(p);
    const minimo = Number((p as any)?.level_min ?? 0) || 0;
    if (actual <= 0) return 'agotado';
    if (actual < minimo) return 'bajo';
    if (minimo > 0 && actual <= minimo * 1.2) return 'alerta';
    return 'ok';
  }

  getBotEstadoMeta(p: Product): { icon: string; colorClass: string; texto: string } {
    const estado = this.getBotEstado(p);
    switch (estado) {
      case 'agotado': return { icon: '🔴', colorClass: 'text-red-600', texto: 'AGOTADO' };
      case 'bajo': return { icon: '⚠️', colorClass: 'text-orange-600', texto: 'BAJO' };
      case 'alerta': return { icon: '⚡', colorClass: 'text-yellow-600', texto: 'ALERTA' };
      default: return { icon: '✅', colorClass: 'text-green-600', texto: 'OK' };
    }
  }

  getBotStats(): { total: number; ok: number; alerta: number; bajo: number; agotado: number } {
    const lista = this.getProductosBotiquin();
    let ok = 0, alerta = 0, bajo = 0, agotado = 0;
    for (const p of lista) {
      const e = this.getBotEstado(p);
      if (e === 'ok') ok++; else if (e === 'alerta') alerta++; else if (e === 'bajo') bajo++; else agotado++;
    }
    return { total: lista.length, ok, alerta, bajo, agotado };
  }

  getProductosBotiquinFiltrados(): Product[] {
    const lista = this.getProductosBotiquin();
    const search = this.normalizarTexto(this.botSearch);
    return lista.filter(p => {
      // Filtro por categoría (TypeFood.name)
      const catName = this.normalizarTexto(p?.typeFood?.name || this.getTypeFoodName(p?.typeFood_id));
      const cumpleCat = this.botFiltroCategoria === 'todos' || catName === this.normalizarTexto(this.botFiltroCategoria);
      // Filtro por estado
      const estado = this.getBotEstado(p);
      const cumpleEstado = this.botFiltroEstado === 'todos' || estado === this.botFiltroEstado;
      // Búsqueda en varios campos
      const nombre = this.normalizarTexto(p?.name);
      const uso = this.normalizarTexto((p as any)?.usoPrincipal);
      const dosis = this.normalizarTexto((p as any)?.dosisRecomendada);
      const via = this.normalizarTexto((p as any)?.viaAdministracion);
      const subcat = this.normalizarTexto((p as any)?.subcategory?.name);
      const cumpleSearch = !search || [nombre, uso, dosis, via, subcat, catName].some(x => x.includes(search));
      return cumpleCat && cumpleEstado && cumpleSearch;
    });
  }

  trackByProductId(index: number, p: Product): number {
    return p?.id ?? index;
  }

  resetFilters(): void {
    this.searchForm.reset();
    this.filteredProducts = this.products;
    this.recalcularResumenCantidadReal();
  }

  /**
   * Calcular porcentaje de stock disponible
   */
  calcularPorcentajeStock(inventario: InventarioAlimento): number {
    const original = this.getStockOriginalPorTipo(inventario);
    const actual = this.getStockActualPorTipo(inventario);
    const base = original || actual || 1;
    const porcentaje = (actual / base) * 100;
    return Math.min(100, Math.round(porcentaje));
  }

  /**
   * Contar inventarios por estado
   */
  contarInventariosPorEstado(estado: string): number {
    return this.inventarioAlimentos.filter(inv => this.getEstadoStock(inv) === estado).length;
  }

  // ======================================================
  // Cálculo de Cantidad Real por Tipo de Alimento
  // ======================================================
  private recalcularResumenCantidadReal(): void {
    const mapaOriginalPorTipo = new Map<number, { nombre: string; total: number }>();

    // Acumular cantidades originales por TypeFood a partir de los productos filtrados
    for (const p of this.filteredProducts) {
      const typeId = p.typeFood?.id ?? p.typeFood_id;
      if (!typeId) continue;
      const nombre = p.typeFood?.name || this.getTypeFoodName(typeId);
      const actual = mapaOriginalPorTipo.get(typeId) || { nombre, total: 0 };
      actual.total += Number(p.quantity || 0);
      mapaOriginalPorTipo.set(typeId, actual);
    }

    // Construir resumen cruzando con inventarioAlimentos (stock real)
    const resultado: Array<{
      typeFoodId: number;
      typeFoodName: string;
      cantidadOriginal: number;
      cantidadActual: number;
      consumido: number;
      unidadMedida: string;
    }> = [];

    for (const [typeFoodId, info] of mapaOriginalPorTipo.entries()) {
      const inv = this.inventarioAlimentos.find(i => i.tipoAlimento?.id === typeFoodId);
      const cantidadActual = Number(inv?.cantidadStock ?? 0);
      const unidad = inv?.unidadMedida || 'kg';
      const original = Number(info.total || 0);
      const consumido = Math.max(original - cantidadActual, 0);
      resultado.push({
        typeFoodId,
        typeFoodName: info.nombre,
        cantidadOriginal: original,
        cantidadActual,
        consumido,
        unidadMedida: unidad
      });
    }

    // Ordenar por nombre para visual ordenada
    resultado.sort((a, b) => a.typeFoodName.localeCompare(b.typeFoodName));
    this.resumenCantidadReal = resultado;
  }

  // ======================================================
  // Cantidad Real y Disminución para la tabla de Productos
  // ======================================================
  getCantidadRealProducto(product: Product): number {
    // Mostrar DISPONIBLE (no vencido) calculado desde entradas válidas (no vencidas)
    if (!product?.id) return 0;
    const cargado = (this as any).stockValidoLoaded === true;
    const val = this.stockValidoMap.get(product.id);
    if (cargado) {
      // Si ya cargamos stock válido, el ID ausente equivale a 0 vigente
      return Number(val ?? 0);
    }
    // Antes de cargar el mapa de válidos podemos mostrar el consolidado como placeholder
    const alt = this.inventarioProductoMap.get(product.id);
    return Number(alt ?? 0);
  }

  getDisminucionProducto(product: Product): number {
    if (!product?.id) return 0;
    return Number(this.disminucionAcumuladaMap.get(product.id) ?? 0);
  }

  getVencidoProducto(product: Product): number {
    if (!product?.id) return 0;
    return Number(this.stockVencidoMap.get(product.id) ?? 0);
  }

  getPorVencerProducto(product: Product): number {
    if (!product?.id) return 0;
    return Number(this.stockPorVencerMap.get(product.id) ?? 0);
  }

  getStockTotalProducto(product: Product): number {
    if (!product?.id) return 0;
    return Number(this.inventarioProductoMap.get(product.id) ?? 0);
  }

  hasStockMismatch(product: Product): boolean {
    if (!product?.id) return false;
    const real = this.getCantidadRealProducto(product);
    const base = this.getStockTotalProducto(product);
    return Math.abs(real - base) > 0.01; // tolerancia
  }

  getStockMismatchTooltip(product: Product): string {
    const real = this.getCantidadRealProducto(product);
    const base = this.getStockTotalProducto(product);
    return `Desfase detectado: real=${real.toFixed(2)} vs consolidado=${base.toFixed(2)}. Use “Actualizar” o registre entradas/consumos para sincronizar.`;
  }

  private cargarVencimientos(): void {
    // Cargar vencidas global y agrupar por producto
    this.entradasService.vencidas().subscribe({
      next: (lista) => {
        const map = new Map<number, number>();
        for (const e of (lista || [])) {
          const pid = (e as any)?.product?.id;
          if (pid != null) {
            const suma = Number(e?.stockBaseRestante ?? 0);
            map.set(pid, Number(map.get(pid) ?? 0) + suma);
          }
        }
        this.stockVencidoMap = map;
      },
      error: () => {
        this.stockVencidoMap = new Map();
      }
    });
    // Cargar por vencer (15 días por defecto)
    this.entradasService.porVencer(undefined, this.diasAlertaPorVencer).subscribe({
      next: (lista) => {
        const map = new Map<number, number>();
        for (const e of (lista || [])) {
          const pid = (e as any)?.product?.id;
          if (pid != null) {
            const suma = Number(e?.stockBaseRestante ?? 0);
            map.set(pid, Number(map.get(pid) ?? 0) + suma);
          }
        }
        this.stockPorVencerMap = map;
      },
      error: () => {
        this.stockPorVencerMap = new Map();
      }
    });
  }

  // Abrir formulario para reponer el producto cuando la cantidad real llegue a 0
  reponerProducto(product: Product): void {
    // Llevar al usuario a Entradas con el producto preseleccionado para crear una entrada VIGENTE (FEFO)
    if (!product?.id) return;
    this.vistaActual = 'entradas';
    this.abrirFormularioNuevaEntrada(product);
  }

  // Acción rápida para la vista Productos: refrescar listado y cantidad real
  actualizarProductosYStock(): void {
    this.loadProducts();
    this.cargarInventarioPorProducto();
    this.cargarDisminuciones();
    this.cargarValidosParaProductos();
  }

  // Sincronizar inventarios: crear faltantes y registrar entradas iniciales
  sincronizarInventario(): void {
    if (this.isLoading) return;
    this.isLoading = true;
    this.invProductoService.sincronizar(true).subscribe({
      next: (res) => {
        console.log('✅ Sincronización de inventario completada:', res);
        alert(`Sincronización completada\n\n` +
              `Productos considerados: ${res?.totalProductosConsiderados ?? '-'}\n` +
              `Inventarios creados: ${res?.inventariosCreados ?? '-'}\n` +
              `Entradas registradas: ${res?.entradasRegistradas ?? '-'}\n` +
              `Omitidos: ${res?.omitidos ?? '-'}`);
        // Refrescar datos visibles
        this.loadProducts();
        this.cargarInventarioPorProducto();
        this.cargarDisminuciones();
      },
      error: (err) => {
        console.error('❌ Error al sincronizar inventario:', err);
        const msg = err?.status === 401 ? 'No autorizado (¿sesión expirada?). Inicie sesión nuevamente.' : 'No se pudo sincronizar inventario.';
        alert(msg);
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }
  // ==============================================
  // UI: Entradas por Producto
  // ==============================================
  onProductoEntradasChange(productIdStr: string): void {
    const pid = Number(productIdStr);
    this.selectedProductIdEntradas = isNaN(pid) ? null : pid;
    if (this.selectedProductIdEntradas) {
      this.entradaForm.patchValue({ productId: this.selectedProductIdEntradas });
      // Prefijar proveedor según el producto seleccionado (si existe)
      const prod = this.products.find(p => p.id === this.selectedProductIdEntradas);
      if (prod) {
        const provId = (prod as any)?.provider?.id ?? (prod as any)?.provider_id ?? null;
        if (provId) this.entradaForm.patchValue({ providerId: provId });
      }
      // Cargar resumen de inventario del producto seleccionado
      this.cargarInventarioProductoSeleccionado(this.selectedProductIdEntradas);
      this.cargarEntradasPorProducto(this.selectedProductIdEntradas);
      this.cargarMovimientosPorProducto(this.selectedProductIdEntradas);
    } else {
      this.entradasProducto = [];
      this.movimientosProducto = [];
      this.invProductoSeleccionado = null;
    }
  }

  cargarEntradasPorProducto(productId: number): void {
    this.entradasService.listarPorProducto(productId).subscribe({
      next: (lista) => this.entradasProducto = lista || [],
      error: (err) => {
        console.error('Error listando entradas por producto', err);
        this.entradasProducto = [];
      }
    });
  }

  /**
   * Cargar todas las entradas para mostrar en listado principal
   */
  cargarTodasLasEntradas(): void {
    this.entradasService.listarTodas().subscribe({
      next: (lista) => {
        this.todasLasEntradas = lista || [];
        // Limpiar cache de últimas entradas para recalcular
        this.ultimasEntradasCache.clear();
        console.log('📦 Total entradas cargadas:', this.todasLasEntradas.length);
      },
      error: (err) => {
        console.error('Error cargando todas las entradas', err);
        this.todasLasEntradas = [];
      }
    });
  }

  /**
   * Filtrar entradas por nombre de producto y estado
   */
  getEntradasFiltradas(): InventarioEntrada[] {
    let resultado = this.todasLasEntradas;
    
    // Filtrar por estado (vigentes/finalizados)
    if (this.filtroEstadoEntradas === 'vigentes') {
      resultado = resultado.filter(e => this.esEntradaVigente(e));
    } else if (this.filtroEstadoEntradas === 'finalizados') {
      resultado = resultado.filter(e => !this.esEntradaVigente(e));
    }
    
    // Filtrar por texto de búsqueda
    if (this.filtroProductoEntradas && this.filtroProductoEntradas.trim() !== '') {
      const filtro = this.filtroProductoEntradas.toLowerCase().trim();
      resultado = resultado.filter(e => 
        e.product?.name?.toLowerCase().includes(filtro) ||
        e.codigoLote?.toLowerCase().includes(filtro)
      );
    }
    
    return resultado;
  }

  /**
   * Verificar si una entrada está finalizada (sin stock o vencida)
   */
  esEntradaFinalizada(entrada: InventarioEntrada): boolean {
    return !this.esEntradaVigente(entrada);
  }

  /**
   * Obtener entradas pendientes de consumir para un producto (excluyendo la más reciente)
   */
  getEntradasPendientesDelProducto(productId: number): InventarioEntrada[] {
    if (!this.todasLasEntradas) return [];
    
    // Obtener todas las entradas vigentes del producto
    const entradasProducto = this.todasLasEntradas
      .filter(e => e.product?.id === productId && this.esEntradaVigente(e))
      .sort((a, b) => {
        const fechaA = a.fechaIngreso ? new Date(a.fechaIngreso).getTime() : 0;
        const fechaB = b.fechaIngreso ? new Date(b.fechaIngreso).getTime() : 0;
        return fechaB - fechaA; // Más reciente primero
      });
    
    // Retornar todas menos la más reciente (que sería la nueva entrada a crear)
    // Si solo hay una, no hay pendientes
    return entradasProducto;
  }

  /**
   * Contar entradas vigentes
   */
  getConteoEntradasVigentes(): number {
    return this.todasLasEntradas.filter(e => this.esEntradaVigente(e)).length;
  }

  /**
   * Contar entradas finalizadas
   */
  getConteoEntradasFinalizadas(): number {
    return this.todasLasEntradas.filter(e => !this.esEntradaVigente(e)).length;
  }

  /**
   * Abrir formulario para nueva entrada
   */
  abrirFormularioNuevaEntrada(producto?: Product): void {
    this.mostrarFormularioEntrada = true;
    this.selectedProductIdEntradas = null;
    this.productoEntradasBloqueado = false;
    this.entradaForm.reset();
    
    if (producto) {
      this.selectedProductIdEntradas = producto.id!;
      this.productoEntradasBloqueado = true;
      const provId = (producto as any)?.provider?.id ?? (producto as any)?.provider_id ?? null;
      this.entradaForm.patchValue({ productId: producto.id, providerId: provId });
      this.cargarInventarioProductoSeleccionado(producto.id!);
      this.cargarEntradasPorProducto(producto.id!);
      this.cargarMovimientosPorProducto(producto.id!);
    }
  }

  /**
   * Cerrar formulario de entrada
   */
  cerrarFormularioEntrada(): void {
    this.mostrarFormularioEntrada = false;
    this.selectedProductIdEntradas = null;
    this.productoEntradasBloqueado = false;
    this.entradaForm.reset();
  }

  /**
   * Iniciar reposición desde el listado de entradas
   */
  reponerDesdeListado(entrada: InventarioEntrada): void {
    if (entrada.product) {
      this.abrirFormularioNuevaEntrada(entrada.product);
    }
  }

  /**
   * Verificar si una entrada está vencida
   */
  esVencida(entrada: InventarioEntrada): boolean {
    if (!entrada.fechaVencimiento) return false;
    const fechaVenc = new Date(entrada.fechaVencimiento);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return fechaVenc < hoy;
  }

  /**
   * Verificar si una entrada está próxima a vencer (15 días)
   */
  esPorVencer(entrada: InventarioEntrada): boolean {
    if (!entrada.fechaVencimiento) return false;
    const fechaVenc = new Date(entrada.fechaVencimiento);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const limite = new Date(hoy);
    limite.setDate(limite.getDate() + this.diasAlertaPorVencer);
    return fechaVenc >= hoy && fechaVenc <= limite;
  }

  private cargarMovimientosPorProducto(productId: number): void {
    this.invProductoService.listarMovimientos(productId).subscribe({
      next: (rows) => this.movimientosProducto = rows || [],
      error: () => this.movimientosProducto = []
    });
  }

  // ===== Expandibles: Entradas/MOV por producto en la tabla de Productos =====
  isEntradasExpanded(productId: number): boolean { return this.expandedEntradas.has(productId); }
  isMovExpanded(productId: number): boolean { return this.expandedMovimientos.has(productId); }

  toggleEntradasForProduct(productId: number): void {
    if (this.expandedEntradas.has(productId)) {
      this.expandedEntradas.delete(productId);
      return;
    }
    this.expandedEntradas.add(productId);
    if (!this.entradasByProduct.has(productId)) {
      this.entradasService.listarPorProducto(productId).subscribe({
        next: (lista) => this.entradasByProduct.set(productId, lista || []),
        error: () => this.entradasByProduct.set(productId, [])
      });
    }
  }

  toggleMovimientosForProduct(productId: number): void {
    if (this.expandedMovimientos.has(productId)) {
      this.expandedMovimientos.delete(productId);
      return;
    }
    this.expandedMovimientos.add(productId);
    if (!this.movimientosByProduct.has(productId)) {
      this.invProductoService.listarMovimientos(productId).subscribe({
        next: (rows) => this.movimientosByProduct.set(productId, rows || []),
        error: () => this.movimientosByProduct.set(productId, [])
      });
    }
  }

  getEntradasVigentesDe(productId: number): InventarioEntrada[] {
    const lista = this.entradasByProduct.get(productId) || [];
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    return lista.filter((e: any) => {
      const activo = (e?.activo !== false);
      const fv = e?.fechaVencimiento ? new Date(e.fechaVencimiento) : null; if (fv) fv.setHours(0,0,0,0);
      const vigente = !fv || fv >= hoy;
      const restante = Number(e?.stockBaseRestante || 0) > 0;
      return activo && vigente && restante;
    });
  }

  getEntradasCerradasDe(productId: number): InventarioEntrada[] {
    const lista = this.entradasByProduct.get(productId) || [];
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    return lista.filter((e: any) => {
      const activo = (e?.activo !== false);
      const fv = e?.fechaVencimiento ? new Date(e.fechaVencimiento) : null; if (fv) fv.setHours(0,0,0,0);
      const vigente = !fv || fv >= hoy;
      const restante = Number(e?.stockBaseRestante || 0) > 0;
      return !activo || !vigente || !restante;
    });
  }

  getMovimientosDe(productId: number): MovimientoProductoResponse[] {
    return this.movimientosByProduct.get(productId) || [];
  }

  private cargarInventarioProductoSeleccionado(productId: number): void {
    this.invProductoService.porProducto(productId).subscribe({
      next: (inv) => this.invProductoSeleccionado = inv || null,
      error: () => this.invProductoSeleccionado = null
    });
  }
  
  // Crear entrada (pestaña Entradas)
  crearEntrada(): void {
    if (this.entradaForm.invalid) {
      this.entradaForm.markAllAsTouched();
      return;
    }
    const v = this.entradaForm.value;
    
    // VALIDACIÓN ESTRICTA: Verificar si hay entradas anteriores sin agotar
    const productId = Number(v.productId);
    const entradasPendientes = this.getEntradasPendientesDelProducto(productId);
    
    if (entradasPendientes.length > 0) {
      const nombresEntradas = entradasPendientes.map(e => 
        `Lote: ${e.codigoLote || 'Sin lote'} - Stock: ${(e.stockBaseRestante || 0).toFixed(2)} kg`
      ).join('\n');
      
      const confirmar = confirm(
        `⚠️ ATENCIÓN: Este producto tiene ${entradasPendientes.length} entrada(s) con stock pendiente de consumir:\n\n` +
        `${nombresEntradas}\n\n` +
        `Según FEFO, debe consumirse el stock anterior antes de agregar nueva recarga.\n\n` +
        `¿Desea continuar de todas formas? (No recomendado)`
      );
      
      if (!confirmar) {
        return;
      }
    }
    const req: CrearEntradaRequest = {
      productId: v.productId,
      codigoLote: v.codigoLote || undefined,
      fechaIngreso: v.fechaIngreso || undefined,
      fechaVencimiento: v.fechaVencimiento || undefined,
      unidadControl: v.unidadControl || undefined,
      contenidoPorUnidadBase: Number(v.contenidoPorUnidadBase),
      cantidadUnidades: v.cantidadUnidades != null ? Number(v.cantidadUnidades) : 1,
      observaciones: v.observaciones || undefined,
      providerId: v.providerId != null ? Number(v.providerId) : undefined,
      costoUnitarioBase: v.costoUnitarioBase != null ? Number(v.costoUnitarioBase) : undefined,
      costoPorUnidadControl: v.costoPorUnidadControl != null ? Number(v.costoPorUnidadControl) : undefined
    };
    this.isLoading = true;
    this.entradasService.crearEntrada(req).subscribe({
      next: () => {
        alert('Entrada creada y stock actualizado');
        if (this.selectedProductIdEntradas) this.cargarEntradasPorProducto(this.selectedProductIdEntradas);
        this.cargarInventarioPorProducto();
        if (this.selectedProductIdEntradas) this.cargarInventarioProductoSeleccionado(this.selectedProductIdEntradas);
        this.cargarValidosParaProductos();
        this.cargarDisminuciones();
        // Limpiar solicitud de recarga para este producto si existía
        if (req.productId) {
          this.clearRechargeRequestForProduct(Number(req.productId));
          // Recalcular localmente el stock válido para reflejo inmediato en UI
          this.recalcStockValidoLocal(Number(req.productId));
          this.cargarMovimientosPorProducto(Number(req.productId));
          this.cargarEntradasGlobales();
        }
        // Desbloquear selector después de crear entrada exitosamente
        this.productoEntradasBloqueado = false;
        this.entradaForm.patchValue({
          codigoLote: '',
          contenidoPorUnidadBase: null,
          cantidadUnidades: 1,
          fechaIngreso: null,
          fechaVencimiento: null,
          observaciones: '',
          costoUnitarioBase: null,
          costoPorUnidadControl: null
        });
      },
      error: (err) => {
        console.error('Error creando entrada', err);
        alert('No se pudo crear la entrada');
      },
      complete: () => this.isLoading = false
    });
  }
  
  // ======================
  // Recarga: utilidades UI
  // ======================
  private loadRechargeRequestsFromStorage(): void {
    try {
      const raw = localStorage.getItem('pc_recharge_requests') || '[]';
      const lista = JSON.parse(raw);
      this.rechargeRequests = Array.isArray(lista) ? lista : [];
      this.rechargeById = new Map();
      this.rechargeByName = new Map();
      for (const r of this.rechargeRequests) {
        const nameKey = this.normalizarTexto(r?.name || '');
        if ((r as any)?.productId != null) this.rechargeById.set(Number((r as any).productId), r);
        if (nameKey) this.rechargeByName.set(nameKey, r);
      }
    } catch {
      this.rechargeRequests = [];
      this.rechargeById = new Map();
      this.rechargeByName = new Map();
    }
  }

  hasRechargeRequest(p: Product): boolean {
    if (!p) return false;
    const present = (p.id != null && this.rechargeById.has(p.id)) || this.rechargeByName.has(this.normalizarTexto(p.name || ''));
    if (!present) return false;
    // Mostrar badge solo cuando NO hay stock disponible
    return this.getCantidadRealProducto(p) <= 0.0001;
  }

  /**
   * Determinar si un producto tiene stock bajo (menos del 20% o por debajo de level_min)
   */
  esStockBajo(p: Product): boolean {
    if (!p) return false;
    const real = this.getCantidadRealProducto(p);
    const total = this.getStockTotalProducto(p);
    
    // Si tiene level_min definido, usarlo como umbral
    if (p.level_min != null && p.level_min > 0) {
      return real > 0 && real <= p.level_min;
    }
    
    // Caso contrario: considerar bajo si es menos del 20% del total original
    if (total > 0) {
      const porcentaje = (real / total) * 100;
      return real > 0 && porcentaje <= 20;
    }
    
    // Si no hay referencia, considerar bajo si está entre 0 y 10 unidades
    return real > 0 && real <= 10;
  }

  getRechargeTooltip(p: Product): string {
    const info = (p.id != null ? this.rechargeById.get(p.id) : null) || this.rechargeByName.get(this.normalizarTexto(p.name || ''));
    if (!info) return 'Recarga solicitada';
    const req = Number((info as any)?.cantidadRequerida || 0);
    const disp = Number((info as any)?.cantidadDisponible || 0);
    const lote = (info as any)?.loteCodigo ? ` • Lote: ${(info as any).loteCodigo}` : '';
    return `Recarga solicitada: requerido ${req.toFixed(2)} vs disponible ${disp.toFixed(2)}${lote}`;
  }

  clearRechargeRequestForProduct(productId: number): void {
    try {
      const raw = localStorage.getItem('pc_recharge_requests') || '[]';
      const lista = JSON.parse(raw);
      const nueva = Array.isArray(lista) ? lista.filter((x: any) => Number(x?.productId) !== Number(productId)) : [];
      localStorage.setItem('pc_recharge_requests', JSON.stringify(nueva));
      this.loadRechargeRequestsFromStorage();
    } catch {}
  }

  // Eliminar de storage las solicitudes que ya cuentan con stock disponible
  private pruneResolvedRechargeRequests(): void {
    try {
      const current = this.rechargeRequests || [];
      if (!current.length) return;
      const byName = new Map<string, Product>();
      for (const p of this.products || []) {
        byName.set(this.normalizarTexto(p?.name || ''), p);
      }
      const keep: any[] = [];
      for (const r of current) {
        let pid = Number((r as any)?.productId);
        let disp = 0;
        if (Number.isFinite(pid)) {
          disp = Number(this.stockValidoMap.get(pid) ?? this.inventarioProductoMap.get(pid) ?? 0);
        } else {
          const prod = byName.get(this.normalizarTexto(r?.name || ''));
          if (prod?.id != null) {
            pid = Number(prod.id);
            disp = Number(this.stockValidoMap.get(pid) ?? this.inventarioProductoMap.get(pid) ?? 0);
          }
        }
        if (disp > 0.0001) {
          // Considerar atendida -> no conservar
          continue;
        }
        keep.push(r);
      }
      localStorage.setItem('pc_recharge_requests', JSON.stringify(keep));
      this.loadRechargeRequestsFromStorage();
    } catch {}
  }

  // ===== Métodos para KPI de Costos en Entradas =====

  /**
   * Obtener productos que tienen inversión (costo inicial o entradas)
   * Incluye todos los productos con price_unit > 0 o con entradas registradas
   */
  getProductosConEntradas(): Product[] {
    const productosMap = new Map<number, Product>();
    
    // 1. Agregar productos que tienen entradas
    if (this.todasLasEntradas && this.todasLasEntradas.length > 0) {
      this.todasLasEntradas.forEach(entrada => {
        if (entrada.product?.id && !productosMap.has(entrada.product.id)) {
          productosMap.set(entrada.product.id, entrada.product as Product);
        }
      });
    }
    
    // 2. Agregar productos que tienen costo inicial (price_unit * quantity > 0)
    if (this.products && this.products.length > 0) {
      this.products.forEach(producto => {
        if (producto.id && !productosMap.has(producto.id)) {
          const costoInicial = this.getCostoInicialProducto(producto);
          if (costoInicial > 0) {
            productosMap.set(producto.id, producto);
          }
        }
      });
    }
    
    return Array.from(productosMap.values());
  }

  /**
   * Obtener el costo inicial del producto desde la tabla de productos.
   * Regla requerida: usar SIEMPRE product.price_unit (sin multiplicar por quantity).
   */
  getCostoInicialProducto(producto: Product | any): number {
    if (!producto) return 0;
    return Number(producto?.price_unit || 0);
  }

  /**
   * Calcular costo total invertido en un producto
   * = Costo inicial (primera entrada o price_unit) + Suma de costos de recargas (todas las demás entradas)
   */
  getCostoTotalProducto(productId: number): number {
    const producto = this.products.find(p => p.id === productId);
    const costoInicial = producto ? this.getCostoInicialProducto(producto) : 0;
    const costoEntradas = (this.todasLasEntradas || [])
      .filter(e => e?.product?.id === productId)
      .reduce((sum, e) => sum + this.getCostoEntrada(e), 0);
    return costoInicial + costoEntradas;
  }

  /**
   * Obtener el costo de una entrada individual
   */
  getCostoEntrada(entrada: InventarioEntrada): number {
    const cantidad = Number((entrada as any)?.cantidadUnidades ?? 1);
    const costoPorUnidadControl = Number((entrada as any)?.costoPorUnidadControl ?? 0);
    if (costoPorUnidadControl > 0) {
      return costoPorUnidadControl * cantidad;
    }
    // Fallback: costo unitario base por unidad base (ej: kg/ml) * total unidades base
    const costoUnitarioBase = Number((entrada as any)?.costoUnitarioBase ?? 0);
    const contenidoUnidad = Number((entrada as any)?.contenidoPorUnidad ?? (entrada as any)?.contenidoPorUnidadBase ?? 0);
    if (costoUnitarioBase > 0 && contenidoUnidad > 0 && cantidad > 0) {
      const totalUnidadesBase = cantidad * contenidoUnidad;
      return costoUnitarioBase * totalUnidadesBase;
    }
    return 0;
  }

  /**
   * Sumar costos de recargas (todas las entradas excepto la primera del producto)
   */
  private getCostoRecargasProducto(productId: number): number {
    const entradas = (this.todasLasEntradas || [])
      .filter(e => e?.product?.id === productId)
      .sort((a, b) => {
        const fa = a?.fechaIngreso ? new Date(a.fechaIngreso).getTime() : 0;
        const fb = b?.fechaIngreso ? new Date(b.fechaIngreso).getTime() : 0;
        return fa - fb; // más antigua primero
      });
    if (entradas.length <= 1) return 0;
    // Excluir la primera (inicial)
    return entradas.slice(1).reduce((sum, e) => sum + this.getCostoEntrada(e), 0);
  }

  /**
   * Contar recargas por producto (entradas posteriores a la inicial)
   */
  getConteoEntradasProducto(productId: number): number {
    return (this.todasLasEntradas || []).filter(e => e?.product?.id === productId).length;
  }

  /**
   * Obtener total invertido en general (todos los productos)
   * = Suma de costo inicial (primera entrada o price_unit) + Suma de recargas (entradas posteriores)
   */
  getTotalInvertidoGeneral(): number {
    const productos = this.products || [];
    const costoInicialTotal = productos.reduce((sum, p) => sum + this.getCostoInicialProducto(p), 0);
    const costoEntradasTotal = (this.todasLasEntradas || []).reduce((sum, e) => sum + this.getCostoEntrada(e), 0);
    return costoInicialTotal + costoEntradasTotal;
  }

  /**
   * Cache para última entrada por producto
   */
  private ultimasEntradasCache = new Map<number, number>();

  /**
   * Verificar si una entrada es la última del producto (por fecha de ingreso)
   */
  esUltimaEntradaDelProducto(entrada: InventarioEntrada): boolean {
    if (!entrada?.id || !entrada?.product?.id) return false;
    
    const productId = entrada.product.id;
    
    // Buscar en cache
    if (this.ultimasEntradasCache.has(productId)) {
      return this.ultimasEntradasCache.get(productId) === entrada.id;
    }
    
    // Calcular y guardar en cache
    const entradasDelProducto = (this.todasLasEntradas || [])
      .filter(e => e.product?.id === productId && e.activo);
    
    if (entradasDelProducto.length === 0) return false;
    
    // Ordenar por fecha de ingreso descendente (más reciente primero)
    entradasDelProducto.sort((a, b) => {
      const fechaA = a.fechaIngreso ? new Date(a.fechaIngreso).getTime() : 0;
      const fechaB = b.fechaIngreso ? new Date(b.fechaIngreso).getTime() : 0;
      return fechaB - fechaA;
    });
    
    const ultimaEntradaId = entradasDelProducto[0]?.id;
    if (ultimaEntradaId) {
      this.ultimasEntradasCache.set(productId, ultimaEntradaId);
    }
    
    return ultimaEntradaId === entrada.id;
  }

  /**
   * Limpiar cache de últimas entradas (llamar cuando se agregan/eliminan entradas)
   */
  limpiarCacheUltimasEntradas(): void {
    this.ultimasEntradasCache.clear();
  }
  
}