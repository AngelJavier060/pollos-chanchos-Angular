import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup, FormArray } from '@angular/forms';
import { Lote } from '../lotes/interfaces/lote.interface';
import { LoteService } from '../lotes/services/lote.service';
import { CostosLogisticaService } from './services/costos-logistica.service';
import { forkJoin } from 'rxjs';
import { DateEsPipe } from '../../shared/pipes/date-es.pipe';

// Interfaz para los datos agrupados
interface RegistroAgrupado {
  fecha: string;
  transporte: string;
  concepto: string;
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
  selector: 'app-logistica',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DateEsPipe],
  template: `
  <div class="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
    <!-- Header -->
    <div class="bg-white rounded-2xl shadow-lg p-6 mb-6">
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">Movilización y Logística</h1>
          <p class="text-gray-500 text-sm mt-1">Transporte, traslados y costos logísticos</p>
        </div>
        <button
          *ngIf="!mostrarFormulario"
          (click)="abrirFormularioNuevo()"
          class="px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 font-semibold">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
          </svg>
          Registrar Movilización
        </button>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      <!-- Costo Total -->
      <div class="bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group">
        <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
        <div class="flex justify-between items-start mb-3">
          <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span class="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Total</span>
        </div>
        <div class="text-2xl font-extrabold text-gray-800 mb-1">{{ costoTotal | currency:'USD':'symbol':'1.2-2' }}</div>
        <div class="text-sm text-gray-500 font-medium">Costo Total Acumulado</div>
        <div class="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">Todas las movilizaciones</div>
      </div>

      <!-- Total Movilizaciones -->
      <div class="bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group">
        <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-purple-600"></div>
        <div class="flex justify-between items-start mb-3">
          <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <span class="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Registros</span>
        </div>
        <div class="text-2xl font-extrabold text-gray-800 mb-1">{{ totalMovilizaciones }}</div>
        <div class="text-sm text-gray-500 font-medium">Total de Movilizaciones</div>
        <div class="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">{{ hoyISO() | dateEs }}</div>
      </div>

      <!-- Costo Promedio -->
      <div class="bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group">
        <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-green-600"></div>
        <div class="flex justify-between items-start mb-3">
          <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <span class="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Promedio</span>
        </div>
        <div class="text-2xl font-extrabold text-gray-800 mb-1">{{ costoPromedio | currency:'USD':'symbol':'1.2-2' }}</div>
        <div class="text-sm text-gray-500 font-medium">Costo Promedio por Viaje</div>
        <div class="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">Por movilización</div>
      </div>

      <!-- Transporte más usado -->
      <div class="bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group">
        <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-orange-600"></div>
        <div class="flex justify-between items-start mb-3">
          <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span class="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Top</span>
        </div>
        <div class="text-xl font-extrabold text-gray-800 mb-1 truncate">{{ transporteMasUsado || 'N/A' }}</div>
        <div class="text-sm text-gray-500 font-medium">Transporte Más Utilizado</div>
        <div class="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">{{ transporteMasUsadoCount }} usos registrados</div>
      </div>

      <!-- Cantidad Total -->
      <div class="bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group">
        <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 to-pink-600"></div>
        <div class="flex justify-between items-start mb-3">
          <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <span class="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Volumen</span>
        </div>
        <div class="text-2xl font-extrabold text-gray-800 mb-1">{{ cantidadTotal | number:'1.0-0' }}</div>
        <div class="text-sm text-gray-500 font-medium">Cantidad Total Transportada</div>
        <div class="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">Unidades y litros</div>
      </div>

      <!-- Última Movilización -->
      <div class="bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group">
        <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-teal-600"></div>
        <div class="flex justify-between items-start mb-3">
          <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span class="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Reciente</span>
        </div>
        <div class="text-xl font-extrabold text-gray-800 mb-1">{{ (ultimaMovilizacion | dateEs) || 'N/A' }}</div>
        <div class="text-sm text-gray-500 font-medium">Última Movilización</div>
        <div class="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">Fecha más reciente</div>
      </div>
    </div>

    <!-- Formulario -->
    <div class="bg-white rounded-2xl p-6 shadow-lg mb-6" *ngIf="mostrarFormulario">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-gray-800">{{ editandoId ? 'Editar Registro de Logística' : 'Nuevo Registro de Logística' }}</h2>
        <button type="button" (click)="cerrarFormulario()" class="text-gray-500 hover:text-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Tipo transporte</label>
            <input type="text" formControlName="tipoTransporte" class="w-full p-2 border rounded-md" placeholder="Ejemplo: Camión, Furgoneta, Motocarro…" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Concepto</label>
            <input type="text" formControlName="concepto" class="w-full p-2 border rounded-md" placeholder="Ejemplo: Transporte de alimento, traslado de animales…" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Unidad</label>
            <input type="text" formControlName="unidad" class="w-full p-2 border rounded-md" placeholder="Ejemplo: kg, litros, unidades…" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Cantidad transportada</label>
            <input type="number" min="0" step="0.01" formControlName="cantidadTransportada" class="w-full p-2 border rounded-md" placeholder="Ejemplo: 500 kg" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Costo unitario</label>
            <input type="number" min="0" step="0.01" formControlName="costoUnitario" class="w-full p-2 border rounded-md" placeholder="Ejemplo: $1.50 por kg" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Fecha</label>
            <input type="date" formControlName="fecha" class="w-full p-2 border rounded-md" />
          </div>
          <div class="md:col-span-2" *ngIf="!editandoId">
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-semibold text-gray-700">Lotes asociados</label>
              <div class="flex items-center gap-3">
                <label class="inline-flex items-center text-sm text-gray-700">
                  <input type="checkbox" formControlName="aplicarTodosLotes" class="mr-2">
                  Aplicar a todos los lotes ({{ lotesActivos.length }})
                </label>
                <button type="button" (click)="agregarLote()" class="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700" [disabled]="form.get('aplicarTodosLotes')?.value">Agregar lote</button>
              </div>
            </div>
            <div *ngIf="form.get('aplicarTodosLotes')?.value" class="text-sm text-gray-600 mb-2">
              Se aplicará a {{ lotesActivos.length }} lote(s) activos.
            </div>
            <div class="space-y-2" *ngIf="!form.get('aplicarTodosLotes')?.value">
              <div class="flex items-center gap-2" *ngFor="let ctrl of lotesFormArray.controls; let i = index">
                <select [formControl]="ctrl.get('loteId')" class="flex-1 p-2 border rounded-md">
                  <option [ngValue]="null">Seleccione lote</option>
                  <option *ngFor="let l of lotesActivos" [ngValue]="l.id">{{ l.name || l.codigo }} — {{ l.race?.animal?.name }} ({{ l.quantity }} animales)</option>
                </select>
                <button type="button" (click)="removerLote(i)" class="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700">Quitar</button>
              </div>
              <div *ngIf="lotesFormArray.length === 0" class="text-sm text-gray-500">Agregue al menos un lote o active "Aplicar a todos".</div>
            </div>
          </div>
          <div class="md:col-span-2" *ngIf="editandoId">
            <label class="block text-sm font-semibold text-gray-700 mb-1">Lote</label>
            <div class="p-3 bg-gray-50 rounded-lg border">
              <span class="font-medium text-gray-700">{{ getLoteCodigo(editandoLoteId) }}</span>
              <span class="text-gray-500 text-sm ml-2">(No se puede cambiar el lote al editar)</span>
            </div>
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-semibold text-gray-700 mb-1">Observaciones</label>
            <textarea rows="3" formControlName="observaciones" class="w-full p-2 border rounded-md"></textarea>
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

    <!-- Tabla de Registros Agrupados -->
    <div class="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div class="p-6 border-b border-gray-100">
        <h3 class="text-xl font-bold text-gray-800">Historial de Movilizaciones</h3>
        <p class="text-gray-500 text-sm mt-1">Resumen agrupado por concepto - Click en una fila para ver detalle por lotes</p>
      </div>
      <div class="overflow-x-auto" *ngIf="registrosAgrupados.length > 0">
        <table class="w-full">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-200">
              <th class="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-10"></th>
              <th class="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha</th>
              <th class="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Transporte</th>
              <th class="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Concepto</th>
              <th class="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Unidad</th>
              <th class="px-4 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Costo Total</th>
            </tr>
          </thead>
          <tbody>
            <ng-container *ngFor="let row of registrosAgrupados; let i = index">
              <!-- Fila Principal (Resumen) -->
              <tr 
                (click)="toggleRow(i)"
                class="hover:bg-gray-50 cursor-pointer transition-colors duration-150 border-b border-gray-100"
                [class.bg-blue-50]="expandedRowIndex === i">
                <td class="px-4 py-4">
                  <svg *ngIf="expandedRowIndex !== i" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                  <svg *ngIf="expandedRowIndex === i" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </td>
                <td class="px-4 py-4 text-sm text-gray-700 font-medium">{{ row.fecha | dateEs }}</td>
                <td class="px-4 py-4 text-sm text-gray-700">{{ row.transporte }}</td>
                <td class="px-4 py-4 text-sm text-gray-700">{{ row.concepto }}</td>
                <td class="px-4 py-4 text-sm text-gray-700">{{ row.unidad }}</td>
                <td class="px-4 py-4 text-right">
                  <span class="text-lg font-bold text-blue-600">$ {{ row.costoTotal | number:'1.2-2' }}</span>
                </td>
              </tr>

              <!-- Detalle Expandible -->
              <tr *ngIf="expandedRowIndex === i">
                <td colspan="6" class="bg-gray-50 px-6 py-4">
                  <div class="pl-8">
                    <h4 class="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      Detalle por Lotes ({{ row.detalles.length }} registro{{ row.detalles.length > 1 ? 's' : '' }})
                    </h4>
                    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
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
                          <tr *ngFor="let detalle of row.detalles" class="hover:bg-gray-50 transition-colors">
                            <td class="px-4 py-3">
                              <span class="inline-flex items-center px-3 py-1 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 text-sm font-semibold">
                                {{ detalle.lote }}
                              </span>
                              <span *ngIf="getEtiquetaAnimal(detalle.animalTipo) as etq" class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs" [ngClass]="{
                                  'bg-green-50 text-green-700': esPollo(etq),
                                  'bg-rose-50 text-rose-700': esChancho(etq),
                                  'bg-gray-100 text-gray-600': !esPollo(etq) && !esChancho(etq)
                                }">
                                {{ etq }}
                              </span>
                            </td>
                            <td class="px-4 py-3 text-sm text-gray-600 text-right font-medium">{{ detalle.cantidad | number:'1.2-2' }}</td>
                            <td class="px-4 py-3 text-sm text-gray-600 text-right">$ {{ detalle.costoUnit | number:'1.2-2' }}</td>
                            <td class="px-4 py-3 text-right">
                              <span class="font-semibold text-gray-800">$ {{ detalle.total | number:'1.2-2' }}</span>
                            </td>
                            <td class="px-4 py-3 text-center">
                              <div class="flex items-center justify-center gap-2">
                                <button (click)="editarRegistroPorId(detalle.id, detalle.loteId); $event.stopPropagation()" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button (click)="eliminarRegistroPorId(detalle.id); $event.stopPropagation()" class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
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
                            <td class="px-4 py-3 text-right">
                              <span class="text-lg font-bold text-blue-600">$ {{ row.costoTotal | number:'1.2-2' }}</span>
                            </td>
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
      <div *ngIf="registrosAgrupados.length === 0" class="text-center py-12 text-gray-500">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        <p class="text-lg font-medium">No hay registros de movilización</p>
        <p class="text-sm mt-1">Haz clic en "Registrar Movilización" para agregar uno.</p>
      </div>
      
      <!-- Footer Info -->
      <div class="p-4 bg-gray-50 border-t border-gray-100 text-center text-sm text-gray-500" *ngIf="registrosAgrupados.length > 0">
        <span class="font-medium">{{ registrosAgrupados.length }}</span> grupo{{ registrosAgrupados.length > 1 ? 's' : '' }} · 
        <span class="font-medium">{{ registros.length }}</span> registro{{ registros.length > 1 ? 's' : '' }} totales · 
        Click en cualquier fila para ver el detalle por lotes
      </div>
    </div>
  </div>
  `
})
export class LogisticaComponent implements OnInit {
  form!: FormGroup;
  lotes: Lote[] = [];
  registros: any[] = [];
  saving = false;
  saveMessage = '';
  errorMessage = '';
  mostrarFormulario = false;
  editandoId: string | null = null;
  editandoLoteId: string | null = null;
  
