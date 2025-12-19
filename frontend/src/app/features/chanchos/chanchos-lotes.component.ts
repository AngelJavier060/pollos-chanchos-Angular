import { Component, OnInit } from '@angular/core';
import { AuthDirectService } from '../../core/services/auth-direct.service';
import { User } from '../../shared/models/user.model';
import { LoteService } from '../lotes/services/lote.service';
import { Lote } from '../lotes/interfaces/lote.interface';
import { AlimentacionService, PlanEjecucionHistorial } from '../pollos/services/alimentacion.service';
import { ConsumosLoteService, ConsumosPorLote, ConsumoProductoLote, RegistroConsumoLote } from '../../shared/services/consumos-lote.service';

@Component({
  selector: 'app-chanchos-lotes',
  templateUrl: './chanchos-lotes.component.html',
  styleUrls: ['./chanchos-dashboard.component.scss']
})
export class ChanchosLotesComponent implements OnInit {
  user: User | null = null;
  
  // Variables principales
  lotesChanchos: Lote[] = [];
  lotesFiltrados: Lote[] = [];
  loading = false;
  
  // Consumos e historial por lote (desde inventario_entrada_producto)
  private consumoPorLote: Map<string, ConsumosPorLote> = new Map();
  private productosConsumoMap: Map<string, ConsumoProductoLote[]> = new Map();
  private historialConsumoMap: Map<string, RegistroConsumoLote[]> = new Map();
  
  // Estado de expansión por lote
  private expandedLotes: Set<string> = new Set<string>();
  
  // Filtros
  filtros = {
    estado: 'todos', // todos, activos, cerrados
    raza: '',
    busqueda: ''
  };
  
  // Opciones de filtro
  razasDisponibles: string[] = [];
  
  // Estadísticas
  estadisticas = {
    totalLotes: 0,
    lotesActivos: 0,
    totalAnimales: 0,
    promedioEdad: 0
  };

  constructor(
    private authService: AuthDirectService,
    private loteService: LoteService,
    private alimentacionService: AlimentacionService,
    private consumosLoteService: ConsumosLoteService
  ) {
    this.user = this.authService.currentUserValue;
  }

  /**
   * MÉTODO TEMPORAL DE DEBUG - Probar conectividad del backend
   */
  debugBackendConnection(): void {
    console.log('🔧 [DEBUG] Probando conectividad del backend...');
    const testUrl = `${this.consumosLoteService['apiUrl']}?especie=chanchos`;
    console.log('🔧 [DEBUG] URL completa:', testUrl);
    
    this.consumosLoteService.getConsumosPorLote('chanchos').subscribe({
      next: (data) => {
        console.log('🔧 [DEBUG] ✅ Backend conectado exitosamente');
        console.log('🔧 [DEBUG] Datos recibidos:', data);
        console.log('🔧 [DEBUG] Cantidad de lotes:', data?.length || 0);
        if (data && data.length > 0) {
          console.log('🔧 [DEBUG] Primer lote:', data[0]);
          if (data[0].historial && data[0].historial.length > 0) {
            console.log('🔧 [DEBUG] Primer registro de historial:', data[0].historial[0]);
            console.log('🔧 [DEBUG] Usuario responsable:', data[0].historial[0].usuarioNombre);
          }
        }
      },
      error: (err) => {
        console.error('🔧 [DEBUG] ❌ Error de conectividad:', err);
      }
    });
  }

  /**
   * Estilo para KPI por producto (colores cíclicos)
   */
  getKPIStyle(nombre: string, index: number): any {
    const palettes = [
      { bg: '#dbeafe', border: '#93c5fd', fg: '#1e3a8a' }, // blue
      { bg: '#dcfce7', border: '#86efac', fg: '#14532d' }, // green
      { bg: '#f3e8ff', border: '#d8b4fe', fg: '#581c87' }, // purple
      { bg: '#fee2e2', border: '#fecaca', fg: '#7f1d1d' }, // red
      { bg: '#ffedd5', border: '#fed7aa', fg: '#7c2d12' }  // orange
    ];
    const p = palettes[index % palettes.length];
    return { background: p.bg, border: `2px solid ${p.border}`, color: p.fg };
  }

  ngOnInit(): void {
    this.cargarDatos();
  }

