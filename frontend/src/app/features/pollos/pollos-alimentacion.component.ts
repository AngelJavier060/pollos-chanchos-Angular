import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { LoteService } from '../lotes/services/lote.service';
import { AlimentacionService } from './services/alimentacion.service';
import { PlanNutricionalIntegradoService } from '../../shared/services/plan-nutricional-integrado.service';
import { Lote } from '../lotes/interfaces/lote.interface';
import { environment } from '../../../environments/environment';
import { CausaMortalidad, CAUSAS_MORTALIDAD } from './models/mortalidad.model';
import { MortalidadService } from './services/mortalidad.service';
import { InventarioService, RegistroConsumoRequest } from './services/inventario.service';

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
  loteId: number;
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

  // Estadísticas de lotes - Cache para mortalidad
  private estadisticasLotes: Map<number, {
    pollosRegistrados: number;
    pollosVivos: number;
    mortalidadTotal: number;
    porcentajeMortalidad: number;
    tieneDatos: boolean;
  }> = new Map();

  // Propiedades para dropdown de causas de mortalidad
  causasMortalidad: CausaMortalidad[] = CAUSAS_MORTALIDAD;
  causasMortalidadFiltradas: CausaMortalidad[] = [];
  mostrarDropdownCausas = false;

  // Mapa de mortalidad por lote (para calcular valores reales)
  mortalidadPorLote = new Map<string, number>();

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

  constructor(
    private loteService: LoteService,
    private alimentacionService: AlimentacionService,
    private planNutricionalService: PlanNutricionalIntegradoService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private mortalidadService: MortalidadService,
    private inventarioService: InventarioService
  ) {}

  ngOnInit(): void {
    console.log('🚀 Iniciando componente PollosAlimentacionComponent');
    this.loading = true;
    this.causasMortalidadFiltradas = [...this.causasMortalidad]; // Inicializar causas filtradas
    this.cargarDatosIniciales();
    this.cargarMortalidadTodosLotes(); // Cargar mortalidad real
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

  trackByLote(index: number, lote: Lote): number {
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
      
      this.lotesActivos = lotes?.filter(lote => 
        lote.race?.animal?.name?.toLowerCase().includes('pollo') ||
        lote.race?.animal?.id === 1
      ) || [];
      
      this.estadoSistema.lotesCargados = this.lotesActivos.length;
      console.log('✅ Datos cargados:', this.lotesActivos.length, 'lotes de pollos');
      
      // ✅ CARGAR ESTADÍSTICAS DE MORTALIDAD PARA CADA LOTE
      await this.cargarEstadisticasLotes();
      
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
    this.registroCompleto.loteId = lote.id || 0;
    this.registroCompleto.animalesVivos = lote.quantity || 0;
    this.modalAbierto = true;
    
    // ✅ CARGAR ALIMENTOS DISPONIBLES PARA EL LOTE
    this.cargarAlimentosParaLote(lote);
    
    // Asignar automáticamente la cantidad total sugerida
    setTimeout(() => {
      this.registroCompleto.cantidadAplicada = this.getCantidadTotalSugerida();
    }, 100);
  }

  // ✅ FUNCIÓN CRÍTICA - CARGAR ALIMENTOS DESDE BACKEND REAL
  async cargarAlimentosParaLote(lote: Lote): Promise<void> {
    console.log('🔍 Cargando alimentos REALES para lote:', lote.codigo);
    console.log('🗓️ Fecha de nacimiento del lote:', lote.birthdate);
    
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
            
            // ✅ Buscar TODAS las etapas que correspondan a los días de vida del lote
            const etapasCorrespondientes = planPollos.etapas.filter((etapa: any) => 
              diasVida >= etapa.diasEdad.min && diasVida <= etapa.diasEdad.max
            );
            
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
              
              // ✅ CREAR TODAS LAS OPCIONES DE ALIMENTOS DISPONIBLES
              this.etapasDisponiblesLote = etapasCorrespondientes.map((etapa, index) => ({
                id: index + 1,
                alimentoRecomendado: etapa.producto?.name || etapa.tipoAlimento,
                quantityPerAnimal: parseFloat((etapa.quantityPerAnimal || (etapa.consumoDiario.min / 1000)).toFixed(2)), // ✅ FORMATO X.XX
                unidad: 'kg',
                seleccionado: true, // ✅ PRESELECCIONAR TODOS LOS ALIMENTOS
                productosDetalle: [
                  {
                    nombre: etapa.producto?.name || etapa.tipoAlimento,
                    cantidad: parseFloat((etapa.quantityPerAnimal || (etapa.consumoDiario.min / 1000)).toFixed(2)), // ✅ FORMATO X.XX
                    unidad: 'kg'
                  }
                ]
              }));
              
              // ✅ CONFIGURAR ETAPA ACTUAL CON INFORMACIÓN COMBINADA
              const primeraEtapa = etapasCorrespondientes[0]; // Usar primera etapa como base
              const todasLasEtapas = etapasCorrespondientes.map(etapa => ({
                nombre: etapa.producto?.name || etapa.tipoAlimento,
                cantidad: parseFloat((etapa.quantityPerAnimal || (etapa.consumoDiario.min / 1000)).toFixed(2)), // ✅ FORMATO X.XX
                unidad: 'kg'
              }));
              
              this.etapaActualLote = {
                nombre: `Etapa ${primeraEtapa.diasEdad.min}-${primeraEtapa.diasEdad.max} días`,
                descripcion: `${etapasCorrespondientes.length} opciones de alimentación disponibles`,
                alimentoRecomendado: `${etapasCorrespondientes.length} opciones: ${etapasCorrespondientes.map(e => e.producto?.name || e.tipoAlimento).join(', ')}`,
                quantityPerAnimal: parseFloat((primeraEtapa.quantityPerAnimal || (primeraEtapa.consumoDiario.min / 1000)).toFixed(2)), // ✅ FORMATO X.XX
                diasInicio: primeraEtapa.diasEdad.min,
                diasFin: primeraEtapa.diasEdad.max,
                productosDetalle: todasLasEtapas
              };
              
              console.log('✅ TODAS las etapas REALES configuradas:', this.etapaActualLote);
              console.log('✅ TODOS los alimentos REALES cargados:', this.etapasDisponiblesLote);
              
            } else {
              console.warn(`⚠️ No se encontró etapa para ${diasVida} días, usando fallback`);
              this.cargarAlimentosFallback(diasVida);
            }
            
            // Actualizar alimentos seleccionados
            this.actualizarAlimentosSeleccionados();
            
            // ✅ FORZAR DETECCIÓN DE CAMBIOS
            this.cdr.detectChanges();
            console.log('🔄 Detección de cambios forzada');
            
          } else {
            console.warn('⚠️ No se encontró plan nutricional, usando fallback');
            this.cargarAlimentosFallback(diasVida);
          }
        },
        error: (error) => {
          console.error('❌ Error al cargar plan nutricional:', error);
          console.log('🔄 Usando datos de fallback por error');
          this.cargarAlimentosFallback(diasVida);
        }
      });
      
    } catch (error) {
      console.error('❌ Error crítico al cargar alimentos:', error);
      this.cargarAlimentosFallback(diasVida);
    }
  }
  
  // Función de fallback en caso de que no haya datos del backend
  private cargarAlimentosFallback(diasVida: number): void {
    console.log('🔄 Cargando alimentos de fallback para', diasVida, 'días');
    
    let etapaNombre = '';
    let alimentoPrincipal = '';
    let cantidadRecomendada = 0;
    
    if (diasVida <= 7) {
      etapaNombre = 'Pre-inicial (0-7 días)';
      alimentoPrincipal = 'Concentrado Pre-inicial';
      cantidadRecomendada = 0.025;
    } else if (diasVida <= 21) {
      etapaNombre = 'Inicial (8-21 días)';
      alimentoPrincipal = 'Concentrado Inicial';
      cantidadRecomendada = 0.050;
    } else if (diasVida <= 35) {
      etapaNombre = 'Crecimiento I (22-35 días)';
      alimentoPrincipal = 'Balanceado Crecimiento';
      cantidadRecomendada = 0.085;
    } else if (diasVida <= 42) {
      etapaNombre = 'Crecimiento II (36-42 días)';
      alimentoPrincipal = 'Balanceado Engorde';
      cantidadRecomendada = 0.120;
    } else {
      etapaNombre = 'Acabado (43+ días)';
      alimentoPrincipal = 'Concentrado Finalizador';
      cantidadRecomendada = 0.150;
    }
    
    this.etapasDisponiblesLote = [
      {
        id: 1,
        alimentoRecomendado: alimentoPrincipal,
        quantityPerAnimal: parseFloat(cantidadRecomendada.toFixed(2)), // ✅ FORMATO X.XX
        unidad: 'kg',
        seleccionado: true,
        productosDetalle: [
          {
            nombre: alimentoPrincipal,
            cantidad: parseFloat(cantidadRecomendada.toFixed(2)), // ✅ FORMATO X.XX
            unidad: 'kg'
          }
        ]
      }
    ];
    
    this.etapaActualLote = {
      nombre: etapaNombre,
      descripcion: `Etapa de fallback para pollos de ${diasVida} días`,
      alimentoRecomendado: alimentoPrincipal,
      quantityPerAnimal: parseFloat(cantidadRecomendada.toFixed(2)), // ✅ FORMATO X.XX
      productosDetalle: [
        {
          nombre: alimentoPrincipal,
          cantidad: parseFloat(cantidadRecomendada.toFixed(2)), // ✅ FORMATO X.XX
          unidad: 'kg'
        }
      ]
    };
    
    this.actualizarAlimentosSeleccionados();
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

  async registrarAlimentacionCompleta(): Promise<void> {
    try {
      console.log('🚀 Registrando alimentación con deducción automática de inventario...');

      // Validaciones básicas
      if (!this.loteSeleccionado) {
        alert('❌ No se ha seleccionado un lote');
        return;
      }

      if (this.registroCompleto.cantidadAplicada <= 0) {
        alert('❌ La cantidad debe ser mayor a 0');
        return;
      }

      // Confirmación
      const confirmar = confirm(
        `¿Confirmar registro de ${this.registroCompleto.cantidadAplicada} kg para el lote ${this.loteSeleccionado.codigo}?\n\n` +
        `✅ Se deducirá automáticamente del inventario de alimentos.`
      );
      if (!confirmar) return;

      this.loading = true;

      // ✅ NUEVA LÓGICA: Registrar consumo con deducción automática de inventario
      const consumoRequest: RegistroConsumoRequest = {
        loteId: String(this.loteSeleccionado.id!),
        tipoAlimentoId: 1, // Por ahora usamos ID 1 como default, se puede mejorar
        cantidadKg: this.registroCompleto.cantidadAplicada,
        observaciones: this.registroCompleto.observacionesGenerales || 
          `Consumo registrado para lote ${this.loteSeleccionado.codigo} - ${new Date().toLocaleString()}`
      };

      console.log('📤 Enviando solicitud de consumo:', consumoRequest);

      // Registrar consumo y deducir inventario automáticamente
      const responseInventario = await this.inventarioService.registrarConsumoAlimento(consumoRequest).toPromise();
      
      console.log('✅ Respuesta del inventario:', responseInventario);

      if (responseInventario && responseInventario.success) {
        // ✅ NOTIFICACIÓN: Informar al usuario sobre la deducción automática de inventario
        console.log(`✅ INVENTARIO AUTOMÁTICO: Se dedujo ${responseInventario.cantidadConsumida} kg de alimento del inventario`);
        console.log(`   Stock anterior: ${responseInventario.stockAnterior} kg`);
        console.log(`   Stock nuevo: ${responseInventario.stockNuevo} kg`);
        
        // ✅ Registro exitoso en inventario, ahora registrar en alimentación tradicional
        const datosRegistro = {
          loteId: this.loteSeleccionado.codigo || '',
          fecha: this.registroCompleto.fecha,
          cantidadAplicada: this.registroCompleto.cantidadAplicada,
          animalesVivos: this.registroCompleto.animalesVivos,
          animalesMuertos: this.registroCompleto.animalesMuertos,
          observaciones: this.registroCompleto.observacionesGenerales || '',
          usuarioId: this.user?.id || 0
        };

        const responseAlimentacion = await this.alimentacionService.registrarAlimentacion(datosRegistro).toPromise();
        
        if (responseAlimentacion) {
          // ✅ ACTUALIZACIÓN AUTOMÁTICA: Si hay animales muertos, actualizar el lote localmente
          if (this.registroCompleto.animalesMuertos > 0) {
            console.log(`🔄 Actualizando cantidad local del lote ${this.loteSeleccionado.codigo}:`);
            console.log(`   - Cantidad anterior: ${this.loteSeleccionado.quantity}`);
            console.log(`   - Animales muertos: ${this.registroCompleto.animalesMuertos}`);
            
            // Actualizar la cantidad local inmediatamente
            this.loteSeleccionado.quantity = Math.max(0, this.loteSeleccionado.quantity - this.registroCompleto.animalesMuertos);
            
            console.log(`   - Nueva cantidad: ${this.loteSeleccionado.quantity}`);
            
            // Actualizar también en la lista de lotes
            const loteEnLista = this.lotesActivos.find(l => l.id === this.loteSeleccionado.id);
            if (loteEnLista) {
              loteEnLista.quantity = this.loteSeleccionado.quantity;
            }
          }
          
          // ✅ Mostrar mensaje de éxito con información del inventario
          const mensaje = `✅ Alimentación registrada exitosamente!\n\n` +
            `📦 Inventario actualizado:\n` +
            `   • Cantidad consumida: ${responseInventario.cantidadConsumida} kg\n` +
            `   • Stock anterior: ${responseInventario.stockAnterior} kg\n` +
            `   • Stock actual: ${responseInventario.stockNuevo} kg\n` +
            (this.registroCompleto.animalesMuertos > 0 ? 
              `\n🐔 Animales vivos actualizados: ${this.loteSeleccionado.quantity}` : '');
          
          alert(mensaje);

          // Si hay animales muertos y se especificó una causa, registrar la mortalidad automáticamente
          if (this.registroCompleto.animalesMuertos > 0 && this.registroCompleto.causaMortalidad) {
            await this.registrarMortalidadAutomatica();
          } else if (this.registroCompleto.animalesMuertos > 0) {
            // Si hay muertos pero no se especificó causa, ir a la página de mortalidad
            this.router.navigate(['/pollos/mortalidad'], { queryParams: { loteId: this.loteSeleccionado.id, cantidad: this.registroCompleto.animalesMuertos } });
          } else if (this.registroCompleto.animalesEnfermos > 0) {
            this.router.navigate(['/pollos/morbilidad'], { queryParams: { loteId: this.loteSeleccionado.id, cantidad: this.registroCompleto.animalesEnfermos } });
          } else {
            this.cerrarModal();
            await this.cargarDatosIniciales();
          }
        }
      } else {
        // Error en el registro de inventario
        const errorMsg = responseInventario?.error || 'Error desconocido en el inventario';
        alert(`❌ Error al actualizar inventario: ${errorMsg}\n\nVerifica que hay suficiente stock disponible.`);
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
      
      alert(errorMessage);
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

  // Función requerida por el template para mostrar información de edad del lote
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
  obtenerEdadLote(loteId: number): number {
    const lote = this.lotesActivos.find(l => l.id === loteId);
    return lote ? this.calcularDiasDeVida(lote.birthdate) : 0;
  }

  obtenerEtapaActual(loteId: number): { nombre: string } | null {
    const lote = this.lotesActivos.find(l => l.id === loteId);
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
    if (!this.loteSeleccionado) return '0.0';
    
    const diasVida = this.calcularDiasDeVida(this.loteSeleccionado.birthdate);
    const cantidadSugerida = this.getCantidadPorAnimalSegunEdad(diasVida);
    const cantidadTotal = cantidadSugerida * (this.loteSeleccionado.quantity || 0);
    
    return this.formatearCantidad(cantidadTotal);
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
      loteId: 0,
      usuarioId: this.user?.id || 0,
      stockAnterior: 0,
      stockPosterior: 0,
      loteCerrado: false,
      motivoCierre: '',
      causaMortalidad: '' // Inicializar campo de causa de mortalidad
    };
  }

  // 🔧 MÉTODO DE DIAGNÓSTICO ESPECÍFICO PARA ALIMENTACIÓN
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
      
      // Buscar la causa por nombre o usar "Causa Desconocida" como fallback
      let causaSeleccionada = this.causasMortalidad.find(c => 
        c.nombre.toLowerCase() === this.registroCompleto.causaMortalidad?.toLowerCase()
      );
      
      if (!causaSeleccionada) {
        // Si no encontramos la causa exacta, usar "Causa Desconocida"
        causaSeleccionada = this.causasMortalidad.find(c => c.nombre === 'Causa Desconocida') || this.causasMortalidad[0];
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
      
      console.log('✅ Mortalidad registrada automáticamente');
      console.log('✅ El backend ha actualizado automáticamente la cantidad del lote');
      alert(`✅ Mortalidad registrada automáticamente: ${this.registroCompleto.animalesMuertos} animales por "${this.registroCompleto.causaMortalidad}". La cantidad del lote se ha actualizado automáticamente.`);
      
      // Cerrar modal y recargar datos para reflejar las cantidades actualizadas desde el backend
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
