import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../../shared/services/product.service';
import { Product } from '../../../shared/models/product.model';
import { Animal } from '../../../shared/models/product.model';
import { Subscription } from 'rxjs';
import { LoteService } from '../../../features/lotes/services/lote.service';
import { Lote } from '../../../features/lotes/interfaces/lote.interface';
import { VentasService } from '../../../shared/services/ventas.service';

@Component({
  selector: 'app-ventas-huevos-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="space-y-6">
    <!-- Buscador superior por periodo (profesional) -->
    <div class="bg-white border rounded p-4">
      <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div class="flex items-center gap-2 flex-wrap">
          <label class="text-sm text-gray-600">Periodo</label>
          <select [(ngModel)]="filtroPeriodo" class="border rounded px-2 py-1">
            <option value="hoy">Hoy</option>
            <option value="ayer">Ayer</option>
            <option value="semana">Esta semana</option>
            <option value="mes">Mes</option>
            <option value="anio">Año</option>
            <option value="rango">Rango</option>
          </select>
          <input *ngIf="filtroPeriodo==='mes'" [(ngModel)]="mesSeleccion" type="month" class="border rounded px-2 py-1" />
          <input *ngIf="filtroPeriodo==='anio'" [(ngModel)]="anioSeleccion" type="number" min="2000" max="2100" placeholder="Año" class="w-28 border rounded px-2 py-1" />
          <input *ngIf="filtroPeriodo==='rango'" [(ngModel)]="fechaDesde" type="date" class="border rounded px-2 py-1" />
          <input *ngIf="filtroPeriodo==='rango'" [(ngModel)]="fechaHasta" type="date" class="border rounded px-2 py-1" />
          <button (click)="aplicarFiltroVentas()" class="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-sm">Buscar</button>
        </div>
        <div>
          <button (click)="exportVentasCSV()" [disabled]="!ventasHoy?.length" class="bg-emerald-50 text-emerald-700 px-3 py-2 rounded hover:bg-emerald-100 text-sm disabled:opacity-40">Exportar CSV</button>
        </div>
      </div>
    </div>
    <!-- Resumen de ventas (visible arriba) -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div class="bg-blue-50 border border-blue-100 rounded p-4">
        <div class="text-xs uppercase tracking-wide text-blue-700">Registros</div>
        <div class="text-2xl font-bold text-blue-900">{{ ventasHoy?.length || 0 }}</div>
      </div>
      <div class="bg-emerald-50 border border-emerald-100 rounded p-4">
        <div class="text-xs uppercase tracking-wide text-emerald-700">Cantidad total</div>
        <div class="text-2xl font-bold text-emerald-900">{{ totalCantidadVentas }}</div>
      </div>
      <div class="bg-amber-50 border border-amber-100 rounded p-4">
        <div class="text-xs uppercase tracking-wide text-amber-700">Monto total</div>
        <div class="text-2xl font-bold text-amber-900">{{ totalMontoVentas | currency:'USD':'symbol-narrow' }}</div>
      </div>
    </div>
    <!-- Formulario de venta (registro directo) -->
    <div class="bg-white border rounded p-4" *ngIf="mostrarCaptura">
      <h2 class="text-lg font-semibold mb-3">Registrar venta de huevo (solo vista)</h2>
      <div class="grid grid-cols-1 md:grid-cols-6 gap-3">
        <div>
          <label class="block text-sm text-gray-600 mb-1">Animal</label>
          <select [(ngModel)]="animalSeleccionadoId" (ngModelChange)="onChangeAnimal()" class="w-full border rounded px-3 py-2">
            <option [ngValue]="'all'">Todos</option>
            <option *ngFor="let a of animales" [ngValue]="a.id">{{ a.name }}</option>
          </select>
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm text-gray-600 mb-1">Lote (solo aves)</label>
          <select [(ngModel)]="loteSeleccionadoId" (ngModelChange)="onSelectLote()" class="w-full border rounded px-3 py-2">
            <option [ngValue]="null">Seleccione un lote</option>
            <option *ngFor="let l of lotesFiltradosPorAnimal" [ngValue]="l.id">{{ l.codigo || l.id }} - {{ l.name }}</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm text-gray-600 mb-1">Fecha</label>
          <input [(ngModel)]="nuevo.fecha" type="date" class="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">Cantidad (unid.)</label>
          <input [(ngModel)]="nuevo.cantidad" (ngModelChange)="recalcularLinea()" type="number" min="1" class="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">Precio Unit.</label>
          <input [(ngModel)]="nuevo.precioUnit" (ngModelChange)="recalcularLinea()" type="number" step="0.01" class="w-full border rounded px-3 py-2" />
        </div>
      </div>
      <div class="flex items-center justify-between mt-3">
        <div class="text-sm text-gray-700 flex flex-col">
          <span>Total línea: <span class="font-semibold">{{ nuevo.totalLinea | currency:'USD':'symbol-narrow' }}</span></span>
          <span *ngIf="loteSeleccionado">Lote: <span class="font-medium">{{ loteSeleccionado.codigo || loteSeleccionado.id }}</span> - {{ loteSeleccionado.name }} • Animales en lote: {{ loteSeleccionado.quantity }}</span>
        </div>
        <div class="space-x-2">
          <button (click)="guardarVentaActual()" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Guardar venta</button>
          <button (click)="limpiarFormulario()" class="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200">Limpiar</button>
        </div>
      </div>
      <!-- Borrador de venta (oculto) -->
      <div class="mt-4" *ngIf="false">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-semibold">Borrador de venta (local)
            <span class="ml-2 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{{ borrador.length }} líneas</span>
          </h3>
          <div class="text-sm text-gray-500">Total borrador: {{ totalBorrador | currency:'USD':'symbol-narrow' }}</div>
        </div>
        <div class="overflow-auto border rounded">
          <table class="min-w-full">
            <thead class="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th class="px-4 py-3">Lote</th>
                <th class="px-4 py-3">Fecha</th>
                <th class="px-4 py-3">Cantidad</th>
                <th class="px-4 py-3">Precio Unit.</th>
                <th class="px-4 py-3">Total</th>
                <th class="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let it of borrador; let i = index" class="border-t">
                <td class="px-4 py-2">{{ it.loteCodigo || it.loteId }}</td>
                <td class="px-4 py-2">{{ it.fecha }}</td>
                <td class="px-4 py-2">{{ it.cantidad }}</td>
                <td class="px-4 py-2">{{ it.precioUnit | currency:'USD':'symbol-narrow' }}</td>
                <td class="px-4 py-2">{{ it.totalLinea | currency:'USD':'symbol-narrow' }}</td>
                <td class="px-4 py-2">
                  <button (click)="guardarLinea(i)" [disabled]="savingIndex===i" class="text-green-700 hover:underline mr-3 opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">{{ savingIndex===i ? 'Guardando...' : 'Guardar' }}</button>
                  <button (click)="eliminarLinea(i)" class="text-red-600 hover:underline">Eliminar</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Ventas guardadas (desde backend) -->
      <div class="mt-6">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-semibold">Ventas guardadas
            <span class="ml-2 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded" *ngIf="ventasHoy && ventasHoy.length">{{ ventasHoy.length }} registros</span>
          </h3>
        </div>
        
        <div class="overflow-auto border rounded" *ngIf="ventasHoy && ventasHoy.length; else sinVentas">
          <table class="min-w-full">
            <thead class="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th class="px-4 py-3">ID</th>
                <th class="px-4 py-3">Fecha</th>
                <th class="px-4 py-3">Lote</th>
                <th class="px-4 py-3">Cantidad</th>
                <th class="px-4 py-3">Precio Unit.</th>
                <th class="px-4 py-3">Total</th>
                <th class="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let v of ventasHoy" class="border-t">
                <td class="px-4 py-2">{{ v.id }}</td>
                <td class="px-4 py-2">{{ formatFecha(v.fecha) }}</td>
                <td class="px-4 py-2">{{ v.loteCodigo || v.loteId }}</td>
                <td class="px-4 py-2">
                  <ng-container *ngIf="editingId===v.id; else viewCant"> 
                    <input type="number" [(ngModel)]="editModel.cantidad" min="0" class="w-24 border rounded px-2 py-1" />
                  </ng-container>
                  <ng-template #viewCant>{{ v.cantidad }}</ng-template>
                </td>
                <td class="px-4 py-2">
                  <ng-container *ngIf="editingId===v.id; else viewPU"> 
                    <input type="number" step="0.01" [(ngModel)]="editModel.precioUnit" class="w-28 border rounded px-2 py-1" />
                  </ng-container>
                  <ng-template #viewPU>{{ v.precioUnit | currency:'USD':'symbol-narrow' }}</ng-template>
                </td>
                <td class="px-4 py-2">{{ (editingId===v.id ? (editModel.cantidad*editModel.precioUnit) : v.total) | currency:'USD':'symbol-narrow' }}</td>
                <td class="px-4 py-2">
                  <ng-container *ngIf="editingId===v.id; else accionesView">
                    <div class="flex items-center gap-2">
                      <button (click)="saveEdit(v)" class="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-sm" title="Guardar cambios">Guardar</button>
                      <button (click)="cancelEdit()" class="px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm" title="Cancelar edición">Cancelar</button>
                    </div>
                  </ng-container>
                  <ng-template #accionesView>
                    <div class="flex items-center gap-3">
                      <button (click)="startEdit(v)" class="p-1 rounded hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200" title="Editar">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5 text-blue-600">
                          <path d="M12 20h9"/>
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
                        </svg>
                      </button>
                      <button (click)="deleteVenta(v)" class="p-1 rounded hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200" title="Eliminar">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5 text-red-600">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6"/>
                          <path d="M14 11v6"/>
                          <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                  </ng-template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <ng-template #sinVentas>
          <div class="text-sm text-gray-500">No hay ventas registradas para hoy.</div>
        </ng-template>
      </div>
    </div>

    <ng-container *ngIf="mostrarCatalogo">
    <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
        <div>
          <label class="block text-sm text-gray-600 mb-1">Animal</label>
          <select [(ngModel)]="animalSeleccionadoId" (ngModelChange)="onChangeAnimal()" class="w-full border rounded px-3 py-2">
            <option [ngValue]="'all'">Todos</option>
            <option *ngFor="let a of animales" [ngValue]="a.id">{{ a.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">Buscar</label>
          <input [(ngModel)]="busqueda" (ngModelChange)="aplicarFiltros()" type="text" placeholder="Nombre..." class="w-full border rounded px-3 py-2" />
        </div>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 md:w-1/2">
        <div class="bg-white border rounded p-3">
          <div class="text-xs text-gray-500">Productos</div>
          <div class="text-lg font-semibold">{{ productosFiltrados.length }}</div>
        </div>
        <div class="bg-white border rounded p-3">
          <div class="text-xs text-gray-500">Precio Promedio</div>
          <div class="text-lg font-semibold">{{ precioPromedio | number:'1.2-2' }}</div>
        </div>
        <div class="bg-white border rounded p-3">
          <div class="text-xs text-gray-500">Stock</div>
          <div class="text-lg font-semibold">N/D</div>
        </div>
      </div>
    </div>

    <div class="overflow-auto bg-white border rounded">
      <table class="min-w-full">
        <thead class="bg-gray-50 text-left text-xs text-gray-500">
          <tr>
            <th class="px-4 py-3">Producto</th>
            <th class="px-4 py-3">Precio Unit.</th>
            <th class="px-4 py-3">Animal</th>
            <th class="px-4 py-3">Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let p of productosFiltrados" class="border-t hover:bg-gray-50">
            <td class="px-4 py-2">{{ p.name }}</td>
            <td class="px-4 py-2">{{ p.price_unit | currency:'USD':'symbol-narrow' }}</td>
            <td class="px-4 py-2">{{ p.animal?.name || 'N/D' }}</td>
            <td class="px-4 py-2">
              <span class="text-xs px-2 py-1 rounded"
                [class.bg-green-100]="p.active"
                [class.text-green-700]="p.active"
                [class.bg-gray-100]="!p.active"
                [class.text-gray-600]="!p.active">
                {{ p.active ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
          </tr>
          <tr *ngIf="!cargando && productosFiltrados.length === 0">
            <td colspan="5" class="px-4 py-6 text-center text-sm text-gray-500">No hay resultados para los filtros seleccionados.</td>
          </tr>
          <tr *ngIf="cargando">
            <td colspan="5" class="px-4 py-6 text-center text-sm text-gray-500">Cargando...</td>
          </tr>
        </tbody>
      </table>
    </div>
    </ng-container>
  </div>
  `
})
export class VentasHuevosWidgetComponent implements OnInit, OnDestroy {
  cargando = false;
  productos: Product[] = [];
  productosFiltrados: Product[] = [];
  productosHuevos: Product[] = [];
  lotesAves: Lote[] = [];
  loteSeleccionadoId: number | null = null;
  get loteSeleccionado(): Lote | null {
    return this.lotesAves.find(l => l.id === this.loteSeleccionadoId) || null;
  }

  // Formatear fecha que venga como array [yyyy,mm,dd] o string ISO
  formatFecha(f: any): string {
    if (Array.isArray(f) && f.length >= 3) {
      const [y, m, d] = f;
      const mm = String(m).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      return `${y}-${mm}-${dd}`;
    }
    if (typeof f === 'string') return f.split('T')[0] || f;
    try { return new Date(f).toISOString().slice(0,10); } catch { return String(f ?? ''); }
  }
  animales: Animal[] = [];
  animalSeleccionadoId: number | 'all' = 'all';

  animalFiltro: 'ave' | 'all' = 'ave';
  tamanoFiltro: 'grande' | 'mediano' | 'peque' | 'all' = 'all';
  busqueda = '';

  private sub?: Subscription;

  get precioPromedio(): number {
    if (!this.productosFiltrados.length) return 0;
    const sum = this.productosFiltrados.reduce((acc, p) => acc + (p.price_unit || 0), 0);
    return sum / this.productosFiltrados.length;
    }

  private cargarLotesAves(): void {
    this.loteService.getLotes().subscribe({
      next: (lotes) => {
        // Filtramos solo lotes cuyo animal sea aves/gallinas/pollos
        this.lotesAves = (lotes || []).filter(l => {
          const a = l.race?.animal?.name?.toLowerCase?.() || '';
          return a.includes('ave') || a.includes('gallina') || a.includes('pollo');
        });
      },
      error: () => { this.lotesAves = []; }
    });
  }

  private cargarAnimales(): void {
    this.productService.getAnimals().subscribe({
      next: (as) => {
        const list = as || [];
        this.animales = list.filter(a => {
          const n = (a.name || '').toLowerCase();
          return n.includes('ave') || n.includes('gallina') || n.includes('pollo');
        });
        // Si no hay selección y existe al menos un animal, dejamos 'all' para ver todos los lotes de aves
        // (no forzamos selección automática para no ocultar datos inesperadamente)
      },
      error: () => this.animales = []
    });
  }

  // Handler vacío para el cambio de lote (requerido por el template)
  onSelectLote(): void {
    // Podríamos precargar precios o validar aquí si fuera necesario.
  }

  // Borrador local de ventas (sin backend)
  borrador: Array<{ loteId: number; loteCodigo?: string; fecha: string; cantidad: number; precioUnit: number; totalLinea: number; }>= [];
  nuevo: { fecha: string; cantidad: number; precioUnit: number; totalLinea: number; } = {
    fecha: this.hoyISO(),
    cantidad: 1,
    precioUnit: 0,
    totalLinea: 0
  };

  // Flag para mostrar el formulario/borrador (habilitado para permitir ingresar ventas)
  mostrarCaptura = true;
  // Flag seguro para mostrar/ocultar el bloque de catálogo (animal/buscar/productos)
  mostrarCatalogo = false;

  constructor(private productService: ProductService, private loteService: LoteService, private ventasService: VentasService) {}

  ngOnInit(): void {
    this.cargarProductos();
    this.cargarLotesAves();
    this.cargarAnimales();
    this.cargarBorradorLocal();
    // Cargar ventas del día al abrir para ver datos reales del backend
    this.cargarVentasHoy();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private cargarProductos(): void {
    this.cargando = true;
    // Traemos todos y filtramos en front con tu lógica/fallback
    this.sub = this.productService.getProducts().subscribe({
      next: (prods) => {
        this.productos = prods || [];
        // Preparamos lista de huevos para el selector del formulario
        this.productosHuevos = (this.productos || []).filter(p => this.esHuevo(p));
        this.aplicarFiltros();
        this.cargando = false;
      },
      error: () => {
        this.productos = [];
        this.productosFiltrados = [];
        this.cargando = false;
      }
    });
  }

  aplicarFiltros(): void {
    const q = this.busqueda.trim().toLowerCase();

    const matchAnimal = (p: Product) => {
      if (this.animalSeleccionadoId === 'all') return true;
      const id = p.animal?.id;
      if (id != null) return id === this.animalSeleccionadoId;
      // Fallback por nombre si no hay id
      const animalName = p.animal?.name?.toLowerCase?.() || '';
      const selected = (this.animales.find(a => a.id === this.animalSeleccionadoId)?.name || '').toLowerCase();
      return animalName.includes(selected);
    };

    const coincideTamano = (p: Product) => {
      if (this.tamanoFiltro === 'all') return true;
      const nombre = (p.name || '').toLowerCase();
      const categoria = (p as any).category?.name?.toLowerCase?.() || '';
      const match = this.tamanoFiltro === 'grande' ? ['grande'] : this.tamanoFiltro === 'mediano' ? ['mediano'] : ['peque', 'pequeño', 'pequenio'];
      return match.some(m => nombre.includes(m) || categoria.includes(m));
    };

    const coincideBusqueda = (p: Product) => {
      if (!q) return true;
      const nombre = (p.name || '').toLowerCase();
      return nombre.includes(q);
    };

    this.productosFiltrados = this.productos
      .filter(p => this.esHuevo(p))
      .filter(p => matchAnimal(p))
      .filter(p => coincideTamano(p))
      .filter(p => coincideBusqueda(p));
  }

  inferirTamano(p: Product): string | null {
    const nombre = (p.name || '').toLowerCase();
    const categoria = (p as any).category?.name?.toLowerCase?.() || '';
    if (nombre.includes('grande') || categoria.includes('grande')) return 'Grande';
    if (nombre.includes('mediano') || categoria.includes('mediano')) return 'Mediano';
    if (nombre.includes('peque') || categoria.includes('peque')) return 'Pequeño';
    return null;
  }

  private esHuevo(p: Product): boolean {
    const nombre = (p.name || '').toLowerCase();
    const categoria = (p as any).category?.name?.toLowerCase?.() || '';
    return categoria.includes('huevo') || nombre.includes('huevo');
  }

  // Lista de productos de huevo filtrados por animal seleccionado
  get productosHuevosFiltrados(): Product[] {
    return (this.productosHuevos || []).filter(p => {
      if (this.animalSeleccionadoId === 'all') return true;
      const id = p.animal?.id;
      if (id != null) return id === this.animalSeleccionadoId;
      const animalName = p.animal?.name?.toLowerCase?.() || '';
      const selected = (this.animales.find(a => a.id === this.animalSeleccionadoId)?.name || '').toLowerCase();
      return animalName.includes(selected);
    });
  }

  // Lista de lotes filtrados por el animal seleccionado
  get lotesFiltradosPorAnimal(): Lote[] {
    if (this.animalSeleccionadoId === 'all') return this.lotesAves || [];
    return (this.lotesAves || []).filter(l => l.race?.animal?.id === this.animalSeleccionadoId);
  }

  // Cambio de animal: limpiar selección de lote y recalcular filtros de productos
  onChangeAnimal(): void {
    this.loteSeleccionadoId = null;
    this.aplicarFiltros();
  }

  // --------- Lógica de borrador local ---------

  recalcularLinea(): void {
    const qty = Number(this.nuevo.cantidad) || 0;
    const pu = Number(String(this.nuevo.precioUnit ?? 0).replace(',', '.')) || 0;
    this.nuevo.totalLinea = +(qty * pu).toFixed(2);
  }

  // Guardado directo de la venta actual (sin borrador)
  savingDirect = false;
  guardarVentaActual(): void {
    if (!this.loteSeleccionado) { alert('Seleccione un lote'); return; }
    const cantidadNum = Number(this.nuevo.cantidad ?? 0) || 0;
    const precioNum = Number(String(this.nuevo.precioUnit ?? 0).replace(',', '.')) || 0;
    if (cantidadNum <= 0 || precioNum < 0) { alert('Ingrese cantidad y precio válidos'); return; }
    const body = {
      fecha: this.nuevo.fecha,
      loteId: String(this.loteSeleccionado.id || ''),
      loteCodigo: this.loteSeleccionado.codigo,
      animalId: this.loteSeleccionado?.race?.animal?.id,
      animalName: this.loteSeleccionado?.race?.animal?.name,
      cantidad: cantidadNum,
      precioUnit: +precioNum.toFixed(2),
      total: +((cantidadNum * precioNum)).toFixed(2)
    };
    this.savingDirect = true;
    this.ventasService.crearVentaHuevo(body).subscribe({
      next: (res) => {
        const id = res?.id ?? '—';
        alert(`Venta de huevo guardada (id=${id})`);
        this.cargarVentasHoy();
        // Reset rápido del formulario manteniendo animal/lote/fecha
        this.nuevo = {
          fecha: this.nuevo.fecha,
          cantidad: 1,
          precioUnit: 0,
          totalLinea: 0
        };
        this.savingDirect = false;
      },
      error: (err) => {
        console.error('Error al guardar venta (directo)', err);
        alert('No se pudo guardar la venta');
        this.savingDirect = false;
      }
    });
  }

  agregarLinea(): void {
    if (!this.loteSeleccionado) { alert('Seleccione un lote'); return; }
    const precioNum = Number(String(this.nuevo.precioUnit ?? 0).replace(',', '.')) || 0;
    const cantidadNum = Number(this.nuevo.cantidad ?? 1) || 1;
    const it = {
      loteId: this.loteSeleccionado.id,
      loteCodigo: this.loteSeleccionado.codigo,
      fecha: this.nuevo.fecha,
      cantidad: cantidadNum,
      precioUnit: precioNum,
      totalLinea: +(cantidadNum * precioNum).toFixed(2)
    };
    this.borrador.push(it);
    this.borrador = [...this.borrador];
    this.guardarBorradorLocal();
    // Reset cantidad default a 1 y total 0
    this.nuevo = {
      fecha: this.nuevo.fecha,
      cantidad: 1,
      precioUnit: precioNum,
      totalLinea: 0
    };
  }

  eliminarLinea(index: number): void {
    this.borrador.splice(index, 1);
    this.borrador = [...this.borrador];
    this.guardarBorradorLocal();
  }

  vaciarBorrador(): void {
    this.borrador = [];
    this.guardarBorradorLocal();
  }

  limpiarFormulario(keepProduct = false): void {
    this.nuevo = {
      fecha: this.hoyISO(),
      cantidad: 1,
      precioUnit: this.nuevo.precioUnit,
      totalLinea: 0
    };
  }

  get totalBorrador(): number {
    return this.borrador.reduce((acc, it) => acc + (it.totalLinea || 0), 0);
  }

  savingIndex: number | null = null;

  guardarLinea(index: number): void {
    const it = this.borrador[index];
    if (!it) return;
    // loteId en backend es String (UUID). En frontend Lote.id es number; usamos loteCodigo si existe, sino convertimos a string.
    const loteIdStr = String(it.loteId || '');
    const precioNum = Number(String(it.precioUnit ?? 0).replace(',', '.')) || 0;
    const cantidadNum = Number(it.cantidad ?? 0) || 0;
    const body = {
      fecha: it.fecha,
      loteId: loteIdStr,
      loteCodigo: it.loteCodigo,
      animalId: this.loteSeleccionado?.race?.animal?.id,
      animalName: this.loteSeleccionado?.race?.animal?.name,
      cantidad: cantidadNum,
      precioUnit: +precioNum.toFixed(2),
      total: +((cantidadNum * precioNum)).toFixed(2)
    };
    this.savingIndex = index;
    this.ventasService.crearVentaHuevo(body).subscribe({
      next: (res) => {
        // Quitamos la línea del borrador
        this.eliminarLinea(index);
        const id = res?.id ?? '—';
        alert(`Venta de huevo guardada correctamente (id=${id})`);
        // Refrescamos la tabla de ventas del día desde backend
        this.cargarVentasHoy();
        this.savingIndex = null;
      },
      error: (err) => {
        console.error('Error al guardar venta de huevo', err);
        alert('No se pudo guardar la venta');
        this.savingIndex = null;
      }
    });
  }

  private guardarBorradorLocal(): void {
    try { localStorage.setItem('ventas_huevos_draft', JSON.stringify(this.borrador)); } catch {}
  }

  private cargarBorradorLocal(): void {
    try {
      const raw = localStorage.getItem('ventas_huevos_draft');
      this.borrador = raw ? JSON.parse(raw) : [];
    } catch { this.borrador = []; }
  }

  private hoyISO(): string {
    const d = new Date();
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const dd = d.getDate().toString().padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  // --- Ventas del día (desde backend) ---
  ventasHoy: any[] = [];
  cargarVentasHoy(): void {
    const hoy = this.hoyISO();
    this.ventasService.listarVentasHuevos(hoy, hoy).subscribe({
      next: (data) => this.ventasHoy = data || [],
      error: () => this.ventasHoy = []
    });
  }

  filtroPeriodo: 'hoy'|'ayer'|'semana'|'mes'|'anio'|'rango' = 'hoy';
  fechaDesde: string = '';
  fechaHasta: string = '';
  mesSeleccion: string = '';// formato YYYY-MM
  anioSeleccion: number | null = null;
  aplicarFiltroVentas(): void {
    let from = '';
    let to = '';
    const hoy = new Date();
    const fmt = (d: Date) => `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
    const startOfWeek = () => {
      const d = new Date(hoy);
      const day = d.getDay(); // 0=Dom, 1=Lun
      const diff = (day === 0 ? 6 : day - 1); // Lunes como inicio
      d.setDate(d.getDate() - diff);
      return d;
    };
    const startOfMonth = () => new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    switch (this.filtroPeriodo) {
      case 'hoy':
        from = to = fmt(hoy); break;
      case 'ayer': {
        const a = new Date(hoy); a.setDate(a.getDate()-1);
        from = to = fmt(a); break;
      }
      case 'semana':
        from = fmt(startOfWeek()); to = fmt(hoy); break;
      case 'mes': {
        if (this.mesSeleccion) {
          const [y, m] = this.mesSeleccion.split('-').map(x => Number(x));
          const d1 = new Date(y, (m-1), 1);
          const d2 = new Date(y, (m-1)+1, 0); // último día del mes
          from = fmt(d1); to = fmt(d2);
        } else {
          const d1 = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
          const d2 = new Date(hoy.getFullYear(), hoy.getMonth()+1, 0);
          from = fmt(d1); to = fmt(d2);
        }
        break;
      }
      case 'anio': {
        const y = this.anioSeleccion || hoy.getFullYear();
        const d1 = new Date(y, 0, 1);
        const d2 = new Date(y, 11, 31);
        from = fmt(d1); to = fmt(d2);
        break;
      }
      case 'rango':
        from = this.fechaDesde || '';
        to = this.fechaHasta || '';
        break;
    }
    this.ventasService.listarVentasHuevos(from || undefined, to || undefined).subscribe({
      next: (data) => this.ventasHoy = data || [],
      error: () => this.ventasHoy = []
    });
  }

  get totalCantidadVentas(): number {
    return (this.ventasHoy || []).reduce((acc, v) => acc + (Number(v?.cantidad) || 0), 0);
  }

  get totalMontoVentas(): number {
    return (this.ventasHoy || []).reduce((acc, v) => acc + (Number(v?.total) || 0), 0);
  }

  exportVentasCSV(): void {
    if (!this.ventasHoy || !this.ventasHoy.length) return;
    const header = ['ID','Fecha','Lote','Cantidad','PrecioUnit','Total'];
    const rows = this.ventasHoy.map((v: any) => [v.id, v.fecha, (v.loteCodigo || v.loteId || ''), v.cantidad, v.precioUnit, v.total]);
    const csv = [header.join(','), ...rows.map(r => r.map(x => (x!=null?String(x).replace(/,/g,' '):'')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ventas_huevos_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // --- Edición en línea / Eliminar ---
  editingId: number | null = null;
  editModel: { cantidad: number; precioUnit: number } = { cantidad: 0, precioUnit: 0 };

  startEdit(v: any): void {
    this.editingId = v.id;
    this.editModel = {
      cantidad: Number(v.cantidad) || 0,
      precioUnit: Number(v.precioUnit) || 0
    };
  }

  cancelEdit(): void {
    this.editingId = null;
  }

  saveEdit(v: any): void {
    if (this.editingId !== v.id) return;
    const cantidad = Number(this.editModel.cantidad) || 0;
    const precioUnit = Number(this.editModel.precioUnit) || 0;
    const total = +((cantidad * precioUnit)).toFixed(2);
    const fechaStr = this.formatFecha(v.fecha);
    const body: any = {
      // Campos obligatorios en backend (@NotNull)
      fecha: fechaStr,
      loteId: String(v.loteId || ''),
      loteCodigo: v.loteCodigo,
      animalId: v.animalId,
      animalName: v.animalName,
      cantidad,
      precioUnit,
      total
    };
    this.ventasService.actualizarVentaHuevo(v.id, body).subscribe({
      next: (res) => {
        this.editingId = null;
        this.aplicarFiltroVentas(); // refrescar con el periodo seleccionado
      },
      error: (err) => {
        console.error('Error al actualizar venta de huevo', err);
        alert('No se pudo actualizar la venta');
      }
    });
  }

  deleteVenta(v: any): void {
    if (!confirm(`¿Eliminar venta id=${v.id}?`)) return;
    this.ventasService.eliminarVentaHuevo(v.id).subscribe({
      next: () => {
        this.aplicarFiltroVentas();
      },
      error: (err) => {
        console.error('Error al eliminar venta de huevo', err);
        alert('No se pudo eliminar la venta');
      }
    });
  }
}
