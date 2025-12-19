import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup, FormArray } from '@angular/forms';
import { Lote } from '../lotes/interfaces/lote.interface';
import { LoteService } from '../lotes/services/lote.service';
import { CostosFijosService } from './services/costos-fijos.service';
import { forkJoin } from 'rxjs';
import { DateEsPipe } from '../../shared/pipes/date-es.pipe';

interface GrupoFijo {
  fecha: string;
  nombre: string;
  periodo: string;
  metodo: string;
  totalGrupo: number;
  detalles: {
    id: string;
    lote: string;
    loteId: string;
    animalTipo: string;
    monto: number;
    observaciones: string;
  }[];
}

@Component({
  selector: 'app-costos-fijos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DateEsPipe],
  template: `
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-blue-800">Costos Fijos</h1>
        <p class="text-gray-600">Prorrateables por periodo y por lote (opcional)</p>
      </div>
      <button (click)="toggleFormulario()" class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md">
        <svg *ngIf="!mostrarFormulario" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <svg *ngIf="mostrarFormulario" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
        {{ mostrarFormulario ? 'Cerrar formulario' : 'Nuevo gasto fijo' }}
      </button>
    </div>

    <!-- KPI Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl p-4 text-white shadow-lg">
        <div class="flex items-center justify-between">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-xs font-semibold opacity-80">TOTAL</span>
        </div>
        <p class="text-2xl font-bold mt-2">S/ {{ totalGastos | number:'1.2-2' }}</p>
        <p class="text-xs opacity-80">Gastos registrados</p>
      </div>
      <div class="bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl p-4 text-white shadow-lg">
        <div class="flex items-center justify-between">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span class="text-xs font-semibold opacity-80">REGISTROS</span>
        </div>
        <p class="text-2xl font-bold mt-2">{{ registros.length }}</p>
        <p class="text-xs opacity-80">Total de gastos</p>
      </div>
      <div class="bg-gradient-to-br from-pink-500 to-pink-700 rounded-xl p-4 text-white shadow-lg">
        <div class="flex items-center justify-between">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span class="text-xs font-semibold opacity-80">PROMEDIO</span>
        </div>
        <p class="text-2xl font-bold mt-2">S/ {{ promedioGasto | number:'1.2-2' }}</p>
        <p class="text-xs opacity-80">Por registro</p>
      </div>
      <div class="bg-gradient-to-br from-rose-500 to-rose-700 rounded-xl p-4 text-white shadow-lg">
        <div class="flex items-center justify-between">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span class="text-xs font-semibold opacity-80">LOTES</span>
        </div>
        <p class="text-2xl font-bold mt-2">{{ lotesConGastos }}</p>
        <p class="text-xs opacity-80">Con gastos asignados</p>
      </div>
    </div>

    <!-- Gráficas -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6" *ngIf="registros.length > 0">
      <!-- Gráfica de barras: Gasto por Lote -->
      <div class="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">Gasto por Lote</h3>
        <div class="space-y-3">
          <div *ngFor="let g of gastosPorLote" class="flex items-center gap-3">
            <span class="w-28 text-sm text-gray-600 truncate" [title]="g.loteNombre">{{ g.loteNombre }}</span>
            <div class="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
              <div class="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full flex items-center justify-end pr-2"
                   [style.width.%]="totalGastos > 0 ? (g.total / totalGastos * 100) : 0">
                <span class="text-xs text-white font-semibold" *ngIf="(g.total / totalGastos * 100) > 15">S/ {{ g.total | number:'1.2-2' }}</span>
              </div>
            </div>
            <span class="w-20 text-sm font-semibold text-indigo-700 text-right">S/ {{ g.total | number:'1.2-2' }}</span>
          </div>
        </div>
      </div>
      <!-- Distribución por tipo de gasto -->
      <div class="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">Distribución por Tipo de Gasto</h3>
        <div class="space-y-3">
          <div *ngFor="let t of gastosPorTipo; let i = index" class="flex items-center gap-3">
            <span class="w-28 text-sm text-gray-600 truncate" [title]="t.nombre">{{ t.nombre }}</span>
            <div class="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
              <div class="h-full rounded-full flex items-center justify-end pr-2"
                   [class]="getBarColor(i)"
                   [style.width.%]="totalGastos > 0 ? (t.total / totalGastos * 100) : 0">
                <span class="text-xs text-white font-semibold" *ngIf="(t.total / totalGastos * 100) > 15">{{ (t.total / totalGastos * 100) | number:'1.0-0' }}%</span>
              </div>
            </div>
            <span class="w-20 text-sm font-semibold text-gray-700 text-right">S/ {{ t.total | number:'1.2-2' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Formulario (oculto por defecto) -->
    <div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6" *ngIf="mostrarFormulario">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">{{ editandoId ? 'Editar Gasto Fijo' : 'Nuevo Gasto Fijo' }}</h3>
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Nombre del costo</label>
            <input type="text" formControlName="nombreCosto" class="w-full p-2 border rounded-md" placeholder="Ejemplo: Energía eléctrica, Agua, Alquiler…" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Monto total</label>
            <input type="number" min="0" step="0.01" formControlName="montoTotal" class="w-full p-2 border rounded-md" placeholder="Ejemplo: $150.00" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Periodo prorrateo</label>
            <input type="text" formControlName="periodoProrrateo" class="w-full p-2 border rounded-md" placeholder="Mensual, Semanal, etc." />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Método prorrateo</label>
            <input type="text" formControlName="metodoProrrateo" class="w-full p-2 border rounded-md" placeholder="Por animales, por días, etc." />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Fecha</label>
            <input type="date" formControlName="fecha" class="w-full p-2 border rounded-md" />
          </div>
          <div class="md:col-span-2">
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-semibold text-gray-700">Lotes (opcional)</label>
              <div class="flex items-center gap-3">
                <label class="inline-flex items-center text-sm text-gray-700">
                  <input type="checkbox" formControlName="aplicarTodosLotes" class="mr-2">
                  Aplicar a todos los lotes
                </label>
                <button type="button" (click)="agregarLote()" class="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700" [disabled]="form.get('aplicarTodosLotes')?.value">Agregar lote</button>
              </div>
            </div>
            <div *ngIf="form.get('aplicarTodosLotes')?.value" class="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 mb-2">
              <strong>Distribución equitativa:</strong> El monto de <strong>S/ {{ form.get('montoTotal')?.value | number:'1.2-2' }}</strong> 
              se dividirá entre <strong>{{ lotes.length }}</strong> lote(s) activos.
            </div>
            <div class="space-y-2" *ngIf="!form.get('aplicarTodosLotes')?.value">
              <div class="flex items-center gap-2" *ngFor="let ctrl of lotesFormArray.controls; let i = index">
                <select [formControl]="ctrl.get('loteId')" class="flex-1 p-2 border rounded-md">
                  <option [ngValue]="null">Sin lote</option>
                  <option *ngFor="let l of lotes" [ngValue]="l.id">{{ l.name || l.codigo }} — {{ l.race?.animal?.name }}</option>
                </select>
                <button type="button" (click)="removerLote(i)" class="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700">Quitar</button>
              </div>
            </div>
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-semibold text-gray-700 mb-1">Observaciones</label>
            <textarea rows="3" formControlName="observaciones" class="w-full p-2 border rounded-md"></textarea>
          </div>
        </div>
        <div class="flex items-center gap-3 pt-2">
          <button type="submit" [disabled]="form.invalid || saving" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
            {{ editandoId ? 'Actualizar' : 'Guardar' }}
          </button>
          <button type="button" (click)="limpiar()" class="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200">Limpiar</button>
          <div *ngIf="saveMessage" class="text-green-700 text-sm">{{ saveMessage }}</div>
          <div *ngIf="errorMessage" class="text-red-700 text-sm">{{ errorMessage }}</div>
        </div>
      </form>
    </div>

    <!-- Tabla resumida de registros -->
    <div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h3 class="text-lg font-semibold text-gray-800 mb-1">Historial de Costos Fijos</h3>
      <p class="text-gray-500 text-sm mb-4">Resumen agrupado por concepto - Click en una fila para ver detalle por lotes</p>
      <div class="overflow-x-auto" *ngIf="registrosAgrupados.length > 0; else emptyFijos">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="w-10"></th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nombre</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Periodo</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Método</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Monto Total</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-100">
            <ng-container *ngFor="let row of registrosAgrupados; let i = index">
              <tr (click)="toggleRow(i)" class="hover:bg-gray-50 cursor-pointer" [class.bg-blue-50]="expandedRowIndex === i">
                <td class="px-2 py-3">
                  <svg *ngIf="expandedRowIndex !== i" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
                  <svg *ngIf="expandedRowIndex === i" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                </td>
                <td class="px-4 py-3 text-sm text-gray-700 font-medium">{{ row.fecha | dateEs }}</td>
                <td class="px-4 py-3 text-sm text-gray-700">{{ row.nombre }}</td>
                <td class="px-4 py-3 text-sm text-gray-600">{{ row.periodo || '—' }}</td>
                <td class="px-4 py-3 text-sm text-gray-600">{{ row.metodo || '—' }}</td>
                <td class="px-4 py-3 text-right"><span class="font-bold text-indigo-700">S/ {{ row.totalGrupo | number:'1.2-2' }}</span></td>
              </tr>
              <tr *ngIf="expandedRowIndex === i">
                <td colspan="6" class="bg-gray-50 px-6 py-4">
                  <div class="pl-6">
                    <h4 class="text-sm font-semibold text-gray-700 mb-3">Detalle por Lotes ({{ row.detalles.length }})</h4>
                    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <table class="w-full">
                        <thead class="bg-gray-100">
                          <tr>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Lote</th>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Observaciones</th>
                            <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Monto</th>
                            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Acciones</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                          <tr *ngFor="let d of row.detalles" class="hover:bg-gray-50">
                            <td class="px-4 py-3">
                              <span class="inline-flex items-center px-3 py-1 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 text-sm font-semibold">{{ d.lote }}</span>
                              <span *ngIf="getEtiquetaAnimal(d.animalTipo) as etq" class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs" [ngClass]="{ 'bg-green-50 text-green-700': esPollo(etq), 'bg-rose-50 text-rose-700': esChancho(etq), 'bg-gray-100 text-gray-600': !esPollo(etq) && !esChancho(etq) }">{{ etq }}</span>
                            </td>
                            <td class="px-4 py-3 text-sm text-gray-600">{{ d.observaciones || '—' }}</td>
                            <td class="px-4 py-3 text-right"><span class="font-semibold text-gray-800">S/ {{ d.monto | number:'1.2-2' }}</span></td>
                            <td class="px-4 py-3 text-center">
                              <div class="flex items-center justify-center gap-2">
                                <button (click)="editarRegistroPorId(d.id, d.loteId); $event.stopPropagation()" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                                <button (click)="eliminarRegistroPorId(d.id); $event.stopPropagation()" class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                        <tfoot class="bg-gray-50 border-t-2 border-gray-200">
                          <tr>
                            <td class="px-4 py-3 text-sm font-bold text-gray-700" colspan="2">Total del grupo</td>
                            <td class="px-4 py-3 text-right"><span class="text-lg font-bold text-indigo-700">S/ {{ row.totalGrupo | number:'1.2-2' }}</span></td>
                            <td class="px-4 py-3"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </td>
              </tr>
            </ng-container>
          </tbody>
        </table>
      </div>
      <ng-template #emptyFijos>
        <div class="text-center py-12 text-gray-500">
          <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          <p>No hay registros</p>
        </div>
      </ng-template>
    </div>
  </div>
  `
})
export class CostosFijosComponent implements OnInit {
  form!: FormGroup;
  lotes: Lote[] = [];
  registros: any[] = [];
  saving = false;
  saveMessage = '';
  errorMessage = '';
  mostrarFormulario = false;
  editandoId: string | null = null;
  editandoLoteId: string | null = null;
  expandedRowIndex: number | null = null;

