import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup, FormArray } from '@angular/forms';
import { Lote } from '../lotes/interfaces/lote.interface';
import { LoteService } from '../lotes/services/lote.service';
import { CostosFijosService } from './services/costos-fijos.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-costos-fijos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-blue-800">Costos Fijos</h1>
        <p class="text-gray-600">Prorrateables por periodo y por lote (opcional)</p>
      </div>
    </div>

    <div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6">
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
            <div *ngIf="form.get('aplicarTodosLotes')?.value" class="text-sm text-gray-600 mb-2">
              Se aplicará a {{ lotes.length }} lote(s).
            </div>
            <div class="space-y-2" *ngIf="!form.get('aplicarTodosLotes')?.value">
              <div class="flex items-center gap-2" *ngFor="let ctrl of lotesFormArray.controls; let i = index">
                <select [formControl]="ctrl.get('loteId')" class="flex-1 p-2 border rounded-md">
                  <option [ngValue]="null">Sin lote</option>
                  <option *ngFor="let l of lotes" [ngValue]="l.id">{{ l.codigo || l.name }} — {{ l.race?.animal?.name }}</option>
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
          <button type="submit" [disabled]="form.invalid || saving" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">Guardar</button>
          <button type="button" (click)="limpiar()" class="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200">Limpiar</button>
          <div *ngIf="saveMessage" class="text-green-700 text-sm">{{ saveMessage }}</div>
          <div *ngIf="errorMessage" class="text-red-700 text-sm">{{ errorMessage }}</div>
        </div>
      </form>
    </div>

    <div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm" *ngIf="registros.length > 0">
      <h3 class="text-lg font-semibold text-gray-800 mb-3">Registros</h3>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lote</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Periodo</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Método</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr *ngFor="let r of registros">
              <td class="px-4 py-2 text-sm">{{ r.fecha }}</td>
              <td class="px-4 py-2 text-sm">{{ r.lote?.codigo || getLoteCodigo(r.lote?.id || r.loteId) || '—' }}</td>
              <td class="px-4 py-2 text-sm">{{ r.nombreCosto }}</td>
              <td class="px-4 py-2 text-sm font-semibold text-indigo-700">$ {{ r.montoTotal | number:'1.2-2' }}</td>
              <td class="px-4 py-2 text-sm">{{ r.periodoProrrateo || '—' }}</td>
              <td class="px-4 py-2 text-sm">{{ r.metodoProrrateo || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
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

    this.lotesService.getLotes().subscribe({ next: (l) => this.lotes = l, error: () => this.lotes = [] });
    this.cargarRegistros();
    this.agregarLote();
  }

  hoyISO(): string { const d = new Date(); return d.toISOString().split('T')[0]; }

  getLoteCodigo(id: string | number): string {
    const l = this.lotes.find(x => String(x.id) === String(id));
    return l?.codigo || l?.name || String(id);
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.saving = true; this.errorMessage = '';
    const v = this.form.value;
    const basePayload = {
      nombreCosto: String(v.nombreCosto || '').trim(),
      montoTotal: Number(v.montoTotal || 0),
      periodoProrrateo: v.periodoProrrateo || '',
      metodoProrrateo: v.metodoProrrateo || '',
      fecha: v.fecha,
      observaciones: v.observaciones || ''
    };

    const aplicarTodos = !!this.form.get('aplicarTodosLotes')?.value;
    let lotesSel: Array<string | number> = [];
    if (aplicarTodos) {
      lotesSel = (this.lotes || []).map(l => l.id as string);
    } else {
      lotesSel = (this.lotesFormArray.controls || [])
        .map(c => c.get('loteId')?.value)
        .filter((x: any) => x !== null && x !== undefined && x !== '');
    }

    const peticiones = (lotesSel && lotesSel.length > 0)
      ? lotesSel.map(lid => this.service.crear({ ...basePayload, loteId: String(lid) }))
      : [this.service.crear({ ...basePayload })]; // sin lote

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

  // ===== Helpers de lotes dinámicos =====
  get lotesFormArray(): FormArray { return this.form.get('lotes') as FormArray; }
  agregarLote(): void { this.lotesFormArray.push(this.fb.group({ loteId: [null] })); }
  removerLote(index: number): void { if (index >= 0 && index < this.lotesFormArray.length) this.lotesFormArray.removeAt(index); }
  resetLotes(): void { while (this.lotesFormArray.length > 0) this.lotesFormArray.removeAt(0); this.agregarLote(); }

  limpiar(): void {
    this.form.reset({ fecha: this.hoyISO(), aplicarTodosLotes: false });
    this.resetLotes();
  }
}
