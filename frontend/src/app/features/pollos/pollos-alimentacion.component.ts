import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { LoteService } from '../lotes/services/lote.service';
import { AlimentacionService } from './services/alimentacion.service';
import { PlanNutricionalIntegradoService } from '../../shared/services/plan-nutricional-integrado.service';
import { Lote } from '../lotes/interfaces/lote.interface';
import { environment } from '../../../environments/environment';
import { CausaMortalidad } from './models/mortalidad.model';
import { MortalidadService } from './services/mortalidad.service';
import { InventarioService, RegistroConsumoRequest } from './services/inventario.service';
import { ProductService } from '../../shared/services/product.service';
import { WebsocketService } from '../../shared/services/websocket.service'; // Import WebSocket service
import { MorbilidadBackendService } from '../../shared/services/morbilidad-backend.service';
import { InventarioEntradasService } from '../../shared/services/inventario-entradas.service';

interface RegistroAlimentacionCompleto {
  fecha: string;
  hora: string;
  cantidadAplicada: number;
  tipoAlimento: string;
  animalesVivos: number;
  animalesMuertos: number;
  animalesEnfermos: number;
  fechaVenta: string;
  animalesVendidos: number;
  precioUnitario: number;
  valorTotalVenta: number;
  observacionesVenta: string;
  observacionesSalud: string;
  observacionesGenerales: string;
  loteId: string;
  usuarioId: number;
  stockAnterior: number;
  stockPosterior: number;
  loteCerrado: boolean;
  motivoCierre: string;
  causaMortalidad?: string; // Campo opcional para causa de mortalidad
}

interface ProductoDetalle {
  nombre: string;
  cantidad: number;
  unidad: string;
}

interface EtapaAlimento {
  id: number;
  alimentoRecomendado: string;
  quantityPerAnimal: number;
  unidad: string;
  seleccionado: boolean;
  productosDetalle: ProductoDetalle[];
  // ✅ Nuevos campos para visualizar el sub-rango del plan
  dayStart: number;
  dayEnd: number;
  // ✅ NUEVO: ID real del producto para descontar inventario por producto
  productoId?: number;
}

interface EtapaActual {
  nombre?: string;
  descripcion?: string;
  alimentoRecomendado: string;
  quantityPerAnimal: number;
  diasInicio?: number;
  diasFin?: number;
  productosDetalle: ProductoDetalle[];
}

@Component({
  selector: 'app-pollos-alimentacion',
  templateUrl: './pollos-alimentacion.component.html',
  styleUrls: ['./pollos-dashboard.component.scss']
})
export class PollosAlimentacionComponent implements OnInit {
  // Propiedades básicas
  lotesActivos: Lote[] = [];
  loteSeleccionado: Lote | null = null;
  modalAbierto = false;
  selectedDate = new Date();
  user: any = { id: 1 }; // Usuario temporal
  registroCompleto: RegistroAlimentacionCompleto = this.getRegistroVacio();
  
  // Propiedades requeridas por el template
  loading = false;
  etapasPlanAdministrador: any[] = [];
  
  // ✅ PROPIEDADES CRÍTICAS PARA MOSTRAR ALIMENTOS
  etapasDisponiblesLote: EtapaAlimento[] = [];
  alimentosSeleccionados: EtapaAlimento[] = [];
  etapaActualLote: EtapaActual | null = null;
  planActivoAdministrador: any = null;
  // 🧭 Plan principal detectado para el día actual
  planPrincipalNombre: string | null = null;
  planPrincipalRango: { min: number | null, max: number | null } = { min: null, max: null };

  // ✅ Parámetros Fase 1 (modo rápido): consumo por animal y animales alimentados
  consumoPorAnimalManual: number | null = null; // kg por animal (puede sobreescribir sugerido)
  animalesAlimentadosManual: number | null = null; // cantidad de animales a alimentar (por defecto los vivos del lote)

  // Estadísticas de lotes - Cache para mortalidad
  private estadisticasLotes: Map<string, {
    pollosRegistrados: number;
    pollosVivos: number;
    mortalidadTotal: number;
    porcentajeMortalidad: number;
    tieneDatos: boolean;
  }> = new Map();

  // Propiedades para dropdown de causas de mortalidad
  causasMortalidad: CausaMortalidad[] = [];
  causasMortalidadFiltradas: CausaMortalidad[] = [];
  mostrarDropdownCausas = false;

  // Mapa de mortalidad por lote (para calcular valores reales)
  mortalidadPorLote = new Map<string, number>();

  // Mapa de morbilidad (enfermos activos) por lote
  morbilidadPorLote = new Map<string, number>();

  // Estados de UI
  diagnosticoVisible = false;
  estadoSistema = {
    color: 'text-green-600',
    mensaje: 'Sistema funcionando',
    lotesCargados: 0,
    planEncontrado: true,
    etapasCubiertas: true,
    problemasDetectados: 0
  };

  // Feedback de UI (éxito/error) para el registro con inventario
  uiMessageSuccess: string | null = null;
  uiMessageError: string | null = null;

  // Cache de productos para resolver IDs por nombre
  private productosCache: any[] = [];
  private productoByNameNorm = new Map<string, any>();

  constructor(
    private loteService: LoteService,
    private alimentacionService: AlimentacionService,
    private planNutricionalService: PlanNutricionalIntegradoService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private mortalidadService: MortalidadService,
    private inventarioService: InventarioService,
    private productService: ProductService,
    private websocketService: WebsocketService, // Inject WebSocket service
    private morbilidadBackend: MorbilidadBackendService,
    private invEntradasService: InventarioEntradasService
  ) {}

  ngOnInit(): void {
    console.log('🚀 Iniciando componente PollosAlimentacionComponent');
    this.loading = true;
    this.causasMortalidadFiltradas = [...this.causasMortalidad]; // Inicializar causas filtradas
    this.cargarDatosIniciales();
    this.cargarMortalidadTodosLotes(); // Cargar mortalidad real
    this.cargarCausasMortalidad();
    // Precargar productos para matching local
    this.cargarProductosCache();
  }

  // ✅ Registrar solicitudes de recarga en localStorage para que el Admin lo vea en Inventario
  private async registrarSolicitudesRecarga(faltantes: Array<{ nombre: string; requerido: number; disponible: number }>): Promise<void> {
    try {
      const key = 'pc_recharge_requests';
      const ahora = new Date().toISOString();
      let current: any[] = [];
      try {
        current = JSON.parse(localStorage.getItem(key) || '[]');
      } catch {
        current = [];
      }

      // Intentar resolver productId por nombre para que el admin vea el badge exacto
      for (const f of faltantes) {
        let productId: number | null = null;
        try {
          const lista = await this.productService.getProducts({ name: f.nombre } as any).toPromise();
          const prod = Array.isArray(lista) && lista.length > 0 ? lista[0] : null;
          productId = prod?.id ?? null;
        } catch {}
        const item = {
          productId: productId || undefined,
          name: f.nombre,
          requestedAt: ahora,
          loteCodigo: this.loteSeleccionado?.codigo || String(this.loteSeleccionado?.id || ''),
          cantidadRequerida: Number(f.requerido || 0),
          cantidadDisponible: Number(f.disponible || 0)
        };

        // Upsert por productId o nombre
        const idx = current.findIndex(x => (item.productId && x.productId === item.productId) || (!item.productId && x.name === item.name));
        if (idx >= 0) current[idx] = item; else current.push(item);
      }

      localStorage.setItem(key, JSON.stringify(current));
    } catch (e) {
      console.warn('No se pudo registrar la solicitud de recarga local:', e);
    }
  }

  /**
   * Cargar morbilidad (enfermos activos) de todos los lotes desde el backend
   */
  private async cargarMorbilidadTodosLotes(): Promise<void> {
    try {
      const tareas = this.lotesActivos.map(async (lote) => {
        // El endpoint de morbilidad espera un ID numérico (Long). Usamos dígitos del código del lote.
        const codigo = String(lote.codigo || '');
        const digits = (codigo.match(/\d+/g) || []).join('');
        const loteNum = Number(digits);
        if (!Number.isFinite(loteNum) || loteNum <= 0) {
          this.morbilidadPorLote.set(String(lote.id || ''), 0);
          return;
        }
        try {
          const datos = await this.morbilidadBackend.contarEnfermosPorLote(loteNum).toPromise();
          const activos = Number(datos?.enfermosActivos || 0);
          this.morbilidadPorLote.set(String(lote.id || ''), activos);
        } catch (e) {
          console.warn('No se pudo obtener morbilidad para lote', lote.codigo, e);
          this.morbilidadPorLote.set(String(lote.id || ''), 0);
        }
      });
      await Promise.all(tareas);
      this.cdr.detectChanges();
    } catch (error) {
      console.error('❌ Error al cargar morbilidad:', error);
      this.morbilidadPorLote = new Map();
    }
  }

  /**
   * Obtener morbilidad (enfermos activos) real desde cache cargado
   */
  calcularMorbilidadActual(lote: Lote): number {
    return this.morbilidadPorLote.get(lote.id?.toString() || '') || 0;
  }

  private cargarCausasMortalidad(): void {
    this.mortalidadService.getCausas().subscribe({
      next: (causas) => {
        this.causasMortalidad = causas || [];
        this.causasMortalidadFiltradas = [...this.causasMortalidad];
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error al cargar causas de mortalidad:', error);
      }
    });
  }