  // KPIs
  totalGastos = 0;
  promedioGasto = 0;
  lotesConGastos = 0;
  gastosPorLote: { loteId: string; loteNombre: string; total: number }[] = [];
  gastosPorTipo: { nombre: string; total: number }[] = [];

  private barColors = [
    'bg-gradient-to-r from-blue-500 to-blue-600',
    'bg-gradient-to-r from-emerald-500 to-emerald-600',
    'bg-gradient-to-r from-amber-500 to-amber-600',
    'bg-gradient-to-r from-rose-500 to-rose-600',
    'bg-gradient-to-r from-violet-500 to-violet-600',
    'bg-gradient-to-r from-cyan-500 to-cyan-600'
  ];

  constructor(private fb: FormBuilder, private lotesService: LoteService, private service: CostosFijosService) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      nombreCosto: ['', [Validators.required, Validators.minLength(3)]],
      montoTotal: [null, [Validators.required, Validators.min(0)]],
      periodoProrrateo: [''],
      metodoProrrateo: [''],
      fecha: [this.hoyISO(), [Validators.required]],
      aplicarTodosLotes: [false],
      lotes: this.fb.array([]),
      observaciones: ['']
    });

    // Cargar solo lotes activos
    this.lotesService.getActivos().subscribe({ next: (l) => this.lotes = l, error: () => this.lotes = [] });
    this.cargarRegistros();
    this.agregarLote();
  }

  hoyISO(): string { const d = new Date(); return d.toISOString().split('T')[0]; }

  getBarColor(index: number): string {
    return this.barColors[index % this.barColors.length];
  }

  getLoteNombre(id: string | number | null | undefined): string {
    if (!id) return '—';
    const l = this.lotes.find(x => String(x.id) === String(id));
    return l?.name || l?.codigo || '—';
  }

  toggleFormulario(): void {
    if (this.mostrarFormulario) {
      this.form.reset({ fecha: this.hoyISO(), aplicarTodosLotes: false });
      this.resetLotes();
      this.errorMessage = '';
      this.saveMessage = '';
      this.editandoId = null;
      this.editandoLoteId = null;
    }
    this.mostrarFormulario = !this.mostrarFormulario;
  }

  editarRegistro(r: any): void {
    this.editandoId = String(r.id);
    this.editandoLoteId = r.lote?.id || r.loteId || null;
    this.form.patchValue({
      nombreCosto: r.nombreCosto || '',
      montoTotal: r.montoTotal,
      periodoProrrateo: r.periodoProrrateo || '',
      metodoProrrateo: r.metodoProrrateo || '',
      fecha: r.fecha,
      observaciones: r.observaciones || '',
      aplicarTodosLotes: false
    });
    this.mostrarFormulario = true;
  }

  eliminarRegistro(r: any): void {
    if (!confirm('¿Está seguro de eliminar este registro de gasto fijo?')) return;
    this.service.eliminar(String(r.id)).subscribe({
      next: () => {
        this.cargarRegistros();
        alert('Registro eliminado correctamente.');
      },
      error: (err) => alert(err?.message || 'Error al eliminar el registro.')
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.saving = true; this.errorMessage = '';
    const v = this.form.value;
    const montoTotal = Number(v.montoTotal || 0);

    const aplicarTodos = !!this.form.get('aplicarTodosLotes')?.value;
    let lotesSel: Array<string | number> = [];
    if (aplicarTodos) {
      lotesSel = (this.lotes || []).map(l => l.id as string);
    } else {
      lotesSel = (this.lotesFormArray.controls || [])
        .map(c => c.get('loteId')?.value)
        .filter((x: any) => x !== null && x !== undefined && x !== '');
    }

    const basePayload = {
      nombreCosto: String(v.nombreCosto || '').trim(),
      periodoProrrateo: v.periodoProrrateo || '',
      metodoProrrateo: v.metodoProrrateo || '',
      fecha: v.fecha,
      observaciones: v.observaciones || ''
    } as any;

    // Si estamos editando, actualizar solo ese registro
    if (this.editandoId) {
      const payloadEdicion: any = { ...basePayload, montoTotal: montoTotal };
      if (this.editandoLoteId != null) {
        payloadEdicion.loteId = String(this.editandoLoteId);
      }
      this.service.actualizar(this.editandoId, payloadEdicion).subscribe({
        next: () => {
          this.cargarRegistros();
          this.saveMessage = 'Registro actualizado correctamente.';
          setTimeout(() => this.saveMessage = '', 3000);
          this.saving = false;
          this.mostrarFormulario = false;
          this.editandoId = null;
          this.editandoLoteId = null;
          this.form.reset({ fecha: this.hoyISO(), aplicarTodosLotes: false });
          this.resetLotes();
        },
        error: (err) => { this.errorMessage = err?.message || 'Error al actualizar.'; this.saving = false; }
      });
      return;
    }

    // Crear nuevos registros con distribución exacta en centavos si aplica a todos
    let peticiones;
    if (aplicarTodos && lotesSel.length > 1) {
      const totalCents = Math.round(montoTotal * 100);
      const baseCents = Math.floor(totalCents / lotesSel.length);
      const resto = totalCents - (baseCents * lotesSel.length);
      peticiones = lotesSel.map((lid, idx) => {
        const centsAsignados = baseCents + (idx < resto ? 1 : 0);
        const montoAsignado = centsAsignados / 100;
        return this.service.crear({ ...basePayload, montoTotal: montoAsignado, loteId: String(lid) });
      });
    } else if (lotesSel && lotesSel.length > 0) {
      peticiones = lotesSel.map(lid => this.service.crear({ ...basePayload, montoTotal, loteId: String(lid) }));
    } else {
      peticiones = [this.service.crear({ ...basePayload, montoTotal })];
    }

    forkJoin(peticiones).subscribe({
      next: () => {
        this.cargarRegistros();
        this.saveMessage = 'Guardado correctamente.';
        setTimeout(() => this.saveMessage = '', 3000);
        this.saving = false;
        this.mostrarFormulario = false;
        this.form.reset({ fecha: this.hoyISO(), aplicarTodosLotes: false });
        this.resetLotes();
      },
      error: (err) => { this.errorMessage = err?.message || 'Error al guardar.'; this.saving = false; }
    });
  }

  cargarRegistros(): void {
    this.service.listar().subscribe({
      next: (data) => {
        this.registros = data;
        this.calcularKPIs();
      },
      error: () => this.registros = []
    });
  }

  calcularKPIs(): void {
    this.totalGastos = this.registros.reduce((sum, r) => sum + (r.montoTotal || 0), 0);
    this.promedioGasto = this.registros.length > 0 ? this.totalGastos / this.registros.length : 0;

    // Gastos por lote
    const loteMap = new Map<string, { loteNombre: string; total: number }>();
    for (const r of this.registros) {
      const loteId = r.lote?.id || r.loteId || 'sin-lote';
      const loteNombre = this.getLoteNombre(loteId);
      if (loteMap.has(loteId)) {
        loteMap.get(loteId)!.total += r.montoTotal || 0;
      } else {
        loteMap.set(loteId, { loteNombre, total: r.montoTotal || 0 });
      }
    }
    this.gastosPorLote = Array.from(loteMap.entries()).map(([loteId, v]) => ({
      loteId,
      loteNombre: v.loteNombre,
      total: v.total
    })).sort((a, b) => b.total - a.total);
    this.lotesConGastos = this.gastosPorLote.filter(g => g.loteId !== 'sin-lote').length;

    // Gastos por tipo (nombre del costo)
    const tipoMap = new Map<string, number>();
    for (const r of this.registros) {
      const nombre = r.nombreCosto || 'Otros';
      tipoMap.set(nombre, (tipoMap.get(nombre) || 0) + (r.montoTotal || 0));
    }
    this.gastosPorTipo = Array.from(tipoMap.entries()).map(([nombre, total]) => ({
      nombre,
      total
    })).sort((a, b) => b.total - a.total);
  }

  // ====== Tabla resumida (agrupada) ======
  get registrosAgrupados(): GrupoFijo[] {
    const groups: { [key: string]: GrupoFijo } = {};
    for (const item of (this.registros || [])) {
      const fechaStr = this.normalizarFecha(item?.fecha);
      const nombre = String(item?.nombreCosto || '').trim();
      const periodo = String(item?.periodoProrrateo || '').trim();
      const metodo = String(item?.metodoProrrateo || '').trim();
      const key = `${fechaStr}|${nombre}|${periodo}|${metodo}`;
      if (!groups[key]) {
        groups[key] = { fecha: fechaStr, nombre, periodo, metodo, totalGrupo: 0, detalles: [] };
      }
      const total = Number(item?.montoTotal ?? 0);
      const animalTipo = (item?.lote?.race?.animal?.name)
        || (this.lotes.find(l => String(l.id) === String(item?.lote?.id || item?.loteId))?.race?.animal?.name)
        || '';
      groups[key].totalGrupo += total;
      groups[key].detalles.push({
        id: String(item?.id ?? ''),
        lote: item?.lote?.name || item?.lote?.codigo || this.getLoteNombre(item?.lote?.id || item?.loteId),
        loteId: String(item?.lote?.id || item?.loteId || ''),
        animalTipo: String(animalTipo || ''),
        monto: total,
        observaciones: item?.observaciones || ''
      });
    }
    return Object.values(groups).sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
  }

  toggleRow(index: number): void {
    this.expandedRowIndex = this.expandedRowIndex === index ? null : index;
  }

  private normalizarFecha(f: any): string {
    try {
      if (!f) return '';
      if (f instanceof Date) return f.toISOString().split('T')[0];
      const s = String(f);
      if (s.includes('T')) return s.split('T')[0];
      return s.replace(/[./]/g, '-').replace(/,/g, '-');
    } catch {
      return String(f || '');
    }
  }

  getEtiquetaAnimal(animalTipo?: string): string {
    if (!animalTipo) return '';
    const s = String(animalTipo).toLowerCase();
    if (s.includes('pollo') || s.includes('ave') || s.includes('broiler')) return 'Pollos';
    if (s.includes('chancho') || s.includes('cerdo') || s.includes('porcino')) return 'Chanchos';
    return animalTipo;
  }

  esPollo(etq: string): boolean { return String(etq).toLowerCase() === 'pollos'; }
  esChancho(etq: string): boolean { return String(etq).toLowerCase() === 'chanchos'; }

  editarRegistroPorId(id: string, loteId: string): void {
    const registro = this.registros.find(r => String(r.id) === id);
    if (registro) this.editarRegistro(registro);
  }

  eliminarRegistroPorId(id: string): void {
    const registro = this.registros.find(r => String(r.id) === id);
    if (registro) this.eliminarRegistro(registro);
  }

  // ===== Helpers de lotes dinámicos =====
  get lotesFormArray(): FormArray { return this.form.get('lotes') as FormArray; }
  agregarLote(): void { this.lotesFormArray.push(this.fb.group({ loteId: [null] })); }
  removerLote(index: number): void { if (index >= 0 && index < this.lotesFormArray.length) this.lotesFormArray.removeAt(index); }
  resetLotes(): void { while (this.lotesFormArray.length > 0) this.lotesFormArray.removeAt(0); this.agregarLote(); }

  limpiar(): void {
    this.form.reset({ fecha: this.hoyISO(), aplicarTodosLotes: false });
    this.resetLotes();
    this.editandoId = null;
    this.editandoLoteId = null;
  }
}
