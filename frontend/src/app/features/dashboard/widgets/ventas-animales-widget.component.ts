import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoteService } from '../../../features/lotes/services/lote.service';
import { Lote } from '../../../features/lotes/interfaces/lote.interface';
import { Subscription } from 'rxjs';
import { VentasService } from '../../../shared/services/ventas.service';
import { ProductService } from '../../../shared/services/product.service';
import { Animal } from '../../../shared/models/product.model';

@Component({
  selector: 'app-ventas-animales-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="space-y-6">
    <!-- Buscador superior por periodo -->
    <div class="bg-white border rounded p-4">
      <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div class="flex items-center gap-2 flex-wrap">
          <label class="text-sm text-gray-600">Periodo</label>
          <select [(ngModel)]="filtroPeriodoAnim" class="border rounded px-2 py-1">
            <option value="todos">Todos</option>
            <option value="hoy">Hoy</option>
            <option value="ayer">Ayer</option>
            <option value="semana">Esta semana</option>
            <option value="mes">Mes actual</option>
            <option value="anio">Año actual</option>
            <option value="rango">Rango personalizado</option>
          </select>
          <input *ngIf="filtroPeriodoAnim==='mes'" [(ngModel)]="mesSeleccionAnim" type="month" class="border rounded px-2 py-1" />
          <input *ngIf="filtroPeriodoAnim==='anio'" [(ngModel)]="anioSeleccionAnim" type="number" min="2000" max="2100" placeholder="Año" class="w-28 border rounded px-2 py-1" />
          <input *ngIf="filtroPeriodoAnim==='rango'" [(ngModel)]="fechaDesdeAnim" type="date" class="border rounded px-2 py-1" />
          <input *ngIf="filtroPeriodoAnim==='rango'" [(ngModel)]="fechaHastaAnim" type="date" class="border rounded px-2 py-1" />
          <button (click)="aplicarFiltroVentasAnim()" class="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-sm">Buscar</button>
        </div>
      </div>
    </div>

    <!-- Resumen de ventas de animales (periodo seleccionado) -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div class="bg-blue-50 border border-blue-100 rounded p-4">
        <div class="text-xs uppercase tracking-wide text-blue-700">Pollos vendidos (periodo)</div>
        <div class="text-2xl font-bold text-blue-900">{{ cantidadPollosPeriodo }}</div>
        <div class="text-xs text-blue-700/80 mt-1">{{ montoPollosPeriodo | currency:'USD':'symbol-narrow' }}</div>
      </div>
      <div class="bg-pink-50 border border-pink-100 rounded p-4">
        <div class="text-xs uppercase tracking-wide text-pink-700">Chanchos vendidos (periodo)</div>
        <div class="text-2xl font-bold text-pink-900">{{ cantidadChanchosPeriodo }}</div>
        <div class="text-xs text-pink-700/80 mt-1">{{ montoChanchosPeriodo | currency:'USD':'symbol-narrow' }}</div>
      </div>
      <div class="bg-amber-50 border border-amber-100 rounded p-4">
        <div class="text-xs uppercase tracking-wide text-amber-700">Monto total (periodo)</div>
        <div class="text-2xl font-bold text-amber-900">{{ totalCostoVentasAnim | currency:'USD':'symbol-narrow' }}</div>
        <div class="text-xs text-amber-700/80 mt-1">{{ totalCantidadVentasAnim }} animales</div>
      </div>
    </div>
    <!-- Formulario de venta de animales -->
    <div class="bg-white border rounded p-4">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-semibold">Venta de animales</h2>
        <button
          *ngIf="!mostrarFormulario"
          (click)="mostrarFormulario = true"
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">
          Ingresar una venta de animales
        </button>
      </div>

      <div *ngIf="mostrarFormulario">
      <h3 class="text-md font-semibold mb-3">Registrar venta</h3>
      <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div>
          <label class="block text-sm text-gray-600 mb-1">Animal</label>
          <select [(ngModel)]="animalSeleccionadoId" (ngModelChange)="onChangeAnimal()" class="w-full border rounded px-3 py-2">
            <option [ngValue]="null">Seleccione animal</option>
            <option *ngFor="let a of animales" [ngValue]="a.id">{{ a.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">Lote</label>
          <select [(ngModel)]="venta.loteId" (ngModelChange)="onSelectLote()" class="w-full border rounded px-3 py-2">
            <option [ngValue]="null">Seleccione un lote</option>
            <ng-container *ngFor="let l of lotesFiltradosPorAnimal">
              <option [ngValue]="l.id">{{ formatLoteCodigo(l.codigo || l.id) }} - {{ l.name }} ({{ l.quantity || 0 }} animales)</option>
            </ng-container>
          </select>
          <div class="mt-1" *ngIf="loteSeleccionado">
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
              Stock: {{ loteSeleccionado.quantity || 0 }} animales
            </span>
          </div>
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">Fecha</label>
          <input [(ngModel)]="venta.fecha" type="date" class="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">Cantidad</label>
          <input [(ngModel)]="venta.cantidad" (ngModelChange)="recalcularTotal()" type="number" min="1" class="w-full border rounded px-3 py-2" />
          <div class="text-xs text-gray-500 mt-1" *ngIf="loteSeleccionado">Stock: {{ loteSeleccionado.quantity }}</div>
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">Precio Unit.</label>
          <input [(ngModel)]="venta.precioUnit" (ngModelChange)="recalcularTotal()" type="number" step="0.01" class="w-full border rounded px-3 py-2" />
        </div>
      </div>
      <div class="flex items-center justify-between mt-3">
        <div class="text-sm text-gray-700 flex flex-col">
          <span>Total línea: <span class="font-semibold">{{ venta.total || 0 | currency:'USD':'symbol-narrow' }}</span></span>
          <span *ngIf="loteSeleccionado">Animal: <span class="font-medium">{{ loteSeleccionado?.race?.animal?.name || '—' }}</span></span>
        </div>
        <div class="space-x-2">
          <button (click)="guardarVentaActual()" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Guardar venta</button>
          <button (click)="limpiarFormulario()" class="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200">Limpiar</button>
          <button (click)="mostrarFormulario = false" class="bg-gray-50 text-gray-600 px-4 py-2 rounded hover:bg-gray-100">Cerrar</button>
        </div>
      </div>
      </div>

      <!-- Ventas guardadas (desde backend) -->
      <div class="mt-6">
        <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-2">
          <h3 class="font-semibold">Ventas de animales guardadas
            <span class="ml-2 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded" *ngIf="ventasAnimalesHoy && ventasAnimalesHoy.length">{{ ventasAnimalesHoy.length }} registros</span>
          </h3>
        </div>
        <div class="overflow-auto border rounded" *ngIf="ventasAnimalesHoy && ventasAnimalesHoy.length; else sinVentasAnim">
          <table class="min-w-full">
            <thead class="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th class="px-4 py-3">ID</th>
                <th class="px-4 py-3">Fecha</th>
                <th class="px-4 py-3">Lote</th>
                <th class="px-4 py-3">Animal</th>
                <th class="px-4 py-3">Cantidad</th>
                <th class="px-4 py-3">Precio Unit.</th>
                <th class="px-4 py-3">Total</th>
                <th class="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let v of ventasAnimalesHoy" class="border-t">
                <td class="px-4 py-2">{{ v.id }}</td>
                <td class="px-4 py-2">{{ formatFecha(v.fecha) }}</td>
                <td class="px-4 py-2">{{ formatLoteCodigo(v.loteCodigo || v.loteId) }}</td>
                <td class="px-4 py-2">{{ getAnimalNameVenta(v) }}</td>
                <td class="px-4 py-2">
                  <ng-container *ngIf="editingIdAnim===v.id; else viewCantA"> 
                    <input type="number" [(ngModel)]="editAnimModel.cantidad" min="0" class="w-24 border rounded px-2 py-1" />
                  </ng-container>
                  <ng-template #viewCantA>{{ v.cantidad }}</ng-template>
                </td>
                <td class="px-4 py-2">
                  <ng-container *ngIf="editingIdAnim===v.id; else viewPUA"> 
                    <input type="number" step="0.01" [(ngModel)]="editAnimModel.precioUnit" class="w-28 border rounded px-2 py-1" />
                  </ng-container>
                  <ng-template #viewPUA>{{ v.precioUnit | currency:'USD':'symbol-narrow' }}</ng-template>
                </td>
                <td class="px-4 py-2">{{ (editingIdAnim===v.id ? (editAnimModel.cantidad*editAnimModel.precioUnit) : v.total) | currency:'USD':'symbol-narrow' }}</td>
                <td class="px-4 py-2">
                  <ng-container *ngIf="editingIdAnim===v.id; else accionesViewA">
                    <div class="flex items-center gap-2">
                      <button (click)="saveEditAnim(v)" class="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-sm" title="Guardar cambios">Guardar</button>
                      <button (click)="cancelEditAnim()" class="px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm" title="Cancelar edición">Cancelar</button>
                    </div>
                  </ng-container>
                  <ng-template #accionesViewA>
                    <div class="flex items-center gap-3">
                      <button (click)="startEditAnim(v)" class="p-1 rounded hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200" title="Editar">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5 text-blue-600">
                          <path d="M12 20h9"/>
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
                        </svg>
                      </button>
                      <button (click)="deleteVentaAnim(v)" class="p-1 rounded hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200" title="Eliminar">
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
        <ng-template #sinVentasAnim>
          <div class="text-sm text-gray-500 p-4 text-center bg-gray-50 rounded border">
            <p>No hay ventas de animales registradas para el periodo seleccionado.</p>
            <p class="text-xs mt-1">Prueba cambiando el filtro de periodo a "Todos" para ver todas las ventas.</p>
          </div>
        </ng-template>
      </div>
    <div class="mt-4" *ngIf="borrador.length">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-semibold">Borrador de venta (local)</h3>
          <div class="text-sm">Total borrador: <span class="font-bold">{{ totalBorrador | currency:'USD':'symbol-narrow' }}</span></div>
        </div>
        <div class="overflow-auto border rounded">
          <table class="min-w-full">
            <thead class="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th class="px-4 py-3">Lote</th>
                <th class="px-4 py-3">Animal</th>
                <th class="px-4 py-3">Fecha</th>
                <th class="px-4 py-3">Cantidad</th>
                <th class="px-4 py-3">Precio Unit.</th>
                <th class="px-4 py-3">Total</th>
                <th class="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let it of borrador; let i = index" class="border-t">
                <td class="px-4 py-2">{{ formatLoteCodigo(it.loteCodigo || it.loteId) }}</td>
                <td class="px-4 py-2">{{ it.animal }}</td>
                <td class="px-4 py-2">{{ it.fecha }}</td>
                <td class="px-4 py-2">{{ it.cantidad }}</td>
                <td class="px-4 py-2">{{ it.precioUnit | currency:'USD':'symbol-narrow' }}</td>
                <td class="px-4 py-2">{{ it.total | currency:'USD':'symbol-narrow' }}</td>
                <td class="px-4 py-2">
                  <button (click)="guardarLinea(i)" class="text-green-700 hover:underline mr-3">Guardar</button>
                  <button (click)="eliminarLinea(i)" class="text-red-600 hover:underline">Eliminar</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="flex justify-end mt-2">
          <button (click)="vaciarBorrador()" class="bg-red-50 text-red-700 px-3 py-2 rounded hover:bg-red-100 text-sm">Vaciar borrador</button>
        </div>
      </div>
    </div>

    <ng-container *ngIf="mostrarPanelExplorador">
    <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
        <div>
          <label class="block text-sm text-gray-600 mb-1">Especie</label>
          <select [(ngModel)]="especie" (ngModelChange)="aplicarFiltros()" class="w-full border rounded px-3 py-2">
            <option value="all">Todas</option>
            <option value="pollos">Pollos/Aves</option>
            <option value="chanchos">Chanchos/Cerdos</option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">Buscar</label>
          <input [(ngModel)]="busqueda" (ngModelChange)="aplicarFiltros()" type="text" placeholder="Código o nombre del lote..." class="w-full border rounded px-3 py-2" />
        </div>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 md:w-1/2">
        <div class="bg-white border rounded p-3">
          <div class="text-xs text-gray-500">Lotes</div>
          <div class="text-lg font-semibold">{{ lotesFiltrados.length }}</div>
        </div>
        <div class="bg-white border rounded p-3">
          <div class="text-xs text-gray-500">Total Animales</div>
          <div class="text-lg font-semibold">{{ totalAnimales }}</div>
        </div>
        <div class="bg-white border rounded p-3">
          <div class="text-xs text-gray-500">Especie</div>
          <div class="text-lg font-semibold">{{ especie | titlecase }}</div>
        </div>
      </div>
    </div>
    </ng-container>

    

    <div class="overflow-auto bg-white border rounded" *ngIf="false">
      <table class="min-w-full">
        <thead class="bg-gray-50 text-left text-xs text-gray-500">
          <tr>
            <th class="px-4 py-3">Código</th>
            <th class="px-4 py-3">Lote</th>
            <th class="px-4 py-3">Animal</th>
            <th class="px-4 py-3">Cantidad</th>
            <th class="px-4 py-3">Nacimiento</th>
            <th class="px-4 py-3">Edad</th>
            <th class="px-4 py-3">Costo</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let l of lotesFiltrados" class="border-t hover:bg-gray-50">
            <td class="px-4 py-2">{{ l.codigo || '—' }}</td>
            <td class="px-4 py-2">{{ l.name }}</td>
            <td class="px-4 py-2">{{ l.race?.animal?.name || 'N/D' }}</td>
            <td class="px-4 py-2">{{ l.quantity }}</td>
            <td class="px-4 py-2">{{ l.birthdate | date:'yyyy-MM-dd' }}</td>
            <td class="px-4 py-2">{{ calcularEdad(l.birthdate) }}</td>
            <td class="px-4 py-2">{{ l.cost | currency:'USD':'symbol-narrow' }}</td>
          </tr>
          <tr *ngIf="!cargando && lotesFiltrados.length === 0">
            <td colspan="7" class="px-4 py-6 text-center text-sm text-gray-500">No hay resultados para los filtros seleccionados.</td>
          </tr>
          <tr *ngIf="cargando">
            <td colspan="7" class="px-4 py-6 text-center text-sm text-gray-500">Cargando...</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  `
})
export class VentasAnimalesWidgetComponent implements OnInit, OnDestroy {
  cargando = false;
  lotes: Lote[] = [];
  lotesFiltrados: Lote[] = [];
  animales: Animal[] = [];
  animalSeleccionadoId: number | null = null;
  // Flag para ocultar el panel de especie/buscar sin afectar el resto
  mostrarPanelExplorador = false;
  // Flag para mostrar/ocultar el formulario de registro
  mostrarFormulario = false;
  // Borrador local de ventas de animales
  borrador: Array<{ loteId: string; loteCodigo?: string; animal: string; fecha: string; cantidad: number; precioUnit: number; total: number; }>= [];
  venta: { loteId: string | null; fecha: string; cantidad: number; precioUnit: number; total: number } = {
    loteId: null,
    fecha: VentasAnimalesWidgetComponent.hoyISO(),
    cantidad: 1,
    precioUnit: 0,
    total: 0
  };

  especie: 'all' | 'pollos' | 'chanchos' = 'all';
  busqueda = '';

  private sub?: Subscription;

  constructor(private loteService: LoteService, private ventasService: VentasService, private productService: ProductService) {}

  ngOnInit(): void {
    this.cargarLotes();
    this.cargarAnimales();
    this.cargarBorradorLocal();
    // Cargar ventas usando el filtro por defecto (todos)
    this.aplicarFiltroVentasAnim();
    // Cargar acumulado global fijo
    this.cargarVentasAnimAcum();
  }

  // Formatea código/ID de lote a 'Lote001', 'Lote002', etc.
  formatLoteCodigo(valor: any): string {
    if (valor == null) return 'Lote001';
    const raw = String(valor).trim();
    const digits = (raw.match(/\d+/g) || []).join('');
    const last3 = (digits || '1').slice(-3);
    const num = Number(last3) || 1;
    return `Lote${num.toString().padStart(3, '0')}`;
  }

  // Helpers para mostrar el animal en ventas guardadas
  private animalNameById(id?: number | null): string | null {
    if (id == null) return null;
    const lote = this.lotes.find(l => l.race?.animal?.id === id);
    return lote?.race?.animal?.name || null;
  }

  getAnimalNameVenta(v: any): string {
    return v?.animalName || this.animalNameById(v?.animalId) || '—';
  }
  // Estado y acciones de edición/eliminación (animales)
  editingIdAnim: number | null = null;
  editAnimModel: { cantidad: number; precioUnit: number } = { cantidad: 0, precioUnit: 0 };

  startEditAnim(v: any): void {
    this.editingIdAnim = v.id;
    this.editAnimModel = {
      cantidad: Number(v.cantidad) || 0,
      precioUnit: Number(v.precioUnit) || 0
    };
  }

  cancelEditAnim(): void {
    this.editingIdAnim = null;
  }

  saveEditAnim(v: any): void {
    if (this.editingIdAnim !== v.id) return;
    const cantidad = Number(this.editAnimModel.cantidad) || 0;
    const precioUnit = Number(this.editAnimModel.precioUnit) || 0;
    const total = +((cantidad * precioUnit)).toFixed(2);
    const body: any = {
      fecha: this.formatFecha(v.fecha),
      loteId: String(v.loteId || ''),
      loteCodigo: v.loteCodigo,
      animalId: v.animalId,
      animalName: v.animalName,
      cantidad,
      precioUnit,
      total
    };
    this.ventasService.actualizarVentaAnimal(v.id, body).subscribe({
      next: () => {
        this.editingIdAnim = null;
        this.aplicarFiltroVentasAnim();
      },
      error: (err) => {
        console.error('Error al actualizar venta de animales', err);
        alert('No se pudo actualizar la venta');
      }
    });
  }

  deleteVentaAnim(v: any): void {
    if (!confirm(`¿Eliminar venta id=${v.id}?`)) return;
    this.ventasService.eliminarVentaAnimal(v.id).subscribe({
      next: () => this.aplicarFiltroVentasAnim(),
      error: (err) => {
        console.error('Error al eliminar venta de animales', err);
        alert('No se pudo eliminar la venta');
      }
    });
  }

  // Totales de ventas mostradas
  private calcularCostoRealVenta(v: any): number {
    if (!v) return 0;
    const loteIdStr = String(v.loteId || '');
    if (!loteIdStr) return 0;

    const lote = this.lotes.find(l => String(l.id || '') === loteIdStr);
    if (!lote) return 0;

    const cantidadVendida = Number(v.cantidad) || 0;
    if (cantidadVendida <= 0) return 0;

    const qtyOriginal = Number(lote.quantityOriginal ?? lote.quantity ?? 0);
    if (!qtyOriginal || qtyOriginal <= 0) return 0;

    const costoTotalLote = Number(lote.cost) || 0;
    const costoUnitario = costoTotalLote / qtyOriginal;
    return cantidadVendida * costoUnitario;
  }

  get totalCantidadVentasAnim(): number {
    return (this.ventasAnimalesHoy || []).reduce((acc, v) => acc + (Number(v?.cantidad) || 0), 0);
  }

  get totalMontoVentasAnim(): number {
    return (this.ventasAnimalesHoy || []).reduce((acc, v) => acc + (Number(v?.total) || 0), 0);
  }

  get totalCostoVentasAnim(): number {
    // Definimos el total de costo del periodo como la suma de los costos por especie
    // para que coincida exactamente con lo que ves en las tarjetas de Pollos y Chanchos.
    return this.montoPollosPeriodo + this.montoChanchosPeriodo;
  }

  // --- Acumulado global fijo (no depende del filtro) ---
  ventasAnimAll: any[] = [];
  private cargarVentasAnimAcum(): void {
    this.ventasService.listarVentasAnimales().subscribe({
      next: (data) => this.ventasAnimAll = data || [],
      error: () => this.ventasAnimAll = []
    });
  }
  get totalRegistrosAnimAcum(): number { return (this.ventasAnimAll || []).length; }
  get totalCantidadAnimAcum(): number {
    return (this.ventasAnimAll || []).reduce((acc, v) => acc + (Number(v?.cantidad) || 0), 0);
  }
  get totalMontoAnimAcum(): number {
    return (this.ventasAnimAll || []).reduce((acc, v) => acc + (Number(v?.total) || 0), 0);
  }

  // --- Resúmenes por especie ---
  private esPollo(v: any): boolean {
    if (!v) return false;
    if (v.animalId != null) {
      // Si hay un mapeo de IDs, puedes reemplazar esta lógica por igualdad a ID de pollos
      // Por ahora dejamos por nombre como fallback robusto
    }
    const name = (v.animalName || '').toString().toLowerCase();
    return name.includes('pollo') || name.includes('ave') || name.includes('gallina');
  }

  private esChancho(v: any): boolean {
    if (!v) return false;
    if (v.animalId != null) {
      // Igual que arriba: si tienes ID fijo para chanchos, puedes verificar aquí
    }
    const name = (v.animalName || '').toString().toLowerCase();
    return name.includes('chancho') || name.includes('cerdo') || name.includes('puerco');
  }

  // Suma directa de v.total por especie (lo que el usuario vendió)
  get totalVentasPollos(): number {
    return (this.ventasAnimalesHoy || []).reduce((acc, v) => acc + (this.esPollo(v) ? (Number(v?.total) || 0) : 0), 0);
  }

  get totalVentasChanchos(): number {
    return (this.ventasAnimalesHoy || []).reduce((acc, v) => acc + (this.esChancho(v) ? (Number(v?.total) || 0) : 0), 0);
  }

  // --- KPIs del periodo seleccionado ---
  get cantidadPollosPeriodo(): number {
    return (this.ventasAnimalesHoy || []).reduce((acc, v) => acc + (this.esPollo(v) ? (Number(v?.cantidad) || 0) : 0), 0);
  }

  get montoPollosPeriodo(): number {
    return this.totalVentasPollos;
  }

  get cantidadChanchosPeriodo(): number {
    return (this.ventasAnimalesHoy || []).reduce((acc, v) => acc + (this.esChancho(v) ? (Number(v?.cantidad) || 0) : 0), 0);
  }

  get montoChanchosPeriodo(): number {
    return this.totalVentasChanchos;
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private cargarLotes(): void {
    this.cargando = true;
    this.sub = this.loteService.getLotes().subscribe({
      next: (lotes) => {
        this.lotes = lotes || [];
        this.aplicarFiltros();
        this.cargando = false;
      },
      error: () => {
        this.lotes = [];
        this.lotesFiltrados = [];
        this.cargando = false;
      }
    });
  }

  private cargarAnimales(): void {
    this.productService.getAnimals().subscribe({
      next: (as) => this.animales = as || [],
      error: () => this.animales = []
    });
  }

  aplicarFiltros(): void {
    const q = this.busqueda.trim().toLowerCase();

    const coincideEspecie = (l: Lote) => {
      if (this.especie === 'all') return true;
      const animalName = l.race?.animal?.name?.toLowerCase?.() || '';
      if (this.especie === 'pollos') {
        return animalName.includes('ave') || animalName.includes('gallina') || animalName.includes('pollo');
      }
      return animalName.includes('cerdo') || animalName.includes('chancho') || animalName.includes('puerco');
    };

    const coincideBusqueda = (l: Lote) => {
      if (!q) return true;
      const codigo = (l.codigo || '').toLowerCase();
      const nombre = (l.name || '').toLowerCase();
      return codigo.includes(q) || nombre.includes(q);
    };

    // Solo lotes activos (animales vivos > 0)
    this.lotesFiltrados = this.lotes
      .filter(l => (l.quantity || 0) > 0)
      .filter(l => coincideEspecie(l))
      .filter(l => coincideBusqueda(l));
  }

  calcularEdad(date: Date | null): string {
    if (!date) return 'N/D';
    const now = new Date();
    const d = new Date(date);
    const diffMs = now.getTime() - d.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30);
    if (months > 0) return `${months} m`;
    return `${days} d`;
  }

  get totalAnimales(): number {
    return this.lotesFiltrados.reduce((acc, l) => acc + (l.quantity || 0), 0);
  }

  get loteSeleccionado(): Lote | null {
    if (!this.venta.loteId) return null;
    return this.lotes.find(l => l.id === this.venta.loteId) || null;
  }

  // Lotes filtrados por animal seleccionado desde configuración - solo lotes con stock disponible
  get lotesFiltradosPorAnimal(): Lote[] {
    const lotesConStock = (this.lotes || []).filter(l => (l.quantity || 0) > 0);
    if (this.animalSeleccionadoId == null) return lotesConStock;
    return lotesConStock.filter(l => l.race?.animal?.id === this.animalSeleccionadoId);
  }

  onSelectLote(): void {
    // Hook para reaccionar a cambio de lote (por ahora no precargamos nada)
  }

  onChangeAnimal(): void {
    // al cambiar animal, limpiamos selección de lote
    this.venta.loteId = null;
  }

  recalcularTotal(): void {
    const qty = Number(this.venta.cantidad) || 0;
    const pu = Number(String(this.venta.precioUnit ?? 0).replace(',', '.')) || 0;
    this.venta.total = +(qty * pu).toFixed(2);
  }

  // Guardado directo (sin borrador)
  savingDirect = false;
  guardarVentaActual(): void {
    if (!this.venta.loteId) { alert('Seleccione un lote'); return; }
    const lote = this.lotes.find(l => l.id === this.venta.loteId);
    if (!lote) { alert('Lote inválido'); return; }
    if (!this.venta.fecha) this.venta.fecha = VentasAnimalesWidgetComponent.hoyISO();
    const cantidadNum = Number(this.venta.cantidad ?? 0) || 0;
    const precioNum = Number(String(this.venta.precioUnit ?? 0).replace(',', '.')) || 0;
    if (cantidadNum <= 0 || precioNum < 0) { alert('Ingrese cantidad y precio válidos'); return; }

    const body = {
      fecha: this.venta.fecha,
      loteId: String(lote.id || ''),
      loteCodigo: lote.codigo,
      animalId: lote.race?.animal?.id,
      animalName: lote.race?.animal?.name,
      cantidad: cantidadNum,
      precioUnit: +precioNum.toFixed(2),
      total: +((cantidadNum * precioNum)).toFixed(2)
    };

    this.savingDirect = true;
    this.ventasService.crearVentaAnimal(body).subscribe({
      next: (res) => {
        const id = res?.id ?? '—';
        const qtyPrev = Number(lote?.quantity ?? 0);
        const qtyVend = cantidadNum;
        const restantes = Math.max(0, qtyPrev - qtyVend);
        if (restantes <= 0) {
          alert(`Venta guardada (id=${id}). El lote ${lote?.codigo || ''} llegó a 0 y fue movido al Histórico. Ciclo finalizado.`);
        } else {
          alert(`Venta de animales guardada (id=${id})`);
        }
        this.cargarVentasAnimalesHoy();
        this.cargarLotes();
        // Reset rápido manteniendo lote seleccionado
        const keepLote = this.venta.loteId;
        this.venta = {
          loteId: keepLote,
          fecha: VentasAnimalesWidgetComponent.hoyISO(),
          cantidad: 1,
          precioUnit: 0,
          total: 0
        };
        this.savingDirect = false;
      },
      error: (err) => {
        console.error('Error al guardar venta de animales (directo)', err);
        alert('No se pudo guardar la venta');
        this.savingDirect = false;
      }
    });
  }

  agregarLinea(): void {
    if (!this.venta.loteId) return;
    const lote = this.lotes.find(l => l.id === this.venta.loteId);
    if (!lote) return;
    if (!this.venta.fecha) this.venta.fecha = VentasAnimalesWidgetComponent.hoyISO();
    const qty = Number(this.venta.cantidad) || 0;
    if (qty <= 0) return;
    // Validación suave de stock (no bloqueante)
    if (lote.quantity != null && qty > lote.quantity) {
      // Limitamos a stock visualmente
      this.venta.cantidad = lote.quantity;
      this.recalcularTotal();
    }

    const item = {
      loteId: String(lote.id!),
      loteCodigo: lote.codigo,
      animal: lote.race?.animal?.name || 'N/D',
      fecha: this.venta.fecha,
      cantidad: this.venta.cantidad,
      precioUnit: this.venta.precioUnit,
      total: this.venta.total
    };
    this.borrador = [...this.borrador, item];
    this.guardarBorradorLocal();
    this.limpiarFormulario();
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

  limpiarFormulario(): void {
    const keepLote = this.venta.loteId;
    this.venta = {
      loteId: keepLote || null,
      fecha: VentasAnimalesWidgetComponent.hoyISO(),
      cantidad: 1,
      precioUnit: 0,
      total: 0
    };
  }

  get totalBorrador(): number {
    return this.borrador.reduce((acc, it) => acc + (it.total || 0), 0);
  }

  guardarLinea(index: number): void {
    const it = this.borrador[index];
    if (!it) return;
    const loteIdStr = String(it.loteId || '');
    const body = {
      fecha: it.fecha,
      loteId: loteIdStr,
      loteCodigo: it.loteCodigo,
      animalName: it.animal,
      cantidad: it.cantidad,
      precioUnit: it.precioUnit,
      total: it.total
    };
    this.ventasService.crearVentaAnimal(body).subscribe({
      next: () => {
        this.eliminarLinea(index);
        const lote = this.lotes.find(l => String(l.id) === loteIdStr);
        const qtyPrev = Number(lote?.quantity ?? 0);
        const qtyVend = Number(it.cantidad ?? 0);
        const restantes = Math.max(0, qtyPrev - qtyVend);
        if (restantes <= 0) {
          alert(`Venta de animales guardada correctamente. El lote ${lote?.codigo || ''} llegó a 0 y fue movido al Histórico. Ciclo finalizado.`);
        } else {
          alert('Venta de animales guardada correctamente');
        }
        // Refrescar listado de ventas guardadas y lotes
        this.cargarVentasAnimalesHoy();
        this.cargarLotes();
      },
      error: (err) => {
        console.error('Error al guardar venta de animales', err);
        alert('No se pudo guardar la venta');
      }
    });
  }

  private guardarBorradorLocal(): void {
    try { localStorage.setItem('ventas_animales_draft', JSON.stringify(this.borrador)); } catch {}
  }

  private cargarBorradorLocal(): void {
    try {
      const raw = localStorage.getItem('ventas_animales_draft');
      this.borrador = raw ? JSON.parse(raw) : [];
    } catch { this.borrador = []; }
  }

  private static hoyISO(): string {
    const d = new Date();
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const dd = d.getDate().toString().padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  // --- Ventas del día / por periodo (desde backend) ---
  ventasAnimalesHoy: any[] = [];
  cargarVentasAnimalesHoy(): void {
    const hoy = VentasAnimalesWidgetComponent.hoyISO();
    this.ventasService.listarVentasAnimales(hoy, hoy).subscribe({
      next: (data) => this.ventasAnimalesHoy = data || [],
      error: () => this.ventasAnimalesHoy = []
    });
  }

  // Formatear fecha [yyyy,mm,dd] o ISO para la tabla
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

  // Filtros de periodo (todos/hoy/ayer/semana/mes/año/rango)
  filtroPeriodoAnim: 'todos'|'hoy'|'ayer'|'semana'|'mes'|'anio'|'rango' = 'todos';
  fechaDesdeAnim: string = '';
  fechaHastaAnim: string = '';
  mesSeleccionAnim: string = '';// YYYY-MM
  anioSeleccionAnim: number | null = null;
  aplicarFiltroVentasAnim(): void {
    let from = '';
    let to = '';
    const hoy = new Date();
    const fmt = (d: Date) => `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
    const startOfWeek = () => {
      const d = new Date(hoy);
      const day = d.getDay();
      const diff = (day === 0 ? 6 : day - 1);
      d.setDate(d.getDate() - diff);
      return d;
    };
    switch (this.filtroPeriodoAnim) {
      case 'todos':
        // Sin filtro de fechas - traer todos los registros
        from = '';
        to = '';
        break;
      case 'hoy':
        from = to = fmt(hoy); break;
      case 'ayer': {
        const a = new Date(hoy); a.setDate(a.getDate()-1);
        from = to = fmt(a); break;
      }
      case 'semana':
        from = fmt(startOfWeek()); to = fmt(hoy); break;
      case 'mes': {
        if (this.mesSeleccionAnim) {
          const [y, m] = this.mesSeleccionAnim.split('-').map(x => Number(x));
          const d1 = new Date(y, (m-1), 1);
          const d2 = new Date(y, (m-1)+1, 0);
          from = fmt(d1); to = fmt(d2);
        } else {
          const d1 = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
          const d2 = new Date(hoy.getFullYear(), hoy.getMonth()+1, 0);
          from = fmt(d1); to = fmt(d2);
        }
        break;
      }
      case 'anio': {
        const y = this.anioSeleccionAnim || hoy.getFullYear();
        const d1 = new Date(y, 0, 1);
        const d2 = new Date(y, 11, 31);
        from = fmt(d1); to = fmt(d2);
        break;
      }
      case 'rango':
        from = this.fechaDesdeAnim || '';
        to = this.fechaHastaAnim || '';
        break;
    }
    this.ventasService.listarVentasAnimales(from || undefined, to || undefined).subscribe({
      next: (data) => this.ventasAnimalesHoy = data || [],
      error: () => this.ventasAnimalesHoy = []
    });
    // Refrescar acumulado fijo en paralelo
    this.cargarVentasAnimAcum();
  }
  
}
