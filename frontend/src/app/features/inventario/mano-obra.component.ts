import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup, FormArray } from '@angular/forms';
import { Lote } from '../lotes/interfaces/lote.interface';
import { LoteService } from '../lotes/services/lote.service';
import { CostosManoObraService } from './services/costos-mano-obra.service';
import { forkJoin } from 'rxjs';
import { DateEsPipe } from '../../shared/pipes/date-es.pipe';

interface GrupoManoObra {
  fecha: string;
  trabajador: string;
  cargo: string;
  horasTotal: number;
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
  selector: 'app-mano-obra',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DateEsPipe],
  template: `
  <div class="p-6 bg-gray-50 min-h-screen">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-blue-800 flex items-center gap-2">
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
          Mano de Obra
        </h1>
        <p class="text-gray-600">Registro de pagos y costos de trabajadores</p>
      </div>
      <button 
        (click)="toggleFormulario()" 
        class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md">
        <svg *ngIf="!mostrarFormulario" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
        </svg>
        <svg *ngIf="mostrarFormulario" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
        {{ mostrarFormulario ? 'Cerrar formulario' : 'Ingresar mano de obra' }}
      </button>
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 font-medium">Total Pagado</p>
            <p class="text-2xl font-bold text-gray-800">S/ {{ totalPagado | number:'1.2-2' }}</p>
          </div>
          <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
        </div>
        <p class="text-xs text-gray-400 mt-2">Total acumulado de pagos</p>
      </div>
      
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 font-medium">Último Pago</p>
            <p class="text-2xl font-bold text-gray-800">S/ {{ ultimoPagoMonto | number:'1.2-2' }}</p>
          </div>
          <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </div>
        </div>
        <p class="text-xs text-gray-400 mt-2">{{ (ultimoPagoFecha | dateEs) || 'Sin registros' }}</p>
      </div>
      
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 font-medium">Trabajadores</p>
            <p class="text-2xl font-bold text-gray-800">{{ cantidadTrabajadores }}</p>
          </div>
          <div class="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
          </div>
        </div>
        <p class="text-xs text-gray-400 mt-2">Personas registradas</p>
      </div>
      
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 font-medium">Total Registros</p>
            <p class="text-2xl font-bold text-gray-800">{{ registros.length }}</p>
          </div>
          <div class="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
            <svg class="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
          </div>
        </div>
        <p class="text-xs text-gray-400 mt-2">Pagos realizados</p>
      </div>
    </div>

    <!-- Gastos por Lote -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6" *ngIf="gastosPorLote.length > 0">
      <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
        </svg>
        Gastos por Lote
      </h3>
      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div *ngFor="let g of gastosPorLote" class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
          <p class="text-xs font-medium text-blue-600 truncate">{{ g.loteNombre }}</p>
          <p class="text-lg font-bold text-gray-800">S/ {{ g.total | number:'1.2-2' }}</p>
        </div>
      </div>
    </div>

    <!-- Formulario (oculto por defecto) -->
    <div *ngIf="mostrarFormulario" class="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6 animate-fadeIn">
      <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
        </svg>
        Registrar Pago de Mano de Obra
      </h3>
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Trabajador</label>
            <input type="text" formControlName="nombreTrabajador" class="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Ejemplo: Juan Pérez" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Cargo</label>
            <input type="text" formControlName="cargo" class="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Ejemplo: Cuidador, Técnico…" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Horas trabajadas</label>
            <input type="number" min="0" step="0.01" formControlName="horasTrabajadas" class="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Ejemplo: 8" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Costo / Monto (S/)</label>
            <input type="number" min="0" step="0.01" formControlName="costoPorHora" class="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Fecha</label>
            <input type="date" formControlName="fecha" class="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div class="md:col-span-2">
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-semibold text-gray-700">Lotes asociados</label>
              <div class="flex items-center gap-3">
                <label class="inline-flex items-center text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" formControlName="aplicarTodosLotes" class="mr-2 rounded text-blue-600 focus:ring-blue-500">
                  Aplicar a todos los lotes
                </label>
                <button type="button" (click)="agregarLote()" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors" [disabled]="form.get('aplicarTodosLotes')?.value">+ Agregar lote</button>
              </div>
            </div>
            <div *ngIf="form.get('aplicarTodosLotes')?.value" class="text-sm text-blue-600 bg-blue-50 p-2 rounded-lg mb-2">
              ✓ Se aplicará a {{ lotes.length }} lote(s) activos.
            </div>
            <div class="space-y-2" *ngIf="!form.get('aplicarTodosLotes')?.value">
              <div class="flex items-center gap-2" *ngFor="let ctrl of lotesFormArray.controls; let i = index">
                <select [formControl]="ctrl.get('loteId')" class="flex-1 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option [ngValue]="null">Seleccione lote</option>
                  <option *ngFor="let l of lotes" [ngValue]="l.id">{{ l.name || l.codigo }} — {{ l.race?.animal?.name }}</option>
                </select>
                <button type="button" (click)="removerLote(i)" class="p-2 text-sm bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
              <div *ngIf="lotesFormArray.length === 0" class="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">Agregue al menos un lote o active "Aplicar a todos".</div>
            </div>
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-semibold text-gray-700 mb-1">Observaciones</label>
            <textarea rows="2" formControlName="observaciones" class="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Notas adicionales..."></textarea>
          </div>
        </div>
        <div class="flex items-center gap-3 pt-2 border-t">
          <button type="submit" [disabled]="form.invalid || saving || lotesInvalid()" class="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2">
            <svg *ngIf="!saving" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            <svg *ngIf="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            {{ saving ? 'Guardando...' : 'Guardar' }}
          </button>
          <button type="button" (click)="limpiar()" class="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">Limpiar</button>
          <div *ngIf="saveMessage" class="text-green-600 text-sm font-medium bg-green-50 px-3 py-1 rounded-lg">{{ saveMessage }}</div>
          <div *ngIf="errorMessage" class="text-red-600 text-sm font-medium bg-red-50 px-3 py-1 rounded-lg">{{ errorMessage }}</div>
        </div>
      </form>
    </div>

    <!-- Tabla de Registros resumida -->
    <div class="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <h3 class="text-lg font-semibold text-gray-800 mb-1 flex items-center justify-between">
        <span class="flex items-center gap-2">
          <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          Historial de Pagos
        </span>
        <span class="text-sm font-normal text-gray-500">{{ registrosAgrupados.length }} grupos</span>
      </h3>
      <p class="text-gray-500 text-sm mb-4">Resumen agrupado por trabajador - Click en una fila para ver detalle por lotes</p>

      <div *ngIf="registrosAgrupados.length === 0" class="text-center py-12 text-gray-500">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        <p>No hay registros de mano de obra</p>
        <p class="text-sm mt-1">Haz clic en "Ingresar mano de obra" para agregar el primer registro</p>
      </div>

      <div class="overflow-x-auto" *ngIf="registrosAgrupados.length > 0">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="w-10"></th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Trabajador</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cargo</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Horas Totales</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Costo Total</th>
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
                <td class="px-4 py-3 text-sm text-gray-700">{{ row.trabajador }}</td>
                <td class="px-4 py-3 text-sm text-gray-700">{{ row.cargo }}</td>
                <td class="px-4 py-3 text-sm text-gray-700 text-right">{{ row.horasTotal | number:'1.2-2' }}</td>
                <td class="px-4 py-3 text-right"><span class="font-bold text-green-600">S/ {{ row.costoTotal | number:'1.2-2' }}</span></td>
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
                            <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Horas</th>
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
                            <td class="px-4 py-3 text-right text-sm font-semibold text-gray-700">{{ row.horasTotal | number:'1.2-2' }} h</td>
                            <td class="px-4 py-3"></td>
                            <td class="px-4 py-3 text-right"><span class="text-lg font-bold text-green-600">S/ {{ row.costoTotal | number:'1.2-2' }}</span></td>
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
    </div>
  </div>
  `,
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fadeIn {
      animation: fadeIn 0.3s ease-out;
    }
  `]
})
export class ManoObraComponent implements OnInit {
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
  totalPagado = 0;
  ultimoPagoMonto = 0;
  ultimoPagoFecha = '';
  cantidadTrabajadores = 0;
  gastosPorLote: { loteId: string; loteNombre: string; total: number }[] = [];

  constructor(private fb: FormBuilder, private lotesService: LoteService, private service: CostosManoObraService) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      nombreTrabajador: ['', [Validators.required, Validators.minLength(3)]],
      cargo: ['', [Validators.required]],
      horasTrabajadas: [null, [Validators.required, Validators.min(0.01)]],
      costoPorHora: [null, [Validators.required, Validators.min(0)]],
      fecha: [this.hoyISO(), [Validators.required]],
      aplicarTodosLotes: [false],
      lotes: this.fb.array([]),
      observaciones: ['']
    });

    this.lotesService.getActivos().subscribe({ next: (l) => this.lotes = l, error: () => this.lotes = [] });
    this.cargarRegistros();
    this.agregarLote();
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

  hoyISO(): string { const d = new Date(); return d.toISOString().split('T')[0]; }

  getLoteCodigo(id: string | number): string {
    const l = this.lotes.find(x => String(x.id) === String(id));
    return l?.name || l?.codigo || String(id);
  }

  calcularKPIs(): void {
    // Total pagado
    this.totalPagado = this.registros.reduce((sum, r) => sum + (r.total || 0), 0);

    // Último pago
    if (this.registros.length > 0) {
      const sorted = [...this.registros].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      this.ultimoPagoMonto = sorted[0]?.total || 0;
      this.ultimoPagoFecha = sorted[0]?.fecha || '';
    } else {
      this.ultimoPagoMonto = 0;
      this.ultimoPagoFecha = '';
    }

    // Cantidad de trabajadores únicos
    const trabajadores = new Set(this.registros.map(r => r.nombreTrabajador?.toLowerCase().trim()).filter(Boolean));
    this.cantidadTrabajadores = trabajadores.size;

    // Gastos por lote
    const gastoMap = new Map<string, { loteNombre: string; total: number }>();
    for (const r of this.registros) {
      const loteId = String(r.lote?.id || r.loteId || 'sin-lote');
      const loteNombre = r.lote?.name || r.lote?.codigo || this.getLoteCodigo(loteId);
      if (!gastoMap.has(loteId)) {
        gastoMap.set(loteId, { loteNombre, total: 0 });
      }
      gastoMap.get(loteId)!.total += (r.total || 0);
    }
    this.gastosPorLote = Array.from(gastoMap.entries()).map(([loteId, data]) => ({
      loteId,
      loteNombre: data.loteNombre,
      total: data.total
    }));
  }

  get registrosAgrupados(): GrupoManoObra[] {
    const groups: { [key: string]: GrupoManoObra } = {};
    this.registros.forEach(item => {
      const fechaStr = this.normalizarFecha(item?.fecha);
      const trabajador = String(item?.nombreTrabajador || '').trim();
      const cargo = String(item?.cargo || '').trim();
      const key = `${fechaStr}|${trabajador}|${cargo}`;
      if (!groups[key]) {
        groups[key] = { fecha: fechaStr, trabajador, cargo, horasTotal: 0, costoTotal: 0, detalles: [] };
      }
      const horas = Number(item?.horasTrabajadas ?? 0);
      const costoUnit = Number(item?.costoPorHora ?? 0);
      const total = Number(item?.total ?? (horas * costoUnit));
      const animalTipo = (item?.lote?.race?.animal?.name)
        || (this.lotes.find(l => String(l.id) === String(item?.lote?.id || item?.loteId))?.race?.animal?.name)
        || '';
      groups[key].horasTotal += horas;
      groups[key].costoTotal += total;
      groups[key].detalles.push({
        id: String(item?.id ?? ''),
        lote: item?.lote?.name || item?.lote?.codigo || this.getLoteCodigo(item?.lote?.id || item?.loteId),
        loteId: String(item?.lote?.id || item?.loteId || ''),
        animalTipo: String(animalTipo || ''),
        cantidad: horas,
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
    const registro = this.registros.find(r => String(r.id) === id);
    if (registro) this.editarRegistro(registro);
  }

  eliminarRegistroPorId(id: string): void {
    const registro = this.registros.find(r => String(r.id) === id);
    if (registro) this.eliminarRegistro(registro);
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.saving = true; this.errorMessage = '';
    const v = this.form.value;

    const horas = Number(v.horasTrabajadas || 0);
    const montoMensual = Number(v.costoPorHora || 0);

    if (montoMensual <= 0) {
      this.errorMessage = 'Ingrese un monto mensual válido.';
      this.saving = false;
      return;
    }

    if (horas <= 0) {
      this.errorMessage = 'Ingrese las horas trabajadas para poder registrar el pago.';
      this.saving = false;
      return;
    }

    const basePayload = {
      nombreTrabajador: String(v.nombreTrabajador || '').trim(),
      cargo: String(v.cargo || '').trim(),
      horasTrabajadas: horas,
      costoPorHora: 0,
      fecha: v.fecha,
      observaciones: v.observaciones || ''
    };

    if (this.editandoId) {
      const costoPorHoraLote = montoMensual / horas;
      const payloadEdicion: any = {
        ...basePayload,
        costoPorHora: costoPorHoraLote
      };
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

    const numLotes = lotesSel.length;

    let costosCentsPorLote: number[];
    if (aplicarTodos && numLotes > 1) {
      const totalCents = Math.round(montoMensual * 100);
      const baseCents = Math.floor(totalCents / numLotes);
      const resto = totalCents - (baseCents * numLotes);
      costosCentsPorLote = Array.from({ length: numLotes }, (_, i) => baseCents + (i < resto ? 1 : 0));
    } else {
      costosCentsPorLote = Array.from({ length: numLotes }, () => Math.round(montoMensual * 100));
    }

    const peticiones = lotesSel.map((lid, idx) => {
      const totalAsignado = costosCentsPorLote[idx] / 100;
      const costoPorHoraLote = totalAsignado / horas;
      const payload = {
        ...basePayload,
        horasTrabajadas: horas,
        costoPorHora: costoPorHoraLote,
        loteId: String(lid)
      };
      return this.service.crear(payload);
    });
    forkJoin(peticiones).subscribe({
      next: () => {
        this.cargarRegistros();
        this.saveMessage = 'Guardado correctamente.';
        setTimeout(() => this.saveMessage = '', 3000);
        this.saving = false;
        this.mostrarFormulario = false; // Ocultar formulario después de guardar
        this.form.reset({ fecha: this.hoyISO(), aplicarTodosLotes: false });
        this.resetLotes();
      },
      error: (err) => { this.errorMessage = err?.message || 'Error al guardar.'; this.saving = false; }
    });
  }

  cargarRegistros(): void {
    this.service.listar().subscribe({ 
      next: (data) => {
        this.registros = [...data].sort((a, b) => {
          const loteA = String(a.lote?.id || a.loteId || '');
          const loteB = String(b.lote?.id || b.loteId || '');
          if (loteA < loteB) return -1;
          if (loteA > loteB) return 1;

          const fechaA = new Date(a.fecha).getTime();
          const fechaB = new Date(b.fecha).getTime();
          if (!isNaN(fechaA) && !isNaN(fechaB) && fechaA !== fechaB) {
            return fechaA - fechaB;
          }

          const horasA = Number(a.horasTrabajadas ?? 0);
          const horasB = Number(b.horasTrabajadas ?? 0);
          return horasA - horasB;
        });
        this.calcularKPIs();
      }, 
      error: () => {
        this.registros = [];
        this.calcularKPIs();
      }
    });
  }

  editarRegistro(r: any): void {
    this.editandoId = String(r.id);
    this.editandoLoteId = r.lote?.id || r.loteId || null;
    const montoMensual = Number(r.total || (Number(r.costoPorHora || 0) * Number(r.horasTrabajadas || 0)));
    this.form.patchValue({
      nombreTrabajador: r.nombreTrabajador || '',
      cargo: r.cargo || '',
      horasTrabajadas: r.horasTrabajadas,
      costoPorHora: montoMensual,
      fecha: r.fecha,
      observaciones: r.observaciones || '',
      aplicarTodosLotes: false
    });
    this.mostrarFormulario = true;
  }

  eliminarRegistro(r: any): void {
    if (!confirm('¿Está seguro de eliminar este registro de mano de obra?')) return;
    this.service.eliminar(String(r.id)).subscribe({
      next: () => {
        this.cargarRegistros();
        alert('Registro eliminado correctamente.');
      },
      error: (err) => alert(err?.message || 'Error al eliminar el registro.')
    });
  }

  // ===== Helpers de lotes dinámicos =====
  get lotesFormArray(): FormArray { return this.form.get('lotes') as FormArray; }
  agregarLote(): void { this.lotesFormArray.push(this.fb.group({ loteId: [null] })); }
  removerLote(index: number): void { if (index >= 0 && index < this.lotesFormArray.length) this.lotesFormArray.removeAt(index); }
  resetLotes(): void { while (this.lotesFormArray.length > 0) this.lotesFormArray.removeAt(0); this.agregarLote(); }
  lotesInvalid(): boolean {
    if (this.editandoId) return false;
    if (!!this.form.get('aplicarTodosLotes')?.value) return false;
    const seleccionados = (this.lotesFormArray.controls || []).map(c => c.get('loteId')?.value).filter((x: any) => x != null && x !== '');
    return seleccionados.length === 0;
  }

  limpiar(): void {
    this.form.reset({ fecha: this.hoyISO(), aplicarTodosLotes: false });
    this.resetLotes();
  }
}