  // Nueva propiedad para controlar filas expandidas
  expandedRowIndex: number | null = null;

  constructor(private fb: FormBuilder, private lotesService: LoteService, private service: CostosLogisticaService) {}

  // === KPIs Getters ===
  get costoTotal(): number {
    return this.registros.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
  }

  get totalMovilizaciones(): number {
    return this.registros.length;
  }

  get costoPromedio(): number {
    return this.totalMovilizaciones > 0 ? this.costoTotal / this.totalMovilizaciones : 0;
  }

  get transporteMasUsado(): string {
    const conteo: { [key: string]: number } = {};
    this.registros.forEach(r => {
      const t = r.tipoTransporte || 'Desconocido';
      conteo[t] = (conteo[t] || 0) + 1;
    });
    let max = 0, top = '';
    Object.entries(conteo).forEach(([k, v]) => { if (v > max) { max = v; top = k; } });
    return top;
  }

  get transporteMasUsadoCount(): number {
    const conteo: { [key: string]: number } = {};
    this.registros.forEach(r => {
      const t = r.tipoTransporte || 'Desconocido';
      conteo[t] = (conteo[t] || 0) + 1;
    });
    return Math.max(0, ...Object.values(conteo));
  }

  get cantidadTotal(): number {
    return this.registros.reduce((sum, r) => sum + (Number(r.cantidadTransportada) || 0), 0);
  }

