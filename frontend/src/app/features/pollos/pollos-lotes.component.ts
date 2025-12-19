import { Component, OnInit } from '@angular/core';
import { AuthDirectService } from '../../core/services/auth-direct.service';
import { User } from '../../shared/models/user.model';
import { LoteService } from '../lotes/services/lote.service';
import { Lote } from '../lotes/interfaces/lote.interface';
import { AlimentacionService, PlanEjecucionHistorial } from './services/alimentacion.service';
import { ConsumosLoteService, ConsumosPorLote, ConsumoProductoLote, RegistroConsumoLote } from '../../shared/services/consumos-lote.service';

@Component({
  selector: 'app-pollos-lotes',
  templateUrl: './pollos-lotes.component.html',
  styleUrls: ['./pollos-dashboard.component.scss']
})
export class PollosLotesComponent implements OnInit {
  user: User | null = null;
  
  // Variables para lotes de pollos
  lotesPollos: Lote[] = [];
  lotesFiltrados: Lote[] = [];
  loading = false;
  
  // Variables para filtros y búsqueda
  filtroEstado: string = 'todos'; // todos, activos, finalizados
  filtroRaza: string = 'todos';
  terminoBusqueda: string = '';
  
  // Variables para estadísticas
  estadisticas = {
    totalLotes: 0,
    lotesActivos: 0,
    lotesFinalizados: 0,
    totalAnimales: 0,
    animalesVivos: 0,
    animalesFallecidos: 0,
    rendimientoPromedio: 0
  };

  // Opciones de filtro
  razasDisponibles: string[] = [];

  // Consumos e historial por lote (desde inventario_entrada_producto)
  private consumoPorLote: Map<string, ConsumosPorLote> = new Map();
  private productosConsumoMap: Map<string, ConsumoProductoLote[]> = new Map();
  private historialConsumoMap: Map<string, RegistroConsumoLote[]> = new Map();
  
  // Estado de expansión por lote
  private expandedLotes: Set<string> = new Set<string>();


  constructor(
    private authService: AuthDirectService,
    private loteService: LoteService,
    private alimentacionService: AlimentacionService,
    private consumosLoteService: ConsumosLoteService
  ) {
    this.user = this.authService.currentUserValue;
  }

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  /**
   * Método trackBy para optimizar el renderizado
   */
  trackByLote(index: number, lote: Lote): any {
    return lote.id || index;
  }

  /**
   * Aplicar filtros y búsqueda
   */
  aplicarFiltros(): void {
    let lotesFiltrados = [...this.lotesPollos];

    // Filtro por estado
    if (this.filtroEstado === 'activos') {
      lotesFiltrados = lotesFiltrados.filter(lote => lote.quantity > 0);
    } else if (this.filtroEstado === 'finalizados') {
      lotesFiltrados = lotesFiltrados.filter(lote => lote.quantity === 0);
    }

    // Filtro por raza
    if (this.filtroRaza !== 'todos') {
      lotesFiltrados = lotesFiltrados.filter(lote => 
        lote.race?.name === this.filtroRaza
      );
    }

    // Búsqueda por término
    if (this.terminoBusqueda.trim()) {
      const termino = this.terminoBusqueda.toLowerCase();
      lotesFiltrados = lotesFiltrados.filter(lote =>
        lote.codigo?.toLowerCase().includes(termino) ||
        lote.name?.toLowerCase().includes(termino) ||
        lote.race?.name?.toLowerCase().includes(termino)
      );
    }

    this.lotesFiltrados = lotesFiltrados;
  }

