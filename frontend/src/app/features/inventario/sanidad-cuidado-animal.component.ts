import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup, FormArray, AbstractControl, ValidatorFn } from '@angular/forms';
import { Lote } from '../lotes/interfaces/lote.interface';
import { LoteService } from '../lotes/services/lote.service';
import { CostosSanidadService } from './services/costos-sanidad.service';
import { ProductService } from '../../shared/services/product.service';
import { Product, Animal } from '../../shared/models/product.model';
import { forkJoin, firstValueFrom } from 'rxjs';
import { DateEsPipe } from '../../shared/pipes/date-es.pipe';
import { InventarioEntradasService } from '../../shared/services/inventario-entradas.service';
import { InventarioProductoFrontService } from '../../shared/services/inventario-producto.service';

interface RegistroSanidad {
  nombreGasto: string;
  detalle: string;
  cantidad: number;
  costoUnitario: number;
  fecha: string;
  loteId: string | number;
  observaciones?: string;
  total: number;
}

@Component({
  selector: 'app-sanidad-cuidado-animal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DateEsPipe],
  template: `
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-blue-800">Sanidad y Cuidado Animal</h1>
        <p class="text-gray-600">Registro de gastos de vacunas, antibióticos, vitaminas y consumibles</p>
      </div>
      <div>
        <button type="button" (click)="mostrarFormulario = !mostrarFormulario"
                class="px-4 py-2 rounded-md text-white"
                [class.bg-blue-600]="!mostrarFormulario" [class.bg-gray-600]="mostrarFormulario">
          {{ mostrarFormulario ? 'Cerrar' : 'Registrar aplicación' }}
        </button>
      </div>
    </div>
    <div class="flex items-center justify-end gap-2 mb-2">
      <span class="text-xs text-gray-500">Periodo:</span>
      <button type="button" (click)="setKpiPeriodo('hoy')" class="px-3 py-1 text-xs rounded border"
              [class.bg-blue-600]="kpiPeriodo==='hoy'" [class.text-white]="kpiPeriodo==='hoy'">Hoy</button>
      <button type="button" (click)="setKpiPeriodo('semana')" class="px-3 py-1 text-xs rounded border"
              [class.bg-blue-600]="kpiPeriodo==='semana'" [class.text-white]="kpiPeriodo==='semana'">Semana</button>
      <button type="button" (click)="setKpiPeriodo('mes')" class="px-3 py-1 text-xs rounded border"
              [class.bg-blue-600]="kpiPeriodo==='mes'" [class.text-white]="kpiPeriodo==='mes'">Mes</button>
      <button type="button" (click)="setKpiPeriodo('todo')" class="px-3 py-1 text-xs rounded border"
              [class.bg-blue-600]="kpiPeriodo==='todo'" [class.text-white]="kpiPeriodo==='todo'">Todo</button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="p-4 rounded-lg border shadow-sm bg-gradient-to-r from-indigo-50 to-white">
        <div class="text-xs text-gray-500">Aplicaciones registradas</div>
        <div class="text-2xl font-semibold text-gray-900">{{ kpiAplicaciones }}</div>
        <div class="text-xs text-gray-500 mt-1">P: {{ kpiAplicacionesP }} | C: {{ kpiAplicacionesC }}</div>
      </div>
      <div class="p-4 rounded-lg border shadow-sm bg-gradient-to-r from-emerald-50 to-white">
        <div class="text-xs text-gray-500">Gasto total</div>
        <div class="text-2xl font-semibold text-emerald-700">S/ {{ kpiGastoTotal | number:'1.2-2' }}</div>
        <div class="text-xs text-gray-500 mt-1">P: S/ {{ kpiGastoTotalP | number:'1.2-2' }} | C: S/ {{ kpiGastoTotalC | number:'1.2-2' }}</div>
      </div>
      <div class="p-4 rounded-lg border shadow-sm bg-gradient-to-r from-amber-50 to-white">
        <div class="text-xs text-gray-500">Costo promedio por aplicación</div>
        <div class="text-2xl font-semibold text-amber-700">S/ {{ kpiCostoPromedio | number:'1.2-2' }}</div>
        <div class="text-xs text-gray-500 mt-1">P: S/ {{ kpiCostoPromedioP | number:'1.2-2' }} | C: S/ {{ kpiCostoPromedioC | number:'1.2-2' }}</div>
      </div>
      <div class="p-4 rounded-lg border shadow-sm bg-gradient-to-r from-sky-50 to-white">
        <div class="text-xs text-gray-500">Productos Botiquín disponibles</div>
        <div class="text-2xl font-semibold text-sky-700">{{ kpiProductosDisponibles }}</div>
        <div class="text-xs text-gray-500 mt-1">P: {{ kpiProductosDisponiblesP }} | C: {{ kpiProductosDisponiblesC }}</div>
      </div>
    </div>
    <div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6" *ngIf="mostrarFormulario">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Animal</label>
            <select formControlName="animalId" (change)="onAnimalChange()" class="w-full p-2 border rounded-md">
              <option [ngValue]="null" disabled>Seleccione un animal</option>
              <option *ngFor="let a of animals" [ngValue]="a.id">{{ a.name }}</option>
            </select>
          </div>
          <div *ngIf="esIndividuosHabilitado()">
            <label class="block text-sm font-semibold text-gray-700 mb-1">Modo de aplicación</label>
            <div class="flex items-center gap-4 p-2 border rounded-md">
              <label class="inline-flex items-center gap-2">
                <input type="radio" name="modo" [value]="'POR_LOTE'" formControlName="modo" (change)="onModoChange()" />
                <span>Por lote</span>
              </label>
              <label class="inline-flex items-center gap-2">
                <input type="radio" name="modo" [value]="'POR_INDIVIDUO'" formControlName="modo" (change)="onModoChange()" />
                <span>Por individuos</span>
              </label>
            </div>
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Producto (Botiquín)</label>
            <select formControlName="productId" (change)="onProductoChange()" class="w-full p-2 border rounded-md">
              <option [ngValue]="null" disabled>Seleccione producto</option>
              <option *ngFor="let p of productosBotiquinDisponibles" [ngValue]="p.id">
                {{ p.name }} — Stock: {{ getStockDisponible(p.id) | number:'1.2-2' }}
              </option>
            </select>
            <p class="text-xs text-gray-500 mt-1" *ngIf="(productosBotiquinDisponibles||[]).length === 0">No hay productos con stock disponible para el animal seleccionado.</p>
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Nombre del gasto</label>
            <input type="text" formControlName="nombreGasto" class="w-full p-2 border rounded-md bg-gray-50" readonly />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Detalle / Descripción</label>
            <input type="text" formControlName="detalle" class="w-full p-2 border rounded-md" placeholder="Vacuna Newcastle aplicada a lote P1" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Unidad</label>
            <input type="text" formControlName="unidad" class="w-full p-2 border rounded-md" placeholder="ml, dosis, unidad, g, kg" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Dosis por animal</label>
            <input type="number" min="0" step="0.001" formControlName="dosisPorAnimal" (input)="recalcularCantidad()" class="w-full p-2 border rounded-md" placeholder="0.000" />
          </div>
          <div *ngIf="!esPorIndividuo(); else individuosCountReadonly">
            <label class="block text-sm font-semibold text-gray-700 mb-1">Animales a tratar</label>
            <input type="number" min="1" step="1" formControlName="animalesTratados" (input)="recalcularCantidad()" class="w-full p-2 border rounded-md" placeholder="1" />
          </div>
          <ng-template #individuosCountReadonly>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1">Animales seleccionados</label>
              <input type="number" [value]="individuosSeleccionados.length" readonly class="w-full p-2 border rounded-md bg-gray-50" />
            </div>
          </ng-template>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Cantidad</label>
            <input type="number" min="0" step="0.01" formControlName="cantidad" class="w-full p-2 border rounded-md" placeholder="0" />
            <p class="text-xs text-gray-500 mt-1" *ngIf="form.get('dosisPorAnimal')?.value && form.get('animalesTratados')?.value">
              Sugerido: {{ (form.get('dosisPorAnimal')?.value * form.get('animalesTratados')?.value) | number:'1.3-3' }} {{ form.get('unidad')?.value || '' }}
            </p>
          </div>
          <div class="md:col-span-2">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div class="border rounded-md p-3 bg-gray-50">
                <div class="text-xs text-gray-500">Costo unitario promedio (Botiquín)</div>
                <div class="text-lg font-semibold">S/ {{ costoUnitarioPromedioSel | number:'1.2-2' }}</div>
              </div>
              <div class="border rounded-md p-3 bg-gray-50">
                <div class="text-xs text-gray-500">Costo por dosis = costo unit × dosis</div>
                <div class="text-lg font-semibold">S/ {{ costoPorDosis | number:'1.2-2' }}</div>
              </div>
              <div class="border rounded-md p-3 bg-gray-50">
                <div class="text-xs text-gray-500">Costo total estimado</div>
                <div class="text-lg font-semibold text-indigo-700">S/ {{ costoTotalEstimado | number:'1.2-2' }}</div>
              </div>
            </div>
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Fecha</label>
            <input type="date" formControlName="fecha" class="w-full p-2 border rounded-md" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Responsable</label>
            <input type="text" formControlName="responsable" class="w-full p-2 border rounded-md" placeholder="Nombre del responsable" />
          </div>
          <div class="md:col-span-2">
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-semibold text-gray-700">Lotes asociados</label>
              <button type="button" *ngIf="!esPorIndividuo()" (click)="agregarLote()" class="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700">Agregar lote</button>
            </div>
            <div class="space-y-2">
              <div class="flex items-center gap-2" *ngFor="let ctrl of lotesFormArray.controls; let i = index">
                <select [formControl]="ctrl.get('loteId')" (change)="onLoteCambio()" class="flex-1 p-2 border rounded-md">
                  <option [ngValue]="null">Seleccione lote</option>
                  <option *ngFor="let l of lotesFiltrados" [ngValue]="l.id">{{ l.name }} — {{ l.race?.animal?.name }}</option>
                </select>
                <button type="button" (click)="removerLote(i)" *ngIf="!esPorIndividuo() || lotesFormArray.length > 1" class="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700">Quitar</button>
              </div>
              <div *ngIf="lotesFormArray.length === 0" class="text-sm text-gray-500">Agregue al menos un lote.</div>
            </div>
            <div *ngIf="esPorIndividuo() && primerLoteId()" class="mt-3">
              <div class="text-sm text-gray-700 mb-2">Selecciona individuos del lote ({{ getCantidadVivosDelLote(primerLoteId()) }} disponibles)</div>
              <div class="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-48 overflow-auto pr-1">
                <button type="button"
                        *ngFor="let idx of getIndicesIndividuos(primerLoteId())"
                        (click)="toggleIndividuo(idx)"
                        class="px-2 py-1 border rounded text-xs"
                        [class.bg-indigo-600]="estaIndSeleccionado(idx)"
                        [class.text-white]="estaIndSeleccionado(idx)">
                  #{{ idx }}
                </button>
              </div>
              <div class="text-xs text-gray-500 mt-1">Seleccionados: {{ individuosSeleccionados.length }}</div>
            </div>
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-semibold text-gray-700 mb-1">Observaciones</label>
            <textarea rows="3" formControlName="observaciones" class="w-full p-2 border rounded-md" placeholder="Reacciones o notas importantes"></textarea>
          </div>
        </div>
        <div class="flex items-center gap-3 pt-2">
          <button type="submit" [disabled]="form.invalid || saving" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">Guardar</button>
          <button type="button" (click)="limpiarForm()" class="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200">Limpiar</button>
          <div *ngIf="saveMessage" class="text-green-700 text-sm">{{ saveMessage }}</div>
          <div *ngIf="errorMessage" class="text-red-700 text-sm">{{ errorMessage }}</div>
        </div>
      </form>
    </div>

    <div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm" *ngIf="registros.length > 0">
      <h3 class="text-lg font-semibold text-gray-800 mb-3">Registros registrados</h3>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lote</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre gasto</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detalle</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo unit.</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr *ngFor="let r of registros" (click)="verDetalle(r)" class="hover:bg-gray-50 cursor-pointer">
              <td class="px-4 py-2 text-sm">{{ r.fecha | dateEs }}</td>
              <td class="px-4 py-2 text-sm">{{ r.lote?.name || getLoteNombre(r.lote?.id || r.loteId) }} — {{ r.lote?.race?.animal?.name || getLoteAnimal(r.lote?.id || r.loteId) }}</td>
              <td class="px-4 py-2 text-sm">{{ r.nombreGasto }}</td>
              <td class="px-4 py-2 text-sm">{{ r.detalle }}</td>
              <td class="px-4 py-2 text-sm">{{ r.cantidad }}</td>
              <td class="px-4 py-2 text-sm">S/ {{ r.costoUnitario | number:'1.2-2' }}</td>
              <td class="px-4 py-2 text-sm font-semibold text-indigo-700">S/ {{ (r.total ?? (r.cantidad * r.costoUnitario)) | number:'1.2-2' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Detalle de Registro -->
    <div *ngIf="registroDetalle" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" (click)="cerrarDetalle()"></div>
      <div class="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        <div class="flex items-center justify-between border-b p-4">
          <h4 class="text-lg font-semibold text-gray-800">Detalle del registro</h4>
          <button type="button" (click)="cerrarDetalle()" class="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div class="text-xs text-gray-500">Fecha</div>
            <div class="font-medium">{{ registroDetalle?.fecha | dateEs }}</div>
          </div>
          <div>
            <div class="text-xs text-gray-500">Lote</div>
            <div class="font-medium">{{ registroDetalle?.lote?.name || getLoteNombre(registroDetalle?.lote?.id || registroDetalle?.loteId) }}</div>
          </div>
          <div>
            <div class="text-xs text-gray-500">Animal</div>
            <div class="font-medium">{{ registroDetalle?.lote?.race?.animal?.name || getLoteAnimal(registroDetalle?.lote?.id || registroDetalle?.loteId) }}</div>
          </div>
          <div>
            <div class="text-xs text-gray-500">Nombre del gasto</div>
            <div class="font-medium">{{ registroDetalle?.nombreGasto }}</div>
          </div>
          <div class="md:col-span-2">
            <div class="text-xs text-gray-500">Detalle</div>
            <div class="font-medium">{{ registroDetalle?.detalle || '—' }}</div>
          </div>
          <div>
            <div class="text-xs text-gray-500">Cantidad</div>
            <div class="font-medium">{{ registroDetalle?.cantidad }}</div>
          </div>
          <div>
            <div class="text-xs text-gray-500">Costo unitario</div>
            <div class="font-medium">S/ {{ registroDetalle?.costoUnitario | number:'1.2-2' }}</div>
          </div>
          <div>
            <div class="text-xs text-gray-500">Total</div>
            <div class="font-semibold text-indigo-700">S/ {{ (registroDetalle?.total ?? (registroDetalle?.cantidad * registroDetalle?.costoUnitario)) | number:'1.2-2' }}</div>
          </div>
          <div class="md:col-span-2">
            <div class="text-xs text-gray-500">Observaciones</div>
            <div class="font-medium whitespace-pre-wrap">{{ registroDetalle?.observaciones || '—' }}</div>
          </div>
        </div>
        <div class="border-t p-4 flex justify-end gap-2">
          <button type="button" (click)="cerrarDetalle()" class="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
  `
})
export class SanidadCuidadoAnimalComponent implements OnInit {
  form!: FormGroup;
  lotes: Lote[] = [];
  lotesFiltrados: Lote[] = [];
  animals: Animal[] = [];
  products: Product[] = [];
  productosSanidadFiltrados: Product[] = [];
  productoSeleccionado: Product | null = null;
  productosBotiquinDisponibles: Product[] = [];
  registros: any[] = [];
  saving = false;
  saveMessage = '';
  errorMessage = '';
  private actualizandoDetalle = false;
  private stockValidoCache: Record<string, number> = {};
  individuosSeleccionados: number[] = [];
  mostrarFormulario = false;
  costoUnitarioPromedioSel = 0;
  costoPorDosis = 0;
  costoTotalEstimado = 0;
  kpiAplicaciones = 0;
  kpiGastoTotal = 0;
  kpiCostoPromedio = 0;
  kpiProductosDisponibles = 0;
  kpiAplicacionesP = 0;
  kpiAplicacionesC = 0;
  kpiGastoTotalP = 0;
  kpiGastoTotalC = 0;
  kpiCostoPromedioP = 0;
  kpiCostoPromedioC = 0;
  kpiProductosDisponiblesP = 0;
  kpiProductosDisponiblesC = 0;
  kpiPeriodo: 'hoy' | 'semana' | 'mes' | 'todo' = 'mes';
  registroDetalle: any | null = null;