  get ultimaMovilizacion(): string {
    if (this.registros.length === 0) return '';
    const sorted = (this.registros || []).slice().sort(this.compararDesc.bind(this));
    const f = this.fechaValor(sorted[0]);
    return f || '';
  }

  // Getter para agrupar registros por fecha, transporte, concepto y unidad
  get registrosAgrupados(): RegistroAgrupado[] {
    const groups: { [key: string]: RegistroAgrupado } = {};

    this.registros.forEach(item => {
      const fechaStr = this.normalizarFecha(item?.fecha);
      const transporte = item?.tipoTransporte || item?.transporte || 'Desconocido';
      const concepto = item?.concepto || '—';
      const unidad = item?.unidad || '—';
      const key = `${fechaStr}|${transporte}|${concepto}|${unidad}`;

      if (!groups[key]) {
        groups[key] = {
          fecha: fechaStr,
          transporte,
          concepto,
          unidad,
          costoTotal: 0,
          detalles: []
        };
      }

      const cantidad = Number(item?.cantidadTransportada ?? item?.cantidad ?? 0);
      const costoUnitario = Number(item?.costoUnitario ?? item?.costoUnit ?? 0);
      const totalRegistroCalc = cantidad * costoUnitario;
      const totalRegistro = (isFinite(totalRegistroCalc) && totalRegistroCalc > 0) ? totalRegistroCalc : Number(item?.total ?? 0);
      const animalTipo = (item?.lote?.race?.animal?.name)
        || (this.lotes.find(l => String(l.id) === String(item?.lote?.id || item?.loteId))?.race?.animal?.name)
        || '';
      groups[key].costoTotal += totalRegistro;
      groups[key].detalles.push({
        id: String(item?.id ?? ''),
        lote: item?.lote?.name || item?.lote?.codigo || this.getLoteCodigo(item?.lote?.id || item?.loteId),
        loteId: String(item?.lote?.id || item?.loteId || ''),
        animalTipo: String(animalTipo || ''),
        cantidad,
        costoUnit: costoUnitario,
        total: totalRegistro,
        observaciones: item?.observaciones || ''
      });
    });

    // Ordenar por fecha descendente de forma segura
    return Object.values(groups).sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
  }