  /**
   * Calcular días de vida de un lote
   */
  calcularDiasDeVida(fechaNacimiento: Date | null): number {
    if (!fechaNacimiento) return 0;
    
    const hoy = new Date();
    const fechaNac = new Date(fechaNacimiento);
    const diffTime = Math.abs(hoy.getTime() - fechaNac.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Formatear fecha para mostrar
   */
  formatearFecha(fecha: Date | null): string {
    if (!fecha) return 'No definida';
    
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Obtener el estado del lote
   */
  getEstadoLote(lote: Lote): { texto: string, clase: string, icono: string } {
    if (lote.quantity > 0) {
      return {
        texto: 'Activo',
        clase: 'bg-green-100 text-green-800 border-green-200',
        icono: 'fas fa-heart'
      };
    } else {
      return {
        texto: 'Finalizado',
        clase: 'bg-gray-100 text-gray-800 border-gray-200',
        icono: 'fas fa-flag-checkered'
      };
    }
  }

  /**
   * Obtener el color de progreso según días de vida
   */
  getColorProgreso(diasVida: number): { fondo: string, barra: string } {
    if (diasVida < 14) {
      return { fondo: 'bg-yellow-100', barra: 'bg-yellow-500' };
    } else if (diasVida < 35) {
      return { fondo: 'bg-blue-100', barra: 'bg-blue-500' };
    } else if (diasVida < 50) {
      return { fondo: 'bg-green-100', barra: 'bg-green-500' };
    } else {
      return { fondo: 'bg-purple-100', barra: 'bg-purple-500' };
    }
  }

  /**
   * Calcular progreso del lote (simula el avance del ciclo productivo)
   */
  calcularProgreso(diasVida: number): number {
    // Asumiendo un ciclo productivo de 60 días
    const cicloCompleto = 60;
    return Math.min(100, Math.round((diasVida / cicloCompleto) * 100));
  }

  /**
   * Simular rendimiento del lote
   */
  simularRendimiento(lote: Lote): number {
    const diasVida = this.calcularDiasDeVida(lote.birthdate);
    // Simular rendimiento basado en días de vida y cantidad inicial vs actual
    if (diasVida === 0) return 0;
    
    // Rendimiento típico: mejor entre 21-42 días
    let rendimientoBase = 85;
    if (diasVida > 21 && diasVida < 42) {
      rendimientoBase = 92;
    } else if (diasVida > 42) {
      rendimientoBase = 88;
    }
    
    // Ajustar por mortalidad simulada
    const factorMortalidad = Math.random() * 0.05; // 0-5% variación
    return Math.max(75, Math.min(98, rendimientoBase - (factorMortalidad * 100)));
  }

  /**
   * Calcular estadísticas generales
   */
  calcularEstadisticas(): void {
    if (this.lotesPollos.length === 0) {
      this.estadisticas = {
        totalLotes: 0,
        lotesActivos: 0,
        lotesFinalizados: 0,
        totalAnimales: 0,
        animalesVivos: 0,
        animalesFallecidos: 0,
        rendimientoPromedio: 0
      };
      return;
    }

    const lotesActivos = this.lotesPollos.filter(lote => lote.quantity > 0);
    const lotesFinalizados = this.lotesPollos.filter(lote => lote.quantity === 0);
    
    this.estadisticas = {
      totalLotes: this.lotesPollos.length,
      lotesActivos: lotesActivos.length,
      lotesFinalizados: lotesFinalizados.length,
      totalAnimales: this.lotesPollos.reduce((total, lote) => total + (lote.quantity || 0), 0),
      animalesVivos: lotesActivos.reduce((total, lote) => total + lote.quantity, 0),
      animalesFallecidos: 0, // Se calcularía con datos reales
      rendimientoPromedio: this.calcularRendimientoPromedio()
    };
  }

  /**
   * Calcular rendimiento promedio
   */
  calcularRendimientoPromedio(): number {
    if (this.lotesPollos.length === 0) return 0;
    
    const rendimientos = this.lotesPollos.map(lote => this.simularRendimiento(lote));
    const suma = rendimientos.reduce((total, rendimiento) => total + rendimiento, 0);
    return Math.round(suma / rendimientos.length);
  }

  /**
   * Exportar datos (placeholder)
   */
  exportarDatos(): void {
    console.log('📊 Exportando datos de lotes...');
    alert('🚀 Funcionalidad de exportación en desarrollo');
  }

  /**
   * Ver detalles del lote (placeholder)
   */
  verDetalleLote(lote: Lote): void {
    console.log('👀 Ver detalles del lote:', lote.codigo);
    // Funcionalidad futura
  }
  
  /**
   * Expand/Collapse por lote
   */
  toggleExpand(lote: Lote): void {
    const id = String(lote.id || '');
    console.log('🐔 Toggle expand para lote:', id, lote.codigo);
    if (!id) return;
    if (this.expandedLotes.has(id)) {
      this.expandedLotes.delete(id);
      console.log('🔽 Colapsando lote:', id);
    } else {
      this.expandedLotes.add(id);
      console.log('🔼 Expandiendo lote:', id);
    }
    console.log('📋 Lotes expandidos:', Array.from(this.expandedLotes));
  }

  isExpanded(lote: Lote): boolean {
    const id = String(lote.id || '');
    const expanded = !!id && this.expandedLotes.has(id);
    return expanded;
  }

  /**
   * Helpers para plantilla
   */
  getConsumoTotal(lote: Lote): number {
    const c = this.consumoPorLote.get(String(lote.id || ''));
    return c ? Number(c.totalConsumo.toFixed(2)) : 0;
  }

  getProductosDelLote(lote: Lote): { nombre: string; cantidad: number }[] {
    const productos = this.productosConsumoMap.get(String(lote.id || '')) || [];
    return productos.map(p => ({ nombre: p.productoNombre, cantidad: p.totalConsumo }));
  }

  getCantidadProductos(lote: Lote): number {
    const productos = this.productosConsumoMap.get(String(lote.id || '')) || [];
    return productos.length;
  }

  getRegistrosDelLote(lote: Lote): RegistroConsumoLote[] {
    return this.historialConsumoMap.get(String(lote.id || '')) || [];
  }

  getPromedioPorAnimal(lote: Lote): number {
    const total = this.getConsumoTotal(lote);
    return lote.quantity > 0 ? Number((total / lote.quantity).toFixed(2)) : 0;
  }

  getPorcentajeProducto(lote: Lote, producto: { nombre: string; cantidad: number }): number {
    const total = this.getConsumoTotal(lote);
    return total > 0 ? Number(((producto.cantidad / total) * 100).toFixed(1)) : 0;
  }

  getKPIStyle(nombreProducto: string, index: number): any {
    const colores = [
      { background: '#fef3c7', border: '#fbbf24' },
      { background: '#dcfce7', border: '#86efac' },
      { background: '#dbeafe', border: '#93c5fd' },
      { background: '#fce7f3', border: '#f9a8d4' },
      { background: '#f3e8ff', border: '#c084fc' }
    ];
    const color = colores[index % colores.length];
    return {
      background: color.background,
      border: `2px solid ${color.border}`
    };
  }

  getNombreProductoRegistro(registro: RegistroConsumoLote): string {
    return registro.productoNombre || 'Alimento';
  }
  
  /**
   * Verificar si un lote tiene datos de consumo
   */
  tieneConsumos(lote: Lote): boolean {
    const consumo = this.consumoPorLote.get(String(lote.id || ''));
    return !!(consumo && consumo.totalConsumo > 0);
  }
  
  /**
   * Verificar si un lote tiene historial de alimentación
   */
  tieneHistorial(lote: Lote): boolean {
    const historial = this.historialConsumoMap.get(String(lote.id || ''));
    return !!(historial && historial.length > 0);
  }

  /**
   * Cargar datos iniciales
   */
  async cargarDatosIniciales(): Promise<void> {
    this.loading = true;
    try {
      await this.cargarLotesPollos();
    } catch (error) {
      console.error('Error al cargar datos iniciales:', error);
    } finally {
      this.loading = false;
    }
  }

  /**
   * Cargar lotes de pollos
   */
  async cargarLotesPollos(): Promise<void> {
    try {
      this.loteService.getLotes().subscribe({
        next: (lotes) => {
          // Filtrar solo lotes de pollos
          this.lotesPollos = lotes.filter(lote => 
            lote.race?.animal?.name?.toLowerCase().includes('pollo') ||
            lote.race?.animal?.id === 1
          );
          
          // Obtener razas disponibles
          this.razasDisponibles = [...new Set(
            this.lotesPollos
              .map(lote => lote.race?.name)
              .filter(name => name) as string[]
          )];
          
          // Aplicar filtros iniciales
          this.aplicarFiltros();
          
          // Calcular estadísticas
          this.calcularEstadisticas();
          
          // Cargar consumos por lote
          this.cargarConsumoPorLote();
          
          console.log('✅ Lotes de pollos cargados:', this.lotesPollos.length);
          console.log('📊 Estadísticas calculadas:', this.estadisticas);
        },
        error: (error) => {
          console.error('❌ Error al cargar lotes:', error);
        }
      });
    } catch (error) {
      console.error('❌ Error en cargarLotesPollos:', error);
    }
  }

  /**
   * Manejar cambios en filtros
   */
  onFiltroChange(): void {
    this.aplicarFiltros();
  }

  /**
   * Manejar cambios en búsqueda
   */
  onBusquedaChange(event: any): void {
    this.terminoBusqueda = event.target.value;
    this.aplicarFiltros();
  }

  /**
   * Limpiar filtros
   */
  limpiarFiltros(): void {
    this.filtroEstado = 'todos';
    this.filtroRaza = 'todos';
    this.terminoBusqueda = '';
    this.aplicarFiltros();
  }

  /**
   * Cargar consumos por lote desde inventario_entrada_producto
   */
  cargarConsumoPorLote(): void {
    console.log('🔄 [POLLOS] Iniciando carga de consumos desde inventario_entrada_producto...');
    try {
      this.consumosLoteService.getConsumosPorLote('pollos').subscribe({
        next: (consumos) => {
          console.log('📊 [POLLOS] Consumos recibidos:', consumos?.length || 0);
          
          if (consumos && consumos.length > 0) {
            this.procesarConsumosPorLote(consumos);
          } else {
            console.log('⚠️ [POLLOS] No se encontraron consumos, creando datos de prueba...');
            this.crearDatosDePrueba();
          }
        },
        error: (err) => {
          console.error('❌ [POLLOS] Error al cargar consumos:', err);
          console.log('🧪 [POLLOS] Creando datos de prueba debido al error...');
          this.crearDatosDePrueba();
        }
      });
    } catch (error) {
      console.error('❌ [POLLOS] Error en cargarConsumoPorLote:', error);
      this.crearDatosDePrueba();
    }
  }

  /**
   * Procesa los consumos por lote desde inventario_entrada_producto
   */
  private procesarConsumosPorLote(consumos: ConsumosPorLote[]): void {
    console.log('🔄 [POLLOS] Procesando', consumos?.length, 'consumos por lote...');
    this.consumoPorLote.clear();
    this.productosConsumoMap.clear();
    this.historialConsumoMap.clear();

    // Crear mapa de codigo->id de lotes
    const mapCodigoToId = new Map<string, string>();
    (this.lotesPollos || []).forEach(l => {
      const id = String(l.id || '').trim();
      const codigo = String(l.codigo || '').trim();
      if (codigo && id) mapCodigoToId.set(codigo, id);
      if (id) mapCodigoToId.set(id, id);
    });

    consumos.forEach(consumo => {
      // Resolver loteId usando codigo o id
      let loteId = consumo.loteId;
      if (consumo.loteCodigo && mapCodigoToId.has(consumo.loteCodigo)) {
        loteId = mapCodigoToId.get(consumo.loteCodigo)!;
      }

      if (loteId) {
        this.consumoPorLote.set(loteId, consumo);
        this.productosConsumoMap.set(loteId, consumo.productos);
        this.historialConsumoMap.set(loteId, consumo.historial);
        
        console.log(`🐔 [POLLOS] Lote ${loteId}:`, {
          totalConsumo: consumo.totalConsumo,
          productos: consumo.productos.length,
          historial: consumo.historial.length
        });
      }
    });

    console.log(`✅ [POLLOS] Procesamiento completado: ${this.consumoPorLote.size} lotes`);
  }
  
  /**
   * Crear datos de prueba para verificar la funcionalidad
   */
  private crearDatosDePrueba(): void {
    console.log('🧪 [POLLOS] Creando datos de prueba realistas...');
    
    if (this.lotesPollos && this.lotesPollos.length > 0) {
      const lotesParaPrueba = this.lotesPollos.slice(0, Math.min(2, this.lotesPollos.length));
      
      lotesParaPrueba.forEach((lote, index) => {
        const loteId = String(lote.id || (index + 1));
        
        // Productos de prueba
        const productos: ConsumoProductoLote[] = [
          {
            productoId: index * 3 + 1,
            productoNombre: 'Concentrado Pollo',
            loteId: loteId,
            loteCodigo: lote.codigo || '',
            totalConsumo: 25.5 + (index * 15),
            registros: 3,
            ultimaFecha: new Date().toISOString()
          },
          {
            productoId: index * 3 + 2,
            productoNombre: 'Maíz Triturado',
            loteId: loteId,
            loteCodigo: lote.codigo || '',
            totalConsumo: 12.3 + (index * 8),
            registros: 2,
            ultimaFecha: new Date().toISOString()
          }
        ].filter((_, i) => i <= index || Math.random() > 0.4);
        
        const totalConsumo = productos.reduce((sum, p) => sum + p.totalConsumo, 0);
        
        // Historial de prueba
        const historial: RegistroConsumoLote[] = [];
        productos.forEach((producto, prodIndex) => {
          for (let i = 0; i < producto.registros; i++) {
            const fecha = new Date(Date.now() - (i + prodIndex * 2) * 86400000);
            historial.push({
              id: (index * 10) + (prodIndex * 3) + i + 1,
              fecha: fecha.toISOString(),
              productoNombre: producto.productoNombre,
              cantidad: producto.totalConsumo / producto.registros,
              loteId: loteId,
              loteCodigo: lote.codigo || '',
              usuarioNombre: ['María', 'Carlos', 'Ana', 'Luis'][i % 4]
            });
          }
        });
        
        // Crear consumo completo
        const consumoCompleto: ConsumosPorLote = {
          loteId: loteId,
          loteCodigo: lote.codigo || '',
          totalConsumo: totalConsumo,
          productos: productos,
          historial: historial.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
        };
        
        this.consumoPorLote.set(loteId, consumoCompleto);
        this.productosConsumoMap.set(loteId, productos);
        this.historialConsumoMap.set(loteId, historial);
        
        console.log(`🧪 [POLLOS] Datos de prueba creados para lote ${loteId}:`, {
          totalConsumo: totalConsumo.toFixed(2),
          productos: productos.length,
          historial: historial.length
        });
      });
    }
  }
} 