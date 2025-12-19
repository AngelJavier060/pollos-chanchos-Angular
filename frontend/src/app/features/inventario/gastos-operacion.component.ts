import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup, FormArray } from '@angular/forms';
import { Lote } from '../lotes/interfaces/lote.interface';
import { LoteService } from '../lotes/services/lote.service';
import { CostosOperacionService } from './services/costos-operacion.service';
import { DateEsPipe } from '../../shared/pipes/date-es.pipe';
import { forkJoin } from 'rxjs';

interface GrupoOperacion {
  fecha: string;
  nombreGasto: string;
  unidad: string;
  costoTotal: number;
  detalles: {
    id: string;
    lote: string;
    loteId: string;
    animalTipo: string;
    cantidad: number;
    costoUnit: number;
    total: number;
    observaciones: string;
  }[];
}

@Component({
  selector: 'app-gastos-operacion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DateEsPipe],
  template: `
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-blue-800">Gastos de Operación</h1>
        <p class="text-gray-600">Consumos operativos: energía, agua, insumos generales</p>
      </div>
    </div>

    <div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Nombre del gasto</label>
            <input type="text" formControlName="nombreGasto" class="w-full p-2 border rounded-md" placeholder="Ej: Energía eléctrica, Agua, Desinfección, Combustible" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Detalle</label>
            <input type="text" formControlName="detalle" class="w-full p-2 border rounded-md" placeholder="Ej: Lectura de medidor, limpieza mensual, proveedor" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Unidad</label>
            <input type="text" formControlName="unidad" class="w-full p-2 border rounded-md" placeholder="Ej: kg, ml, unidad, dosis, kWh, m³" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Cantidad consumida</label>
            <input type="number" min="0" step="0.01" formControlName="cantidadConsumida" class="w-full p-2 border rounded-md" placeholder="Ej: 120.5" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Costo unitario</label>
            <input type="number" min="0" step="0.01" formControlName="costoUnitario" class="w-full p-2 border rounded-md" placeholder="Ej: 0.15" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Fecha</label>
            <input type="date" formControlName="fecha" class="w-full p-2 border rounded-md" />
          </div>
          <div class="md:col-span-2">
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-semibold text-gray-700">Lotes asociados</label>
              <div class="flex items-center gap-3">
                <label class="inline-flex items-center text-sm text-gray-700">
                  <input type="checkbox" formControlName="aplicarTodosLotes" class="mr-2">
                  Aplicar a todos los lotes
                </label>
                <button type="button" (click)="agregarLote()" class="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700" [disabled]="form.get('aplicarTodosLotes')?.value">Agregar lote</button>
              </div>
            </div>
            <div *ngIf="form.get('aplicarTodosLotes')?.value" class="text-sm text-gray-600 mb-2">
              Se aplicará a {{ lotes.length }} lote(s) activos.
            </div>
            <div class="space-y-2" *ngIf="!form.get('aplicarTodosLotes')?.value">
              <div class="flex items-center gap-2" *ngFor="let ctrl of lotesFormArray.controls; let i = index">
                <select [formControl]="ctrl.get('loteId')" class="flex-1 p-2 border rounded-md">
                  <option [ngValue]="null">Seleccione lote</option>
                  <option *ngFor="let l of lotes" [ngValue]="l.id">{{ l.name }} — {{ l.race?.animal?.name }}</option>
                </select>
                <button type="button" (click)="removerLote(i)" class="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700">Quitar</button>
              </div>
              <div *ngIf="lotesFormArray.length === 0" class="text-sm text-gray-500">Agregue al menos un lote o active "Aplicar a todos".</div>
            </div>
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-semibold text-gray-700 mb-1">Observaciones</label>
            <textarea rows="3" formControlName="observaciones" class="w-full p-2 border rounded-md" placeholder="Notas adicionales"></textarea>
          </div>
        </div>
        <div class="flex items-center gap-3 pt-2">
          <button type="submit" [disabled]="form.invalid || saving || lotesInvalid()" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">Guardar</button>
          <button type="button" (click)="limpiar()" class="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200">Limpiar</button>
          <div *ngIf="saveMessage" class="text-green-700 text-sm">{{ saveMessage }}</div>
          <div *ngIf="errorMessage" class="text-red-700 text-sm">{{ errorMessage }}</div>
        </div>
      </form>
    </div>

    <div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h3 class="text-lg font-semibold text-gray-800 mb-1">Historial de Gastos de Operación</h3>
      <p class="text-gray-500 text-sm mb-4">Resumen agrupado por concepto - Click en una fila para ver detalle por lotes</p>
      <div class="overflow-x-auto" *ngIf="registrosAgrupados.length > 0; else emptyOperacion">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="w-10"></th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gasto</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidad</th>
              <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Costo Total</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-100">
            <ng-container *ngFor="let row of registrosAgrupados; let i = index">
              <tr (click)="toggleRow(i)" class="hover:bg-gray-50 cursor-pointer" [class.bg-blue-50]="expandedRowIndex === i">
                <td class="px-2 py-2">
                  <svg *ngIf="expandedRowIndex !== i" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
                  <svg *ngIf="expandedRowIndex === i" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                </td>
                <td class="px-4 py-2 text-sm text-gray-700 font-medium">{{ row.fecha | dateEs }}</td>
                <td class="px-4 py-2 text-sm text-gray-700">{{ row.nombreGasto }}</td>
                <td class="px-4 py-2 text-sm text-gray-700">{{ row.unidad }}</td>
                <td class="px-4 py-2 text-right"><span class="font-bold text-indigo-700">S/ {{ row.costoTotal | number:'1.2-2' }}</span></td>
              </tr>
              <tr *ngIf="expandedRowIndex === i">
                <td colspan="5" class="bg-gray-50 px-6 py-4">
                  <div class="pl-6">
                    <h4 class="text-sm font-semibold text-gray-700 mb-3">Detalle por Lotes ({{ row.detalles.length }})</h4>
                    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <table class="w-full">
                        <thead class="bg-gray-100">
                          <tr>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Lote</th>
                            <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Cantidad</th>
                            <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Costo Unit.</th>
                            <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Total</th>
                            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Acciones</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                          <tr *ngFor="let d of row.detalles" class="hover:bg-gray-50">
                            <td class="px-4 py-3">
                              <span class="inline-flex items-center px-3 py-1 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 text-sm font-semibold">{{ d.lote }}</span>
                              <span *ngIf="getEtiquetaAnimal(d.animalTipo) as etq" class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs" [ngClass]="{ 'bg-green-50 text-green-700': esPollo(etq), 'bg-rose-50 text-rose-700': esChancho(etq), 'bg-gray-100 text-gray-600': !esPollo(etq) && !esChancho(etq) }">{{ etq }}</span>
                            </td>
                            <td class="px-4 py-3 text-sm text-gray-600 text-right font-medium">{{ d.cantidad | number:'1.2-2' }}</td>
                            <td class="px-4 py-3 text-sm text-gray-600 text-right">S/ {{ d.costoUnit | number:'1.4-4' }}</td>
                            <td class="px-4 py-3 text-right"><span class="font-semibold text-gray-800">S/ {{ d.total | number:'1.2-2' }}</span></td>
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
                            <td class="px-4 py-3 text-sm font-bold text-gray-700">Total del grupo</td>
                            <td class="px-4 py-3"></td>
                            <td class="px-4 py-3"></td>
                            <td class="px-4 py-3 text-right"><span class="text-lg font-bold text-indigo-700">S/ {{ row.costoTotal | number:'1.2-2' }}</span></td>
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
      <ng-template #emptyOperacion>
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
export class GastosOperacionComponent implements OnInit {
  form!: FormGroup;
  lotes: Lote[] = [];
  registros: any[] = [];
  saving = false;
  saveMessage = '';
  errorMessage = '';
  expandedRowIndex: number | null = null;
  editandoId: string | null = null;

  constructor(private fb: FormBuilder, private lotesService: LoteService, private service: CostosOperacionService) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      nombreGasto: ['', [Validators.required, Validators.minLength(3)]],
      detalle: [''],
      unidad: [''],
      cantidadConsumida: [null, [Validators.required, Validators.min(0.01)]],
      costoUnitario: [null, [Validators.required, Validators.min(0)]],
      fecha: [this.hoyISO(), [Validators.required]],
      observaciones: [''],
      animals: this.fb.array([]),
      aplicarTodosLotes: [false],
      lotes: this.fb.array([])
    });

    this.lotesService.getActivos().subscribe({ next: (l) => { this.lotes = l; }, error: () => { this.lotes = []; } });
    this.cargarRegistros();
    this.agregarLote();
  }

  hoyISO(): string { const d = new Date(); return d.toISOString().split('T')[0]; }

  getLoteCodigo(id: string | number): string {
    const l = this.lotes.find(x => String(x.id) === String(id));
    return l?.codigo || l?.name || String(id);
  }

  // === Tabla resumida y helpers ===
  get registrosAgrupados(): GrupoOperacion[] {
    const groups: { [key: string]: GrupoOperacion } = {};
    (this.registros || []).forEach(item => {
      const fechaStr = this.normalizarFecha(item?.fecha);
      const nombreGasto = String(item?.nombreGasto || '').trim();
      const unidad = String(item?.unidad || '').trim();
      const key = `${fechaStr}|${nombreGasto}|${unidad}`;
      if (!groups[key]) {
        groups[key] = { fecha: fechaStr, nombreGasto, unidad, costoTotal: 0, detalles: [] };
      }
      const cantidad = Number(item?.cantidadConsumida ?? 0);
      const costoUnit = Number(item?.costoUnitario ?? 0);
      const total = Number(item?.total ?? (cantidad * costoUnit));
      const animalTipo = (item?.lote?.race?.animal?.name)
        || (this.lotes.find(l => String(l.id) === String(item?.lote?.id || item?.loteId))?.race?.animal?.name)
        || '';
      groups[key].costoTotal += total;
      groups[key].detalles.push({
        id: String(item?.id ?? ''),
        lote: item?.lote?.codigo || item?.lote?.name || this.getLoteCodigo(item?.lote?.id || item?.loteId),
        loteId: String(item?.lote?.id || item?.loteId || ''),
        animalTipo: String(animalTipo || ''),
        cantidad,
        costoUnit,
        total,
        observaciones: item?.observaciones || ''
      });
    });
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
      return s.replace(/[./]/g, '-');
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
    const r = (this.registros || []).find(x => String(x.id) === String(id));
    if (!r) return;
    this.editandoId = String(r.id);
    this.form.patchValue({
      nombreGasto: r.nombreGasto || '',
      detalle: r.detalle || '',
      unidad: r.unidad || '',
      cantidadConsumida: r.cantidadConsumida,
      costoUnitario: r.costoUnitario,
      fecha: r.fecha,
      observaciones: r.observaciones || '',
      aplicarTodosLotes: false
    });
    // Seleccionar el lote del registro
    this.resetLotes();
    this.lotesFormArray.at(0).get('loteId')?.setValue(r.lote?.id || r.loteId || null);
  }

  eliminarRegistroPorId(id: string): void {
    if (!confirm('¿Eliminar registro de operación?')) return;
    this.service.eliminar(String(id)).subscribe({ next: () => this.cargarRegistros(), error: (e) => alert(e?.message || 'Error al eliminar') });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.saving = true; this.errorMessage = '';
    const v = this.form.value;
    const basePayload = {
      nombreGasto: String(v.nombreGasto || '').trim(),
      detalle: v.detalle || '',
      unidad: v.unidad || '',
      cantidadConsumida: Number(v.cantidadConsumida || 0),
      costoUnitario: Number(v.costoUnitario || 0),
      fecha: v.fecha,
      observaciones: v.observaciones || ''
    };

    // Resolver lotes destino
    const aplicarTodos = !!this.form.get('aplicarTodosLotes')?.value;
    let lotesSel: Array<string | number> = [];
    if (aplicarTodos) {
      lotesSel = (this.lotes || []).map(l => l.id as string);
    } else {
      lotesSel = (this.lotesFormArray.controls || [])
        .map(c => c.get('loteId')?.value)
        .filter((x: any) => x !== null && x !== undefined && x !== '');
    }
    if (!lotesSel || lotesSel.length === 0) {
      this.errorMessage = 'Seleccione al menos un lote o active "Aplicar a todos".';
      this.saving = false;
      return;
    }

    // Si estamos editando un registro puntual
    if (this.editandoId) {
      const payloadEdicion: any = { ...basePayload };
      const loteIdEdicion = (this.lotesFormArray.at(0)?.get('loteId')?.value);
      if (loteIdEdicion) payloadEdicion.loteId = String(loteIdEdicion);
      this.service.actualizar(this.editandoId, payloadEdicion).subscribe({
        next: () => { this.cargarRegistros(); this.saveMessage = 'Actualizado correctamente.'; setTimeout(() => this.saveMessage = '', 3000); this.saving = false; this.editandoId = null; },
        error: (err) => { this.errorMessage = err?.message || 'Error al actualizar.'; this.saving = false; }
      });
      return;
    }

    // Distribución exacta del total: repartir en centavos y derivar cantidad por lote manteniendo costo unitario constante
    let peticiones;
    const cantidad = Number(basePayload.cantidadConsumida || 0);
    const unit = Number(basePayload.costoUnitario || 0);
    if (aplicarTodos && lotesSel.length > 1 && cantidad > 0 && unit > 0) {
      const totalCents = Math.round((cantidad * unit) * 100);
      const baseCents = Math.floor(totalCents / lotesSel.length);
      const resto = totalCents - (baseCents * lotesSel.length);
      peticiones = lotesSel.map((lid, idx) => {
        const centsAsignados = baseCents + (idx < resto ? 1 : 0);
        const totalAsignado = centsAsignados / 100;
        const cantidadAsignada = totalAsignado / unit; // mantener costo unitario
        return this.service.crear({ ...basePayload, cantidadConsumida: cantidadAsignada, loteId: String(lid) });
      });
    } else {
      peticiones = lotesSel.map((lid) => this.service.crear({ ...basePayload, loteId: String(lid) }));
    }
    forkJoin(peticiones).subscribe({
      next: () => {
        this.cargarRegistros();
        this.saveMessage = 'Guardado correctamente.';
        setTimeout(() => this.saveMessage = '', 3000);
        this.saving = false;
        this.form.reset({ fecha: this.hoyISO(), aplicarTodosLotes: aplicarTodos });
        this.resetLotes();
      },
      error: (err) => { this.errorMessage = err?.message || 'Error al guardar.'; this.saving = false; }
    });
  }

  cargarRegistros(): void {
    this.service.listar().subscribe({ next: (data) => this.registros = data, error: () => this.registros = [] });
  }

  limpiar(): void {
    this.form.reset({ fecha: this.hoyISO(), aplicarTodosLotes: false });
    this.resetLotes();
  }

  // ===== Helpers de lotes dinámicos y filtros =====
  get lotesFormArray(): FormArray { return this.form.get('lotes') as FormArray; }
  agregarLote(): void { this.lotesFormArray.push(this.fb.group({ loteId: [null] })); }
  removerLote(index: number): void { if (index >= 0 && index < this.lotesFormArray.length) this.lotesFormArray.removeAt(index); }
  resetLotes(): void { while (this.lotesFormArray.length > 0) this.lotesFormArray.removeAt(0); this.agregarLote(); }
  lotesInvalid(): boolean {
    if (!!this.form.get('aplicarTodosLotes')?.value) return false;
    const seleccionados = (this.lotesFormArray.controls || []).map(c => c.get('loteId')?.value).filter((x: any) => x != null && x !== '');
    return seleccionados.length === 0;
  }
}