  // Método para toggle de fila expandida
  toggleRow(index: number): void {
    this.expandedRowIndex = this.expandedRowIndex === index ? null : index;
  }

  get lotesActivos(): Lote[] {
    return this.lotes.filter(l => (l.quantity ?? 0) > 0);
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      tipoTransporte: ['', [Validators.required, Validators.minLength(3)]],
      concepto: ['', [Validators.required]],
      unidad: [''],
      cantidadTransportada: [null, [Validators.required, Validators.min(0.01)]],
      costoUnitario: [null, [Validators.required, Validators.min(0)]],
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
    return l?.name || l?.codigo || String(id);
  }

  abrirFormularioNuevo(): void {
    this.editandoId = null;
    this.editandoLoteId = null;
    this.form.reset({ fecha: this.hoyISO(), aplicarTodosLotes: false });
    this.resetLotes();
    this.mostrarFormulario = true;
  }

  editarRegistro(r: any): void {
    this.editandoId = String(r.id);
    this.editandoLoteId = r.lote?.id || r.loteId || null;
    this.form.patchValue({
      tipoTransporte: r.tipoTransporte || '',
      concepto: r.concepto || '',
      unidad: r.unidad || '',
      cantidadTransportada: r.cantidadTransportada,
      costoUnitario: r.costoUnitario,
      fecha: r.fecha,
      observaciones: r.observaciones || '',
      aplicarTodosLotes: false
    });
    this.mostrarFormulario = true;
  }