  // ================= UTILIDADES DE PLAN PRINCIPAL =================
  private determinarPlanPrincipal(etapas: any[], diasVida: number): { nombre: string, rango?: { min: number, max: number } } | null {
    if (!etapas || etapas.length === 0) return null;
    // 1) Preferir un plan cuyo nombre contenga un rango x-y que incluya diasVida
    for (const e of etapas) {
      const parsed = this.extraerRangoDesdeNombre(e.planNombre);
      if (parsed && diasVida >= parsed.min && diasVida <= parsed.max) {
        return { nombre: e.planNombre, rango: parsed };
      }
    }
    // 2) Si ninguno tiene rango en el nombre, agrupar por planNombre y usar el primero
    const nombre = etapas[0]?.planNombre || null;
    if (nombre) {
      const parsed = this.extraerRangoDesdeNombre(nombre);
      return { nombre, rango: parsed || undefined } as any;
    }
    return null;
  }

  // Resolver productId para un alimento seleccionado
  private async resolverProductoId(al: EtapaAlimento): Promise<number | null> {
    try {
      if (al.productoId && Number.isFinite(Number(al.productoId))) {
        return Number(al.productoId);
      }
      if (!this.productosCache?.length) {
        await this.cargarProductosCache();
      }
      const nombre = (al.alimentoRecomendado || '').toString();
      const norm = this.normalizarTexto(nombre);
      const prod = this.productoByNameNorm.get(norm) || this.productosCache.find(p => this.normalizarTexto(p?.name) === norm);
      const id = prod?.id ?? null;
      if (Number.isFinite(Number(id))) return Number(id);
      // Último intento: consulta remota
      if (al.alimentoRecomendado) {
        const lista = await this.productService.getProducts({ name: al.alimentoRecomendado } as any).toPromise();
        const prodSrv = Array.isArray(lista) && lista.length > 0 ? lista[0] : null;
        const idSrv = prodSrv?.id ?? null;
        return Number.isFinite(Number(idSrv)) ? Number(idSrv) : null;
      }
    } catch {
      // ignorar y devolver null
    }
    return null;
  }

  private extraerRangoDesdeNombre(nombrePlan?: string): { min: number, max: number } | null {
    if (!nombrePlan) return null;
    const fuente = String(nombrePlan).toLowerCase();
    // Soportar: "31-60", "31 – 60", "31 — 60", "31 a 60", "31 al 60"
    const regex = /(\d+)\s*(?:-|–|—|al|a)\s*(\d+)/i;
    const match = fuente.match(regex);
    if (match) {
      const min = Number(match[1]);
      const max = Number(match[2]);
      if (!isNaN(min) && !isNaN(max) && min > 0 && max >= min) return { min, max };
    }
    return null;
  }

  // Métodos básicos requeridos por el template
  mostrarDiagnostico(): void {
    this.diagnosticoVisible = !this.diagnosticoVisible;
  }

  recargarDatos(): void {
    this.cargarDatosIniciales();
  }

  realizarAnalisisCompleto(): void {
    console.log('Análisis completo iniciado');
    this.diagnosticarCargaDeAlimentos();
  }

  getSelectedDateString(): string {
    return this.selectedDate.toISOString().split('T')[0];
  }

  // Formatear código/ID de lote como 'LoteXYZ' usando los últimos 3 dígitos
  formatLoteCodigo(valor: any): string {
    if (valor == null) return 'Lote001';
    const raw = String(valor).trim();
    const digits = (raw.match(/\d+/g) || []).join('');
    const last3 = (digits || '1').slice(-3);
    const num = Number(last3) || 1;
    return `Lote${num.toString().padStart(3, '0')}`;
  }

  updateSelectedDate(event: any): void {
    this.selectedDate = new Date(event.target.value);
  }

