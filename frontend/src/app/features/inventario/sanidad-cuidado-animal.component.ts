import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup, FormArray, AbstractControl, ValidatorFn } from '@angular/forms';
import { Lote } from '../lotes/interfaces/lote.interface';
import { LoteService } from '../lotes/services/lote.service';
import { CostosSanidadService } from './services/costos-sanidad.service';
import { ProductService } from '../../shared/services/product.service';
import { Product, Animal } from '../../shared/models/product.model';
import { forkJoin } from 'rxjs';

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
  imports: [CommonModule, ReactiveFormsModule],
  template: `
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-blue-800">Sanidad y Cuidado Animal</h1>
        <p class="text-gray-600">Registro de gastos de vacunas, antibióticos, vitaminas y consumibles</p>
      </div>
    </div>

    <div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Animal</label>
            <select formControlName="animalId" (change)="onAnimalChange()" class="w-full p-2 border rounded-md">
              <option [ngValue]="null" disabled>Seleccione un animal</option>
              <option *ngFor="let a of animals" [ngValue]="a.id">{{ a.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Nombre del gasto</label>
            <input type="text" list="listaProductosSanidad" (input)="onNombreGastoInput()" formControlName="nombreGasto" class="w-full p-2 border rounded-md" placeholder="Vacuna Newcastle, Antibiótico, Vitamina o Servicios veterinarios" />
            <datalist id="listaProductosSanidad">
              <option *ngFor="let p of productosSanidadFiltrados" [value]="p.name"></option>
            </datalist>
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Detalle / Descripción</label>
            <input type="text" formControlName="detalle" class="w-full p-2 border rounded-md" placeholder="Vacuna Newcastle aplicada a lote P1" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Cantidad</label>
            <input type="number" min="0" step="0.01" formControlName="cantidad" class="w-full p-2 border rounded-md" placeholder="0" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Costo unitario</label>
            <input type="number" min="0" step="0.01" formControlName="costoUnitario" class="w-full p-2 border rounded-md" placeholder="0.00" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Fecha</label>
            <input type="date" formControlName="fecha" class="w-full p-2 border rounded-md" />
          </div>
          <div class="md:col-span-2">
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-semibold text-gray-700">Lotes asociados</label>
              <button type="button" (click)="agregarLote()" class="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700">Agregar lote</button>
            </div>
            <div class="space-y-2">
              <div class="flex items-center gap-2" *ngFor="let ctrl of lotesFormArray.controls; let i = index">
                <select [formControl]="ctrl.get('loteId')" class="flex-1 p-2 border rounded-md">
                  <option [ngValue]="null">Seleccione lote</option>
                  <option *ngFor="let l of lotesFiltrados" [ngValue]="l.id">{{ l.codigo || l.name }} — {{ l.race?.animal?.name }}</option>
                </select>
                <button type="button" (click)="removerLote(i)" class="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700">Quitar</button>
              </div>
              <div *ngIf="lotesFormArray.length === 0" class="text-sm text-gray-500">Agregue al menos un lote.</div>
            </div>
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-semibold text-gray-700 mb-1">Observaciones</label>
            <textarea rows="3" formControlName="observaciones" class="w-full p-2 border rounded-md" placeholder="Reacciones o notas importantes"></textarea>
          </div>
        </div>
        <div class="flex items-center gap-3 pt-2">
          <button type="submit" [disabled]="form.invalid || saving" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">Guardar</button>
          <button type="button" (click)="form.reset({ fecha: hoyISO() }); resetLotes();" class="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200">Limpiar</button>
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
            <tr *ngFor="let r of registros">
              <td class="px-4 py-2 text-sm">{{ r.fecha }}</td>
              <td class="px-4 py-2 text-sm">{{ r.lote?.codigo || getLoteCodigo(r.lote?.id || r.loteId) }}</td>
              <td class="px-4 py-2 text-sm">{{ r.nombreGasto }}</td>
              <td class="px-4 py-2 text-sm">{{ r.detalle }}</td>
              <td class="px-4 py-2 text-sm">{{ r.cantidad }}</td>
              <td class="px-4 py-2 text-sm">$ {{ r.costoUnitario | number:'1.2-2' }}</td>
              <td class="px-4 py-2 text-sm font-semibold text-indigo-700">$ {{ r.total | number:'1.2-2' }}</td>
            </tr>
          </tbody>
        </table>
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
  registros: any[] = [];
  saving = false;
  saveMessage = '';
  errorMessage = '';
  private actualizandoDetalle = false;

  constructor(private fb: FormBuilder, private lotesService: LoteService, private cSanidad: CostosSanidadService, private productService: ProductService) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      animalId: [null, [Validators.required]],
      nombreGasto: ['', [Validators.required, Validators.minLength(3)]],
      detalle: [''],
      cantidad: [null, [Validators.required, Validators.min(0.0001)]],
      costoUnitario: [null, [Validators.required, Validators.min(0)]],
      fecha: [this.hoyISO(), [Validators.required]],
      observaciones: [''],
      lotes: this.fb.array([], [this.alMenosUnLoteValidator()])
    });

    this.lotesService.getLotes().subscribe({
      next: (l) => { this.lotes = l; this.lotesFiltrados = l; },
      error: () => { this.lotes = []; this.lotesFiltrados = []; }
    });

    this.productService.getAnimals().subscribe({
      next: (a) => this.animals = a || [],
      error: () => this.animals = []
    });

    this.productService.getProducts().subscribe({
      next: (p) => { this.products = p || []; this.filtrarProductosSanidad(); },
      error: () => { this.products = []; this.productosSanidadFiltrados = []; }
    });

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

  onSubmit(): void {
    if (this.form.invalid) return;
    this.saving = true;
    this.errorMessage = '';
    const v = this.form.value;
    // Intentar mapear nombre a producto conocido para mostrar descripción
    const nombreGastoStr = String(v.nombreGasto || '').trim();
    const producto = (this.productosSanidadFiltrados || []).find(p => (p.name || '').toLowerCase() === nombreGastoStr.toLowerCase()) || null;
    const nombreGastoFinal = nombreGastoStr;
    const lotesSel: Array<string | number> = (this.lotesFormArray.controls || [])
      .map(c => c.get('loteId')?.value)
      .filter((x: any) => x !== null && x !== undefined && x !== '');
    const basePayload = {
      nombreGasto: nombreGastoFinal,
      detalle: v.detalle || '',
      cantidad: Number(v.cantidad || 0),
      costoUnitario: Number(v.costoUnitario || 0),
      fecha: v.fecha,
      observaciones: v.observaciones || ''
    } as any;

    if (!lotesSel || lotesSel.length === 0) {
      this.errorMessage = 'Seleccione al menos un lote.';
      this.saving = false;
      return;
    }

    const peticiones = lotesSel.map(lid => this.cSanidad.crear({ ...basePayload, loteId: String(lid) }));
    forkJoin(peticiones).subscribe({
      next: (resps) => {
        this.cargarRegistros();
        this.saveMessage = 'Guardado correctamente.';
        setTimeout(() => this.saveMessage = '', 3000);
        this.form.reset({ fecha: this.hoyISO(), animalId: v.animalId });
        this.resetLotes();
        // Actualizar producto seleccionado si coincide el nombre
        this.productoSeleccionado = producto;
        this.saving = false;
      },
      error: (err) => {
        this.errorMessage = err?.message || 'Error al guardar.';
        this.saving = false;
      }
    });
  }

  cargarRegistros(): void {
    this.cSanidad.listar().subscribe({
      next: (data) => this.registros = data,
      error: () => this.registros = []
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

  onAnimalChange(): void {
    const animalId = this.form.get('animalId')?.value as number | null;
    if (animalId) {
      this.lotesFiltrados = (this.lotes || []).filter(l => (l as any)?.race?.animal?.id === animalId);
    } else {
      this.lotesFiltrados = this.lotes || [];
    }
    this.filtrarProductosSanidad();
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

}