  eliminarRegistro(r: any): void {
    if (!confirm('¿Está seguro de eliminar este registro de logística?')) return;
    this.service.eliminar(String(r.id)).subscribe({
      next: () => {
        this.cargarRegistros();
        alert('Registro eliminado correctamente.');
      },
      error: (err) => alert(err?.message || 'Error al eliminar el registro.')
    });
  }

  // Métodos para acciones desde el detalle expandido
  editarRegistroPorId(id: string, loteId: string): void {
    const registro = this.registros.find(r => String(r.id) === id);
    if (registro) {
      this.editarRegistro(registro);
    }
  }

  eliminarRegistroPorId(id: string): void {
    const registro = this.registros.find(r => String(r.id) === id);
    if (registro) {
      this.eliminarRegistro(registro);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.saving = true; this.errorMessage = '';
    const v = this.form.value;
    const basePayload = {
      tipoTransporte: String(v.tipoTransporte || '').trim(),
      concepto: String(v.concepto || '').trim(),
      unidad: v.unidad || '',
      cantidadTransportada: Number(v.cantidadTransportada || 0),
      costoUnitario: Number(v.costoUnitario || 0),
      fecha: v.fecha,
      observaciones: v.observaciones || ''
    };

    // Si estamos editando
    if (this.editandoId) {
      this.service.actualizar(this.editandoId, { ...basePayload, loteId: this.editandoLoteId }).subscribe({
        next: () => {
          this.cargarRegistros();
          this.saving = false;
          this.cerrarFormulario();
          alert('Registro actualizado correctamente.');
        },
        error: (err) => { this.errorMessage = err?.message || 'Error al actualizar.'; this.saving = false; }
      });
      return;
    }

    // Crear nuevo
    const aplicarTodos = !!this.form.get('aplicarTodosLotes')?.value;
    let lotesSel: Array<string | number> = [];
    if (aplicarTodos) {
      lotesSel = (this.lotesActivos || []).map(l => l.id as string);
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

    // LÓGICA DE DIVISIÓN DE COSTOS:
    // - Si "Aplicar a todos" está activo y hay más de 1 lote: el costo total se DIVIDE entre todos los lotes
    // - Si se selecciona un lote específico: el costo completo va a ese lote
    const numLotes = lotesSel.length;
    let costoUnitarioPorLote = basePayload.costoUnitario;
    let cantidadPorLote = basePayload.cantidadTransportada;

    if (aplicarTodos && numLotes > 1) {
      // Dividir SOLO el costo entre los lotes. La cantidad se mantiene.
      costoUnitarioPorLote = basePayload.costoUnitario / numLotes;
      cantidadPorLote = basePayload.cantidadTransportada;
    }

    // Distribución justa en centavos para asegurar que la suma por lotes == costo total del viaje
    const totalViajeCents = Math.round(Number(basePayload.costoUnitario) * 100);
    const baseCents = Math.floor(totalViajeCents / numLotes);
    const resto = totalViajeCents - (baseCents * numLotes);

    const costosCentsPorLote = Array.from({ length: numLotes }, (_, i) => baseCents + (i < resto ? 1 : 0));

    const peticiones = lotesSel.map((lid, idx) => {
      const costoAsignado = costosCentsPorLote[idx] / 100;
      return this.service.crear({
        ...basePayload,
        costoUnitario: costoAsignado,
        cantidadTransportada: cantidadPorLote,
        loteId: String(lid)
      });
    });
    forkJoin(peticiones).subscribe({
      next: () => {
        this.cargarRegistros();
        this.saving = false;
        this.cerrarFormulario();
        if (aplicarTodos && numLotes > 1) {
          const costoTotal = basePayload.cantidadTransportada * basePayload.costoUnitario;
          const costoPorLote = costoTotal / numLotes;
          alert(`Costo dividido: $${costoPorLote.toFixed(2)} por cada uno de los ${numLotes} lotes.`);
        } else {
          alert('Registro de logística guardado correctamente.');
        }
      },
      error: (err) => { this.errorMessage = err?.message || 'Error al guardar.'; this.saving = false; }
    });
  }

  cerrarFormulario(): void {
    this.mostrarFormulario = false;
    this.editandoId = null;
    this.editandoLoteId = null;
    this.form.reset({ fecha: this.hoyISO(), aplicarTodosLotes: false });
    this.resetLotes();
    this.errorMessage = '';
    this.saveMessage = '';
  }

  cargarRegistros(): void {
    this.service.listar().subscribe({
      next: (data) => {
        const arr = Array.isArray(data) ? data.slice() : [];
        this.registros = arr.sort(this.compararDesc.bind(this));
      },
      error: () => this.registros = []
    });
  }

  // ===== Helpers de lotes dinámicos =====
  get lotesFormArray(): FormArray { return this.form.get('lotes') as FormArray; }
  agregarLote(): void { this.lotesFormArray.push(this.fb.group({ loteId: [null] })); }
  removerLote(index: number): void { if (index >= 0 && index < this.lotesFormArray.length) this.lotesFormArray.removeAt(index); }
  resetLotes(): void { while (this.lotesFormArray.length > 0) this.lotesFormArray.removeAt(0); this.agregarLote(); }
  lotesInvalid(): boolean {
    if (this.editandoId) return false; // Al editar, el lote ya está asignado
    if (!!this.form.get('aplicarTodosLotes')?.value) return false;
    const seleccionados = (this.lotesFormArray.controls || []).map(c => c.get('loteId')?.value).filter((x: any) => x != null && x !== '');
    return seleccionados.length === 0;
  }

  limpiar(): void {
    this.form.reset({ fecha: this.hoyISO(), aplicarTodosLotes: false });
    this.resetLotes();
  }

  // Normaliza la fecha a YYYY-MM-DD (acepta Date o string con T, /, .)
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

  private fechaValor(item: any): string {
    try {
      const fuente = item?.fecha ?? item?.date ?? item?.createdAt ?? item?.created_at ?? '';
      return this.normalizarFecha(fuente);
    } catch {
      return '';
    }
  }

  private compararDesc(a: any, b: any): number {
    const fa = this.fechaValor(a);
    const fb = this.fechaValor(b);
    const cmp = String(fb || '').localeCompare(String(fa || ''));
    if (cmp !== 0) return cmp;
    const idA = Number(a?.id || 0);
    const idB = Number(b?.id || 0);
    return idB - idA;
  }

  // Etiqueta y estilos según tipo de animal
  getEtiquetaAnimal(animalTipo?: string): string {
    if (!animalTipo) return '';
    const s = String(animalTipo).toLowerCase();
    if (s.includes('pollo') || s.includes('ave') || s.includes('broiler')) return 'Pollos';
    if (s.includes('chancho') || s.includes('cerdo') || s.includes('porcino')) return 'Chanchos';
    return animalTipo;
  }

  esPollo(etq: string): boolean { return String(etq).toLowerCase() === 'pollos'; }
  esChancho(etq: string): boolean { return String(etq).toLowerCase() === 'chanchos'; }
}