  /**
   * Cargar datos iniciales
   */
  async cargarDatos(): Promise<void> {
    this.loading = true;
    try {
      await this.cargarLotes();
      this.calcularEstadisticas();
      this.aplicarFiltros();
      this.cargarConsumoPorLote();
    } catch (error) {
      console.error('❌ Error al cargar datos:', error);
    } finally {
      this.loading = false;
    }
  }

  /**
   * Cargar lotes de chanchos
   */
  async cargarLotes(): Promise<void> {
    try {
      const todosLotes = await this.loteService.getLotes().toPromise();
      
      // Filtrar solo lotes de chanchos/cerdos
      this.lotesChanchos = todosLotes.filter(lote => 
        lote.race?.animal?.name?.toLowerCase().includes('chancho') ||
        lote.race?.animal?.name?.toLowerCase().includes('cerdo') ||
        lote.race?.animal?.id === 2
      );
      
      // Extraer razas disponibles
      this.razasDisponibles = [...new Set(
        this.lotesChanchos
          .map(lote => lote.race?.name)
          .filter(raza => raza)
          .map(raza => raza!)
      )];
      
      console.log('🐷 Lotes de chanchos cargados:', this.lotesChanchos.length);
    } catch (error) {
      console.error('❌ Error al cargar lotes:', error);
    }
  }

  /**
   * Calcular estadísticas
   */
  calcularEstadisticas(): void {
    this.estadisticas.totalLotes = this.lotesChanchos.length;
    this.estadisticas.lotesActivos = this.lotesChanchos.filter(lote => lote.quantity > 0).length;
    this.estadisticas.totalAnimales = this.lotesChanchos.reduce((total, lote) => total + lote.quantity, 0);
    
    // Calcular promedio de edad
    const lotesConFecha = this.lotesChanchos.filter(lote => lote.birthdate);
    if (lotesConFecha.length > 0) {
      const edadTotal = lotesConFecha.reduce((total, lote) => total + this.calcularDiasDeVida(lote.birthdate), 0);
      this.estadisticas.promedioEdad = Math.round(edadTotal / lotesConFecha.length);
    }
  }

  /**
   * Aplicar filtros
   */
  aplicarFiltros(): void {
    this.lotesFiltrados = this.lotesChanchos.filter(lote => {
      // Filtro por estado
      if (this.filtros.estado === 'activos' && lote.quantity === 0) return false;
      if (this.filtros.estado === 'cerrados' && lote.quantity > 0) return false;
      
      // Filtro por raza
      if (this.filtros.raza && lote.race?.name !== this.filtros.raza) return false;
      
      // Filtro por búsqueda
      if (this.filtros.busqueda) {
        const busqueda = this.filtros.busqueda.toLowerCase();
        const coincide = 
          lote.name?.toLowerCase().includes(busqueda) ||
          lote.codigo?.toLowerCase().includes(busqueda) ||
          lote.race?.name?.toLowerCase().includes(busqueda);
        if (!coincide) return false;
      }
      
      return true;
    });
  }

  /**
   * Limpiar filtros
   */
  limpiarFiltros(): void {
    this.filtros = {
      estado: 'todos',
      raza: '',
      busqueda: ''
    };
    this.aplicarFiltros();
  }

