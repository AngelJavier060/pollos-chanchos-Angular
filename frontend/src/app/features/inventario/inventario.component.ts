import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ProductService } from '../../shared/services/product.service';
import { AnalisisInventarioService, InventarioAnalisis } from '../../shared/services/analisis-inventario.service';
import { InventarioService, InventarioAlimento, MovimientoInventario } from '../pollos/services/inventario.service';
import { InventarioProductoFrontService, InventarioProductoFront, MovimientoProductoRequest } from '../../shared/services/inventario-producto.service';
import { InventarioEntradasService, InventarioEntrada, CrearEntradaRequest } from '../../shared/services/inventario-entradas.service';
import { 
  Product, Provider, TypeFood, UnitMeasurement, Animal, Stage, NombreProducto 
} from '../../shared/models/product.model';
import { WebsocketService } from '../../shared/services/websocket.service';

@Component({
  selector: 'app-inventario',
  templateUrl: './inventario.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, HttpClientModule],
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
  vistaActual: 'productos' | 'analisis' | 'inventario-automatico' | 'entradas' | 'alertas' = 'productos';

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

  selectedProduct: Product | null = null;
  isLoading = false;
  showForm = false;
  isEditMode = false;

  // Referencia a Math para usarlo en el template
  Math = Math;

  // Entradas por producto (UI Entradas)
  selectedProductIdEntradas: number | null = null;
  entradasProducto: InventarioEntrada[] = [];

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
    private websocketService: WebsocketService
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
      stage_id: [null, [Validators.required]]
    });

    this.searchForm = this.fb.group({
      name: [''],
      providerId: [null],
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
      },
      error: () => this.stockValidoMap = new Map<number, number>()
    });
  }

  ngOnInit(): void {
    this.loadRelatedEntities();
    this.loadProducts();
    this.cargarInventarioAutomatico();
    this.cargarInventarioPorProducto();
    this.cargarVencimientos();
    this.cargarValidosParaProductos();
    this.cargarDisminuciones();

    // ✅ NUEVA FUNCIONALIDAD: Actualizar inventario automáticamente cada 30 segundos
    // cuando se está viendo la vista de inventario automático
    this.setupAutoRefresh();

    // ✅ Suscripción WebSocket: refrescar inventario en tiempo real ante cambios
    this.websocketService.connect().subscribe({
      next: () => {
        console.log('🔔 WS /topic/inventory-update recibido -> refrescando inventario');
        this.cargarInventarioAutomatico();
        this.cargarInventarioPorProducto();
        this.cargarVencimientos();
        this.cargarValidosParaProductos();
        this.cargarDisminuciones();
      }
    });

    // ✅ Leer la pestaña desde query params (?tab=productos|inventario-automatico|entradas|alertas)
    this.route.queryParamMap.subscribe(params => {
      const tabParam = (params.get('tab') || '').trim();
      const validTabs = ['productos', 'inventario-automatico', 'entradas', 'alertas'];
      const target = validTabs.includes(tabParam) ? tabParam : 'productos';
      if (this.vistaActual !== (target as any)) {
        this.cambiarVista(target as any);
      }
    });
  }

  /**
   * Configurar actualización automática del inventario
   */
  private setupAutoRefresh(): void {
    // Actualizar cada 30 segundos en vistas relevantes
    setInterval(() => {
      if (this.vistaActual === 'inventario-automatico' || this.vistaActual === 'productos') {
        console.log('🔄 Auto-refresh: Actualizando inventario automáticamente...');
        this.cargarInventarioAutomatico();
        this.cargarInventarioPorProducto();
        this.cargarVencimientos();
        this.cargarValidosParaProductos();
        this.cargarDisminuciones();
      }
    }, 30000); // 30 segundos
  }

  loadProducts(): void {
    this.isLoading = true;
    this.productService.getProducts().subscribe({
      next: (data) => {
        console.log('Productos cargados:', data);
        this.products = data;
        this.filteredProducts = data;
        this.isLoading = false;
        this.recalcularResumenCantidadReal();
        this.cargarInventarioPorProducto();
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
  cambiarVista(vista: 'productos' | 'analisis' | 'inventario-automatico' | 'entradas' | 'alertas'): void {
    this.vistaActual = vista;
    // La vista de análisis fue trasladada a 'Análisis Financiero'
    if (vista === 'inventario-automatico') {
      this.cargarInventarioAutomatico();
      this.cargarInventarioPorProducto();
      this.cargarVencimientos();
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
      // Si ya hay un producto seleccionado, refrescar sus entradas
      if (this.selectedProductIdEntradas) {
        this.cargarEntradasPorProducto(this.selectedProductIdEntradas);
      }
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
   * Cargar inventario automático con control de stock
   */
  cargarInventarioAutomatico(): void {
    console.log('📦 Cargando inventario automático...');
    
    // Cargar inventarios disponibles
    this.inventarioService.obtenerInventarios().subscribe({
      next: (inventarios) => {
        console.log('✅ Inventarios cargados:', inventarios);
        this.inventarioAlimentos = inventarios;
        this.recalcularResumenCantidadReal();
        
        // Si no hay inventarios, mostrar mensaje de ayuda
        if (inventarios.length === 0) {
          console.log('⚠️ No hay inventarios disponibles. Puede necesitar crear datos de ejemplo.');
        }
      },
      error: (error) => {
        console.error('❌ Error cargando inventarios:', error);
        console.log('💡 Intente crear datos de ejemplo si la base de datos está vacía');
        this.inventarioAlimentos = [];
      }
    });
    
    // Cargar inventarios con stock bajo
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
        this.cargarInventarioAutomatico();
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
        stage_id: product.stage?.id || product.stage_id
      });
    } else {
      this.selectedProduct = null;
      this.productForm.reset();
    }
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
      
      console.log('Enviando producto:', productData);
      
      this.productService.createProduct(productData).subscribe({
        next: () => {
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
    
    // Si la fecha viene como string, convertirla a Date
    if (product.date_compra && typeof product.date_compra === 'string') {
      product.date_compra = new Date(product.date_compra);
    }
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
    const val = this.stockValidoMap.get(product.id);
    return Number(val ?? 0);
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
    this.selectedProductIdEntradas = product.id;
    this.entradaForm.patchValue({ productId: product.id });
    const provId = (product as any)?.provider?.id ?? (product as any)?.provider_id ?? null;
    if (provId) this.entradaForm.patchValue({ providerId: provId });
    this.cargarInventarioProductoSeleccionado(product.id);
    this.cargarEntradasPorProducto(product.id);
  }

  // Acción rápida para la vista Productos: refrescar listado y cantidad real
  actualizarProductosYStock(): void {
    this.loadProducts();
    this.cargarInventarioPorProducto();
    this.cargarDisminuciones();
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
    } else {
      this.entradasProducto = [];
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
  
}