  constructor(
    private fb: FormBuilder,
    private lotesService: LoteService,
    private cSanidad: CostosSanidadService,
    private productService: ProductService,
    private invEntradasService: InventarioEntradasService,
    private invProductoService: InventarioProductoFrontService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      animalId: [null, [Validators.required]],
      modo: ['POR_LOTE'],
      productId: [null, [Validators.required]],
      nombreGasto: ['', [Validators.required, Validators.minLength(3)]],
      detalle: [''],
      unidad: ['ml'],
      dosisPorAnimal: [null, [Validators.min(0.0001)]],
      animalesTratados: [null, [Validators.min(1)]],
      cantidad: [null, [Validators.required, Validators.min(0.0001)]],
      costoUnitario: [null, [Validators.min(0)]],
      fecha: [this.hoyISO(), [Validators.required]],
      responsable: [''],
      observaciones: [''],
      lotes: this.fb.array([], [this.alMenosUnLoteValidator()])
    });

    this.lotesService.getLotes().subscribe({
      next: (l) => { this.lotes = l || []; this.refiltrarLotes(); },
      error: () => { this.lotes = []; this.lotesFiltrados = []; }
    });

    this.productService.getAnimals().subscribe({
      next: (a) => this.animals = a || [],
      error: () => this.animals = []
    });

    this.productService.getProducts().subscribe({
      next: (p) => { this.products = p || []; this.filtrarProductosSanidad(); this.recalcularProductosDisponibles(); },
      error: () => { this.products = []; this.productosSanidadFiltrados = []; this.productosBotiquinDisponibles = []; }
    });

    // Cargar stock válido del Botiquín para conocer qué productos están disponibles
    this.cargarStockValido();

    // Reaccionar al cambio de producto para auto-completar y costos por dosis
    this.form.get('productId')?.valueChanges.subscribe(() => this.onProductoChange());

    this.cargarRegistros();
    // Iniciar con un lote por defecto
    this.agregarLote();
  }

  hoyISO(): string {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }

  getLoteCodigo(id: string | number): string {
    const l = this.lotes.find(x => String(x.id) === String(id));
    return l?.codigo || l?.name || String(id);
  }

  getLoteNombre(id: string | number): string {
    const l = this.lotes.find(x => String(x.id) === String(id));
    return l?.name || l?.codigo || String(id);
  }

  getLoteAnimal(id: string | number): string {
    const l = this.lotes.find(x => String(x.id) === String(id));
    return (l as any)?.race?.animal?.name || '';
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.saving = true;
    this.errorMessage = '';
    const v = this.form.value;
    const modo = String(this.form.get('modo')?.value || 'POR_LOTE');
    let productId: number | null = v.productId != null ? Number(v.productId) : null;
    const prodSel = (this.products || []).find(p => Number(p.id) === Number(productId)) || this.productoSeleccionado;
    const nombreGastoFinal = (prodSel?.name || String(v.nombreGasto || '')).trim();
    let lotesSel: Array<string | number> = (this.lotesFormArray.controls || [])
      .map(c => c.get('loteId')?.value)
      .filter((x: any) => x !== null && x !== undefined && x !== '');

    if (!lotesSel || lotesSel.length === 0) {
      this.errorMessage = 'Seleccione al menos un lote.';
      this.saving = false;
      return;
    }
    // Validar que todos los lotes tengan animales vivos (> 0)
    const lotesValidos = lotesSel.filter(lid => this.getCantidadVivosDelLote(lid) > 0);
    if (lotesValidos.length !== lotesSel.length) {
      this.errorMessage = 'Seleccione solo lotes con animales vivos (stock > 0).';
      this.saving = false;
      return;
    }
    lotesSel = lotesValidos;
    if (modo === 'POR_INDIVIDUO') {
      if (lotesSel.length > 1) {
        // Forzamos un solo lote para modo por individuo
        while (this.lotesFormArray.length > 1) this.lotesFormArray.removeAt(this.lotesFormArray.length - 1);
      }
      if (this.individuosSeleccionados.length < 1) {
        this.errorMessage = 'Seleccione al menos un individuo del lote.';
        this.saving = false;
        return;
      }
    }

    if (!productId) {
      this.errorMessage = 'Seleccione un producto válido del catálogo (use la lista sugerida).';
      this.saving = false;
      return;
    }

    // Calcular cantidad total a consumir
    let cantidadTotal = Number(v.cantidad || 0);
    const dosis = Number(v.dosisPorAnimal || 0);
    let nAnim = Number(v.animalesTratados || 0);
    if (modo === 'POR_INDIVIDUO') {
      nAnim = this.individuosSeleccionados.length;
      // Sincronizamos el form para que el sugerido muestre el cálculo correcto
      this.form.get('animalesTratados')?.setValue(nAnim);
    }
    if (dosis > 0 && nAnim > 0) {
      cantidadTotal = parseFloat((dosis * nAnim).toFixed(3));
    }
    if (!(cantidadTotal > 0)) {
      this.errorMessage = 'Ingrese una cantidad válida o defina dosis y número de animales.';
      this.saving = false;
      return;
    }

    // Validar stock (FEFO válido) disponible por producto
    try {
      const stockMap = await firstValueFrom(this.invEntradasService.stockValidoAgrupado());
      this.stockValidoCache = stockMap || {};
      const disponible = Number(this.stockValidoCache[String(productId)] || 0);
      const requeridoTotal = cantidadTotal * (lotesSel.length || 1);
      if (requeridoTotal > disponible + 1e-6) {
        this.errorMessage = `Stock insuficiente para "${nombreGastoFinal}". Disponible: ${disponible.toFixed(3)} ${v.unidad || ''}. Requerido: ${requeridoTotal.toFixed(3)} ${v.unidad || ''}.`;
        this.saving = false;
        return;
      }
    } catch (e) {
      // Si falla la validación, continuar bajo responsabilidad del usuario
    }

    // Registrar movimientos de inventario (CONSUMO_LOTE) por cada lote
    try {
      const indObs = (modo === 'POR_INDIVIDUO' && this.individuosSeleccionados.length > 0)
        ? ` | Individuos: ${this.individuosSeleccionados.join(',')}`
        : '';
      const observ = `Sanidad - ${nombreGastoFinal}${v.detalle ? ' - ' + v.detalle : ''}${indObs}`;
      const movs = lotesSel.map(lid => this.invProductoService.registrarMovimiento({
        productId: Number(productId!),
        tipo: 'CONSUMO_LOTE' as any,
        cantidad: Number(cantidadTotal),
        loteId: String(lid),
        usuario: v.responsable || 'Sistema',
        observaciones: observ
      }));
      await firstValueFrom(forkJoin(movs));
      await this.cargarStockValido();
    } catch (e: any) {
      this.errorMessage = e?.message || 'Error registrando consumo de inventario.';
      this.saving = false;
      return;
    }

    // Determinar costo unitario para registro de costos
    let costoUnitarioCalc = Number(this.costoUnitarioPromedioSel || 0) || Number(v.costoUnitario || 0);
    if (!(costoUnitarioCalc > 0)) {
      try {
        const invProd = await firstValueFrom(this.invProductoService.porProducto(Number(productId)) as any);
        const prom = Number((invProd as any)?.costoUnitarioPromedio || 0);
        if (prom > 0) costoUnitarioCalc = prom;
        else if ((this.productoSeleccionado as any)?.price_unit) {
          costoUnitarioCalc = Number((this.productoSeleccionado as any).price_unit || 0);
        }
      } catch {}
    }

    // Registrar costos de sanidad por lote
    try {
      const basePayload = {
        nombreGasto: nombreGastoFinal,
        detalle: v.detalle || '',
        cantidad: Number(cantidadTotal),
        costoUnitario: Number(costoUnitarioCalc || 0),
        fecha: v.fecha,
        observaciones: (v.observaciones || '') + ((modo === 'POR_INDIVIDUO' && this.individuosSeleccionados.length > 0) ? ` | Individuos: ${this.individuosSeleccionados.join(',')}` : '')
      } as any;
      const peticiones = lotesSel.map(lid => this.cSanidad.crear({ ...basePayload, loteId: String(lid) }));
      await firstValueFrom(forkJoin(peticiones));

      this.cargarRegistros();
      this.saveMessage = 'Guardado correctamente.';
      setTimeout(() => this.saveMessage = '', 3000);
      this.form.reset({ fecha: this.hoyISO(), animalId: v.animalId, unidad: 'ml', modo });
      this.resetLotes();
      this.individuosSeleccionados = [];
      this.saving = false;
    } catch (err: any) {
      this.errorMessage = err?.message || 'Error al guardar costos de sanidad.';
      this.saving = false;
    }
  }

  cargarRegistros(): void {
    this.cSanidad.listar().subscribe({
      next: (data) => { this.registros = data; this.actualizarKpis(); },
      error: () => { this.registros = []; this.actualizarKpis(); }
    });
  }

  private filtrarProductosSanidad(): void {
    const animalId = this.form?.get('animalId')?.value as number | null;
    const perteneceASanidad = (p: Product) => {
      const nombre = ((p?.typeFood as any)?.name || '').toLowerCase();
      return nombre.includes('medic') || nombre.includes('vitamin') || nombre.includes('vacun');
    };
    let lista = (this.products || []).filter(p => perteneceASanidad(p));
    if (animalId) {
      lista = lista.filter(p => (p.animal?.id || p.animal_id) === animalId);
    }
    this.productosSanidadFiltrados = lista;
    // Si el nombre actual coincide, actualizar descripción
    this.onNombreGastoInput();
  }

  private recalcularProductosDisponibles(): void {
    const animalId = this.form?.get('animalId')?.value as number | null;
    const idsConStock = Object.keys(this.stockValidoCache || {}).filter(k => Number(this.stockValidoCache[k]) > 1e-6).map(k => Number(k));
    const perteneceASanidad = (p: Product) => {
      const nombre = ((p?.typeFood as any)?.name || '').toLowerCase();
      return nombre.includes('medic') || nombre.includes('vitamin') || nombre.includes('vacun');
    };
    let lista = (this.products || []).filter(p => idsConStock.includes(Number(p.id)) && perteneceASanidad(p));
    if (animalId) {
      lista = lista.filter(p => (p.animal?.id || p.animal_id) === animalId);
    }
    this.productosBotiquinDisponibles = lista;
    this.actualizarKpis();
  }

  private refiltrarLotes(): void {
    const animalId = this.form?.get('animalId')?.value as number | null;
    let lista = (this.lotes || []).filter(l => Number((l as any)?.quantity || 0) > 0);
    if (animalId) {
      lista = lista.filter(l => (l as any)?.race?.animal?.id === animalId);
    }
    this.lotesFiltrados = lista;
    // Asegurar que los lotes seleccionados sigan siendo válidos
    (this.lotesFormArray.controls || []).forEach(ctrl => {
      const lid = ctrl.get('loteId')?.value;
      if (lid != null && !this.lotesFiltrados.some(l => String(l.id) === String(lid))) {
        ctrl.get('loteId')?.setValue(null);
      }
    });
  }

  private async cargarStockValido(): Promise<void> {
    try {
      const stockMap = await firstValueFrom(this.invEntradasService.stockValidoAgrupado());
      this.stockValidoCache = stockMap || {};
      this.recalcularProductosDisponibles();
    } catch {
      this.stockValidoCache = {};
      this.recalcularProductosDisponibles();
    }
  }

  getStockDisponible(pid: number): number {
    return Number(this.stockValidoCache[String(pid)] || 0);
  }

  async onProductoChange(): Promise<void> {
    const pid = Number(this.form.get('productId')?.value || 0);
    const prod = (this.products || []).find(p => Number(p.id) === pid) || null;
    this.productoSeleccionado = prod;
    const nombreCtrl = this.form.get('nombreGasto');
    if (nombreCtrl) nombreCtrl.setValue(prod?.name || '');

    const detalleCtrl = this.form.get('detalle');
    if (prod?.description && detalleCtrl && (!detalleCtrl.dirty || !detalleCtrl.value)) {
      this.actualizandoDetalle = true;
      detalleCtrl.setValue(prod.description);
      this.actualizandoDetalle = false;
    }

    const unidadCtrl = this.form.get('unidad');
    if (unidadCtrl) unidadCtrl.setValue((prod as any)?.unitMeasurement?.name_short || (prod as any)?.unitMeasurement?.name || 'ml');

    // Guardar: si no hay producto válido, no llamar API (evita 404 /producto/0)
    if (!pid || pid <= 0 || Number.isNaN(pid)) {
      this.costoUnitarioPromedioSel = 0;
      if (nombreCtrl && !prod) nombreCtrl.setValue('');
      if (detalleCtrl && !prod && (!detalleCtrl.dirty || !detalleCtrl.value)) detalleCtrl.setValue('');
      this.recalcularCostosDosis();
      return;
    }

    try {
      const invProd = await firstValueFrom(this.invProductoService.porProducto(pid) as any);
      const prom = Number((invProd as any)?.costoUnitarioPromedio || 0);
      this.costoUnitarioPromedioSel = isNaN(prom) ? 0 : prom;
    } catch {
      this.costoUnitarioPromedioSel = 0;
    }
    this.recalcularCostosDosis();
    this.actualizarKpis();
  }

  private recalcularCostosDosis(): void {
    const dosis = Number(this.form.get('dosisPorAnimal')?.value || 0);
    const modo = String(this.form.get('modo')?.value || 'POR_LOTE');
    const n = modo === 'POR_INDIVIDUO' ? this.individuosSeleccionados.length : Number(this.form.get('animalesTratados')?.value || 0);
    this.costoPorDosis = (this.costoUnitarioPromedioSel > 0 && dosis > 0) ? this.costoUnitarioPromedioSel * dosis : 0;
    this.costoTotalEstimado = (this.costoPorDosis > 0 && n > 0) ? this.costoPorDosis * n : 0;
  }

  onAnimalChange(): void {
    this.refiltrarLotes();
    this.filtrarProductosSanidad();
    this.individuosSeleccionados = [];
    this.recalcularProductosDisponibles();
    // Limpiar selección de producto al cambiar animal
    this.form.get('productId')?.setValue(null);
    this.costoUnitarioPromedioSel = 0; this.costoPorDosis = 0; this.costoTotalEstimado = 0;
  }

  onNombreGastoInput(): void {
    const nombre = (this.form.get('nombreGasto')?.value || '').toString().trim().toLowerCase();
    this.productoSeleccionado = (this.productosSanidadFiltrados || []).find(p => (p.name || '').toLowerCase() === nombre) || null;

    // Autocompletar detalle con la descripción del producto si existe y
    // no sobreescribir cuando el usuario ya lo modificó manualmente.
    const detalleCtrl = this.form.get('detalle');
    if (!detalleCtrl) return;
    const detalleActual = (detalleCtrl.value || '').toString();
    const esVacio = detalleActual.trim().length === 0;

    if (this.productoSeleccionado?.description) {
      // Solo autocompletar si el campo está vacío o aún no ha sido modificado por el usuario (no dirty)
      if (esVacio || !detalleCtrl.dirty) {
        this.actualizandoDetalle = true;
        detalleCtrl.setValue(this.productoSeleccionado.description);
        this.actualizandoDetalle = false;
      }
    }
  }

  recalcularCantidad(): void {
    const dosis = Number(this.form.get('dosisPorAnimal')?.value || 0);
    const n = Number(this.form.get('animalesTratados')?.value || 0);
    if (dosis > 0 && n > 0) {
      const total = parseFloat((dosis * n).toFixed(3));
      const ctrl = this.form.get('cantidad');
      if (ctrl && !ctrl.dirty) ctrl.setValue(total);
    }
    this.recalcularCostosDosis();
  }

  get lotesFormArray(): FormArray {
    return this.form.get('lotes') as FormArray;
  }

  agregarLote(): void {
    this.lotesFormArray.push(this.fb.group({ loteId: [null] }));
  }

  removerLote(index: number): void {
    if (index >= 0 && index < this.lotesFormArray.length) this.lotesFormArray.removeAt(index);
  }

  resetLotes(): void {
    while (this.lotesFormArray.length > 0) this.lotesFormArray.removeAt(0);
    this.agregarLote();
  }

  private alMenosUnLoteValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const arr = control as FormArray;
      if (!arr || !arr.controls) return { alMenosUnLote: true };
      const alguno = arr.controls.some(c => {
        const v = c.get('loteId')?.value;
        return v !== null && v !== undefined && v !== '';
      });
      return alguno ? null : { alMenosUnLote: true };
    };
  }

  esChanchosSeleccionado(): boolean {
    const id = this.form?.get('animalId')?.value;
    if (!id) return false;
    const a = (this.animals || []).find(x => x.id === id);
    const n = (a?.name || '').toLowerCase();
    return n.includes('cerdo') || n.includes('chancho') || n.includes('porc');
  }

  esIndividuosHabilitado(): boolean {
    const id = this.form?.get('animalId')?.value;
    if (!id) return false;
    const a = (this.animals || []).find(x => x.id === id);
    const n = (a?.name || '').toLowerCase();
    return n.includes('cerdo') || n.includes('chancho') || n.includes('porc') ||
           n.includes('pollo') || n.includes('ave') || n.includes('gallin');
  }

  esPorIndividuo(): boolean {
    return String(this.form?.get('modo')?.value || 'POR_LOTE') === 'POR_INDIVIDUO';
  }

  onModoChange(): void {
    if (this.esPorIndividuo()) {
      while (this.lotesFormArray.length > 1) this.lotesFormArray.removeAt(this.lotesFormArray.length - 1);
      this.individuosSeleccionados = [];
      this.form.get('animalesTratados')?.setValue(this.individuosSeleccionados.length || null);
    }
  }

  primerLoteId(): string | number | null {
    return this.lotesFormArray.length ? (this.lotesFormArray.at(0).get('loteId')?.value ?? null) : null;
  }

  getCantidadVivosDelLote(loteId: string | number | null): number {
    if (!loteId) return 0;
    const l = (this.lotes || []).find(x => String(x.id) === String(loteId));
    return Number(l?.quantity || 0);
  }

  getIndicesIndividuos(loteId: string | number | null): number[] {
    const n = this.getCantidadVivosDelLote(loteId);
    return Array.from({ length: n }, (_, i) => i + 1);
  }

  estaIndSeleccionado(idx: number): boolean {
    return this.individuosSeleccionados.includes(idx);
  }

  toggleIndividuo(idx: number): void {
    const i = this.individuosSeleccionados.indexOf(idx);
    if (i >= 0) this.individuosSeleccionados.splice(i, 1);
    else this.individuosSeleccionados.push(idx);
    this.form.get('animalesTratados')?.setValue(this.individuosSeleccionados.length || null);
    this.recalcularCantidad();
  }

  onLoteCambio(): void {
    if (this.esPorIndividuo()) {
      this.individuosSeleccionados = [];
      this.form.get('animalesTratados')?.setValue(null);
      this.recalcularCantidad();
    }
  }

  limpiarForm(): void {
    const animalId = this.form.get('animalId')?.value || null;
    this.form.reset({
      fecha: this.hoyISO(),
      animalId: animalId,
      unidad: 'ml',
      modo: 'POR_LOTE',
      productId: null,
      nombreGasto: '',
      detalle: '',
      dosisPorAnimal: null,
      animalesTratados: null,
      cantidad: null,
      costoUnitario: null,
      responsable: '',
      observaciones: ''
    });
    this.resetLotes();
    this.individuosSeleccionados = [];
    this.costoUnitarioPromedioSel = 0;
    this.costoPorDosis = 0;
    this.costoTotalEstimado = 0;
    this.recalcularProductosDisponibles();
  }

  private actualizarKpis(): void {
    const { from, to } = this.obtenerRangoPeriodo(this.kpiPeriodo);
    const lista = (this.registros || []).filter(r => this.fechaEnRango(String(r?.fecha || ''), from, to));

    let aplicaciones = 0, aplicacionesP = 0, aplicacionesC = 0;
    let total = 0, totalP = 0, totalC = 0;
    for (const r of lista) {
      const t = Number((r && r.total != null) ? r.total : (Number(r?.cantidad || 0) * Number(r?.costoUnitario || 0)));
      const loteId = (r?.lote?.id ?? r?.loteId ?? null);
      const esp = this.especieDeLote(loteId);
      const val = isNaN(t) ? 0 : t;
      aplicaciones += 1;
      total += val;
      if (esp === 'P') { aplicacionesP += 1; totalP += val; }
      else if (esp === 'C') { aplicacionesC += 1; totalC += val; }
    }
    this.kpiAplicaciones = aplicaciones;
    this.kpiAplicacionesP = aplicacionesP;
    this.kpiAplicacionesC = aplicacionesC;
    this.kpiGastoTotal = total;
    this.kpiGastoTotalP = totalP;
    this.kpiGastoTotalC = totalC;
    this.kpiCostoPromedio = aplicaciones > 0 ? (total / aplicaciones) : 0;
    this.kpiCostoPromedioP = aplicacionesP > 0 ? (totalP / aplicacionesP) : 0;
    this.kpiCostoPromedioC = aplicacionesC > 0 ? (totalC / aplicacionesC) : 0;

    // Productos disponibles por especie (stock FEFO > 0)
    const idsConStock = Object.keys(this.stockValidoCache || {}).filter(k => Number(this.stockValidoCache[k]) > 1e-6).map(k => Number(k));
    const perteneceASanidad = (p: Product) => {
      const nombre = ((p?.typeFood as any)?.name || '').toLowerCase();
      return nombre.includes('medic') || nombre.includes('vitamin') || nombre.includes('vacun');
    };
    const listaProd = (this.products || []).filter(p => idsConStock.includes(Number(p.id)) && perteneceASanidad(p));
    let dispP = 0, dispC = 0;
    for (const p of listaProd) {
      const a = (p.animal?.name || '').toLowerCase();
      if (a.includes('pollo') || a.includes('ave') || a.includes('gallin')) dispP += 1;
      else if (a.includes('cerdo') || a.includes('chancho') || a.includes('porc')) dispC += 1;
    }
    this.kpiProductosDisponibles = (this.productosBotiquinDisponibles || []).length;
    this.kpiProductosDisponiblesP = dispP;
    this.kpiProductosDisponiblesC = dispC;
  }

  setKpiPeriodo(p: 'hoy'|'semana'|'mes'|'todo'): void {
    this.kpiPeriodo = p;
    this.actualizarKpis();
  }

  private obtenerRangoPeriodo(p: 'hoy'|'semana'|'mes'|'todo'): { from: Date | null, to: Date | null } {
    const hoy = new Date();
    const startOfDay = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const endOfDay = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59, 999);
    if (p === 'hoy') return { from: startOfDay, to: endOfDay };
    if (p === 'semana') {
      const from = new Date(startOfDay);
      from.setDate(from.getDate() - 6);
      return { from, to: endOfDay };
    }
    if (p === 'mes') {
      const from = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const to = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59, 999);
      return { from, to };
    }
    return { from: null, to: null };
  }

  private fechaEnRango(fechaStr: string, from: Date | null, to: Date | null): boolean {
    if (!fechaStr) return false;
    const d = new Date(fechaStr);
    if (isNaN(d.getTime())) return true; // si el backend no formatea, no filtrar
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  }

  private especieDeLote(loteId: string | number | null): 'P' | 'C' | 'O' {
    if (loteId == null) return 'O';
    const l = (this.lotes || []).find(x => String(x.id) === String(loteId));
    const n = (l as any)?.race?.animal?.name?.toLowerCase?.() || '';
    if (n.includes('pollo') || n.includes('ave') || n.includes('gallin')) return 'P';
    if (n.includes('cerdo') || n.includes('chancho') || n.includes('porc')) return 'C';
    return 'O';
  }

  verDetalle(r: any): void {
    this.registroDetalle = r || null;
  }

  cerrarDetalle(): void {
    this.registroDetalle = null;
  }

}