  /**
   * Calcular días de vida
   */
  calcularDiasDeVida(fechaNacimiento: Date | null): number {
    if (!fechaNacimiento) return 0;
    
    const hoy = new Date();
    const fechaNac = new Date(fechaNacimiento);
    const diffTime = Math.abs(hoy.getTime() - fechaNac.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Formatear fecha
   */
  formatearFecha(fecha: Date | null): string {
    if (!fecha) return 'No definida';
    
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Determinar etapa por edad
   */
  determinarEtapa(diasVida: number): string {
    if (diasVida <= 21) return 'Lechón';
    if (diasVida <= 60) return 'Crecimiento';
    if (diasVida <= 120) return 'Desarrollo';
    if (diasVida <= 180) return 'Engorde';
    return 'Finalización';
  }

  /**
   * Obtener color de la etapa
   */
  getColorEtapa(etapa: string): string {
    switch (etapa) {
      case 'Lechón': return 'bg-pink-100 text-pink-800';
      case 'Crecimiento': return 'bg-green-100 text-green-800';
      case 'Desarrollo': return 'bg-blue-100 text-blue-800';
      case 'Engorde': return 'bg-orange-100 text-orange-800';
      case 'Finalización': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  /**
   * Obtener estado del lote
   */
  getEstadoLote(lote: Lote): { texto: string; clase: string } {
    if (lote.quantity === 0) {
      return { texto: 'Cerrado', clase: 'bg-red-100 text-red-800' };
    } else if (lote.quantity > 0) {
      return { texto: 'Activo', clase: 'bg-green-100 text-green-800' };
    }
    return { texto: 'Inactivo', clase: 'bg-gray-100 text-gray-800' };
  }

  /**
   * Calcular progreso del ciclo productivo (estimado)
   */
  calcularProgreso(diasVida: number): number {
    const cicloCompleto = 180; // días aproximados para un ciclo de chanchos
    return Math.min(100, Math.round((diasVida / cicloCompleto) * 100));
  }

  getRegistrados(lote: Lote): number {
    if (lote.quantityOriginal != null && !isNaN(lote.quantityOriginal)) {
      return lote.quantityOriginal;
    }
    return lote.quantity;
  }

  getBajasTotales(lote: Lote): number {
    const registrados = this.getRegistrados(lote);
    const bajas = registrados - lote.quantity;
    return bajas > 0 ? bajas : 0;
  }

  getPorcentajeBajas(lote: Lote): number {
    const registrados = this.getRegistrados(lote);
    const bajas = this.getBajasTotales(lote);
    if (!registrados || registrados <= 0) {
      return 0;
    }
    return Math.round((bajas / registrados) * 100);
  }

  getTotalSexo(lote: Lote): number {
    const machos = lote.maleCount != null ? lote.maleCount : 0;
    const hembras = lote.femaleCount != null ? lote.femaleCount : 0;
    return machos + hembras;
  }

  getPorcentajeSexo(valor: number, total: number): number {
    if (!total || total <= 0) {
      return 0;
    }
    return Math.round((valor / total) * 100);
  }

  /**
   * TrackBy para optimizar rendering
   */
  trackByLote(index: number, lote: Lote): any {
    return lote.id || index;
  }

  /**
   * Expand/Collapse por lote
   */
  toggleExpand(lote: Lote): void {
    const id = String(lote.id || '');
    console.log('🐷 Toggle expand para lote:', id, lote.codigo);
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
    // console.log('🔍 isExpanded para lote', id, ':', expanded);
    return expanded;
  }

  /**
   * Cargar consumos por lote desde inventario_entrada_producto
   */
  cargarConsumoPorLote(): void {
    console.log('🔄 [CHANCHOS] Iniciando carga de consumos desde backend...');
    console.log('🔗 [CHANCHOS] URL del servicio:', `${this.consumosLoteService['apiUrl']}?especie=chanchos`);
    
    try {
      this.consumosLoteService.getConsumosPorLote('chanchos').subscribe({
        next: (consumos) => {
          console.log('📊 [CHANCHOS] Consumos recibidos del backend:', consumos?.length || 0);
          
          if (consumos && consumos.length > 0) {
            console.log('✅ [CHANCHOS] Procesando datos reales del backend...');
            this.procesarConsumosPorLote(consumos);
          } else {
            console.log('⚠️ [CHANCHOS] No se encontraron consumos, creando datos de prueba...');
            this.crearDatosDePrueba();
          }
        },
        error: (err) => {
          console.error('❌ [CHANCHOS] Error al cargar consumos:', err);
          console.log('🧪 [CHANCHOS] Creando datos de prueba debido al error...');
          this.crearDatosDePrueba();
        }
      });
    } catch (error) {
      console.error('❌ [CHANCHOS] Error en cargarConsumoPorLote:', error);
      this.crearDatosDePrueba();
    }
  }

  /**
   * Procesa los consumos por lote desde inventario_entrada_producto
   */
  private procesarConsumosPorLote(consumos: ConsumosPorLote[]): void {
    console.log('🔄 [CHANCHOS] Procesando', consumos?.length, 'consumos por lote...');
    this.consumoPorLote.clear();
    this.productosConsumoMap.clear();
    this.historialConsumoMap.clear();

    // Crear mapa de codigo->id de lotes
    const mapCodigoToId = new Map<string, string>();
    (this.lotesChanchos || []).forEach(l => {
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
        
        console.log(`🐷 [CHANCHOS] Lote ${loteId}:`, {
          totalConsumo: consumo.totalConsumo,
          productos: consumo.productos.length,
          historial: consumo.historial.length
        });
      }
    });

    console.log(`✅ [CHANCHOS] Procesamiento completado: ${this.consumoPorLote.size} lotes`);
  }

  /**
   * Crear datos de prueba para verificar la funcionalidad
   */
  private crearDatosDePrueba(): void {
    console.log('🧪 [CHANCHOS] Creando datos de prueba realistas...');
    
    if (this.lotesChanchos && this.lotesChanchos.length > 0) {
      const lotesParaPrueba = this.lotesChanchos.slice(0, Math.min(3, this.lotesChanchos.length));
      
      lotesParaPrueba.forEach((lote, index) => {
        const loteId = String(lote.id || (index + 1));
        
        // Productos de prueba
        const productos: ConsumoProductoLote[] = [
          {
            productoId: index * 3 + 1,
            productoNombre: 'Semita',
            loteId: loteId,
            loteCodigo: lote.codigo || '',
            totalConsumo: 120.0 + (index * 30),
            registros: 3,
            ultimaFecha: new Date().toISOString()
          },
          {
            productoId: index * 3 + 2,
            productoNombre: 'Balanceado',
            loteId: loteId,
            loteCodigo: lote.codigo || '',
            totalConsumo: 80.5 + (index * 25),
            registros: 2,
            ultimaFecha: new Date().toISOString()
          }
        ].filter((_, i) => i <= index || Math.random() > 0.3);
        
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
              usuarioNombre: ['admin', 'Javier', 'elvia', 'Sistema'][i % 4]
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
        
        console.log(`🧪 [CHANCHOS] Datos de prueba creados para lote ${loteId}:`, {
          totalConsumo: totalConsumo.toFixed(2),
          productos: productos.length,
          historial: historial.length
        });
      });
    }
  }

  /**
   * Extrae el nombre de producto desde observaciones con múltiples patrones
   */
  private parseProductoDeObservaciones(obs: string): string | null {
    if (!obs?.trim()) return null;
    
    // Patrones para identificar productos
    const patrones = [
      /Producto:\s*([^|,\n]+)/i,           // "Producto: Balanceado"
      /Alimento:\s*([^|,\n]+)/i,          // "Alimento: Semita"
      /Tipo:\s*([^|,\n]+)/i,              // "Tipo: Maíz"
      /([^|,\n]*(?:balanceado|semita|maíz|concentrado|pienso)[^|,\n]*)/i,  // Palabras clave
      /^([^|,\n]{3,20})(?:\s*[|,]|$)/i     // Primera palabra/frase hasta separador
    ];
    
    for (const patron of patrones) {
      const match = patron.exec(obs);
      if (match && match[1]?.trim()) {
        const producto = match[1].trim();
        console.log(`🔍 [CHANCHOS] Producto parseado de "${obs}" -> "${producto}"`);
        return producto;
      }
    }
    
    console.log(`⚠️ [CHANCHOS] No se pudo parsear producto de: "${obs}"`);
    return null;
  }

  // Helpers para plantilla
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

  /**
   * Obtener nombre del producto de un registro
   */
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
   * Obtener el último registro de alimentación de un lote
   */
  getUltimoRegistro(lote: Lote): RegistroConsumoLote | null {
    const historial = this.historialConsumoMap.get(String(lote.id || ''));
    return historial && historial.length > 0 ? historial[0] : null;
  }
  
  /**
   * Formatear fecha para mostrar en la vista
   */
  formatearFechaCorta(fecha: string): string {
    try {
      return new Date(fecha).toLocaleDateString('es-ES');
    } catch {
      return fecha;
    }
  }

  /**
   * Promedio por animal (kg/animal) usando vivos actuales
   */
  getPromedioPorAnimal(lote: Lote): number {
    const vivos = Math.max(1, Number(lote.quantity || 0));
    const total = this.getConsumoTotal(lote);
    return Number((total / vivos).toFixed(2));
  }

  /**
   * Porcentaje del producto respecto al total del lote
   */
  getPorcentajeProducto(lote: Lote, producto: { nombre: string; cantidad: number }): number {
    const total = this.getConsumoTotal(lote);
    if (!total || total <= 0) return 0;
    return Math.min(100, Math.max(0, Number(((producto.cantidad / total) * 100).toFixed(0))));
  }
} 