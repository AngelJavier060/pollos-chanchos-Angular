$ErrorActionPreference = 'Stop'
$path = 'd:\PROGRAMAS 2025 CONTRUCCION\pollos-chanchos-Angular\frontend\src\app\features\chanchos\chanchos-lotes.component.html'

# Leer contenido
$content = Get-Content -Raw -Encoding UTF8 $path

# 1) Hacer el header clickeable (expand/collapse)
# La línea exacta en el archivo tiene 8 espacios de indentación antes del div
$patternHeader = '(?m)^[ ]{8}<div class="bg-gradient-to-r from-pink-500 to-pink-600 text-white p-4">$'
$replacementHeader = '        <div class="bg-gradient-to-r from-pink-500 to-pink-600 text-white p-4 cursor-pointer" (click)="toggleExpand(lote)">'
$content = [regex]::Replace($content, $patternHeader, $replacementHeader, 1)

# 2) Insertar bloque expandible antes de la línea con 10 espacios: "<!-- Estado visual -->"
$patternEstado = '(?m)^[ ]{10}<!-- Estado visual -->$'
$block = @'
          <!-- Detalle expandible: KPIs de consumo y Historial -->
          <ng-container *ngIf="isExpanded(lote)">
            <!-- Consumo del Lote (KPIs) -->
            <div class="bg-orange-50 rounded-lg p-3 border border-orange-200">
              <div class="flex items-center justify-between mb-3">
                <h5 class="font-semibold text-orange-800 text-sm">Consumo del Lote</h5>
                <div class="text-right">
                  <p class="text-xs text-orange-700">Productos</p>
                  <p class="text-sm font-semibold text-orange-800">{{ getCantidadProductos(lote) }}</p>
                </div>
              </div>
              <!-- KPIs Totales -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div class="text-xs text-blue-700">Consumo Total</div>
                  <div class="text-2xl font-bold text-blue-900">{{ getConsumoTotal(lote) | number:'1.2-2' }} <span class="text-sm font-medium">kg</span></div>
                </div>
                <div class="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div class="text-xs text-green-700">Animales</div>
                  <div class="text-2xl font-bold text-green-900">{{ lote.quantity }} <span class="text-sm font-medium">cabezas</span></div>
                </div>
                <div class="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div class="text-xs text-purple-700">Promedio</div>
                  <div class="text-2xl font-bold text-purple-900">{{ getPromedioPorAnimal(lote) | number:'1.2-2' }} <span class="text-sm font-medium">kg/animal</span></div>
                </div>
              </div>

              <!-- KPIs por Producto -->
              <div *ngIf="getProductosDelLote(lote)?.length; else sinProductos" class="space-y-2">
                <div *ngFor="let p of getProductosDelLote(lote)" class="bg-white rounded-lg p-3 border border-orange-100">
                  <div class="flex items-center justify-between">
                    <div class="font-semibold text-gray-800">{{ p.nombre | uppercase }}</div>
                    <div class="text-lg font-bold text-orange-800">{{ p.cantidad | number:'1.2-2' }} kg</div>
                  </div>
                  <div class="mt-2">
                    <div class="w-full h-2 rounded-full bg-gray-200">
                      <div class="h-2 rounded-full bg-gradient-to-r from-orange-400 to-orange-500" [style.width.%]="getPorcentajeProducto(lote, p)"></div>
                    </div>
                    <div class="text-[11px] text-gray-600 mt-1">{{ getPorcentajeProducto(lote, p) }}% del total</div>
                  </div>
                </div>
              </div>
              <ng-template #sinProductos>
                <p class="text-xs text-orange-700 italic">Sin consumos registrados aún.</p>
              </ng-template>
            </div>

            <!-- Historial de Alimentación del Lote -->
            <div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <h5 class="font-semibold text-gray-800 text-sm mb-2">Historial de Alimentación</h5>
              <div *ngIf="getRegistrosDelLote(lote)?.length; else sinHist" class="overflow-x-auto">
                <table class="min-w-full text-sm">
                  <thead>
                    <tr class="bg-gray-100 text-gray-700">
                      <th class="text-left px-3 py-2">FECHA</th>
                      <th class="text-left px-3 py-2">TIPO</th>
                      <th class="text-left px-3 py-2">CANTIDAD</th>
                      <th class="text-left px-3 py-2">RESPONSABLE</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let r of getRegistrosDelLote(lote) | slice:0:5" class="border-t">
                      <td class="px-3 py-2">{{ r.executionDate | date:'yyyy-MM-dd' }}</td>
                      <td class="px-3 py-2">{{ getNombreProductoRegistro(r) }}</td>
                      <td class="px-3 py-2">{{ r.quantityApplied | number:'1.2-2' }} kg</td>
                      <td class="px-3 py-2">{{ r.usuarioNombre || '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <ng-template #sinHist>
                <p class="text-xs text-gray-600 italic">Sin registros de alimentación.</p>
              </ng-template>
            </div>
          </ng-container>
'@

# Reemplazo: insertar el bloque antes del comentario (única ocurrencia)
$content = $content -replace $patternEstado, ($block + "`r`n          <!-- Estado visual -->")

# Guardar
Set-Content -Path $path -Value $content -Encoding UTF8
Write-Host '✅ chanchos-lotes.component.html actualizado correctamente.'