  formatearFecha(fecha: Date): string {
    return fecha.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getTotalAnimales(): number {
    return this.lotesActivos.reduce((total, lote) => total + (lote.quantity || 0), 0);
  }

  trackByLote(index: number, lote: Lote): any {
    return lote.id || index;
  }

  /**
   * Obtener la cantidad inicial registrada del lote
   */
  getPollosRegistrados(lote: Lote): number {
    // Si tenemos quantityOriginal, la usamos. Si no, asumimos que quantity es la original por ahora
    return lote.quantityOriginal || lote.quantity || 0;
  }

  /**
   * Calcular la mortalidad total acumulada de un lote
   * Por ahora lo calculamos como diferencia hasta que implementemos la consulta real al backend
   */
  getMortalidadTotal(lote: Lote): number {
    const registrados = this.getPollosRegistrados(lote);
    const vivos = lote.quantity || 0;
    
    // Si no tenemos quantityOriginal, asumimos que no hay mortalidad registrada aún
    if (!lote.quantityOriginal) {
      return 0;
    }
    
    return Math.max(0, registrados - vivos);
  }

  /**
   * Obtener estadísticas completas del lote para mostrar en la tarjeta
   */
  getEstadisticasLote(lote: Lote): {
    pollosRegistrados: number;
    pollosVivos: number;
    mortalidadTotal: number;
    porcentajeMortalidad: number;
    tieneDatos: boolean;
  } {
    // Usar datos del cache si están disponibles
    if (lote.id && this.estadisticasLotes.has(lote.id)) {
      return this.estadisticasLotes.get(lote.id)!;
    }

    // DATOS DE PRUEBA TEMPORALES - Para simular la funcionalidad
    // Esto se puede remover cuando tengas datos reales de backend
    if (lote.codigo === '00002') {
      return {
        pollosRegistrados: 28,
        pollosVivos: lote.quantity || 24,
        mortalidadTotal: 4,
        porcentajeMortalidad: 14.3,
        tieneDatos: true
      };
    }

    // Fallback: calcular localmente
    const pollosRegistrados = lote.quantityOriginal || lote.quantity || 0;
    const pollosVivos = lote.quantity || 0;
    const mortalidadTotal = lote.quantityOriginal ? Math.max(0, pollosRegistrados - pollosVivos) : 0;
    const porcentajeMortalidad = pollosRegistrados > 0 ? (mortalidadTotal / pollosRegistrados) * 100 : 0;
    const tieneDatos = lote.quantityOriginal ? true : false;

    return {
      pollosRegistrados,
      pollosVivos,
      mortalidadTotal,
      porcentajeMortalidad,
      tieneDatos
    };
  }

  async cargarDatosIniciales(): Promise<void> {
    try {
      this.loading = true;
      console.log('🔄 Iniciando carga de datos...');
      
      const lotes = await this.loteService.getLotes().toPromise();
      console.log('📦 Lotes recibidos del servicio:', lotes?.length || 0);
      
      try {
        const activos = await this.loteService.getActivos().toPromise();
        this.lotesActivos = (activos || []).filter(l => l.race?.animal?.name?.toLowerCase().includes('pollo') || l.race?.animal?.id === 1);
      } catch {
        this.lotesActivos = lotes?.filter(lote => 
          (lote.quantity || 0) > 0 && (lote.race?.animal?.name?.toLowerCase().includes('pollo') ||
          lote.race?.animal?.id === 1)
        ) || [];
      }
      
      this.estadoSistema.lotesCargados = this.lotesActivos.length;
      console.log('✅ Datos cargados:', this.lotesActivos.length, 'lotes de pollos');
      
      // ✅ CARGAR ESTADÍSTICAS DE MORTALIDAD PARA CADA LOTE
      await this.cargarEstadisticasLotes();
      // ✅ CARGAR MORBILIDAD (ENFERMOS ACTIVOS) PARA CADA LOTE
      await this.cargarMorbilidadTodosLotes();
      
      console.log('🐔 Lotes activos con estadísticas:', this.lotesActivos);
      
      // Forzar detección de cambios
      this.cdr.detectChanges();
      
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      this.lotesActivos = [];
    } finally {
      this.loading = false;
      console.log('🏁 Carga finalizada. Loading:', this.loading);
      console.log('📊 Estado final - Lotes activos:', this.lotesActivos.length);
      
      // Forzar detección de cambios final
      this.cdr.detectChanges();
    }
  }

  /**
   * Cargar estadísticas de mortalidad para todos los lotes
   */
  private async cargarEstadisticasLotes(): Promise<void> {
    console.log('📊 Cargando estadísticas de mortalidad para los lotes...');
    
    const promesasEstadisticas = this.lotesActivos.map(async (lote) => {
      try {
        // Obtener mortalidad total del backend
        const mortalidadTotal = await this.mortalidadService.contarMortalidadPorLote(String(lote.id)).toPromise() || 0;
        
        const pollosRegistrados = lote.quantityOriginal || lote.quantity || 0;
        const pollosVivos = lote.quantity || 0;
        const porcentajeMortalidad = pollosRegistrados > 0 ? (mortalidadTotal / pollosRegistrados) * 100 : 0;
        const tieneDatos = lote.quantityOriginal ? true : false;

        // Guardar en cache
        this.estadisticasLotes.set(lote.id!, {
          pollosRegistrados,
          pollosVivos,
          mortalidadTotal,
          porcentajeMortalidad,
          tieneDatos
        });

        console.log(`📊 Estadísticas lote ${lote.codigo}:`, {
          pollosRegistrados,
          pollosVivos,
          mortalidadTotal,
          porcentajeMortalidad: porcentajeMortalidad.toFixed(1) + '%'
        });

      } catch (error) {
        console.error(`❌ Error cargando estadísticas para lote ${lote.codigo}:`, error);
        
        // Fallback: usar cálculo local
        const pollosRegistrados = lote.quantityOriginal || lote.quantity || 0;
        const pollosVivos = lote.quantity || 0;
        const mortalidadTotal = lote.quantityOriginal ? Math.max(0, pollosRegistrados - pollosVivos) : 0;
        
        this.estadisticasLotes.set(lote.id!, {
          pollosRegistrados,
          pollosVivos,
          mortalidadTotal,
          porcentajeMortalidad: 0,
          tieneDatos: false
        });
      }
    });

    await Promise.all(promesasEstadisticas);
    console.log('✅ Estadísticas de mortalidad cargadas para todos los lotes');
  }

  abrirModalAlimentacion(lote: Lote): void {
    this.loteSeleccionado = lote;
    this.registroCompleto = this.getRegistroVacio();
    this.registroCompleto.loteId = String(lote.id || '');
    this.registroCompleto.animalesVivos = lote.quantity || 0;
    this.modalAbierto = true;
    
    // Calcular días de vida del lote
    const diasVida = this.calcularDiasDeVida(lote.birthdate);
    console.log('📅 Días de vida del lote:', diasVida);
    
    // 🚨 DEBUG CRÍTICO: Verificar fecha de nacimiento y cálculo de días
    console.log('🚨 DEBUG DETALLADO DEL LOTE:', {
      codigo: lote.codigo,
      fechaNacimiento: lote.birthdate,
      fechaHoy: new Date().toISOString().split('T')[0],
      diasCalculados: diasVida,
      esFechaValida: lote.birthdate ? 'SÍ' : 'NO'
    });
    
    try {
      // ✅ CARGAR PLAN NUTRICIONAL REAL DESDE EL BACKEND
      console.log('🌐 Consultando plan nutricional real desde backend...');
      // Forzar recarga del plan para evitar cache desactualizado
      this.planNutricionalService.forzarRecargaCompleta();
      
      // Hacer la llamada al servicio real para obtener plan nutricional de pollos
      this.planNutricionalService.obtenerPlanActivo('pollos').subscribe({
        next: (planPollos) => {
          console.log('✅ Plan nutricional REAL recibido:', planPollos);
          
          if (planPollos && planPollos.etapas && planPollos.etapas.length > 0) {
            console.log('🎯 Plan de pollo encontrado:', planPollos);
            console.log('🔍 Etapas disponibles:', planPollos.etapas);
            console.log('🔍 Buscando etapa para', diasVida, 'días...');
            
            // 🚨 DEBUG AVANZADO: Mostrar CADA etapa y su rango en detalle
            console.log('🚨 ANÁLISIS DETALLADO DE ETAPAS:');
            planPollos.etapas.forEach((etapa: any, index: number) => {
              const perteneceAEtapa = diasVida >= etapa.diasEdad.min && diasVida <= etapa.diasEdad.max;
              console.log(`  ${index + 1}. ${etapa.nombre}:`);
              console.log(`     - Rango: ${etapa.diasEdad.min} - ${etapa.diasEdad.max} días`);
              console.log(`     - Días del lote: ${diasVida}`);
              console.log(`     - ¿Pertenece?: ${perteneceAEtapa ? '✅ SÍ' : '❌ NO'}`);
              console.log(`     - Producto: ${etapa.producto?.name || etapa.tipoAlimento}`);
            });
            
            // ✅ Buscar todas las etapas que corresponden al día actual (para diagnóstico)
            const etapasCorrespondientes = planPollos.etapas.filter((etapa: any) => {
              const min = Number(etapa?.diasEdad?.min);
              const max = Number(etapa?.diasEdad?.max);
              return Number.isFinite(min) && Number.isFinite(max) && diasVida >= min && diasVida <= max;
            });
            
            console.log(`🔍 TODAS las etapas encontradas para ${diasVida} días:`, etapasCorrespondientes);
            console.log(`📊 Cantidad de etapas encontradas: ${etapasCorrespondientes.length}`);
            
            // 🚨 DEBUG: Si no se encuentran etapas, mostrar todas las etapas disponibles
            if (!etapasCorrespondientes || etapasCorrespondientes.length === 0) {
              console.error('❌ NO SE ENCONTRÓ ETAPA CORRESPONDIENTE');
              console.error('🔍 Días buscados:', diasVida);
              console.error('🔍 Etapas disponibles:');
              planPollos.etapas.forEach((etapa: any, index: number) => {
                console.error(`  ${index + 1}. ${etapa.nombre} (${etapa.diasEdad.min} - ${etapa.diasEdad.max} días)`);
              });
              
              // 🚨 ANÁLISIS DE GAPS: Buscar qué rangos no están cubiertos
              console.error('🚨 ANÁLISIS DE GAPS EN RANGOS:');
              console.error(`  - Lote necesita: ${diasVida} días`);
              const rangoMinimo = Math.min(...planPollos.etapas.map((e: any) => e.diasEdad.min));
              const rangoMaximo = Math.max(...planPollos.etapas.map((e: any) => e.diasEdad.max));
              console.error(`  - Rango cubierto por etapas: ${rangoMinimo} - ${rangoMaximo} días`);
              if (diasVida < rangoMinimo) {
                console.error(`  - 🚨 PROBLEMA: Lote es MUY JOVEN (necesita etapa para ${diasVida} días)`);
              } else if (diasVida > rangoMaximo) {
                console.error(`  - 🚨 PROBLEMA: Lote es MUY VIEJO (necesita etapa para ${diasVida} días)`);
              } else {
                console.error(`  - 🚨 PROBLEMA: HAY GAP EN RANGOS (falta etapa para ${diasVida} días)`);
              }
            }
            
            // ✅ VALIDAR QUE EXISTAN ETAPAS ANTES DE PROCESAR
            if (etapasCorrespondientes && etapasCorrespondientes.length > 0) {
              console.log(`✅ Procesando ${etapasCorrespondientes.length} etapas para ${diasVida} días`);
              
              // 🚨 DEBUG: Verificar los rangos que llegan del backend
              etapasCorrespondientes.forEach((etapa, index) => {
                console.log(`🚨 ETAPA ${index + 1} RANGOS DEL BACKEND:`, {
                  nombre: etapa.nombre,
                  producto: etapa.producto?.name || etapa.tipoAlimento,
                  cantidad: etapa.quantityPerAnimal,
                  diasEdadMin: etapa.diasEdad?.min,
                  diasEdadMax: etapa.diasEdad?.max,
                  rangoCompleto: `${etapa.diasEdad?.min} - ${etapa.diasEdad?.max} días`
                });
              });
              
              // 🧭 DETERMINAR PLAN PRINCIPAL SEGÚN NOMBRE CON RANGO QUE CONTENGA LA EDAD (buscar en TODAS las etapas)
              const planPrincipal = this.determinarPlanPrincipal(planPollos.etapas, diasVida);
              this.planPrincipalNombre = planPrincipal?.nombre || (etapasCorrespondientes[0]?.planNombre || null);
              this.planPrincipalRango = {
                min: planPrincipal?.rango?.min ?? null,
                max: planPrincipal?.rango?.max ?? null
              };
              console.log('🧭 Plan principal detectado:', this.planPrincipalNombre, this.planPrincipalRango);

              // Filtrar sub-etapas por rango principal detectado (min-max) SIN limitar al día actual
              let etapasDelPlanPrincipal: any[] = [];
              if (this.planPrincipalRango.min != null && this.planPrincipalRango.max != null) {
                const minP = this.planPrincipalRango.min as number;
                const maxP = this.planPrincipalRango.max as number;
                etapasDelPlanPrincipal = planPollos.etapas.filter((e: any) => {
                  const r = this.extraerRangoDesdeNombre(e.planNombre);
                  // Preferir emparejar por rango del nombre del plan
                  if (r) return r.min === minP && r.max === maxP;
                  // Si no hay rango en el nombre del plan, al menos exigir que la sub-etapa esté contenida en el rango
                  return e.diasEdad?.min >= minP && e.diasEdad?.max <= maxP;
                });

                // 🔁 Fallback de robustez: si por inconsistencias de nombre se perdió alguna sub-etapa del rango, unir con todas las sub-etapas contenidas
                const candidatasPorRango = planPollos.etapas.filter((e: any) => e.diasEdad?.min >= minP && e.diasEdad?.max <= maxP);
                const unicas: any[] = [];
                const vistos = new Set<number | string>();
                [...etapasDelPlanPrincipal, ...candidatasPorRango].forEach((e: any) => {
                  const key = e.id ?? `${e.producto?.id}-${e.diasEdad?.min}-${e.diasEdad?.max}`;
                  if (!vistos.has(key)) {
                    vistos.add(key);
                    unicas.push(e);
                  }
                });
                etapasDelPlanPrincipal = unicas;
              } else if (this.planPrincipalNombre) {
                // Fallback: agrupar por nombre exacto del plan si no pudimos extraer rango
                etapasDelPlanPrincipal = planPollos.etapas.filter((e: any) => e.planNombre === this.planPrincipalNombre);
              } else {
                // Último fallback: usar solo las etapas correspondientes al día actual
                etapasDelPlanPrincipal = etapasCorrespondientes;
              }
              console.log('📋 Sub-etapas del plan principal:', etapasDelPlanPrincipal);

              // ✅ CREAR TODAS LAS OPCIONES DE ALIMENTOS DISPONIBLES SOLO DEL PLAN PRINCIPAL
              // Ordenar por rango
              const etapasOrdenadas = [...etapasDelPlanPrincipal].sort((a: any, b: any) => {
                if (a.diasEdad?.min !== b.diasEdad?.min) return (a.diasEdad?.min || 0) - (b.diasEdad?.min || 0);
                return (a.diasEdad?.max || 0) - (b.diasEdad?.max || 0);
              });

              this.etapasDisponiblesLote = etapasOrdenadas.map((etapa, index) => ({
                id: index + 1,
                alimentoRecomendado: etapa.producto?.name || etapa.tipoAlimento,
                quantityPerAnimal: parseFloat((etapa.quantityPerAnimal || (etapa.consumoDiario.min / 1000)).toFixed(2)), // ✅ FORMATO X.XX
                unidad: 'kg',
                // ✅ Seleccionar por defecto TODAS las opciones disponibles del plan principal
                seleccionado: true,
                productosDetalle: [
                  {
                    nombre: etapa.producto?.name || etapa.tipoAlimento,
                    cantidad: parseFloat((etapa.quantityPerAnimal || (etapa.consumoDiario.min / 1000)).toFixed(2)), // ✅ FORMATO X.XX
                    unidad: 'kg'
                  }
                ],
                // ✅ Sub-rango visual
                dayStart: etapa.diasEdad?.min,
                dayEnd: etapa.diasEdad?.max,
                // ✅ ID real del producto para inventario
                productoId: etapa.producto?.id
              }));
              
              // ✅ CONFIGURAR ETAPA ACTUAL CON INFORMACIÓN COMBINADA
              const etapaActual = etapasOrdenadas.find((e: any) => {
                const min = Number(e?.diasEdad?.min);
                const max = Number(e?.diasEdad?.max);
                return Number.isFinite(min) && Number.isFinite(max) && diasVida >= min && diasVida <= max;
              }) || etapasOrdenadas[0];
              const todasLasEtapas = etapasOrdenadas.map(etapa => ({
                nombre: etapa.producto?.name || etapa.tipoAlimento,
                cantidad: parseFloat((etapa.quantityPerAnimal || (etapa.consumoDiario.min / 1000)).toFixed(2)), // ✅ FORMATO X.XX
                unidad: 'kg'
              }));
              
              this.etapaActualLote = {
                nombre: `Etapa ${etapaActual.diasEdad.min}-${etapaActual.diasEdad.max} días` + (this.planPrincipalNombre ? ` • ${this.planPrincipalNombre}` : ''),
                descripcion: `${etapasOrdenadas.length} opciones de alimentación disponibles`,
                alimentoRecomendado: `${etapasOrdenadas.length} opciones: ${etapasOrdenadas.map(e => e.producto?.name || e.tipoAlimento).join(', ')}`,
                quantityPerAnimal: parseFloat((etapaActual.quantityPerAnimal || (etapaActual.consumoDiario.min / 1000)).toFixed(2)), // ✅ FORMATO X.XX
                diasInicio: etapaActual.diasEdad.min,
                diasFin: etapaActual.diasEdad.max,
                productosDetalle: todasLasEtapas
              };
              
              console.log('✅ TODAS las etapas REALES configuradas:', this.etapaActualLote);
              console.log('✅ TODOS los alimentos REALES cargados:', this.etapasDisponiblesLote);
              
            } else {
              console.warn(`⚠️ No se encontró etapa para ${diasVida} días en los planes del administrador.`);
              this.etapasDisponiblesLote = [];
              this.etapaActualLote = null;
              this.uiMessageError = `No hay etapas configuradas para ${diasVida} días. Configure los rangos en Admin > Plan Nutricional > Etapas.`;
            }
            
            // Actualizar alimentos seleccionados
            this.actualizarAlimentosSeleccionados();
            
            // ✅ FORZAR DETECCIÓN DE CAMBIOS
            this.cdr.detectChanges();
            console.log('🔄 Detección de cambios forzada');
            
          } else {
            console.warn('⚠️ No se encontró plan nutricional activo para pollos.');
            this.etapasDisponiblesLote = [];
            this.etapaActualLote = null;
            this.uiMessageError = 'No existe un plan de alimentación activo para pollos. Configure uno en Admin > Plan Nutricional.';
          }
        },
        error: (error) => {
          console.error('❌ Error al cargar plan nutricional:', error);
          this.etapasDisponiblesLote = [];
          this.etapaActualLote = null;
          this.uiMessageError = 'Ocurrió un error al cargar el plan de alimentación. Intente nuevamente o verifique la configuración en Admin.';
        }
      });
      
    } catch (error) {
      console.error('❌ Error crítico al cargar alimentos:', error);
      this.etapasDisponiblesLote = [];
      this.etapaActualLote = null;
      this.uiMessageError = 'Error crítico al cargar el plan de alimentación. Verifique la configuración en Admin.';
    }
  }

  // ✅ FUNCIÓN FALTANTE - ACTUALIZAR ALIMENTOS SELECCIONADOS
  actualizarAlimentosSeleccionados(): void {
    console.log('🔄 Actualizando alimentos seleccionados...');
    console.log('📋 Etapas disponibles:', this.etapasDisponiblesLote);
    console.log('✅ Etapas marcadas como seleccionadas:', this.etapasDisponiblesLote.filter(e => e.seleccionado));
    
    this.alimentosSeleccionados = this.etapasDisponiblesLote.filter(etapa => etapa.seleccionado);
    
    console.log('🍽️ Cantidad de alimentos seleccionados:', this.alimentosSeleccionados.length);
    console.log('🚨 ALIMENTOS SELECCIONADOS DETALLADOS:');
    this.alimentosSeleccionados.forEach((alimento, index) => {
      console.log(`  ${index + 1}. ${alimento.alimentoRecomendado} - ${alimento.quantityPerAnimal} kg`);
    });
    
    // ✅ FORZAR DETECCIÓN DE CAMBIOS
    this.cdr.detectChanges();
  }

  // ✅ FUNCIÓN FALTANTE - REMOVER ALIMENTO
  removerAlimento(nombreAlimento: string): void {
    const etapa = this.etapasDisponiblesLote.find(e => e.alimentoRecomendado === nombreAlimento);
    if (etapa) {
      etapa.seleccionado = false;
      this.actualizarAlimentosSeleccionados();
    }
  }

  // ✅ Resolver el tipo de alimento (TypeFood.id) para un alimento seleccionado
  private async resolverTipoAlimentoId(al: EtapaAlimento): Promise<number | null> {
    try {
      if (al.productoId) {
        const prod = await this.productService.getProductById(al.productoId).toPromise();
        const id = prod?.typeFood?.id || (prod as any)?.typeFood_id || null;
        return Number.isFinite(Number(id)) ? Number(id) : null;
      }
      if (al.alimentoRecomendado) {
        const lista = await this.productService.getProducts({ name: al.alimentoRecomendado } as any).toPromise();
        const prod = Array.isArray(lista) && lista.length > 0 ? lista[0] : null;
        const id = prod?.typeFood?.id || (prod as any)?.typeFood_id || null;
        return Number.isFinite(Number(id)) ? Number(id) : null;
      }
    } catch {
      // ignorar y devolver null
    }
    return null;
  }

  // ✅ Validar stock disponible antes de registrar alimentación
  private async validarStockAntesDeRegistrar(): Promise<{ ok: boolean; faltantes: Array<{ nombre: string; requerido: number; disponible: number }> }> {
    const faltantes: Array<{ nombre: string; requerido: number; disponible: number }> = [];
    const animales = this.loteSeleccionado?.quantity || 0;

    // Asegurar cache de productos (para matching por nombre)
    if (!this.productosCache?.length) {
      await this.cargarProductosCache();
    }

    // Obtener stock válido por PRODUCTO (entradas vigentes)
    let stockValido: Record<string, number> = {};
    try {
      stockValido = await this.invEntradasService.stockValidoAgrupado().toPromise() || {};
    } catch {
      stockValido = {};
    }
    console.log('🔎 stockValidoAgrupado keys:', Object.keys(stockValido || {}));

    // Demanda por PRODUCTO (puede haber múltiples candidatos por nombre)
    const demandaPorProducto = new Map<number, { requerido: number; nombre: string }>();
    const demandaPorGrupoNombre: Array<{ nombre: string; requerido: number; pids: number[]; tipoId: number | null }> = [];

    const candidatosPorNombre = (nombre: string): any[] => {
      const n = this.normalizarTexto(nombre);
      const exactos = (this.productosCache || []).filter(p => this.normalizarTexto(p?.name) === n);
      if (exactos.length > 0) {
        console.log('🔍 candidatos exactos para', nombre, '=>', exactos.map(x => ({ id: x?.id, name: x?.name })));
        return exactos;
      }
      const todos = (this.productosCache || []);
      const parciales = todos.filter(p => {
        const pn = this.normalizarTexto(p?.name);
        return pn.includes(n) || n.includes(pn);
      });
      console.log('🔍 candidatos parciales para', nombre, '=>', parciales.map(x => ({ id: x?.id, name: x?.name })));
      return parciales;
    };

    for (const al of this.alimentosSeleccionados) {
      const qty = parseFloat(((al.quantityPerAnimal || 0) * animales).toFixed(3));
      if (Number.isFinite(Number(al.productoId))) {
        const pid = Number(al.productoId);
        const prev = demandaPorProducto.get(pid);
        demandaPorProducto.set(pid, { requerido: (prev?.requerido || 0) + qty, nombre: al.alimentoRecomendado });
      } else {
        const candidatos = candidatosPorNombre(al.alimentoRecomendado);
        if (candidatos.length > 0) {
          const pids = candidatos.map(c => Number(c?.id)).filter(id => Number.isFinite(id)) as number[];
          demandaPorGrupoNombre.push({ nombre: al.alimentoRecomendado, requerido: qty, pids, tipoId: await this.resolverTipoAlimentoId(al) });
        } else {
          // Fallback por tipo si no hay candidatos por nombre
          const tipoId = await this.resolverTipoAlimentoId(al);
          demandaPorGrupoNombre.push({ nombre: al.alimentoRecomendado, requerido: qty, pids: [], tipoId: Number.isFinite(Number(tipoId)) ? Number(tipoId) : null });
        }
      }
    }

    // Mapa productos por tipo (para fallback)
    const productosByType = new Map<number, number[]>();
    for (const p of this.productosCache) {
      const tfid = Number(p?.typeFood?.id || (p as any)?.typeFood_id);
      const pid = Number(p?.id);
      if (!Number.isFinite(tfid) || !Number.isFinite(pid)) continue;
      const arr = productosByType.get(tfid) || [];
      arr.push(pid);
      productosByType.set(tfid, arr);
    }

    // Validar por producto (ids explícitos del plan)
    for (const [pid, info] of demandaPorProducto.entries()) {
      let disponible = Number(stockValido[String(pid)] || 0);
      if (disponible <= 0) {
        // Fallback: consultar entradas por producto y sumar stockBaseRestante
        try {
          const entradas = await this.invEntradasService.listarPorProducto(pid).toPromise();
          const total = (entradas || []).reduce((sum, e: any) => sum + Number(e?.stockBaseRestante || 0), 0);
          if (Number.isFinite(total)) disponible = total;
          console.log(`🔁 Fallback entradas[pid=${pid}] total=`, total);
        } catch (e) {
          console.warn('No se pudo consultar entradas para pid', pid, e);
        }
      }
      if (info.requerido > disponible + 1e-6) {
        faltantes.push({ nombre: info.nombre, requerido: info.requerido, disponible });
      }
    }

    // Validar por grupo de nombre (sumando todos los candidatos por nombre)
    if (demandaPorGrupoNombre.length > 0) {
      // Precalcular stock por tipo (desde stock válido) para fallbacks
      const stockPorTipo = new Map<number, number>();
      for (const [tfid, pids] of productosByType.entries()) {
        const total = (pids || []).reduce((sum, id) => sum + Number(stockValido[String(id)] || 0), 0);
        stockPorTipo.set(tfid, total);
      }
      for (const item of demandaPorGrupoNombre) {
        // Sumar disponible sobre todos los candidatos por nombre
        let disp = (item.pids || []).reduce((sum, id) => sum + Number(stockValido[String(id)] || 0), 0);
        if (disp <= 0) {
          // Fallback: entradas por cada candidato
          try {
            let total = 0;
            for (const pid of (item.pids || [])) {
              const entradas = await this.invEntradasService.listarPorProducto(pid).toPromise();
              total += (entradas || []).reduce((s, e: any) => s + Number(e?.stockBaseRestante || 0), 0);
            }
            disp = total;
            console.log(`🔁 Fallback nombre='${item.nombre}' totalEntradas=`, total);
          } catch {}
        }
        if (disp <= 0 && item.tipoId != null) {
          // Último recurso: por tipo (stock válido sumado de todos los productos del tipo)
          let totalTipo = Number(stockPorTipo.get(item.tipoId) || 0);
          if (totalTipo <= 0) {
            try {
              const pids = productosByType.get(item.tipoId) || [];
              totalTipo = 0;
              for (const pid of pids) {
                const entradas = await this.invEntradasService.listarPorProducto(pid).toPromise();
                totalTipo += (entradas || []).reduce((s, e: any) => s + Number(e?.stockBaseRestante || 0), 0);
              }
              console.log(`🔁 Fallback tipoId=${item.tipoId} totalEntradas=`, totalTipo);
            } catch {}
          }
          disp = totalTipo;
        }
        if (item.requerido > disp + 1e-6) {
          faltantes.push({ nombre: item.nombre, requerido: item.requerido, disponible: disp });
        }
      }
    }

    // Log detallado del resultado
    console.log('🧪 Validación stock - faltantes:', faltantes);

    return { ok: faltantes.length === 0, faltantes };
  }

  private normalizarTexto(v: any): string {
    return (v ?? '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  private async cargarProductosCache(): Promise<void> {
    try {
      const lista = await this.productService.getProducts({} as any).toPromise();
      this.productosCache = Array.isArray(lista) ? lista : [];
      this.productoByNameNorm.clear();
      for (const p of this.productosCache) {
        const key = this.normalizarTexto(p?.name);
        if (key) this.productoByNameNorm.set(key, p);
      }
    } catch {
      this.productosCache = [];
      this.productoByNameNorm.clear();
    }
  }

  async registrarAlimentacionCompleta(): Promise<void> {
    try {
      console.log('🚀 Registrando alimentación con deducción automática de inventario...');

      // Validaciones básicas
      if (!this.loteSeleccionado) {
        alert('❌ No se ha seleccionado un lote');
        return;
      }

      // ✅ Validar stock antes de continuar
      const validacion = await this.validarStockAntesDeRegistrar();
      if (!validacion.ok) {
        const detalle = validacion.faltantes
          .map(f => `• ${f.nombre}: requerido ${f.requerido.toFixed(2)} kg, disponible ${f.disponible.toFixed(2)} kg`)
          .join('\n');
        // Registrar la solicitud de recarga para que el administrador la vea en Inventario
        await this.registrarSolicitudesRecarga(validacion.faltantes);
        this.uiMessageError = `❌ No hay suficiente stock para completar el registro.\n\n${detalle}\n\n` +
          `Se notificó al administrador para recargar los productos. ` +
          `Por favor, vuelva a intentar cuando el stock esté disponible.`;
        this.uiMessageSuccess = null;
        // Permanecer en la misma página sin redirección
        return;
      }

      // ✅ Hacer opcional mortalidad/enfermedad y auto-calcular consumo desde selección
      const totalSeleccionado = this.getCantidadTotalAlimentosSeleccionados();
      if (this.registroCompleto.cantidadAplicada == null || this.registroCompleto.cantidadAplicada <= 0) {
        if (totalSeleccionado > 0) {
          this.registroCompleto.cantidadAplicada = totalSeleccionado;
          console.log(`🔄 Cantidad aplicada autocalculada desde selección: ${totalSeleccionado} kg`);
        }
      }
      // Si aún no hay consumo ni mortalidad ni enfermedad, permitir continuar opcionalmente
      if ((this.registroCompleto.cantidadAplicada == null || this.registroCompleto.cantidadAplicada <= 0) &&
          (this.registroCompleto.animalesMuertos == null || this.registroCompleto.animalesMuertos <= 0) &&
          (this.registroCompleto.animalesEnfermos == null || this.registroCompleto.animalesEnfermos <= 0)) {
        const continuar = confirm('ℹ️ No se registrará consumo ni mortalidad/enfermedad para este lote. ¿Desea continuar de todas formas?');
        if (!continuar) return;
      }

      // Confirmación
      const mensajeConfirmacion = (this.registroCompleto.cantidadAplicada > 0)
        ? `¿Confirmar registro de ${this.registroCompleto.cantidadAplicada} kg (total de seleccionados) para el lote ${this.loteSeleccionado.codigo}?\n\n` +
          `✅ Se deducirá automáticamente del inventario por cada producto seleccionado.`
        : `¿Confirmar registro sin consumo de alimento para el lote ${this.loteSeleccionado.codigo}?\n\n` +
          `🐔 Se registrará mortalidad/enfermedad solo si fue indicada.`;
      const confirmar = confirm(mensajeConfirmacion);
      if (!confirmar) return;

      // Si no hay consumo de alimento pero sí hay mortalidad, registrar solo mortalidad
      if ((this.registroCompleto.cantidadAplicada == null || this.registroCompleto.cantidadAplicada <= 0) &&
          (this.registroCompleto.animalesMuertos != null && this.registroCompleto.animalesMuertos > 0)) {
        try {
          this.loading = true;
          if (!this.registroCompleto.causaMortalidad) {
            this.registroCompleto.causaMortalidad = 'Causa Desconocida';
          }
          await this.registrarMortalidadAutomatica();
        } catch (e) {
          console.error('❌ Error en flujo de solo mortalidad:', e);
          alert('❌ Ocurrió un error al registrar la mortalidad. Intente nuevamente.');
        } finally {
          this.loading = false;
        }
        return;
      }

      this.loading = true;

      // ✅ Delegar deducción a backend (consumo automático por nombre de producto del plan activo)
      const datosRegistro = {
        loteId: String(this.loteSeleccionado.id || this.loteSeleccionado.codigo || ''),
        fecha: this.registroCompleto.fecha,
        cantidadAplicada: this.registroCompleto.cantidadAplicada || 0,
        animalesVivos: this.registroCompleto.animalesVivos,
        animalesMuertos: this.registroCompleto.animalesMuertos,
        observaciones: this.registroCompleto.observacionesGenerales || ''
      };

      console.log('📤 Enviando registro de alimentación al backend (consumo automático):', datosRegistro);
      const responseAlimentacion = await this.alimentacionService.registrarAlimentacion(datosRegistro).toPromise();

      if (responseAlimentacion) {
        // ❗ No ajustar cantidad local de animales vivos; el backend actualiza tras registrar mortalidad.
        // ✅ DESCONTAR INVENTARIO: por cada alimento seleccionado llamamos al endpoint oficial
        //    /api/plan-alimentacion/registrar-consumo para que descuente en inventario_alimentos
        //    y sincronice a inventario_producto. Se calcula la cantidad por alimento.
        try {
          const loteIdStr = String(this.loteSeleccionado.id || this.loteSeleccionado.codigo || '');
          const llamadas = this.alimentosSeleccionados.map(async (al) => {
            // Cantidad por este alimento = cantidadPorAnimal * animales del lote
            const cantidad = parseFloat(((al.quantityPerAnimal || 0) * (this.loteSeleccionado?.quantity || 0)).toFixed(3));
            if (cantidad <= 0) return null;

            // Obtener producto para extraer typeFoodId (si tenemos productoId es directo)
            let tipoAlimentoId: number | null = null;
            let productId: number | null = al.productoId || null;
            if (productId) {
              try {
                const prod = await this.productService.getProductById(productId).toPromise();
                tipoAlimentoId = prod?.typeFood?.id || (prod as any)?.typeFood_id || null;
                // Asegurar que mantenemos el productId correcto por seguridad
                productId = prod?.id ?? productId;
              } catch (e) {
                console.warn('⚠️ No se pudo obtener product por ID', al.productoId, e);
              }
            }

            // Fallback: buscar por nombre si no tuvimos productoId o fallo anterior
            if (!tipoAlimentoId && al.alimentoRecomendado) {
              try {
                const lista = await this.productService.getProducts({ name: al.alimentoRecomendado } as any).toPromise();
                const prod = Array.isArray(lista) && lista.length > 0 ? lista[0] : null;
                tipoAlimentoId = prod?.typeFood?.id || (prod as any)?.typeFood_id || null;
                // Si logramos resolver un producto único por nombre, usar su id para que la
                // disminución en Admin/Inventario sea por producto y no solo por tipo.
                if (prod?.id != null) {
                  productId = prod.id;
                }
              } catch (e) {
                console.warn('⚠️ No se pudo buscar producto por nombre', al.alimentoRecomendado, e);
              }
            }

            const payload: any = {
              loteId: loteIdStr,
              cantidadKg: cantidad,
              observaciones: `Alimentación diaria - ${al.alimentoRecomendado}`,
              // ✅ Enviar nombre del producto (backend normaliza y resuelve Product correcto)
              nombreProducto: al.alimentoRecomendado
            };
            // Priorizar consumo estricto por PRODUCTO cuando está disponible
            if (productId) {
              payload.productId = productId;
            }
            const tipoNum = Number(tipoAlimentoId);
            if (Number.isFinite(tipoNum)) {
              payload.tipoAlimentoId = tipoNum;
            }
            // ⚠️ Guard: permitir llamada si tenemos nombreProducto o tipoAlimentoId
            if ((!payload.nombreProducto || payload.nombreProducto.trim() === '') &&
                (payload.tipoAlimentoId === undefined || payload.tipoAlimentoId === null)) {
              console.warn('⏭️ Saltando consumo: falta nombreProducto y tipoAlimentoId para', al);
              return null;
            }
            console.log('📦 Registrando consumo en inventario:', payload);
            try {
              const resp: any = await this.inventarioService.registrarConsumoAlimento(payload).toPromise();
              return { alimento: al.alimentoRecomendado, solicitado: cantidad, resp };
            } catch (err: any) {
              console.error('❌ Error registrando consumo para', al.alimentoRecomendado, err);
              return { alimento: al.alimentoRecomendado, solicitado: cantidad, error: err };
            }
          });
          const respuestas: any[] = (await Promise.all(llamadas))?.filter(Boolean) as any[];
          console.log('✅ Resultados de consumos:', respuestas);

          let totalSolicitado = 0, totalConsumido = 0, totalPendiente = 0, parciales = 0, errores = 0;
          const detalleLineas: string[] = [];
          respuestas.forEach(r => {
            totalSolicitado += Number(r?.solicitado || 0);
            const res: any = r?.resp || {};
            const consumida = Number(res?.cantidadConsumida ?? 0);
            const pendiente = Number(res?.cantidadPendiente ?? 0);
            const bloqueoVenc = Boolean(res?.bloqueoPorVencido);
            const ok = res?.success === true && pendiente === 0 && !bloqueoVenc;
            const parcial = res?.success === true && pendiente > 0;
            const sinStock = res?.success === false && String(res?.error || '').toLowerCase().includes('stock insuficiente');
            const huboError = Boolean(r?.error) || (res?.success === false && !sinStock && !bloqueoVenc);
            let estado = 'OK';
            if (bloqueoVenc) estado = 'VENCIDO';
            else if (parcial) estado = 'PARCIAL';
            else if (sinStock) estado = 'SIN STOCK';
            else if (!ok) estado = 'ERROR';
            let extra = '';
            if (bloqueoVenc) extra = 'Stock vencido. Registre una entrada vigente.';
            else if (parcial) extra = `Consumo parcial. Pendiente ${pendiente.toFixed(2)} kg.`;
            else if (sinStock) extra = 'No hay stock disponible.';
            else if (huboError) extra = String(res?.error || 'Error desconocido');
            detalleLineas.push(`${r?.alimento || 'Alimento'}: ${estado}${extra ? ` — ${extra}` : ''}`);
            if (r?.error || res?.success === false) errores++;
            if (pendiente > 0) parciales++;
            totalConsumido += consumida;
            totalPendiente += pendiente;
          });

          (this as any)._resumenConsumo = { totalSolicitado, totalConsumido, totalPendiente, parciales, errores, detalleLineas };
          console.log('📊 Resumen consumo:', (this as any)._resumenConsumo);
        } catch (e) {
          console.error('❌ Error descontando inventario por alimento(s):', e);
          // Continuamos sin bloquear el flujo de la UI
        }

        // ✅ Mensaje de éxito (en banner, sin alert())
        const resumen = (this as any)._resumenConsumo || null;
        let mensaje = `✅ Alimentación registrada exitosamente!\n\n`;
        if (resumen) {
          const { totalSolicitado, totalConsumido, totalPendiente, parciales, errores } = resumen;
          mensaje += `📦 Inventario: solicitado=${totalSolicitado.toFixed(2)} kg, consumido=${totalConsumido.toFixed(2)} kg`;
          if (totalPendiente > 0) {
            mensaje += `, pendiente=${totalPendiente.toFixed(2)} kg`;
          }
          if (parciales > 0 || errores > 0) {
            mensaje += `\n⚠️ Consumo parcial en ${parciales} items` + (errores > 0 ? `, errores=${errores}` : '');
            mensaje += `\n💡 Sugerencia: reponga stock (Movimiento: ENTRADA) y vuelva a intentar.`;
          }
          mensaje += `\n`;
          if (Array.isArray(resumen?.detalleLineas) && resumen.detalleLineas.length > 0) {
            mensaje += `\nDetalle por alimento:\n` + resumen.detalleLineas.map((l: string) => `• ${l}`).join('\n') + `\n`;
          }
        } else {
          mensaje += `📦 Inventario actualizado (alimentos seleccionados descontados).\n`;
        }
        if (this.registroCompleto.animalesMuertos > 0) {
          mensaje += `\n🐔 Animales vivos actualizados: ${this.loteSeleccionado.quantity}`;
        }
        this.uiMessageSuccess = mensaje;
        this.uiMessageError = null;

        // WebSocket notification after successful consumption registration
        this.websocketService.sendMessage('/topic/inventory-update', 'Inventory changed due to consumption in lote ' + this.loteSeleccionado?.codigo);

        if (this.registroCompleto.animalesMuertos > 0) {
          if (!this.registroCompleto.causaMortalidad) {
            this.registroCompleto.causaMortalidad = 'Causa Desconocida';
          }
          await this.registrarMortalidadAutomatica();
        } else if (this.registroCompleto.animalesEnfermos > 0) {
          this.router.navigate(['/pollos/morbilidad'], { queryParams: { loteId: this.loteSeleccionado.id, cantidad: this.registroCompleto.animalesEnfermos } });
        } else {
          this.cerrarModal();
          await this.cargarDatosIniciales();
        }
      } else {
        alert('❌ Error al registrar alimentación. Verifica los datos e intenta nuevamente.');
      }

    } catch (error: any) {
      console.error('❌ Error al registrar alimentación con inventario:', error);
      
      let errorMessage = '❌ Error al registrar alimentación. ';
      if (error?.error?.error) {
        errorMessage += error.error.error;
      } else if (error?.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Verifica los datos e intenta nuevamente.';
      }
      this.uiMessageError = errorMessage;
      this.uiMessageSuccess = null;
    } finally {
      this.loading = false;
    }
  }

  calcularDiasDeVida(fechaNacimiento: Date | null): number {
    if (!fechaNacimiento) return 0;
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const fechaNac = new Date(fechaNacimiento);
    fechaNac.setHours(0, 0, 0, 0);
    
    const diffTime = hoy.getTime() - fechaNac.getTime();
    return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  }

  calcularDiasVida(lote: Lote): number {
    if (!lote.birthdate) {
      console.warn(`⚠️ Lote ${lote.codigo} no tiene fecha de nacimiento`);
      return 0;
    }
    
    const fechaNacimiento = new Date(lote.birthdate);
    const fechaActual = new Date();
    
    // Validar que la fecha sea válida
    if (isNaN(fechaNacimiento.getTime())) {
      console.error(`❌ Fecha de nacimiento inválida para lote ${lote.codigo}:`, lote.birthdate);
      return 0;
    }
    
    const diferenciaTiempo = fechaActual.getTime() - fechaNacimiento.getTime();
    const diasVida = Math.floor(diferenciaTiempo / (1000 * 3600 * 24));
    
    console.log(`📅 Lote ${lote.codigo}: ${diasVida} días de vida (nacido: ${fechaNacimiento.toLocaleDateString()})`);
    return Math.max(0, diasVida); // Asegurar que no sea negativo
  }

  /**
   * Calcular meses y días exactos desde una fecha de nacimiento hasta hoy
   * Usa diferencias de calendario reales (no meses de 30 días fijos)
   */
  private calcularMesesYDiasDesde(fechaNacimiento: Date | null): { meses: number; dias: number } {
    if (!fechaNacimiento) return { meses: 0, dias: 0 };

    const inicio = new Date(fechaNacimiento);
    const hoy = new Date();

    // Normalizar horas para evitar desfases
    inicio.setHours(0, 0, 0, 0);
    hoy.setHours(0, 0, 0, 0);

    let meses = (hoy.getFullYear() - inicio.getFullYear()) * 12 + (hoy.getMonth() - inicio.getMonth());

    // Si aún no se ha cumplido el día del mes, restar un mes
    if (hoy.getDate() < inicio.getDate()) {
      meses -= 1;
    }

    // Calcular la fecha al sumar esos meses a la fecha de inicio
    const referencia = new Date(inicio);
    referencia.setMonth(referencia.getMonth() + meses);

    // Días restantes entre referencia y hoy
    const diffMs = hoy.getTime() - referencia.getTime();
    const dias = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    return { meses: Math.max(0, meses), dias };
  }

  /**
   * Obtener edad en meses/días como texto para un lote
   */
  getEdadEnMesesTexto(lote: Lote | null): string {
    if (!lote || !lote.birthdate) return '0 meses';
    const { meses, dias } = this.calcularMesesYDiasDesde(lote.birthdate);
    const mesesTxt = meses === 1 ? '1 mes' : `${meses} meses`;
    if (dias <= 0) return mesesTxt;
    const diasTxt = dias === 1 ? '1 día' : `${dias} días`;
    return `${mesesTxt} y ${diasTxt}`;
  }

  getInfoEdadLote(lote: Lote | null): { 
    diasVida: number; 
    etapa: string; 
    descripcion: string;
    edadTexto: string;
    cantidadTexto: string;
    actualizado: string;
    fechaNacimiento: string;
  } | null {
    if (!lote) return null;
    
    const diasVida = this.calcularDiasDeVida(lote.birthdate);
    
    let etapa = '';
    let descripcion = '';
    
    if (diasVida <= 20) {
      etapa = 'Pre-inicial';
      descripcion = 'Pollos muy jóvenes, requieren alimento especializado';
    } else if (diasVida <= 38) {
      etapa = 'Inicial';
      descripcion = 'Etapa de crecimiento rápido';
    } else if (diasVida <= 60) {
      etapa = 'Crecimiento';
      descripcion = 'Desarrollo muscular y óseo';
    } else {
      etapa = 'Acabado';
      descripcion = 'Preparación para venta o sacrificio';
    }
    
    const edadTexto = `${diasVida} días`;
    const cantidadTexto = `${lote.quantity || 0} pollos`;
    const actualizado = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const fechaNacimiento = lote.birthdate ? 
      new Date(lote.birthdate).toLocaleDateString('es-ES') : 'No disponible';
    
    return {
      diasVida,
      etapa,
      descripcion,
      edadTexto,
      cantidadTexto,
      actualizado,
      fechaNacimiento
    };
  }

  // Función requerida por el template para mostrar información de la etapa actual
  getInfoEtapaActual(lote: Lote): { 
    tieneEtapa: boolean; 
    nombre?: string; 
    descripcion?: string;
    diasVida?: number;
    rangoDias?: string;
    alimentoRecomendado?: string;
    cantidadPorAnimal?: number;
    unidad?: string;
    mensaje?: string;
    advertencia?: string;
  } {
    if (!lote) {
      return { tieneEtapa: false, mensaje: 'No hay lote seleccionado' };
    }

    const diasVida = this.calcularDiasDeVida(lote.birthdate);
    
    // ✅ CALCULAR CANTIDAD POR ANIMAL (SUMA DE TODOS LOS ALIMENTOS)
    const cantidadPorAnimal = this.alimentosSeleccionados.reduce((total, alimento) => {
      const cantidad = alimento.quantityPerAnimal || 0;
      console.log(`🥣 ${alimento.alimentoRecomendado}: ${cantidad} kg/animal`);
      return total + cantidad;
    }, 0);
    
    const cantidadFormateada = parseFloat(cantidadPorAnimal.toFixed(2));
    console.log(`🧮 CANTIDAD POR ANIMAL TOTAL: ${cantidadFormateada} kg`);
    
    // ✅ USAR DATOS REALES DE etapaActualLote SI EXISTE
    if (this.etapaActualLote) {
      // Construir rango de días desde los datos reales
      let rangoDias = '';
      if (this.etapaActualLote.diasInicio && this.etapaActualLote.diasFin) {
        rangoDias = `${this.etapaActualLote.diasInicio} - ${this.etapaActualLote.diasFin} días`;
      }
      
      return {
        tieneEtapa: true,
        nombre: this.etapaActualLote.nombre || 'Etapa Nutricional',
        descripcion: this.etapaActualLote.descripcion || `Etapa para pollos de ${diasVida} días`,
        diasVida: diasVida,
        rangoDias: rangoDias,
        alimentoRecomendado: this.etapaActualLote.alimentoRecomendado || 'No definido',
        cantidadPorAnimal: cantidadFormateada,
        unidad: 'kg'
      };
    }
    
    // Fallback si no hay etapa cargada del backend
    return {
      tieneEtapa: false,
      diasVida: diasVida,
      cantidadPorAnimal: cantidadFormateada,
      unidad: 'kg',
      mensaje: `No se encontró etapa para pollos de ${diasVida} días`
    };
  }

  // Funciones adicionales requeridas por el template
  obtenerEdadLote(loteId: string): number {
    const lote = this.lotesActivos.find(l => String(l.id) === loteId);
    return lote ? this.calcularDiasDeVida(lote.birthdate) : 0;
  }

  obtenerEtapaActual(loteId: string): { nombre: string } | null {
    const lote = this.lotesActivos.find(l => String(l.id) === loteId);
    if (!lote) return null;
    
    const diasVida = this.calcularDiasDeVida(lote.birthdate);
    let nombre = '';
    
    if (diasVida <= 20) {
      nombre = 'Pre-inicial';
    } else if (diasVida <= 38) {
      nombre = 'Inicial';
    } else if (diasVida <= 60) {
      nombre = 'Crecimiento';
    } else {
      nombre = 'Acabado';
    }
    
    return { nombre };
  }

  formatearCantidad(cantidad: number | undefined): string {
    if (cantidad === undefined || cantidad === null) return '0.00'; // ✅ FORMATO X.XX
    return Number(cantidad).toFixed(2); // ✅ FORMATO X.XX (dos decimales)
  }

  getCantidadTotalSugerida(): number {
    if (!this.loteSeleccionado) return 0;
    
    // ✅ CALCULAR CANTIDAD POR ANIMAL (SUMA DE TODOS LOS ALIMENTOS SELECCIONADOS)
    const cantidadPorAnimal = this.alimentosSeleccionados.reduce((total, alimento) => {
      const cantidad = alimento.quantityPerAnimal || 0;
      return total + cantidad;
    }, 0);
    
    const total = cantidadPorAnimal * (this.loteSeleccionado.quantity || 0);
    const resultado = parseFloat(total.toFixed(2));
    
    console.log(`🎯 getCantidadTotalSugerida: ${cantidadPorAnimal} kg/animal × ${this.loteSeleccionado.quantity} animales = ${resultado} kg`);
    
    return resultado; // ✅ FORMATO X.XX
  }

  getCantidadTotalAlimentosSeleccionados(): number {
    console.log('🧮 Calculando cantidad total de alimentos seleccionados...');
    console.log('🍽️ Alimentos seleccionados para cálculo:', this.alimentosSeleccionados.length);
    console.log('🐔 Cantidad de animales en lote:', this.loteSeleccionado?.quantity || 0);
    
    const total = this.alimentosSeleccionados.reduce((total, alimento) => {
      const cantidad = alimento.quantityPerAnimal || 0;
      const subtotal = cantidad * (this.loteSeleccionado?.quantity || 0);
      console.log(`  - ${alimento.alimentoRecomendado}: ${cantidad} kg/animal × ${this.loteSeleccionado?.quantity || 0} animales = ${subtotal.toFixed(2)} kg`);
      return total + subtotal;
    }, 0);
    
    const resultado = parseFloat(total.toFixed(2));
    console.log(`🎯 TOTAL CALCULADO: ${resultado} kg`);
    return resultado; // ✅ FORMATO X.XX
  }

  private getCantidadPorAnimalSegunEdad(diasVida: number): number {
    if (diasVida <= 20) {
      return 0.025; // 25g por día
    } else if (diasVida <= 38) {
      return 0.075; // 75g por día
    } else if (diasVida <= 60) {
      return 0.120; // 120g por día
    } else {
      return 0.150; // 150g por día
    }
  }

  // Función requerida por el template para obtener placeholder de cantidad
  getPlaceholderCantidad(): string {
    if (!this.loteSeleccionado) return '0.00';
    const total = this.getCantidadTotalSugerida();
    return this.formatearCantidad(total);
  }

  private getRegistroVacio(): RegistroAlimentacionCompleto {
    const ahora = new Date();
    return {
      fecha: ahora.toISOString().split('T')[0],
      hora: ahora.toTimeString().slice(0, 5),
      cantidadAplicada: 0,
      tipoAlimento: 'Concentrado balanceado',
      animalesVivos: 0,
      animalesMuertos: 0,
      animalesEnfermos: 0,
      fechaVenta: '',
      animalesVendidos: 0,
      precioUnitario: 0,
      valorTotalVenta: 0,
      observacionesVenta: '',
      observacionesSalud: '',
      observacionesGenerales: '',
      loteId: '',
      usuarioId: this.user?.id || 0,
      stockAnterior: 0,
      stockPosterior: 0,
      loteCerrado: false,
      motivoCierre: '',
      causaMortalidad: '' // Inicializar campo de causa de mortalidad
    };
  }

  // MÉTODO DE DIAGNÓSTICO ESPECÍFICO PARA ALIMENTACIÓN
  async diagnosticarCargaDeAlimentos(): Promise<void> {
    console.log('🔧 === DIAGNÓSTICO ESPECÍFICO DE ALIMENTACIÓN ===');
    
    try {
      // 1. Verificar conexión con backend
      console.log('1️⃣ Verificando conexión con backend...');
      console.log('URL del servicio:', `${environment.apiUrl}/lote`);
      
      // 2. Intentar cargar lotes directamente
      console.log('2️⃣ Intentando cargar lotes...');
      
      this.loteService.getLotes().subscribe({
        next: (lotes) => {
          console.log('✅ ÉXITO: Lotes recibidos del backend:', lotes);
          console.log('📊 Total de lotes:', lotes.length);
          
          // 3. Filtrar lotes de pollos
          const lotesPollos = lotes.filter(lote => 
            lote.race?.animal?.name?.toLowerCase().includes('pollo') ||
            lote.race?.animal?.id === 1
          );
          console.log('🐔 Lotes de pollos encontrados:', lotesPollos.length);
          console.log('🐔 Detalle de lotes de pollos:', lotesPollos);
          
          if (lotesPollos.length === 0) {
            console.warn('⚠️ PROBLEMA: No hay lotes de pollos registrados');
            console.log('💡 SOLUCIÓN: Asegúrate de tener lotes con animal ID=1 (pollos)');
          }
          
        },
        error: (error) => {
          console.error('❌ ERROR AL CARGAR LOTES:', error);
          console.error('📝 Detalles del error:', {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            url: error.url
          });
          
          if (error.status === 0) {
            console.error('🔗 PROBLEMA DE CONEXIÓN: El backend no responde');
            console.log('💡 VERIFICAR: ¿Está ejecutándose el backend en puerto 8088?');
          } else if (error.status === 404) {
            console.error('🔍 ENDPOINT NO ENCONTRADO: Revisa la URL del API');
          } else if (error.status === 500) {
            console.error('🐛 ERROR DEL SERVIDOR: Problema en el backend');
          }
        }
      });
      
    } catch (error) {
      console.error('💥 ERROR CRÍTICO EN DIAGNÓSTICO:', error);
    }
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    this.loteSeleccionado = null;
    this.etapasDisponiblesLote = [];
    this.alimentosSeleccionados = [];
    this.etapaActualLote = null;
  }

  // ✅ MÉTODOS PARA DROPDOWN DE CAUSAS DE MORTALIDAD
  filtrarCausasMortalidad(event: any): void {
    const texto = event.target.value.toLowerCase();
    if (texto.trim() === '') {
      this.causasMortalidadFiltradas = [...this.causasMortalidad];
    } else {
      this.causasMortalidadFiltradas = this.causasMortalidad.filter(causa =>
        causa.nombre.toLowerCase().includes(texto) ||
        causa.descripcion?.toLowerCase().includes(texto)
      );
    }
    this.mostrarDropdownCausas = true;
  }

  seleccionarCausaMortalidad(causa: CausaMortalidad): void {
    this.registroCompleto.causaMortalidad = causa.nombre;
    this.mostrarDropdownCausas = false;
    this.causasMortalidadFiltradas = [];
  }

  ocultarDropdownCausas(): void {
    // Delay para permitir que el click en una opción se procese
    setTimeout(() => {
      this.mostrarDropdownCausas = false;
      this.causasMortalidadFiltradas = [];
    }, 200);
  }

  // ✅ REGISTRO AUTOMÁTICO DE MORTALIDAD
  private async registrarMortalidadAutomatica(): Promise<void> {
    try {
      console.log('🔄 Registrando mortalidad automáticamente desde alimentación...');
      
      if (!this.causasMortalidad || this.causasMortalidad.length === 0) {
        try {
          const causas = await this.mortalidadService.getCausas().toPromise();
          this.causasMortalidad = causas || [];
          this.causasMortalidadFiltradas = [...this.causasMortalidad];
        } catch (e) {
          console.error('❌ No se pudieron cargar las causas de mortalidad antes de registrar:', e);
        }
      }
      
      if (!this.causasMortalidad || this.causasMortalidad.length === 0) {
        try {
          const creada = await this.mortalidadService.createCausa({
            nombre: 'Causa Desconocida',
            descripcion: 'Sin causa aparente identificada',
            color: '#6B7280'
          }).toPromise();
          if (creada) {
            this.causasMortalidad = [creada];
            this.causasMortalidadFiltradas = [...this.causasMortalidad];
          }
        } catch (e) {
          console.error('❌ No se pudo crear la causa por defecto:', e);
        }
      }
      
      // Buscar la causa por nombre o usar "Causa Desconocida" como fallback
      let causaSeleccionada = this.causasMortalidad.find(c => 
        c.nombre.toLowerCase() === this.registroCompleto.causaMortalidad?.toLowerCase()
      );
      if (!causaSeleccionada && this.registroCompleto.causaMortalidad) {
        const texto = this.registroCompleto.causaMortalidad.toLowerCase();
        causaSeleccionada = this.causasMortalidad.find(c => c.nombre?.toLowerCase().includes(texto));
      }
      
      if (!causaSeleccionada) {
        // Si no encontramos la causa exacta, usar "Causa Desconocida"
        causaSeleccionada = this.causasMortalidad.find(c => c.nombre === 'Causa Desconocida') || this.causasMortalidad[0];
      }
      if (!causaSeleccionada) {
        throw new Error('No hay causas de mortalidad disponibles para registrar automáticamente.');
      }

      const diasDeVida = this.calcularDiasDeVida(this.loteSeleccionado?.birthdate || null);

      const registroMortalidad = {
        loteId: this.loteSeleccionado?.id,
        cantidadMuertos: this.registroCompleto.animalesMuertos,
        causaId: causaSeleccionada.id,
        observaciones: `Registro automático desde alimentación. Causa: ${this.registroCompleto.causaMortalidad}. ${this.registroCompleto.observacionesGenerales || ''}`.trim(),
        edad: diasDeVida,
        ubicacion: this.loteSeleccionado?.codigo || this.loteSeleccionado?.name || '',
        confirmado: false,
        usuarioRegistro: 'Sistema (desde alimentación)'
      };

      console.log('📤 Enviando registro de mortalidad automático:', registroMortalidad);

      await this.mortalidadService.registrarMortalidadConCausa(registroMortalidad).toPromise();
      const vivosPrevios = this.loteSeleccionado?.quantity || 0;
      const muertos = this.registroCompleto.animalesMuertos || 0;
      const restantes = Math.max(0, vivosPrevios - muertos);
      console.log('✅ Mortalidad registrada automáticamente');
      console.log('✅ El backend ha actualizado automáticamente la cantidad del lote');
      if (restantes <= 0) {
        alert(`✅ Mortalidad registrada: ${muertos} animales. El lote ${this.loteSeleccionado?.codigo || ''} ha llegado a 0 y fue movido al Histórico. Ciclo finalizado.`);
      } else {
        alert(`✅ Mortalidad registrada automáticamente: ${muertos} animales por "${this.registroCompleto.causaMortalidad}". La cantidad del lote se ha actualizado.`);
      }
      this.cerrarModal();
      await this.cargarDatosIniciales();
      
    } catch (error) {
      console.error('❌ Error al registrar mortalidad automática:', error);
      alert('⚠️ Alimentación registrada, pero hubo un error al registrar la mortalidad. Por favor, registre la mortalidad manualmente.');
      
      // Ir a la página de mortalidad para registro manual
      this.router.navigate(['/pollos/mortalidad'], { 
        queryParams: { 
          loteId: this.loteSeleccionado?.id, 
          cantidad: this.registroCompleto.animalesMuertos,
          causa: this.registroCompleto.causaMortalidad
        } 
      });
    }
  }

  /**
   * Cargar mortalidad real de todos los lotes desde el backend
   */
  async cargarMortalidadTodosLotes(): Promise<void> {
    try {
      const registrosMortalidad = await this.mortalidadService.getRegistrosMortalidad().toPromise();
      
      // Agrupar mortalidad por loteId
      const mortalidadPorLote = new Map<string, number>();
      
      if (registrosMortalidad) {
        registrosMortalidad.forEach(registro => {
          const loteKey = registro.loteId.toString();
          const cantidadActual = mortalidadPorLote.get(loteKey) || 0;
          mortalidadPorLote.set(loteKey, cantidadActual + registro.cantidadMuertos);
        });
      }
      
      this.mortalidadPorLote = mortalidadPorLote;
      console.log('✅ Mortalidad cargada:', Object.fromEntries(this.mortalidadPorLote));
      
    } catch (error) {
      console.error('❌ Error al cargar mortalidad:', error);
      this.mortalidadPorLote = new Map();
    }
  }

  /**
   * Obtener pollos registrados originalmente
   */
  obtenerPollosRegistrados(lote: Lote): number {
    // Si hay mortalidad registrada, calcular los registrados originales
    const mortalidadReal = this.mortalidadPorLote.get(lote.id?.toString() || '') || 0;
    const vivosActuales = lote.quantity || 0;
    
    if (mortalidadReal > 0) {
      return vivosActuales + mortalidadReal;
    }
    
    // Para lotes sin mortalidad, usar quantityOriginal si existe, sino quantity actual
    return lote.quantityOriginal || lote.quantity || 0;
  }

  /**
   * Calcular mortalidad real de un lote usando datos del backend
   */
  calcularMortalidadReal(lote: Lote): number {
    // Usar datos reales de mortalidad del backend
    const mortalidadReal = this.mortalidadPorLote.get(lote.id?.toString() || '') || 0;
    
    if (mortalidadReal > 0) {
      return mortalidadReal;
    }
    
    // Fallback: calcular basado en la diferencia entre registrados y vivos
    const registrados = this.obtenerPollosRegistrados(lote);
    const vivos = lote.quantity || 0;
    
    return Math.max(0, registrados - vivos);
  }
}
