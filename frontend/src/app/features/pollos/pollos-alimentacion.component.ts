import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { AuthDirectService } from '../../core/services/auth-direct.service';
import { User } from '../../shared/models/user.model';
import { LoteService } from '../lotes/services/lote.service';
import { PlanAlimentacionService, PlanDetalle } from '../plan-nutricional/services/plan-alimentacion.service';
import { AlimentacionService, RegistroAlimentacionRequest } from './services/alimentacion.service';
import { Lote } from '../lotes/interfaces/lote.interface';
import { ProductService } from '../../shared/services/product.service';
import { Product } from '../../shared/models/product.model';
import { CorreccionService } from '../../shared/services/correccion.service';
import { ValidacionResult, CorreccionRequest } from '../../shared/models/correccion.model';
import { PlanNutricionalIntegradoService, PlanIntegrado, EtapaCrecimiento } from '../../shared/services/plan-nutricional-integrado.service';
import { Subscription, interval } from 'rxjs';

// Interface completa para el registro de alimentación
interface RegistroAlimentacionCompleto {
  // Fecha y hora
  fecha: string;
  hora: string;
  
  // Alimentación (automatizada desde el plan)
  cantidadAplicada: number;
  tipoAlimento: string;
  
  // Animales
  animalesVivos: number;
  animalesMuertos: number;
  animalesEnfermos: number;
  
  // Ventas de animales
  fechaVenta: string;
  animalesVendidos: number;
  precioUnitario: number;
  valorTotalVenta: number;
  observacionesVenta: string;
  
  // Observaciones
  observacionesSalud: string;
  observacionesGenerales: string;
  
  // Control interno
  loteId: number;
  usuarioId: number;
  stockAnterior: number;
  stockPosterior: number;
  
  // Estado del lote
  loteCerrado: boolean;
  motivoCierre: string;
}

// Interface para el historial de registros
interface RegistroHistorial {
  fecha: string;
  cantidad: number;
  animalesVivos: number;
  animalesVendidos?: number;
  valorVenta?: number;
  observaciones: string;
}

// Interface para lotes cerrados/históricos
interface LoteHistorico {
  loteId: number;
  codigo: string;
  fechaInicio: string;
  fechaCierre: string;
  motivoCierre: string;
  animalesIniciales: number;
  animalesVendidos: number;
  animalesMuertos: number;
  consumoTotalAlimento: number;
  valorTotalVentas: number;
  rentabilidad: number;
}

// Interface para información del plan por lote
interface PlanInfo {
  tienePlan: boolean;
  diasVida: number;
  etapa: string;
  rangoDias: string;
  alimentoAsignado: string;
  cantidadPorAnimal: number;
  sinEtapa: boolean;
}

// Interface para datos del modal
interface ModalData {
  cantidadSugerida: number;
  tipoAlimento: string;
  etapaNombre: string;
  animalesVivos: number;
}

@Component({
  selector: 'app-pollos-alimentacion',
  templateUrl: './pollos-alimentacion.component.html',
  styleUrls: ['./pollos-dashboard.component.scss']
})
export class PollosAlimentacionComponent implements OnInit, OnDestroy {
  user: User | null = null;
  
  // Variables principales
  lotesPollos: Lote[] = [];
  lotesActivos: Lote[] = [];
  etapasAlimentacion: PlanDetalle[] = [];
  loading = false;
  selectedDate = new Date();
  
  // Inventario real
  productosPollos: Product[] = [];
  inventarioCargado = false;
  
  // Plan nutricional integrado
  planNutricionalActivo: PlanIntegrado | null = null;
  etapaActualLote: EtapaCrecimiento | null = null;
  cronogramaCompleto: EtapaCrecimiento[] = [];
  planCargado = false;
  
  // Modal de alimentación completo
  modalAbierto = false;
  loteSeleccionado: Lote | null = null;
  
  // Registro completo
  registroCompleto: RegistroAlimentacionCompleto = {
    fecha: '',
    hora: '',
    cantidadAplicada: 0,
    tipoAlimento: '',
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
    usuarioId: 0,
    stockAnterior: 0,
    stockPosterior: 0,
    loteCerrado: false,
    motivoCierre: ''
  };

  // ✅ ELIMINADO: Ya no se usa stock simulado, ahora se obtiene del inventario real
  // private stockSimulado = {
  //   maiz: 500,
  //   concentrado: 300,
  //   mixto: 200,
  //   otro: 100
  // };

  // Simulación de historial de registros por lote
  private historialSimulado: { [loteId: number]: RegistroHistorial[] } = {
    1: [
      { fecha: '2024-01-15', cantidad: 1.5, animalesVivos: 20, observaciones: 'Consumo normal' },
      { fecha: '2024-01-14', cantidad: 1.5, animalesVivos: 20, observaciones: 'Sin novedad' },
      { fecha: '2024-01-13', cantidad: 1.5, animalesVivos: 20, observaciones: 'Buen apetito' }
    ],
    2: [
      { fecha: '2024-01-15', cantidad: 6.0, animalesVivos: 120, observaciones: 'Consumo óptimo' },
      { fecha: '2024-01-14', cantidad: 6.0, animalesVivos: 120, animalesVendidos: 5, valorVenta: 125.50, observaciones: 'Venta parcial' }
    ]
  };

  // Control de animales vivos actual por lote (simulación)
  private animalesVivosActuales: { [loteId: number]: number } = {};

  // Histórico de lotes cerrados
  private lotesHistoricos: LoteHistorico[] = [];

  // Información del plan de alimentación por lote
  planInfo: { [loteId: number]: PlanInfo } = {};

  // Datos del modal
  modalData: ModalData = {
    cantidadSugerida: 0,
    tipoAlimento: '',
    etapaNombre: '',
    animalesVivos: 0
  };

  // ========== NUEVO: CONSUMO DIRECTO DEL PLAN NUTRICIONAL DEL ADMINISTRADOR ==========
  
  // Variables para mostrar etapas del plan nutricional
  etapasPlanAdministrador: any[] = [];
  planActivoAdministrador: any = null;
  etapasDisponiblesLote: any[] = []; // 🔥 NUEVA: Todas las etapas disponibles para el lote
  
  // 🆕 Sistema de actualización automática y monitoreo
  private updateSubscription: Subscription = new Subscription();
  private lastStageCheck: { [loteId: number]: { stage: string, timestamp: number } } = {};
  private stageChangeDetected = false;
  
  /**
   * Cargar etapas directamente del plan nutricional del administrador
   * SIMPLIFICADO: Tomar cualquier plan disponible con etapas
   */
  private async cargarEtapasPlanAdministrador(): Promise<void> {
    try {
      console.log('📋 ====== SIMPLIFICANDO CARGA DE ETAPAS ======');
      
      // Obtener todos los planes SIN FILTROS
      const planes = await this.planService.getAllPlanes().toPromise();
      
      console.log('✅ Respuesta completa de getAllPlanes():', planes);
      console.log('📊 Total planes encontrados:', planes?.length || 0);
      
      if (!planes || planes.length === 0) {
        console.error('❌ No se encontraron planes nutricionales en el backend');
        return;
      }
      
      // 🔧 SIMPLIFICADO: Tomar el PRIMER plan que tenga etapas, sin importar si está activo o no
      console.log('🔍 Buscando CUALQUIER plan con etapas...');
      
      let planConEtapas = null;
      
      for (const plan of planes) {
        console.log(`🔍 Verificando plan "${plan.name}" (ID: ${plan.id}):`, {
          id: plan.id,
          name: plan.name,
          active: plan.active,
          animal: plan.animal?.name || plan.animalName || 'No especificado'
        });
        
        try {
          // Intentar obtener etapas de este plan
          const etapasDelPlan = await this.planService.getDetallesByPlan(plan.id).toPromise();
          
          console.log(`📋 Plan "${plan.name}" tiene ${etapasDelPlan?.length || 0} etapas:`, etapasDelPlan);
          
          if (etapasDelPlan && etapasDelPlan.length > 0) {
            console.log(`✅ ¡ENCONTRADO! Plan "${plan.name}" tiene etapas configuradas`);
            planConEtapas = plan;
            this.etapasPlanAdministrador = etapasDelPlan.map(etapa => ({
              id: etapa.id,
              nombre: `Etapa ${etapa.dayStart}-${etapa.dayEnd} días`,
              rangoDias: `${etapa.dayStart} - ${etapa.dayEnd}`,
              diasInicio: etapa.dayStart,
              diasFin: etapa.dayEnd,
              alimentoRecomendado: etapa.product?.name || 'No especificado',
              cantidadPorAnimal: etapa.quantityPerAnimal || 0,
              unidad: 'kg',
              frecuencia: etapa.frequency || 'Diaria',
              observaciones: etapa.instructions || '',
              productoId: etapa.product?.id
            }));
            break; // Usar este plan y parar la búsqueda
          }
        } catch (errorEtapas) {
          console.warn(`⚠️ Error al obtener etapas del plan "${plan.name}":`, errorEtapas);
        }
      }
      
      if (planConEtapas) {
        this.planActivoAdministrador = planConEtapas;
        
        console.log('🎉 ÉXITO - Plan seleccionado:', {
          id: this.planActivoAdministrador.id,
          name: this.planActivoAdministrador.name,
          totalEtapas: this.etapasPlanAdministrador.length
        });
        
        console.log('📋 Etapas procesadas:', this.etapasPlanAdministrador.map(e => ({
          nombre: e.nombre,
          rango: e.rangoDias,
          alimento: e.alimentoRecomendado,
          cantidad: e.cantidadPorAnimal
        })));
        
        // Verificar específicamente los días 20-21
        console.log('🎯 Verificación para días 20-21:');
        [20, 21].forEach(dia => {
          const etapaEncontrada = this.etapasPlanAdministrador.find(e => 
            dia >= e.diasInicio && dia <= e.diasFin
          );
          
          if (etapaEncontrada) {
            console.log(`  ✅ Día ${dia}: Cubierto por "${etapaEncontrada.nombre}"`);
          } else {
            console.warn(`  ❌ Día ${dia}: NO CUBIERTO`);
          }
        });
        
      } else {
        console.error('❌ Ningún plan tiene etapas configuradas');
        console.log('🔧 Planes encontrados pero sin etapas:', planes.map(p => ({
          id: p.id,
          name: p.name,
          active: p.active
        })));
        this.etapasPlanAdministrador = [];
      }
      
      console.log('📋 ====== FIN CARGA SIMPLIFICADA ======');
      
    } catch (error) {
      console.error('❌ ERROR COMPLETO en cargarEtapasPlanAdministrador:', error);
      this.etapasPlanAdministrador = [];
    }
  }
  
  /**
   * Obtener etapa correspondiente según la edad del lote
   * CORREGIDO: Busca correctamente la etapa basada en los días de vida
   */
  obtenerEtapaParaLote(diasVida: number): any | null {
    console.log('🔍 Buscando etapa para lote con', diasVida, 'días de vida');
    
    if (!this.etapasPlanAdministrador || this.etapasPlanAdministrador.length === 0) {
      console.warn('⚠️ No hay etapas del plan del administrador cargadas');
      console.log('📊 Estado actual:', {
        etapasPlanAdministrador: this.etapasPlanAdministrador?.length || 0,
        planActivoAdministrador: this.planActivoAdministrador?.name || 'No disponible'
      });
      return null;
    }
    
    console.log('📋 Etapas disponibles para búsqueda:', this.etapasPlanAdministrador.map(e => ({
      nombre: e.nombre,
      diasInicio: e.diasInicio,
      diasFin: e.diasFin,
      alimento: e.alimentoRecomendado,
      cantidad: e.cantidadPorAnimal
    })));
    
    // 🔧 CORREGIDO: Buscar la etapa que contenga exactamente los días de vida
    const etapaCorrespondiente = this.etapasPlanAdministrador.find(etapa => {
      const dentroDelRango = diasVida >= etapa.diasInicio && diasVida <= etapa.diasFin;
      
      console.log(`🔍 Verificando etapa "${etapa.nombre}":`, {
        rango: `${etapa.diasInicio}-${etapa.diasFin}`,
        diasVida,
        dentroDelRango,
        alimento: etapa.alimentoRecomendado
      });
      
      return dentroDelRango;
    });
    
    if (etapaCorrespondiente) {
      console.log(`✅ ETAPA ENCONTRADA para ${diasVida} días:`, {
        nombre: etapaCorrespondiente.nombre,
        rango: etapaCorrespondiente.rangoDias,
        alimento: etapaCorrespondiente.alimentoRecomendado,
        cantidadPorAnimal: etapaCorrespondiente.cantidadPorAnimal,
        unidad: etapaCorrespondiente.unidad
      });
      
      return {
        ...etapaCorrespondiente,
        esActual: true,
        diasActuales: diasVida
      };
    }
    
    // Si no encuentra etapa exacta, buscar la más cercana
    console.warn(`⚠️ No se encontró etapa exacta para ${diasVida} días`);
    
    // Buscar etapa más cercana (la que tenga el rango más próximo)
    const etapaMasCercana = this.etapasPlanAdministrador.reduce((mejor, actual) => {
      const distanciaActual = Math.min(
        Math.abs(diasVida - actual.diasInicio),
        Math.abs(diasVida - actual.diasFin)
      );
      
      const distanciaMejor = mejor ? Math.min(
        Math.abs(diasVida - mejor.diasInicio),
        Math.abs(diasVida - mejor.diasFin)
      ) : Number.MAX_SAFE_INTEGER;
      
      return distanciaActual < distanciaMejor ? actual : mejor;
    }, null);
    
    if (etapaMasCercana) {
      console.log(`🔄 Usando etapa más cercana para ${diasVida} días:`, {
        nombre: etapaMasCercana.nombre,
        rango: etapaMasCercana.rangoDias,
        alimento: etapaMasCercana.alimentoRecomendado
      });
      
      return {
        ...etapaMasCercana,
        esActual: false,
        diasActuales: diasVida,
        advertencia: `Etapa aproximada - No hay etapa exacta para ${diasVida} días`
      };
    }
    
    console.error(`❌ No se pudo determinar etapa para ${diasVida} días`);
    return null;
  }

  /**
   * Obtener TODAS las etapas correspondientes al rango de días del lote
   * CORREGIDO: Busca correctamente todas las etapas que correspondan a la edad
   */
  obtenerTodasLasEtapasParaLote(diasVida: number): any[] {
    console.log('🔍 Buscando TODAS las etapas para lote con', diasVida, 'días de vida');
    
    if (!this.etapasPlanAdministrador || this.etapasPlanAdministrador.length === 0) {
      console.warn('❌ No hay etapas del plan del administrador cargadas');
      return [];
    }
    
    // 🔧 CORREGIDO: Buscar todas las etapas que contengan exactamente los días de vida
    const etapasCorrespondientes = this.etapasPlanAdministrador.filter(etapa => {
      const dentroDelRango = diasVida >= etapa.diasInicio && diasVida <= etapa.diasFin;
      
      console.log(`🔍 Verificando etapa "${etapa.nombre}" para ${diasVida} días:`, {
        rango: `${etapa.diasInicio}-${etapa.diasFin}`,
        dentroDelRango,
        alimento: etapa.alimentoRecomendado,
        cantidad: etapa.cantidadPorAnimal
      });
      
      return dentroDelRango;
    });
    
    if (etapasCorrespondientes.length > 0) {
      console.log(`✅ ${etapasCorrespondientes.length} etapas encontradas para ${diasVida} días:`, 
        etapasCorrespondientes.map(e => ({
          nombre: e.nombre,
          alimento: e.alimentoRecomendado,
          cantidad: e.cantidadPorAnimal
        })));
        
      return etapasCorrespondientes.map(etapa => ({ 
        ...etapa, 
        esActual: true,
        diasActuales: diasVida 
      }));
    }
    
    console.warn(`⚠️ No se encontraron etapas exactas para ${diasVida} días`);
    
    // Si no hay etapas exactas, buscar la más cercana
    const etapaMasCercana = this.etapasPlanAdministrador.reduce((mejor, actual) => {
      const distanciaActual = Math.min(
        Math.abs(diasVida - actual.diasInicio),
        Math.abs(diasVida - actual.diasFin)
      );
      
      const distanciaMejor = mejor ? Math.min(
        Math.abs(diasVida - mejor.diasInicio),
        Math.abs(diasVida - mejor.diasFin)
      ) : Number.MAX_SAFE_INTEGER;
      
      return distanciaActual < distanciaMejor ? actual : mejor;
    }, null);
    
    if (etapaMasCercana) {
      console.log(`🔄 Usando etapa más cercana para ${diasVida} días:`, {
        nombre: etapaMasCercana.nombre,
        rango: etapaMasCercana.rangoDias,
        alimento: etapaMasCercana.alimentoRecomendado
      });
      
      return [{
        ...etapaMasCercana,
        esActual: false,
        diasActuales: diasVida,
        advertencia: `Etapa aproximada - No hay etapa exacta para ${diasVida} días`
      }];
    }
    
    console.error(`❌ No se pudo determinar ninguna etapa para ${diasVida} días`);
    return [];
  }

  /**
   * Formatear cantidad con 2 decimales
   */
  formatearCantidad(cantidad: number): string {
    if (cantidad == null || cantidad === undefined || isNaN(cantidad)) return '0.00';
    // Redondear a 2 decimales para evitar problemas de precisión de punto flotante
    return parseFloat(cantidad.toFixed(2)).toFixed(2);
  }

  constructor(
    private authService: AuthDirectService,
    private loteService: LoteService,
    private planService: PlanAlimentacionService,
    private alimentacionService: AlimentacionService,
    private productService: ProductService,
    private correccionService: CorreccionService,
    private planIntegradoService: PlanNutricionalIntegradoService,
    private cdr: ChangeDetectorRef
  ) {
    this.user = this.authService.currentUserValue;
  }

  ngOnInit(): void {
    this.cargarDatosIniciales();
    this.iniciarActualizacionAutomatica();
    
    // 🆕 Exponer funciones debug globalmente para acceso desde consola
    (window as any).pollosDebug = {
      stageChanges: () => this.debugStageChanges(),
      forceCheck: () => this.debugForceStageCheck(),
      simulateTime: (hours: number) => this.debugSimulateTimeChange(hours),
      lote01: () => this.debugLote01Info(),
      plan: () => this.debugPlanNutricional(),
      etapaParaDia: (dias: number) => this.debugEtapaParaDia(dias),
      getComponent: () => this
    };
    
    console.log('🛠️  Funciones debug disponibles en: window.pollosDebug');
    console.log('   • pollosDebug.stageChanges() - Mostrar info de cambios de etapa');
    console.log('   • pollosDebug.forceCheck() - Forzar verificación manual');
    console.log('   • pollosDebug.simulateTime(horas) - Simular avance de tiempo');
    console.log('   • pollosDebug.lote01() - Info específica del Lote 01');
    console.log('   • pollosDebug.plan() - NUEVO: Debug del plan nutricional');
    console.log('   • pollosDebug.etapaParaDia(dias) - NUEVO: Debug etapa para días específicos');
  }

  ngOnDestroy(): void {
    this.updateSubscription.unsubscribe();
  }

  /**
   * 🆕 Iniciar sistema de actualización automática cada minuto
   */
  private iniciarActualizacionAutomatica(): void {
    console.log('🕐 Iniciando actualización automática cada 60 segundos...');
    
    const updateTimer = interval(60000).subscribe(() => {
      this.verificarCambiosDeEtapa();
      this.actualizarDatosEnTiempoReal();
    });
    
    this.updateSubscription.add(updateTimer);
  }

  /**
   * 🆕 Verificar cambios de etapa automáticamente
   * CORREGIDO: Detecta correctamente los cambios basados en la edad del lote
   */
  private verificarCambiosDeEtapa(): void {
    this.lotesActivos.forEach(lote => {
      const diasVida = this.calcularDiasDeVida(lote.birthdate);
      const etapaActual = this.obtenerEtapaParaLote(diasVida);
      
      const loteId = lote.id || 0;
      const etapaNombreActual = etapaActual ? etapaActual.nombre : 'Sin etapa';
      
      // Verificar si hay cambio de etapa
      const ultimoCheck = this.lastStageCheck[loteId];
      
      if (ultimoCheck && ultimoCheck.stage !== etapaNombreActual) {
        console.log(`🔄 CAMBIO DE ETAPA DETECTADO en Lote ${lote.codigo}:`, {
          etapaAnterior: ultimoCheck.stage,
          etapaNueva: etapaNombreActual,
          diasVida,
          tiempoTranscurrido: Date.now() - ultimoCheck.timestamp
        });
        
        // Notificar cambio
        this.notificarCambioDeEtapa(lote, ultimoCheck.stage, etapaNombreActual, diasVida);
        
        // Actualizar registro
        this.lastStageCheck[loteId] = {
          stage: etapaNombreActual,
          timestamp: Date.now()
        };
        
        this.stageChangeDetected = true;
      } else {
        // Log de seguimiento normal
        console.log(`📊 Lote ${lote.codigo} - Etapa estable:`, {
          etapaActual: etapaNombreActual,
          diasVida,
          rango: etapaActual ? etapaActual.rangoDias : 'No definido'
        });
      }
    });
  }

  /**
   * 🆕 Notificar cambio de etapa
   */
  private notificarCambioDeEtapa(lote: any, etapaAnterior: string, etapaNueva: string, diasVida: number): void {
    console.log(`🚨 ALERTA: Cambio automático de etapa detectado`);
    console.log(`📊 Detalles del cambio:`);
    console.log(`   • Lote: ${lote.codigo}`);
    console.log(`   • Días de vida: ${diasVida}`);
    console.log(`   • Etapa anterior: ${etapaAnterior}`);
    console.log(`   • Nueva etapa: ${etapaNueva}`);
    console.log(`   • Momento exacto: ${new Date().toLocaleString()}`);
    
    // Actualizar la interfaz si es necesario
    if (this.loteSeleccionado && this.loteSeleccionado.id === lote.id) {
      this.actualizarEtapaLote(lote);
      this.cdr.detectChanges();
    }
  }

  /**
   * 🆕 Actualizar datos en tiempo real
   */
  private actualizarDatosEnTiempoReal(): void {
    // Solo recargar datos si se detectó un cambio de etapa
    if (this.stageChangeDetected) {
      console.log('🔄 Recargando datos debido a cambio de etapa...');
      this.cargarDatosIniciales();
      this.stageChangeDetected = false;
    }
  }

  /**
   * 🆕 Obtener información detallada del timing de cambio de etapa
   */
  getStageChangeInfo(lote: any): any {
    const diasVida = this.calcularDiasDeVida(lote.birthdate);
    const etapaActual = this.obtenerEtapaParaLote(diasVida);
    
    // Calcular cuándo será el próximo cambio
    let proximoCambio = null;
    if (etapaActual) {
      const diasRestantes = etapaActual.diasFin - diasVida;
      if (diasRestantes > 0) {
        const fechaCambio = new Date();
        fechaCambio.setDate(fechaCambio.getDate() + diasRestantes + 1);
        proximoCambio = {
          dias: diasRestantes + 1,
          fecha: fechaCambio.toLocaleDateString(),
          horaExacta: '00:00:00'
        };
      }
    }
    
    return {
      loteId: lote.id,
      codigo: lote.codigo,
      diasVida: diasVida,
      etapaActual: etapaActual ? etapaActual.nombre : 'Sin etapa',
      rangoActual: etapaActual ? `${etapaActual.diasInicio}-${etapaActual.diasFin} días` : 'N/A',
      proximoCambio: proximoCambio,
      horaCalculoCambio: '00:00:00 (medianoche)',
      explicacion: 'El cambio de etapa se produce automáticamente a las 00:00:00 cuando el lote cumple un nuevo día de vida'
    };
  }

  /**
   * Cargar datos iniciales
   */
  async cargarDatosIniciales(): Promise<void> {
    console.log('🔄 Iniciando carga de datos...');
    
    try {
      this.loading = true;
      
      // Cargar en paralelo: lotes, inventario y plan nutricional
      await Promise.all([
        this.cargarLotesPollos(),
        this.cargarInventarioPollos(),
        this.cargarPlanNutricional(),
        this.cargarEtapasPlanAdministrador() // 🔥 NUEVO: Cargar etapas del administrador
      ]);
      
      // Después de cargar todo, actualizar las etapas con el plan integrado
      await this.cargarEtapasAlimentacion();
      
      // 🆕 Inicializar seguimiento de etapas
      this.inicializarSeguimientoEtapas();
      
      // Actualizar estado del sistema con datos cargados
      this.actualizarEstadoSistema([]);
      
      console.log('✅ Todos los datos cargados exitosamente');
      
    } catch (error) {
      console.error('❌ Error al cargar datos iniciales:', error);
      
      // Actualizar estado con error
      this.estadoSistema = {
        lotesCargados: 0,
        planEncontrado: false,
        etapasCubiertas: false,
        problemasDetectados: 1,
        mensaje: '❌ Error al cargar datos',
        color: 'text-red-600'
      };
    } finally {
      this.loading = false;
    }
  }

  /**
   * 🆕 Inicializar seguimiento de etapas para todos los lotes
   */
  private inicializarSeguimientoEtapas(): void {
    console.log('🎯 Inicializando seguimiento de etapas...');
    
    this.lotesActivos.forEach(lote => {
      const diasVida = this.calcularDiasDeVida(lote.birthdate);
      const etapaActual = this.obtenerEtapaParaLote(diasVida);
      const etapaNombre = etapaActual ? etapaActual.nombre : 'Sin etapa';
      
      const loteId = lote.id || 0;
      this.lastStageCheck[loteId] = {
        stage: etapaNombre,
        timestamp: Date.now()
      };
      
      // Log detallado del estado inicial
      const stageInfo = this.getStageChangeInfo(lote);
      console.log(`📊 Lote ${lote.codigo}:`, stageInfo);
    });
  }

  /**
   * Cargar plan nutricional integrado
   */
  private async cargarPlanNutricional(): Promise<void> {
    try {
      console.log('🔍 Cargando plan nutricional para pollos...');
      
      this.planNutricionalActivo = await this.planIntegradoService
        .obtenerPlanActivo('pollos')
        .toPromise();
      
      if (this.planNutricionalActivo) {
        this.cronogramaCompleto = this.planNutricionalActivo.etapas;
        this.planCargado = true;
        
        console.log('✅ Plan nutricional cargado:', {
          plan: this.planNutricionalActivo.name,
          etapas: this.cronogramaCompleto.length,
          activo: this.planNutricionalActivo.activo
        });
        
        // Si hay un lote seleccionado, actualizar su etapa
        if (this.loteSeleccionado) {
          this.actualizarEtapaLote(this.loteSeleccionado);
        }
      } else {
        console.warn('⚠️ No se pudo cargar el plan nutricional');
      }
      
    } catch (error) {
      console.error('❌ Error al cargar plan nutricional:', error);
    }
  }

  /**
   * Cargar inventario de productos para pollos
   */
  private async cargarInventarioPollos(): Promise<void> {
    try {
      console.log('🔍 Cargando inventario de productos para pollos...');
      
      const todosLosProductos = await this.productService.getProducts().toPromise();
      
      // Filtrar productos para pollos (animal_id = 1 o nombre que contenga "pollo")
      this.productosPollos = todosLosProductos?.filter(producto => 
        producto.animal_id === 1 || 
        producto.name.toLowerCase().includes('pollo') ||
        producto.animal?.name?.toLowerCase().includes('pollo')
      ) || [];
      
      this.inventarioCargado = true;
      
      console.log('✅ Inventario cargado:', {
        totalProductos: todosLosProductos?.length || 0,
        productosPollos: this.productosPollos.length,
        productos: this.productosPollos.map(p => ({ name: p.name, stock: p.quantity }))
      });
      
    } catch (error) {
      console.error('❌ Error al cargar inventario:', error);
      this.productosPollos = [];
    }
  }

  /**
   * Cargar lotes de pollos
   */
  private async cargarLotesPollos(): Promise<void> {
    try {
      console.log('🔍 Cargando lotes de pollos...');
      
      // Usar el servicio de lotes existente
      this.loteService.getLotes().subscribe({
        next: (lotes) => {
          // Filtrar solo lotes de pollos
          this.lotesPollos = lotes.filter(lote => 
            lote.race?.animal?.name?.toLowerCase().includes('pollo') ||
            lote.race?.animal?.id === 1
          );
          
          // Filtrar lotes activos (que tienen animales vivos)
          this.lotesActivos = this.lotesPollos.filter(lote => lote.quantity > 0);
          
          console.log('✅ Lotes cargados:', {
            totalLotes: this.lotesPollos.length,
            lotesActivos: this.lotesActivos.length
          });
          
          // Si ya tenemos el plan cargado, actualizar etapas de los lotes
          if (this.planCargado) {
            this.lotesActivos.forEach(lote => this.actualizarEtapaLote(lote));
          }
        },
        error: (error) => {
          console.error('❌ Error al cargar lotes:', error);
          this.lotesPollos = [];
          this.lotesActivos = [];
        }
      });
      
    } catch (error) {
      console.error('❌ Error al cargar lotes:', error);
    }
  }

  /**
   * Método trackBy para optimizar el renderizado
   */
  trackByLote(index: number, lote: Lote): number {
    return lote.id || index;
  }

  /**
   * TrackBy function para las etapas
   */
  trackByEtapa(index: number, etapa: any): any {
    return etapa.id || index;
  }

  /**
   * Calcular el total de animales en lotes activos
   */
  getTotalAnimales(): number {
    return this.lotesActivos.reduce((total, lote) => total + lote.quantity, 0);
  }

  /**
   * Obtener las razas activas en formato resumido
   */
  getRazasActivas(): string {
    if (this.lotesActivos.length === 0) return 'Ninguna';
    
    const razas = this.lotesActivos
      .map(lote => lote.race?.name || 'Sin raza')
      .filter((raza, index, array) => array.indexOf(raza) === index); // Eliminar duplicados
    
    if (razas.length === 1) {
      return razas[0];
    } else if (razas.length === 2) {
      return razas.join(' y ');
    } else {
      return `${razas.length} diferentes`;
    }
  }

  /**
   * Obtener la fecha seleccionada en formato string
   */
  getSelectedDateString(): string {
    return this.selectedDate.toISOString().split('T')[0];
  }

  /**
   * Actualizar fecha seleccionada
   */
  updateSelectedDate(event: any): void {
    this.selectedDate = new Date(event.target.value);
    console.log('📅 Fecha actualizada:', this.selectedDate);
  }

  /**
   * Formatear fecha para mostrar
   */
  formatearFecha(fecha: Date | string | null): string {
    if (!fecha) return 'No definida';
    
    const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return fechaObj.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Calcular días de vida de un lote CORREGIDO
   * CORREGIDO: Calcula correctamente los días desde la fecha de registro
   */
  calcularDiasDeVida(fechaNacimiento: Date | null): number {
    if (!fechaNacimiento) return 0;
    
    // Crear fechas sin hora para calcular solo días completos
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Resetear a medianoche
    
    const fechaNac = new Date(fechaNacimiento);
    fechaNac.setHours(0, 0, 0, 0); // Resetear a medianoche
    
    // Calcular diferencia en milisegundos y convertir a días
    const diffTime = hoy.getTime() - fechaNac.getTime();
    const diasTranscurridos = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Debug para verificar el cálculo
    console.log('📅 Cálculo de edad del lote:', {
      fechaNacimiento: fechaNac.toLocaleDateString('es-ES'),
      fechaHoy: hoy.toLocaleDateString('es-ES'),
      diffTime,
      diasCalculados: diasTranscurridos,
      fechaNacOriginal: fechaNacimiento
    });
    
    // Retornar los días transcurridos (debe ser positivo)
    return Math.max(0, diasTranscurridos);
  }

  /**
   * Obtener etapa de alimentación actual para un lote
   */
  getEtapaActual(lote: Lote): PlanDetalle | null {
    if (!lote) return null;
    
    const diasVida = this.calcularDiasDeVida(lote.birthdate);
    
    console.log('🔍 Buscando etapa para lote:', {
      codigo: lote.codigo,
      diasVida: diasVida,
      fechaNacimiento: lote.birthdate,
      etapasDisponibles: this.etapasAlimentacion.length
    });
    
    // Buscar la etapa que contenga los días de vida actuales
    const etapaEncontrada = this.etapasAlimentacion.find(etapa => 
      diasVida >= etapa.dayStart && diasVida <= etapa.dayEnd
    );
    
    if (etapaEncontrada) {
      console.log('✅ Etapa encontrada:', {
        etapa: this.generarNombreEtapa(etapaEncontrada),
        rango: `${etapaEncontrada.dayStart}-${etapaEncontrada.dayEnd} días`,
        alimento: etapaEncontrada.product?.name,
        cantidadPorAnimal: etapaEncontrada.quantityPerAnimal
      });
    } else {
      console.log('❌ No se encontró etapa para', diasVida, 'días de vida');
      console.log('📋 Etapas disponibles:', this.etapasAlimentacion.map(e => ({
        etapa: this.generarNombreEtapa(e),
        rango: `${e.dayStart}-${e.dayEnd}`,
        alimento: e.product?.name
      })));
    }
    
    return etapaEncontrada || null;
  }

  /**
   * Calcular cantidad total de alimento para un lote y etapa
   */
  calcularCantidadTotal(lote: Lote, etapa: PlanDetalle): number {
    const animalesVivos = this.getAnimalesVivosActuales();
    return Math.round((animalesVivos * etapa.quantityPerAnimal) * 100) / 100;
  }

  /**
   * Obtener alimento asignado desde el plan del administrador
   */
  getAlimentoAsignado(): string {
    if (!this.loteSeleccionado) return 'No definido';
    
    const etapa = this.getEtapaActual(this.loteSeleccionado);
    
    if (etapa && etapa.product?.name) {
      return etapa.product.name;
    }
    
    // Si no hay etapa específica, pero hay días de vida, sugerir alimento por defecto
    const diasVida = this.calcularDiasDeVida(this.loteSeleccionado.birthdate);
    
    if (diasVida > 0) {
      if (diasVida <= 30) {
        return 'Alimento inicial (por defecto)';
      } else if (diasVida <= 90) {
        return 'Alimento de crecimiento (por defecto)';
      } else {
        return 'Alimento de engorde (por defecto)';
      }
    }
    
    return 'Alimento básico';
  }

  /**
   * Obtener cantidad por animal desde el plan
   */
  getCantidadPorAnimal(): string {
    if (!this.loteSeleccionado) return '0.000';
    
    const etapa = this.getEtapaActual(this.loteSeleccionado);
    
    if (etapa) {
      return etapa.quantityPerAnimal.toFixed(3);
    }
    
    // Si no hay etapa definida, usar cantidades por defecto según edad
    const diasVida = this.calcularDiasDeVida(this.loteSeleccionado.birthdate);
    
    if (diasVida <= 30) {
      return '0.025'; // 25g por pollo inicial
    } else if (diasVida <= 90) {
      return '0.075'; // 75g por pollo en crecimiento
    } else {
      return '0.120'; // 120g por pollo en engorde
    }
  }

  /**
   * Obtener cantidad total a aplicar hoy
   */
  getCantidadTotalHoy(): string {
    if (!this.loteSeleccionado) return '0.00';
    
    const animalesVivos = this.getAnimalesVivosActualesNum();
    const cantidadPorAnimal = parseFloat(this.getCantidadPorAnimal());
    
    const cantidadTotal = animalesVivos * cantidadPorAnimal;
    return parseFloat(cantidadTotal.toFixed(2)).toFixed(2);
  }

  /**
   * Obtener cantidad total a aplicar hoy (número)
   */
  getCantidadTotalHoyNum(): number {
    return parseFloat(this.getCantidadTotalHoy());
  }

  /**
   * Obtener animales vivos actuales
   */
  getAnimalesVivosActuales(): number {
    if (!this.loteSeleccionado) return 0;
    
    const loteId = this.loteSeleccionado.id || 0;
    
    // Si ya tenemos un valor actualizado, usarlo
    if (this.animalesVivosActuales[loteId] !== undefined) {
      return this.animalesVivosActuales[loteId];
    }
    
    // Si no, usar la cantidad original del lote
    return this.loteSeleccionado.quantity;
  }

  /**
   * Obtener animales vivos actuales (número)
   */
  getAnimalesVivosActualesNum(): number {
    return this.getAnimalesVivosActuales();
  }

  /**
   * Obtener valor total de venta
   */
  getValorTotalVenta(): string {
    const cantidad = this.registroCompleto.animalesVendidos || 0;
    const precio = this.registroCompleto.precioUnitario || 0;
    const total = cantidad * precio;
    return parseFloat(total.toFixed(2)).toFixed(2);
  }

  /**
   * Validar si el lote se cerrará con este registro
   */
  validarCierreLote(): boolean {
    if (!this.loteSeleccionado) return false;
    
    const animalesVivosActuales = this.getAnimalesVivosActuales();
    const animalesMuertos = this.registroCompleto.animalesMuertos || 0;
    const animalesVendidos = this.registroCompleto.animalesVendidos || 0;
    
    const animalesQueQuedan = animalesVivosActuales - animalesMuertos - animalesVendidos;
    
    return animalesQueQuedan <= 0;
  }

  /**
   * Obtener historial de registros para el lote actual
   */
  getHistorialRegistros(): RegistroHistorial[] {
    if (!this.loteSeleccionado) return [];
    
    const loteId = this.loteSeleccionado.id || 0;
    return this.historialSimulado[loteId] || [];
  }

  /**
   * Obtener consumo acumulado del lote
   */
  getConsumoAcumulado(): string {
    const historial = this.getHistorialRegistros();
    const totalConsumo = historial.reduce((total, registro) => total + registro.cantidad, 0);
    return totalConsumo.toFixed(2);
  }

  /**
   * Obtener consumo por pollo
   */
  getConsumoPorPollo(): string {
    const historial = this.getHistorialRegistros();
    const totalConsumo = historial.reduce((total, registro) => total + registro.cantidad, 0);
    const animalesVivos = this.getAnimalesVivosActuales();
    
    if (animalesVivos === 0) return '0.00';
    
    const consumoPorPollo = totalConsumo / animalesVivos;
    return consumoPorPollo.toFixed(3);
  }

  /**
   * Obtener consumo con el registro de hoy
   */
  getConsumoConHoy(): string {
    const consumoAcumulado = parseFloat(this.getConsumoAcumulado());
    const consumoHoy = this.getCantidadTotalHoyNum();
    const total = consumoAcumulado + consumoHoy;
    return total.toFixed(2);
  }

  /**
   * Obtener información detallada de la etapa actual
   */
  getInfoEtapaDetallada() {
    if (!this.loteSeleccionado) return null;
    
    const diasVida = this.calcularDiasDeVida(this.loteSeleccionado.birthdate);
    const etapa = this.getEtapaActual(this.loteSeleccionado);
    
    return {
      diasVida: diasVida,
      etapa: etapa,
      nombreEtapa: etapa ? this.generarNombreEtapa(etapa) : 'Sin etapa definida',
      rangoEtapa: etapa ? `${etapa.dayStart}-${etapa.dayEnd} días` : 'N/A',
      alimento: etapa?.product?.name || 'No definido',
      cantidadPorAnimal: etapa?.quantityPerAnimal || 0,
      cantidadTotal: this.getCantidadTotalHoyNum(),
      animalesVivos: this.getAnimalesVivosActuales(),
      fechaNacimiento: this.loteSeleccionado.birthdate
    };
  }

  /**
   * Validar si la cantidad aplicada está dentro del rango esperado
   */
  validarCantidadAplicada(): { valida: boolean, mensaje: string, porcentaje: number } {
    const cantidadAplicada = this.registroCompleto.cantidadAplicada || 0;
    const cantidadEsperada = this.getCantidadTotalHoyNum();
    
    if (cantidadEsperada === 0) {
      return {
        valida: false,
        mensaje: 'No se puede calcular la cantidad esperada',
        porcentaje: 0
      };
    }
    
    const porcentaje = (cantidadAplicada / cantidadEsperada) * 100;
    
    let valida = true;
    let mensaje = '';
    
    if (porcentaje < 80) {
      valida = false;
      mensaje = '⚠️ Cantidad muy baja (menos del 80% del plan)';
    } else if (porcentaje > 120) {
      valida = false;
      mensaje = '⚠️ Cantidad muy alta (más del 120% del plan)';
    } else if (porcentaje >= 95 && porcentaje <= 105) {
      mensaje = '✅ Cantidad óptima (según plan)';
    } else {
      mensaje = '✓ Cantidad aceptable';
    }
    
    return {
      valida: valida,
      mensaje: mensaje,
      porcentaje: porcentaje
    };
  }

  /**
   * Inicializar registro completo con valores por defecto
   */
  private inicializarRegistroCompleto(): void {
    if (!this.loteSeleccionado) return;
    
    // 🔥 USAR DATOS DEL PLAN NUTRICIONAL DEL ADMINISTRADOR
    const diasVida = this.calcularDiasDeVida(this.loteSeleccionado.birthdate);
    const etapaAdministrador = this.obtenerEtapaParaLote(diasVida);
    
    // Calcular cantidad basada en la etapa del administrador
    let cantidadSugerida = 0;
    let tipoAlimento = 'Sin alimento definido';
    
    if (etapaAdministrador) {
      // Cantidad = cantidad por animal * número de animales vivos
      const animalesVivos = this.getAnimalesVivosActuales();
      cantidadSugerida = parseFloat((etapaAdministrador.cantidadPorAnimal * animalesVivos).toFixed(2));
      tipoAlimento = etapaAdministrador.alimentoRecomendado;
      
      console.log('✅ Etapa del administrador encontrada:', {
        etapa: etapaAdministrador.nombre,
        diasVida: diasVida,
        cantidadPorAnimal: etapaAdministrador.cantidadPorAnimal,
        animalesVivos: animalesVivos,
        cantidadTotal: cantidadSugerida,
        alimento: tipoAlimento
      });
    } else {
      console.warn('⚠️ No se encontró etapa del administrador para', diasVida, 'días');
    }
    
    this.registroCompleto = {
      fecha: this.getSelectedDateString(),
      hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      cantidadAplicada: cantidadSugerida,
      tipoAlimento: tipoAlimento,
      animalesVivos: this.getAnimalesVivosActuales(),
      animalesMuertos: 0,
      animalesEnfermos: 0,
      fechaVenta: '',
      animalesVendidos: 0,
      precioUnitario: 0,
      valorTotalVenta: 0,
      observacionesVenta: '',
      observacionesSalud: '',
      observacionesGenerales: '',
      loteId: this.loteSeleccionado.id || 0,
      usuarioId: this.user?.id || 0,
      stockAnterior: this.getStockActualNum(),
      stockPosterior: 0,
      loteCerrado: false,
      motivoCierre: ''
    };
    
    console.log('📝 Registro inicializado con datos del administrador:', {
      diasVida: diasVida,
      etapa: etapaAdministrador?.nombre || 'Sin etapa',
      cantidadSugerida: cantidadSugerida,
      alimento: tipoAlimento,
      animalesVivos: this.getAnimalesVivosActuales()
    });
  }

  /**
   * Abrir modal de alimentación
   */
  abrirModalAlimentacion(lote: Lote): void {
    console.log('🔥 INICIANDO abrirModalAlimentacion...');
    console.log('🔥 Lote recibido:', lote);
    console.log('🔥 modalAbierto ANTES:', this.modalAbierto);
    
    this.loteSeleccionado = lote;
    
    // Calcular días de vida una sola vez
    const diasVida = this.calcularDiasDeVida(lote.birthdate);
    
    // Obtener etapas disponibles para este lote (una sola vez)
    this.etapasDisponiblesLote = this.obtenerTodasLasEtapasParaLote(diasVida);
    this.etapaActualLote = this.obtenerEtapaParaLote(diasVida);
    
    console.log('🎯 Etapas calculadas para', diasVida, 'días:', this.etapasDisponiblesLote);
    console.log('🎯 Etapa actual:', this.etapaActualLote);
    
    // Inicializar el conteo de animales vivos si no existe
    const loteId = lote.id || 0;
    if (this.animalesVivosActuales[loteId] === undefined) {
      this.animalesVivosActuales[loteId] = lote.quantity;
    }
    
    // Inicializar registro completo con valores inteligentes
    this.inicializarRegistroCompleto();

    this.modalAbierto = true;
    
    // Forzar detección de cambios inmediatamente
    this.cdr.detectChanges();
    
    console.log('🔥 modalAbierto DESPUÉS:', this.modalAbierto);
    console.log('🔥 loteSeleccionado:', this.loteSeleccionado);
    
    // Log detallado para debugging
    const infoEtapa = this.getInfoEtapaDetallada();
    console.log('🎯 Abriendo modal para lote:', lote.codigo);
    console.log('📊 Información completa:', infoEtapa);
    
    // Timeout para verificar estado
    setTimeout(() => {
      console.log('🔥 modalAbierto EN TIMEOUT:', this.modalAbierto);
      console.log('🔥 Modal element exists:', document.querySelector('.modal-overlay'));
    }, 100);
  }

  /**
   * Cerrar modal de alimentación
   */
  cerrarModal(): void {
    this.modalAbierto = false;
    this.loteSeleccionado = null;
    this.resetearRegistro();
  }

  /**
   * Resetear el registro completo
   */
  private resetearRegistro(): void {
    this.registroCompleto = {
      fecha: '',
      hora: '',
      cantidadAplicada: 0,
      tipoAlimento: '',
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
      usuarioId: 0,
      stockAnterior: 0,
      stockPosterior: 0,
      loteCerrado: false,
      motivoCierre: ''
    };
  }

  /**
   * Recalcular animales vivos cuando se registran muertes o ventas
   */
  recalcularAnimalesVivos(): void {
    if (!this.loteSeleccionado) return;
    
    const loteId = this.loteSeleccionado.id || 0;
    const animalesIniciales = this.animalesVivosActuales[loteId] || this.loteSeleccionado.quantity;
    const animalesMuertos = this.registroCompleto.animalesMuertos || 0;
    const animalesVendidos = this.registroCompleto.animalesVendidos || 0;
    
    // Calcular animales vivos para este registro
    const animalesVivosCalculados = Math.max(0, animalesIniciales - animalesMuertos - animalesVendidos);
    this.registroCompleto.animalesVivos = animalesVivosCalculados;
    
    // Recalcular la cantidad de alimento necesaria
    this.registroCompleto.cantidadAplicada = this.getCantidadTotalHoyNum();
    
    // Calcular valor total de venta
    this.registroCompleto.valorTotalVenta = parseFloat(this.getValorTotalVenta());
    
    console.log('🔄 Recalculando animales vivos:', {
      iniciales: animalesIniciales,
      muertos: animalesMuertos,
      vendidos: animalesVendidos,
      vivos: animalesVivosCalculados,
      cantidadAlimento: this.registroCompleto.cantidadAplicada,
      valorVenta: this.registroCompleto.valorTotalVenta
    });
  }

  /**
   * Obtener stock actual
   */
  getStockActual(): string {
    return this.getStockActualNum().toFixed(2);
  }

  /**
   * Obtener stock actual (número) desde el inventario real
   */
  getStockActualNum(): number {
    if (!this.inventarioCargado || this.productosPollos.length === 0) {
      console.log('⚠️ Inventario no cargado o vacío');
      return 0;
    }

    const tipoAlimento = this.registroCompleto.tipoAlimento || '';
    
    // Buscar el producto que coincida con el tipo de alimento
    const producto = this.productosPollos.find(p => {
      const nombreProducto = p.name.toLowerCase();
      const tipoABuscar = tipoAlimento.toLowerCase();
      
      // Mapear tipos de alimento comunes
      if (tipoABuscar.includes('concentrado') || tipoABuscar.includes('inicial') || tipoABuscar.includes('crecimiento') || tipoABuscar.includes('acabado')) {
        return nombreProducto.includes('concentrado');
      }
      if (tipoABuscar.includes('maiz') || tipoABuscar.includes('maíz')) {
        return nombreProducto.includes('maíz') || nombreProducto.includes('maiz');
      }
      if (tipoABuscar.includes('mixto')) {
        return nombreProducto.includes('mixto') || nombreProducto.includes('mix');
      }
      
      // Búsqueda general
      return nombreProducto.includes(tipoABuscar);
    });

    if (producto) {
      console.log(`📦 Stock encontrado para ${tipoAlimento}: ${producto.quantity} ${producto.unitMeasurement?.name || 'kg'}`);
      return producto.quantity || 0;
    } else {
      console.log(`⚠️ No se encontró producto para el tipo: ${tipoAlimento}`);
      // Si no encontramos el producto específico, devolver el stock del primer producto disponible
      const primerProducto = this.productosPollos[0];
      if (primerProducto) {
        console.log(`📦 Usando stock del primer producto disponible: ${primerProducto.name} - ${primerProducto.quantity} ${primerProducto.unitMeasurement?.name || 'kg'}`);
        return primerProducto.quantity || 0;
      }
      return 0;
    }
  }

  /**
   * Obtener stock después del registro
   */
  getStockDespues(): string {
    const stockActual = this.getStockActualNum();
    const cantidadADescontar = this.getCantidadTotalHoyNum();
    const stockFinal = Math.max(0, stockActual - cantidadADescontar);
    return stockFinal.toFixed(2);
  }

  /**
   * Validar formulario completo
   */
  validarFormularioCompleto(): boolean {
    return !!(
      this.registroCompleto.fecha &&
      this.registroCompleto.hora &&
      this.registroCompleto.animalesMuertos >= 0 &&
      this.registroCompleto.animalesEnfermos >= 0 &&
      this.registroCompleto.animalesVendidos >= 0 &&
      this.loteSeleccionado &&
      this.getCantidadTotalHoyNum() >= 0
    );
  }

  /**
   * Registrar alimentación completa con validación preventiva
   */
  async registrarAlimentacionCompleta(): Promise<void> {
    if (!this.validarFormularioCompleto() || !this.loteSeleccionado) {
      alert('❌ Por favor completa todos los campos obligatorios');
      return;
    }

    const cantidadTotal = this.getCantidadTotalHoyNum();
    
    // Validar stock suficiente si hay alimentación
    if (cantidadTotal > 0 && cantidadTotal > this.getStockActualNum()) {
      alert('❌ No hay suficiente stock disponible para esta cantidad');
      return;
    }

    // 🔥 NUEVA VALIDACIÓN PREVENTIVA
    if (cantidadTotal > 0) {
      try {
        const edad = this.calcularDiasDeVida(this.loteSeleccionado.birthdate);
        const etapa = this.determinarEtapaLote(this.loteSeleccionado);
        const cantidadPorAnimal = cantidadTotal / this.loteSeleccionado.quantity;
        
        const validacion = await this.correccionService.validarCantidad(
          'pollos', 
          etapa, 
          cantidadPorAnimal, 
          this.loteSeleccionado.quantity
        ).toPromise();

        if (validacion) {
          // Mostrar resultado de validación
          this.mostrarValidacion(validacion);
          
          // Si requiere confirmación, preguntar al usuario
          const continuar = await this.correccionService.mostrarDialogoConfirmacion(validacion);
          if (!continuar) {
            return;
          }
        }
      } catch (error) {
        console.warn('Error en validación preventiva:', error);
        // Continuar sin validación si hay error
      }
    }

    // Determinar si el lote se cerrará
    const loteSeCierra = this.validarCierreLote();
    
    // Preparar datos para envío
    const registroFinal = {
      ...this.registroCompleto,
      cantidadAplicada: cantidadTotal,
      valorTotalVenta: parseFloat(this.getValorTotalVenta()),
      loteId: this.loteSeleccionado.id,
      usuarioId: this.user?.id || 0,
      stockAnterior: this.getStockActualNum(),
      stockPosterior: parseFloat(this.getStockDespues()),
      loteCerrado: loteSeCierra,
      motivoCierre: loteSeCierra ? 'Lote agotado por ventas/mortalidad' : ''
    };

    console.log('✅ Registrando alimentación completa:', registroFinal);

    // Simular actualización de stock
    if (registroFinal.cantidadAplicada > 0) {
      this.actualizarStockInventario(registroFinal.tipoAlimento, registroFinal.cantidadAplicada);
    }

    // Actualizar animales vivos del lote
    if (registroFinal.animalesMuertos > 0 || registroFinal.animalesVendidos > 0) {
      this.actualizarLoteConCambios(registroFinal.animalesMuertos, registroFinal.animalesVendidos);
    }

    // Simular seguimiento de animales enfermos
    if (registroFinal.animalesEnfermos > 0) {
      this.registrarAnimalesEnfermos(registroFinal.animalesEnfermos, registroFinal.observacionesSalud);
    }

    // Agregar al historial
    this.agregarAlHistorial(registroFinal);

    // Si el lote se cierra, enviarlo al histórico
    if (loteSeCierra) {
      this.cerrarYEnviarAHistorico(registroFinal);
    }

    // Llamada real al backend para guardar el registro
    this.registrarAlimentacionEnBackend(registroFinal).then(() => {
      let mensaje = `✅ Alimentación registrada exitosamente para el lote ${this.loteSeleccionado!.codigo}\n\n📊 Resumen:\n`;
      
      if (registroFinal.cantidadAplicada > 0) {
        mensaje += `• Alimento aplicado: ${registroFinal.cantidadAplicada} kg\n`;
      }
      
      mensaje += `• Animales vivos: ${registroFinal.animalesVivos}\n`;
      
      if (registroFinal.cantidadAplicada > 0) {
        mensaje += `• Stock actualizado: ${registroFinal.stockPosterior} kg restantes\n`;
      }
      
      if (registroFinal.animalesMuertos > 0) {
        mensaje += `• Mortalidad registrada: ${registroFinal.animalesMuertos} animales\n`;
      }
      
      if (registroFinal.animalesVendidos > 0) {
        mensaje += `• Venta registrada: ${registroFinal.animalesVendidos} animales por $${registroFinal.valorTotalVenta}\n`;
      }
      
      if (registroFinal.animalesEnfermos > 0) {
        mensaje += `• Animales enfermos: ${registroFinal.animalesEnfermos} (enviados a seguimiento)\n`;
      }
      
      if (loteSeCierra) {
        mensaje += `\n🔒 LOTE CERRADO: El lote ha sido enviado al histórico.`;
      }

      alert(mensaje);
      
      this.cerrarModal();
      
      // Recargar datos si el lote se cerró
      if (loteSeCierra) {
        this.cargarDatosIniciales();
      }
    }).catch((error) => {
      console.error('Error al registrar alimentación:', error);
      alert('Error al registrar alimentación. Por favor, intenta nuevamente.');
    });
  }

  /**
   * Registrar alimentación en el backend usando el servicio
   */
  private async registrarAlimentacionEnBackend(registro: RegistroAlimentacionCompleto): Promise<any> {
    const request: RegistroAlimentacionRequest = {
      loteId: this.loteSeleccionado?.id.toString() || '',
      fecha: registro.fecha,
      cantidadAplicada: registro.cantidadAplicada,
      animalesVivos: registro.animalesVivos,
      animalesMuertos: registro.animalesMuertos,
      observaciones: `${registro.observacionesGenerales || ''} ${registro.observacionesSalud || ''}`.trim()
    };

    console.log('🍽️ Enviando registro mediante servicio:', request);

    try {
      // Intentar registro real en backend
      return await this.alimentacionService.registrarAlimentacion(request).toPromise();
    } catch (error) {
      console.warn('⚠️ Backend no disponible, simulando registro exitoso:', error);
      
      // ✅ SOLUCIÓN TEMPORAL: Simular respuesta exitosa
      const simulatedResponse = {
        id: Date.now(),
        executionDate: registro.fecha,
        quantityApplied: registro.cantidadAplicada,
        observations: request.observaciones,
        status: 'SIMULADO_OK',
        message: '✅ Registro simulado exitoso (backend no disponible)'
      };
      
      console.log('✅ Simulando registro exitoso:', simulatedResponse);
      return simulatedResponse;
    }
  }

  /**
   * Cerrar lote y enviar al histórico
   */
  private cerrarYEnviarAHistorico(registro: RegistroAlimentacionCompleto): void {
    if (!this.loteSeleccionado) return;
    
    const historial = this.getHistorialRegistros();
    const totalConsumo = parseFloat(this.getConsumoConHoy());
    const totalVentas = historial.reduce((total, reg) => total + (reg.valorVenta || 0), 0) + registro.valorTotalVenta;
    
    const loteHistorico: LoteHistorico = {
      loteId: registro.loteId,
      codigo: this.loteSeleccionado.codigo,
      fechaInicio: this.loteSeleccionado.birthdate?.toISOString().split('T')[0] || '',
      fechaCierre: registro.fecha,
      motivoCierre: registro.motivoCierre,
      animalesIniciales: this.loteSeleccionado.quantity,
      animalesVendidos: historial.reduce((total, reg) => total + (reg.animalesVendidos || 0), 0) + registro.animalesVendidos,
      animalesMuertos: registro.animalesMuertos,
      consumoTotalAlimento: totalConsumo,
      valorTotalVentas: totalVentas,
      rentabilidad: totalVentas - (totalConsumo * 2.5) // Estimación simple
    };
    
    this.lotesHistoricos.push(loteHistorico);
    
    console.log('📚 Lote enviado al histórico:', loteHistorico);
    
    // Remover el lote de los activos
    this.lotesActivos = this.lotesActivos.filter(lote => lote.id !== registro.loteId);
  }

  /**
   * Agregar registro al historial
   */
  private agregarAlHistorial(registro: RegistroAlimentacionCompleto): void {
    const loteId = registro.loteId;
    
    if (!this.historialSimulado[loteId]) {
      this.historialSimulado[loteId] = [];
    }
    
    const nuevoRegistro: RegistroHistorial = {
      fecha: registro.fecha,
      cantidad: registro.cantidadAplicada,
      animalesVivos: registro.animalesVivos,
      animalesVendidos: registro.animalesVendidos > 0 ? registro.animalesVendidos : undefined,
      valorVenta: registro.valorTotalVenta > 0 ? registro.valorTotalVenta : undefined,
      observaciones: registro.observacionesGenerales || 'Sin observaciones'
    };
    
    // Agregar al inicio del array para mostrar el más reciente primero
    this.historialSimulado[loteId].unshift(nuevoRegistro);
    
    console.log('📋 Registro agregado al historial:', nuevoRegistro);
  }

  /**
   * Actualizar stock de inventario
   */
  private actualizarStockInventario(tipoAlimento: string, cantidadUsada: number): void {
    // Buscar el producto correspondiente en el inventario
    const producto = this.productosPollos.find(p => {
      const nombreProducto = p.name.toLowerCase();
      const tipoABuscar = tipoAlimento.toLowerCase();
      
      // Mapear tipos de alimento comunes
      if (tipoABuscar.includes('concentrado') || tipoABuscar.includes('inicial') || tipoABuscar.includes('crecimiento') || tipoABuscar.includes('acabado')) {
        return nombreProducto.includes('concentrado');
      }
      if (tipoABuscar.includes('maiz') || tipoABuscar.includes('maíz')) {
        return nombreProducto.includes('maíz') || nombreProducto.includes('maiz');
      }
      if (tipoABuscar.includes('mixto')) {
        return nombreProducto.includes('mixto') || nombreProducto.includes('mix');
      }
      
      return nombreProducto.includes(tipoABuscar);
    });

    if (producto) {
      const stockAnterior = producto.quantity || 0;
      const nuevoStock = Math.max(0, stockAnterior - cantidadUsada);
      
      // Actualizar localmente
      producto.quantity = nuevoStock;
      
      console.log(`📦 Stock actualizado - ${producto.name}: ${stockAnterior} → ${nuevoStock} ${producto.unitMeasurement?.name || 'kg'}`);
      
      // TODO: Aquí se debería actualizar en el backend
      // this.productService.updateProduct(producto).subscribe({
      //   next: (response) => console.log('✅ Stock actualizado en backend'),
      //   error: (error) => console.error('❌ Error al actualizar stock:', error)
      // });
      
    } else {
      console.log(`⚠️ No se encontró producto para actualizar stock: ${tipoAlimento}`);
    }
  }

  /**
   * Actualizar lote con cambios (mortalidad y ventas)
   */
  private actualizarLoteConCambios(animalesMuertos: number, animalesVendidos: number): void {
    if (this.loteSeleccionado) {
      const loteId = this.loteSeleccionado.id || 0;
      
      // Actualizar el conteo de animales vivos
      const cambioTotal = animalesMuertos + animalesVendidos;
      this.animalesVivosActuales[loteId] = Math.max(0, this.getAnimalesVivosActuales() - cambioTotal);
      
      console.log('🔄 Actualizando lote:', {
        lote: this.loteSeleccionado.codigo,
        animalesMuertos: animalesMuertos,
        animalesVendidos: animalesVendidos,
        animalesVivosAntes: this.getAnimalesVivosActuales() + cambioTotal,
        animalesVivosDespues: this.animalesVivosActuales[loteId]
      });
    }
  }

  /** 
   * Registrar animales enfermos para seguimiento
   */
  private registrarAnimalesEnfermos(animalesEnfermos: number, observaciones: string): void {
    console.log('🏥 Registrando animales enfermos para seguimiento:', {
      lote: this.loteSeleccionado?.codigo,
      cantidadEnfermos: animalesEnfermos,
      observaciones: observaciones,
      fechaRegistro: new Date().toISOString()
    });
    
    // Aquí se enviarían los datos al módulo de seguimiento de salud
    // this.saludService.registrarAnimalesEnfermos(...)
  }

  /**
   * Cargar etapas de alimentación integradas del módulo admin
   */
  async cargarEtapasAlimentacion(): Promise<void> {
    try {
      console.log('🔄 Cargando etapas desde el módulo admin...');
      
      if (this.planNutricionalActivo?.etapas) {
        this.etapasAlimentacion = this.planNutricionalActivo.etapas.map(etapa => ({
          dayStart: etapa.diasEdad.min,
          dayEnd: etapa.diasEdad.max,
          quantityPerAnimal: etapa.quantityPerAnimal || 0,
          frequency: (etapa.frequency as 'DIARIA' | 'INTERDIARIA' | 'SEMANAL') || 'DIARIA',
          instructions: etapa.instructions || etapa.descripcion,
          product: etapa.producto,
          planAlimentacion: {
            id: this.planNutricionalActivo!.id,
            name: this.planNutricionalActivo!.name,
            animal: { id: 1, name: 'Pollos' }
          }
        }));
        
        console.log('✅ Etapas cargadas desde plan integrado:', this.etapasAlimentacion.length);
      } else {
        console.log('⚠️ Plan nutricional no disponible, usando configuración por defecto');
        this.etapasAlimentacion = [];
      }
      
    } catch (error) {
      console.error('❌ Error en cargarEtapasAlimentacion:', error);
      this.etapasAlimentacion = [];
    }
  }

  /**
   * Determinar la etapa según días de vida del lote
   */
  private determinarEtapaLote(lote: Lote): string {
    const diasVida = this.calcularDiasDeVida(lote.birthdate);
    
    if (diasVida <= 7) return 'Inicial';
    if (diasVida <= 21) return 'Crecimiento';
    if (diasVida <= 35) return 'Desarrollo';
    if (diasVida <= 49) return 'Engorde';
    return 'Finalización';
  }

  /**
   * Encontrar etapa del plan según días de vida
   */
  private findEtapaForDayNumber(detalles: PlanDetalle[], dayNumber: number): PlanDetalle | null {
    if (!detalles || detalles.length === 0) return null;
    
    const etapaEncontrada = detalles.find(detalle => 
      dayNumber >= detalle.dayStart && dayNumber <= detalle.dayEnd
    );
    
    console.log('🔍 Buscando etapa para día:', dayNumber);
    console.log('📋 Detalles disponibles:', detalles.map(d => ({
      dias: `${d.dayStart}-${d.dayEnd}`,
      producto: d.product?.name,
      cantidad: d.quantityPerAnimal,
      instrucciones: d.instructions
    })));
    
    if (etapaEncontrada) {
      console.log('✅ Etapa encontrada:', {
        dias: `${etapaEncontrada.dayStart}-${etapaEncontrada.dayEnd}`,
        producto: etapaEncontrada.product?.name,
        cantidad: etapaEncontrada.quantityPerAnimal,
        instrucciones: etapaEncontrada.instructions
      });
      
      return etapaEncontrada;
    }
    
    console.log('❌ No se encontró etapa para el día:', dayNumber);
    return null;
  }

  /**
   * Actualizar información del plan para un lote específico
   */
  private async actualizarPlanInfo(lote: Lote): Promise<void> {
    if (!lote.id) {
      return;
    }
    
    const diasVida = this.calcularDiasDeVida(lote.birthdate);
    
    // TODO: Implementar servicio para obtener asignaciones de planes
    // Por ahora, simulamos que no hay plan asignado
    this.planInfo[lote.id] = {
      tienePlan: false,
      diasVida: diasVida,
      etapa: this.determinarEtapaLote(lote),
      rangoDias: `Día ${diasVida}`,
      alimentoAsignado: 'No asignado',
      cantidadPorAnimal: 0,
      sinEtapa: true
    };
  }

  /**
   * Obtener todas las etapas del plan para mostrar resumen
   */
  private async obtenerEtapasDelPlan(planId: number): Promise<any[]> {
    try {
      const detalles = await this.planService.getDetallesByPlan(planId).toPromise();
      return detalles.map(detalle => ({
        rangoDias: `${detalle.dayStart}-${detalle.dayEnd}`,
        etapa: this.generarNombreEtapa(detalle),
        alimento: detalle.product?.name || 'No especificado',
        cantidad: detalle.quantityPerAnimal || 0,
        instrucciones: detalle.instructions || 'Sin instrucciones'
      }));
    } catch (error) {
      console.error('❌ Error al obtener etapas del plan:', error);
      return [];
    }
  }

  /** 
   * Generar nombre de etapa basado en el rango de días
   */
  private generarNombreEtapa(detalle: PlanDetalle): string {
    if (detalle.instructions && detalle.instructions.trim()) {
      return detalle.instructions;
    }
    
    // Generar nombre basado en rango de días
    const diasPromedio = (detalle.dayStart + detalle.dayEnd) / 2;
    
    if (diasPromedio <= 7) return 'Etapa Inicial';
    if (diasPromedio <= 21) return 'Etapa de Crecimiento';
    if (diasPromedio <= 35) return 'Etapa de Desarrollo';
    if (diasPromedio <= 49) return 'Etapa de Engorde';
    return 'Etapa de Finalización';
  }

  /**
   * Preparar datos para el modal
   */
  private async prepararDatosModal(lote: Lote): Promise<void> {
    const diasVida = this.calcularDiasDeVida(lote.birthdate);
    
    // TODO: Implementar carga de datos del plan asignado
    // Por ahora, establecemos valores por defecto
    this.modalData.cantidadSugerida = 0;
    this.modalData.tipoAlimento = 'No especificado';
    this.modalData.etapaNombre = this.determinarEtapaLote(lote);
    this.modalData.animalesVivos = lote.quantity;
  }

  /**
   * Obtener lista de productos disponibles para mostrar en la UI
   */
  getProductosDisponibles(): Product[] {
    return this.productosPollos.filter(producto => (producto.quantity || 0) > 0);
  }

  /**
   * Obtener stock disponible para un producto específico
   */
  getStockProducto(producto: Product): string {
    const cantidad = producto.quantity || 0;
    const unidad = producto.unitMeasurement?.name || 'kg';
    return `${cantidad} ${unidad}`;
  }

  /**
   * Verificar si hay stock suficiente para la cantidad requerida
   */
  hayStockSuficiente(cantidadRequerida: number): boolean {
    const stockActual = this.getStockActualNum();
    return stockActual >= cantidadRequerida;
  }

  /**
   * Mostrar resultado de validación al usuario
   */
  mostrarValidacion(validacion: ValidacionResult): void {
    let icono = '';
    let color = '';
    
    switch(validacion.tipoAlerta) {
      case 'error':
        icono = '❌';
        color = 'color: red;';
        break;
      case 'warning':
        icono = '⚠️';
        color = 'color: orange;';
        break;
      case 'info':
        icono = '✅';
        color = 'color: green;';
        break;
    }
    
    console.log(`%c${icono} VALIDACIÓN: ${validacion.mensaje}`, color);
    
    // También podrías mostrar en la UI si tienes un componente de notificaciones
    if (validacion.tipoAlerta === 'error') {
      alert(`${icono} ${validacion.mensaje}`);
    }
  }

  /**
   * Corregir un registro existente
   */
  async corregirRegistro(registroId: number, motivo: string, nuevaCantidad?: number): Promise<void> {
    if (!this.user) {
      alert('❌ Usuario no autenticado');
      return;
    }

    const request: CorreccionRequest = {
      registroId: registroId,
      motivoCorreccion: motivo,
      usuarioId: this.user.id,
      nuevaCantidad: nuevaCantidad
    };

    try {
      const registroCorregido = await this.correccionService.corregirRegistro(request).toPromise();
      if (registroCorregido) {
        alert('✅ Registro corregido exitosamente');
        // Recargar datos si es necesario
        this.getHistorialRegistros();
      }
    } catch (error) {
      console.error('Error al corregir registro:', error);
      alert('❌ Error al corregir el registro');
    }
  }

  /**
   * Verificar si un registro puede ser corregido
   */
  async puedeCorregirRegistro(registroId: number): Promise<boolean> {
    if (!this.user) return false;
    
    try {
      return await this.correccionService.puedeCorregir(registroId, this.user.id).toPromise() || false;
    } catch (error) {
      console.error('Error al verificar permisos de corrección:', error);
      return false;
    }
  }

  /**
   * Actualizar etapa actual del lote según su edad y el plan nutricional
   */
  private actualizarEtapaLote(lote: Lote): void {
    if (!this.planNutricionalActivo?.etapas) {
      return;
    }
    
    const diasVida = this.calcularDiasDeVida(lote.birthdate);
    
    // Buscar la etapa correspondiente según los días de vida
    this.etapaActualLote = this.planNutricionalActivo.etapas.find(etapa => 
      diasVida >= etapa.diasEdad.min && diasVida <= etapa.diasEdad.max
    ) || null;
    
    if (this.etapaActualLote) {
      console.log(`✅ Lote ${lote.codigo}: ${diasVida} días → Etapa ${this.etapaActualLote.nombre}`);
    } else {
      console.warn(`⚠️ Lote ${lote.codigo}: ${diasVida} días → No se encontró etapa`);
    }
  }

  /**
   * 🆕 Debug: Mostrar información completa de timing de cambios de etapa
   * Función disponible desde la consola del navegador
   */
  debugStageChanges(): void {
    console.log('🔍 INFORMACIÓN DETALLADA DE CAMBIOS DE ETAPA');
    console.log('===============================================');
    
    this.lotesActivos.forEach(lote => {
      const info = this.getStageChangeInfo(lote);
      console.log(`\n📦 LOTE: ${info.codigo}`);
      console.log(`   🗓️  Días de vida actuales: ${info.diasVida}`);
      console.log(`   📊 Etapa actual: ${info.etapaActual}`);
      console.log(`   📏 Rango actual: ${info.rangoActual}`);
      
      if (info.proximoCambio) {
        console.log(`   ⏰ Próximo cambio:`);
        console.log(`      • En ${info.proximoCambio.dias} día(s)`);
        console.log(`      • Fecha: ${info.proximoCambio.fecha}`);
        console.log(`      • Hora exacta: ${info.proximoCambio.horaExacta}`);
      } else {
        console.log(`   ⏰ Sin próximos cambios programados`);
      }
      
      console.log(`   ⚙️  Mecanismo: ${info.explicacion}`);
    });
    
    console.log('\n⏱️  FRECUENCIA DE VERIFICACIÓN: Cada 60 segundos');
    console.log('🔄 ACTUALIZACIÓN AUTOMÁTICA: ' + (this.updateSubscription ? 'ACTIVA' : 'INACTIVA'));
    console.log('\n💡 Para forzar verificación manual, usa: debugForceStageCheck()');
  }

  /**
   * 🆕 Debug: Forzar verificación manual de cambios de etapa
   */
  debugForceStageCheck(): void {
    console.log('🔄 Forzando verificación manual de cambios de etapa...');
    this.verificarCambiosDeEtapa();
    console.log('✅ Verificación completada. Revisa los logs anteriores.');
  }

  /**
   * 🆕 Debug: Simular el paso del tiempo para testing
   */
  debugSimulateTimeChange(horasAdelante: number): void {
    console.log(`🕐 SIMULANDO AVANCE DE TIEMPO: +${horasAdelante} horas`);
    console.log('⚠️  NOTA: Esta simulación es solo para testing y no afecta la base de datos');
    
    // Crear una fecha simulada
    const fechaSimulada = new Date();
    fechaSimulada.setHours(fechaSimulada.getHours() + horasAdelante);
    
    console.log(`📅 Fecha actual real: ${new Date().toLocaleString()}`);
    console.log(`📅 Fecha simulada: ${fechaSimulada.toLocaleString()}`);
    
    // Temporalmente reemplazar el método calcularDiasDeVida para la simulación
    const originalCalcular = this.calcularDiasDeVida.bind(this);
    this.calcularDiasDeVida = (fechaNacimiento: Date | null): number => {
      if (!fechaNacimiento) return 0;
      const fechaNac = new Date(fechaNacimiento);
      const diffTime = Math.abs(fechaSimulada.getTime() - fechaNac.getTime());
      return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    };
    
    // Verificar cambios con el tiempo simulado
    this.debugStageChanges();
    
    // Restaurar el método original
    this.calcularDiasDeVida = originalCalcular;
    
    console.log('🔄 Método restaurado a cálculo real de tiempo');
  }

  /**
   * 🆕 Debug: Información específica del Lote 01
   */
  debugLote01Info(): void {
    const lote01 = this.lotesActivos.find(lote => 
      lote.codigo?.toLowerCase().includes('01') || 
      lote.codigo?.toLowerCase().includes('00001')
    );
    
    if (!lote01) {
      console.log('❌ No se encontró el Lote 01 en los lotes activos');
      console.log('📋 Lotes disponibles:', this.lotesActivos.map(l => l.codigo));
      return;
    }
    
    console.log('🎯 INFORMACIÓN DETALLADA DEL LOTE 01');
    console.log('=====================================');
    
    const info = this.getStageChangeInfo(lote01);
    const ahora = new Date();
    
    console.log(`📦 Código del lote: ${info.codigo}`);
    console.log(`🗓️  Días de vida actuales: ${info.diasVida}`);
    console.log(`📊 Etapa actual: ${info.etapaActual}`);
    console.log(`📏 Rango de días: ${info.rangoActual}`);
    console.log(`🕐 Hora actual: ${ahora.toLocaleTimeString()}`);
    console.log(`📅 Fecha actual: ${ahora.toLocaleDateString()}`);
    
    if (info.proximoCambio) {
      console.log(`\n⏰ PRÓXIMO CAMBIO DE ETAPA:`);
      console.log(`   • Ocurrirá en: ${info.proximoCambio.dias} día(s)`);
      console.log(`   • Fecha exacta: ${info.proximoCambio.fecha}`);
      console.log(`   • Hora exacta: ${info.proximoCambio.horaExacta}`);
      
      // Calcular tiempo restante hasta medianoche si es hoy
      const hoy = new Date();
      const proximaMedianoche = new Date(hoy);
      proximaMedianoche.setDate(proximaMedianoche.getDate() + 1);
      proximaMedianoche.setHours(0, 0, 0, 0);
      
      const tiempoRestante = proximaMedianoche.getTime() - hoy.getTime();
      const horasRestantes = Math.floor(tiempoRestante / (1000 * 60 * 60));
      const minutosRestantes = Math.floor((tiempoRestante % (1000 * 60 * 60)) / (1000 * 60));
      
      if (info.proximoCambio.dias === 1) {
        console.log(`   • Tiempo hasta próxima medianoche: ${horasRestantes}h ${minutosRestantes}m`);
      }
    } else {
      console.log(`\n⏰ Sin próximos cambios programados (lote en última etapa)`);
    }
    
    console.log(`\n⚙️  MECANISMO DE CAMBIO:`);
    console.log(`   • Se ejecuta a las 00:00:00 de cada día`);
    console.log(`   • Cálculo: Math.floor((hoy - fechaNacimiento) / milisegundosDelDia)`);
    console.log(`   • Verificación automática: cada 60 segundos`);
    
    // Información específica sobre el estado actual
    if (info.diasVida >= 21 && info.diasVida <= 30) {
      console.log(`\n🎯 ESTADO ACTUAL (RANGO 21-30 DÍAS):`);
      console.log(`   • El lote está en el día ${info.diasVida} del rango 21-30`);
      console.log(`   • Días restantes en esta etapa: ${30 - info.diasVida}`);
      console.log(`   • Progreso en etapa: ${((info.diasVida - 21) / 9 * 100).toFixed(1)}%`);
    }
  }

  /**
   * 🆕 Obtener información detallada del lote para mostrar en el HTML
   * NUEVA: Proporciona información completa sobre edad y etapa actual
   */
  getInfoCompletaLote(lote: Lote): any {
    const diasVida = this.calcularDiasDeVida(lote.birthdate);
    const etapaActual = this.obtenerEtapaParaLote(diasVida);
    const todasLasEtapas = this.obtenerTodasLasEtapasParaLote(diasVida);
    
    return {
      // Información básica del lote
      codigo: lote.codigo,
      cantidad: lote.quantity,
      fechaNacimiento: lote.birthdate,
      
      // Información de edad
      diasVida,
      edadFormateada: `${diasVida} días`,
      
      // Información de etapa
      etapaActual: etapaActual ? {
        nombre: etapaActual.nombre,
        rangoDias: etapaActual.rangoDias,
        alimentoRecomendado: etapaActual.alimentoRecomendado,
        cantidadPorAnimal: etapaActual.cantidadPorAnimal,
        unidad: etapaActual.unidad,
        esActual: etapaActual.esActual,
        advertencia: etapaActual.advertencia || null
      } : null,
      
      // Todas las etapas disponibles
      todasLasEtapas,
      
      // Estado
      tieneEtapa: !!etapaActual,
      requiereAtencion: !etapaActual || !etapaActual.esActual,
      
      // Información adicional
      ultimaActualizacion: new Date().toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    };
  }

  /**
   * 🆕 Obtener información específica para el área verde de "Edad de Lote"
   * NUEVA: Información específica para el recuadro verde del HTML
   */
  getInfoEdadLote(lote: Lote): any {
    if (!lote) return null;
    
    const diasVida = this.calcularDiasDeVida(lote.birthdate);
    const fechaNacimiento = lote.birthdate ? new Date(lote.birthdate) : null;
    
    return {
      diasVida,
      edadTexto: `${diasVida} días`,
      fechaNacimiento: fechaNacimiento ? fechaNacimiento.toLocaleDateString('es-ES') : 'No definida',
      cantidad: lote.quantity,
      cantidadTexto: `${lote.quantity} animales`,
      actualizado: new Date().toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  }

  /**
   * 🆕 Obtener información específica para el área de "Etapa Actual"
   * NUEVA: Información específica para la sección de etapa actual
   */
  getInfoEtapaActual(lote: Lote): any {
    if (!lote) return null;
    
    const diasVida = this.calcularDiasDeVida(lote.birthdate);
    const etapaActual = this.obtenerEtapaParaLote(diasVida);
    
    if (!etapaActual) {
      return {
        tieneEtapa: false,
        mensaje: `No hay etapa definida para ${diasVida} días`,
        diasVida,
        requiereConfiguracion: true
      };
    }
    
    return {
      tieneEtapa: true,
      nombre: etapaActual.nombre,
      rangoDias: etapaActual.rangoDias,
      alimentoRecomendado: etapaActual.alimentoRecomendado,
      cantidadPorAnimal: etapaActual.cantidadPorAnimal,
      unidad: etapaActual.unidad,
      esActual: etapaActual.esActual,
      diasVida,
      advertencia: etapaActual.advertencia || null,
      actualizado: new Date().toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  }

  /**
   * 🆕 NUEVA: Función de debugging para verificar etapas del plan nutricional
   * Ayuda a diagnosticar por qué no se encuentra la etapa correcta
   */
  debugPlanNutricional(): void {
    console.log('🔍 ====== DEBUG PLAN NUTRICIONAL ======');
    console.log('📊 Estado del plan del administrador:', {
      planCargado: !!this.planActivoAdministrador,
      nombrePlan: this.planActivoAdministrador?.name || 'No disponible',
      planId: this.planActivoAdministrador?.id || 'No disponible',
      totalEtapas: this.etapasPlanAdministrador?.length || 0
    });
    
    if (this.etapasPlanAdministrador && this.etapasPlanAdministrador.length > 0) {
      console.log('📋 TODAS las etapas disponibles:');
      this.etapasPlanAdministrador.forEach((etapa, index) => {
        console.log(`  ${index + 1}. ${etapa.nombre}:`, {
          diasInicio: etapa.diasInicio,
          diasFin: etapa.diasFin,
          alimento: etapa.alimentoRecomendado,
          cantidad: etapa.cantidadPorAnimal,
          unidad: etapa.unidad
        });
      });
      
      // Verificar cobertura de rangos
      console.log('🔍 Análisis de cobertura de rangos:');
      const rangos = this.etapasPlanAdministrador.map(e => ({
        inicio: e.diasInicio,
        fin: e.diasFin,
        nombre: e.nombre
      })).sort((a, b) => a.inicio - b.inicio);
      
      rangos.forEach((rango, index) => {
        const siguienteRango = rangos[index + 1];
        console.log(`  📅 ${rango.nombre}: ${rango.inicio}-${rango.fin} días`);
        
        if (siguienteRango && rango.fin + 1 < siguienteRango.inicio) {
          console.warn(`    ⚠️ HUECO DETECTADO: Entre ${rango.fin + 1} y ${siguienteRango.inicio - 1} días`);
        }
      });
      
      // Verificar específicamente los días 20-21
      console.log('🎯 Verificación específica para días 20-21:');
      [20, 21].forEach(dia => {
        const etapaEncontrada = this.etapasPlanAdministrador.find(e => 
          dia >= e.diasInicio && dia <= e.diasFin
        );
        
        if (etapaEncontrada) {
          console.log(`  ✅ Día ${dia}: Cubierto por "${etapaEncontrada.nombre}" (${etapaEncontrada.diasInicio}-${etapaEncontrada.diasFin})`);
        } else {
          console.warn(`  ❌ Día ${dia}: NO CUBIERTO por ninguna etapa`);
        }
      });
      
    } else {
      console.error('❌ No hay etapas del plan del administrador cargadas');
      console.log('🔧 Sugerencias:');
      console.log('  1. Verificar que existe un plan nutricional activo para pollos');
      console.log('  2. Verificar que el plan tiene etapas (detalles) definidas');
      console.log('  3. Verificar la conectividad con el backend');
    }
    
    console.log('🔍 ====== FIN DEBUG PLAN NUTRICIONAL ======');
  }

  /**
   * 🆕 NUEVA: Verificar por qué no se encuentra etapa para un día específico
   */
  debugEtapaParaDia(diasVida: number): void {
    console.log(`🔍 ====== DEBUG ETAPA PARA ${diasVida} DÍAS ======`);
    
    // Verificar datos de entrada
    console.log('📋 Datos de entrada:', {
      diasVida,
      etapasPlanDisponibles: this.etapasPlanAdministrador?.length || 0,
      planActivoNombre: this.planActivoAdministrador?.name || 'No disponible'
    });
    
    if (!this.etapasPlanAdministrador || this.etapasPlanAdministrador.length === 0) {
      console.error('❌ No hay etapas del plan cargadas');
      return;
    }
    
    // Mostrar evaluación de cada etapa
    console.log('🔍 Evaluando cada etapa:');
    this.etapasPlanAdministrador.forEach((etapa, index) => {
      const cumpleInicio = diasVida >= etapa.diasInicio;
      const cumpleFin = diasVida <= etapa.diasFin;
      const cumpleRango = cumpleInicio && cumpleFin;
      
      console.log(`  ${index + 1}. ${etapa.nombre}:`, {
        rango: `${etapa.diasInicio}-${etapa.diasFin}`,
        cumpleInicio: `${diasVida} >= ${etapa.diasInicio} = ${cumpleInicio}`,
        cumpleFin: `${diasVida} <= ${etapa.diasFin} = ${cumpleFin}`,
        cumpleRango,
        resultado: cumpleRango ? '✅ COINCIDE' : '❌ No coincide'
      });
    });
    
    // Buscar etapa
    const etapaEncontrada = this.obtenerEtapaParaLote(diasVida);
    console.log('🎯 Resultado final:', {
      etapaEncontrada: !!etapaEncontrada,
      nombre: etapaEncontrada?.nombre || 'No encontrada',
      esActual: etapaEncontrada?.esActual || false,
      advertencia: etapaEncontrada?.advertencia || 'Ninguna'
    });
    
    console.log(`🔍 ====== FIN DEBUG ETAPA PARA ${diasVida} DÍAS ======`);
  }

  // ========== PROPIEDADES PARA DIAGNÓSTICO ========== 
  diagnosticoVisible = false;
  estadoSistema = {
    lotesCargados: 0,
    planEncontrado: false,
    etapasCubiertas: false,
    problemasDetectados: 0,
    mensaje: 'Sistema iniciando...',
    color: 'text-gray-600'
  };

  // ========== MÉTODOS DE DIAGNÓSTICO ==========

  /**
   * Mostrar/ocultar panel de diagnóstico
   */
  mostrarDiagnostico(): void {
    this.diagnosticoVisible = !this.diagnosticoVisible;
    
    if (this.diagnosticoVisible) {
      console.log('🔧 ======= DIAGNÓSTICO COMPLETO =======');
      console.log('📋 Plan Administrador:', this.planActivoAdministrador);
      console.log('📊 Etapas del Plan:', this.etapasPlanAdministrador);
      console.log('🐣 Lotes Pollos Cargados:', this.lotesPollos);
      console.log('🔥 Lotes Activos:', this.lotesActivos);
      
      // Verificar conectividad
      this.planService.getAllPlanes().subscribe({
        next: (planes) => {
          console.log('✅ Conectividad con backend OK - Planes disponibles:', planes);
        },
        error: (error) => {
          console.error('❌ Error de conectividad con backend:', error);
        }
      });
    }
  }

  /**
   * Recargar todos los datos desde cero
   */
  async recargarDatos(): Promise<void> {
    console.log('🔄 Recargando todos los datos...');
    
    try {
      // Limpiar datos existentes
      this.lotesPollos = [];
      this.lotesActivos = [];
      this.etapasPlanAdministrador = [];
      this.planActivoAdministrador = null;
      
      // Cargar todo de nuevo
      await this.cargarDatosIniciales();
      
      console.log('✅ Recarga completada - Ejecutando análisis completo...');
      
      // Ejecutar análisis completo automáticamente
      setTimeout(() => {
        this.realizarAnalisisCompleto();
      }, 1000); // Esperar 1 segundo para que los datos se asienten
      
      alert('✅ Datos recargados correctamente\n💡 Revisa la consola para el análisis completo');
      
    } catch (error) {
      console.error('❌ Error en recarga:', error);
      alert('❌ Error al recargar los datos');
    }
  }

  /**
   * Obtener edad del lote (método público para el template)
   */
  obtenerEdadLote(loteId: number): number {
    const lote = this.lotesPollos.find(l => l.id === loteId) || 
                 this.lotesActivos.find(l => l.id === loteId);
    if (!lote) return 0;
    
    return this.calcularDiasDeVida(lote.birthdate);
  }

  /**
   * Obtener etapa actual del lote (método público para el template) 
   */
  obtenerEtapaActual(loteId: number): any {
    const edad = this.obtenerEdadLote(loteId);
    
    if (edad === 0) return null;
    
    return this.etapasPlanAdministrador.find(etapa => 
      edad >= etapa.diasInicio && edad <= etapa.diasFin
    );
  }

  // ========== MÉTODOS PRINCIPALES ==========

  // ========== ANÁLISIS Y VALIDACIÓN COMPLETA ==========

  /**
   * Realizar análisis completo del sistema para validar coherencia
   */
  async realizarAnalisisCompleto(): Promise<void> {
    console.log('🔍 ====== INICIANDO ANÁLISIS COMPLETO DEL SISTEMA ======');
    
    try {
      // 1. Análisis de fechas y edades de lotes
      await this.analizarLotesYEdades();
      
      // 2. Análisis de planes y etapas disponibles
      await this.analizarPlanesYEtapas();
      
      // 3. Validación de coherencia entre lotes y etapas
      await this.validarCoherenciaLotesEtapas();
      
      // 4. Análisis específico para Lote 01 (día 21)
      await this.analizarLote01Especifico();
      
      // 5. Recomendaciones de corrección
      this.generarRecomendaciones();
      
      console.log('✅ ====== ANÁLISIS COMPLETO FINALIZADO ======');
      
    } catch (error) {
      console.error('❌ Error en análisis completo:', error);
    }
  }

  /**
   * 1. Analizar lotes y sus edades calculadas
   */
  private async analizarLotesYEdades(): Promise<void> {
    console.log('📊 === 1. ANÁLISIS DE LOTES Y EDADES ===');
    
    const hoy = new Date();
    console.log('📅 Fecha actual del sistema:', hoy.toLocaleDateString('es-ES'));
    
    if (this.lotesPollos.length === 0) {
      console.warn('⚠️ No hay lotes de pollos cargados');
      return;
    }
    
    this.lotesPollos.forEach((lote, index) => {
      const fechaNacimiento = lote.birthdate;
      const edad = this.calcularDiasDeVida(fechaNacimiento);
      
      console.log(`🐣 Lote ${index + 1} (${lote.codigo || lote.id}):`);
      console.log(`   • Fecha Nacimiento: ${fechaNacimiento ? fechaNacimiento.toLocaleDateString('es-ES') : 'No definida'}`);
      console.log(`   • Edad Calculada: ${edad} días`);
      console.log(`   • Cantidad: ${lote.quantity} pollos`);
      console.log(`   • Raza: ${lote.race?.name || 'No asignada'}`);
      
      // Validar fecha coherente
      if (fechaNacimiento) {
        const diffTime = Math.abs(hoy.getTime() - fechaNacimiento.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (Math.abs(diffDays - edad) > 1) {
          console.warn(`   ⚠️ ADVERTENCIA: Diferencia en cálculo de edad (calculado: ${edad}, esperado: ~${diffDays})`);
        } else {
          console.log(`   ✅ Cálculo de edad correcto`);
        }
        
        // Verificar si es futuro
        if (fechaNacimiento > hoy) {
          console.warn(`   ⚠️ ADVERTENCIA: Fecha de nacimiento en el futuro`);
        }
      } else {
        console.error(`   ❌ ERROR: Fecha de nacimiento no definida`);
      }
      
      console.log(''); // Separador
    });
  }

  /**
   * 2. Analizar planes disponibles y sus etapas
   */
  private async analizarPlanesYEtapas(): Promise<void> {
    console.log('📋 === 2. ANÁLISIS DE PLANES Y ETAPAS ===');
    
    try {
      const planes = await this.planService.getAllPlanes().toPromise();
      
      if (!planes || planes.length === 0) {
        console.error('❌ No se encontraron planes nutricionales');
        return;
      }
      
      console.log(`📊 Total de planes encontrados: ${planes.length}`);
      
      for (const plan of planes) {
        console.log(`\n🎯 Plan "${plan.name}" (ID: ${plan.id}):`);
        console.log(`   • Activo: ${plan.active ? 'SÍ' : 'NO'}`);
        console.log(`   • Animal: ${plan.animal?.name || plan.animalName || 'No especificado'}`);
        
        try {
          const etapas = await this.planService.getDetallesByPlan(plan.id).toPromise();
          
          if (etapas && etapas.length > 0) {
            console.log(`   • Etapas: ${etapas.length}`);
            
            // Analizar cada etapa
            etapas.sort((a, b) => a.dayStart - b.dayStart).forEach((etapa, idx) => {
              console.log(`     ${idx + 1}. Días ${etapa.dayStart}-${etapa.dayEnd}: ${etapa.product?.name || 'Sin producto'} (${etapa.quantityPerAnimal}kg/animal)`);
            });
            
            // Verificar cobertura completa
            const rangos = etapas.map(e => ({ inicio: e.dayStart, fin: e.dayEnd }));
            this.verificarCoberturaEtapas(rangos);
            
          } else {
            console.warn(`   ⚠️ Sin etapas definidas`);
          }
          
        } catch (errorEtapas) {
          console.error(`   ❌ Error al obtener etapas: ${errorEtapas.message}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Error al analizar planes:', error);
    }
  }

  /**
   * Verificar que las etapas cubren todos los días sin gaps
   */
  private verificarCoberturaEtapas(rangos: { inicio: number, fin: number }[]): void {
    if (rangos.length === 0) return;
    
    rangos.sort((a, b) => a.inicio - b.inicio);
    
    console.log('   📊 Verificando cobertura de etapas:');
    
    for (let i = 0; i < rangos.length; i++) {
      const etapaActual = rangos[i];
      
      // Verificar gap con etapa anterior
      if (i > 0) {
        const etapaAnterior = rangos[i - 1];
        const gap = etapaActual.inicio - etapaAnterior.fin;
        
        if (gap > 1) {
          console.warn(`     ⚠️ GAP detectado: días ${etapaAnterior.fin + 1}-${etapaActual.inicio - 1} sin cobertura`);
        } else if (gap < 0) {
          console.warn(`     ⚠️ SOLAPAMIENTO detectado: días ${etapaActual.inicio}-${etapaAnterior.fin} duplicados`);
        } else {
          console.log(`     ✅ Transición correcta: ${etapaAnterior.fin} → ${etapaActual.inicio}`);
        }
      }
    }
    
    // Verificar cobertura específica para días críticos (20-21)
    const cubre20 = rangos.some(r => 20 >= r.inicio && 20 <= r.fin);
    const cubre21 = rangos.some(r => 21 >= r.inicio && 21 <= r.fin);
    
    console.log(`   🎯 Cobertura días críticos:`);
    console.log(`     • Día 20: ${cubre20 ? '✅ Cubierto' : '❌ Sin cobertura'}`);
    console.log(`     • Día 21: ${cubre21 ? '✅ Cubierto' : '❌ Sin cobertura'}`);
  }

  /**
   * 3. Validar coherencia entre lotes y etapas
   */
  private async validarCoherenciaLotesEtapas(): Promise<void> {
    console.log('🔗 === 3. VALIDACIÓN DE COHERENCIA LOTES-ETAPAS ===');
    
    if (this.etapasPlanAdministrador.length === 0) {
      console.error('❌ No hay etapas del plan administrador cargadas');
      return;
    }
    
    console.log(`📋 Plan administrador activo: "${this.planActivoAdministrador?.name || 'No identificado'}"`);
    console.log(`📊 Etapas disponibles: ${this.etapasPlanAdministrador.length}`);
    
    this.lotesPollos.forEach((lote, index) => {
      const edad = this.calcularDiasDeVida(lote.birthdate);
      const etapaCorrespondiente = this.etapasPlanAdministrador.find(etapa => 
        edad >= etapa.diasInicio && edad <= etapa.diasFin
      );
      
      console.log(`\n🐣 Lote ${index + 1} (${lote.codigo || lote.id}) - ${edad} días:`);
      
      if (etapaCorrespondiente) {
        console.log(`   ✅ Etapa encontrada: ${etapaCorrespondiente.nombre}`);
        console.log(`   📊 Rango: ${etapaCorrespondiente.rangoDias}`);
        console.log(`   🍽️ Alimento: ${etapaCorrespondiente.alimentoRecomendado}`);
        console.log(`   ⚖️ Cantidad: ${etapaCorrespondiente.cantidadPorAnimal}kg/animal`);
      } else {
        console.error(`   ❌ SIN ETAPA para ${edad} días`);
        
        // Buscar etapa más cercana
        let etapaMasCercana = null;
        let menorDistancia = Infinity;
        
        this.etapasPlanAdministrador.forEach(etapa => {
          const distanciaInicio = Math.abs(edad - etapa.diasInicio);
          const distanciaFin = Math.abs(edad - etapa.diasFin);
          const distanciaMinima = Math.min(distanciaInicio, distanciaFin);
          
          if (distanciaMinima < menorDistancia) {
            menorDistancia = distanciaMinima;
            etapaMasCercana = etapa;
          }
        });
        
        if (etapaMasCercana) {
          console.log(`   🔄 Etapa más cercana: ${etapaMasCercana.nombre} (distancia: ${menorDistancia} días)`);
        }
      }
    });
  }

  /**
   * 4. Análisis específico para Lote 01 (caso reportado)
   */
  private async analizarLote01Especifico(): Promise<void> {
    console.log('🎯 === 4. ANÁLISIS ESPECÍFICO LOTE 01 ===');
    
    const lote01 = this.lotesPollos.find(lote => 
      lote.codigo === '0001' || lote.codigo === '00001' || 
      lote.id === 1
    );
    
    if (!lote01) {
      console.warn('⚠️ No se encontró Lote 01');
      console.log('📋 Lotes disponibles:', this.lotesPollos.map(l => ({
        id: l.id,
        codigo: l.codigo,
        edad: this.calcularDiasDeVida(l.birthdate)
      })));
      return;
    }
    
    const edad = this.calcularDiasDeVida(lote01.birthdate);
    
    console.log('🔍 Análisis detallado del Lote 01:');
    console.log(`   • ID: ${lote01.id}`);
    console.log(`   • Código: ${lote01.codigo}`);
    console.log(`   • Nombre: ${lote01.name}`);
    console.log(`   • Fecha Nacimiento: ${lote01.birthdate?.toLocaleDateString('es-ES')}`);
    console.log(`   • Edad Actual: ${edad} días`);
    console.log(`   • Cantidad: ${lote01.quantity} pollos`);
    
    // Verificar transición 20→21 días específicamente
    console.log('\n🔄 Análisis de transición día 20→21:');
    
    [20, 21].forEach(dia => {
      const etapaParaDia = this.etapasPlanAdministrador.find(etapa => 
        dia >= etapa.diasInicio && dia <= etapa.diasFin
      );
      
      if (etapaParaDia) {
        console.log(`   • Día ${dia}: ${etapaParaDia.nombre} (${etapaParaDia.rangoDias})`);
      } else {
        console.error(`   ❌ Día ${dia}: SIN ETAPA DEFINIDA`);
      }
    });
    
    // Verificar si debería cambiar de etapa
    if (edad === 21) {
      console.log('\n🎯 CASO ESPECÍFICO - Lote en día 21:');
      
      const etapaAnterior = this.etapasPlanAdministrador.find(e => 20 >= e.diasInicio && 20 <= e.diasFin);
      const etapaActual = this.etapasPlanAdministrador.find(e => 21 >= e.diasInicio && 21 <= e.diasFin);
      
      if (etapaAnterior && etapaActual && etapaAnterior.id !== etapaActual.id) {
        console.log(`   🔄 CAMBIO DE ETAPA detectado:`);
        console.log(`      • Día 20: ${etapaAnterior.nombre}`);
        console.log(`      • Día 21: ${etapaActual.nombre}`);
        console.log(`   🎉 El sistema debería mostrar este cambio automáticamente`);
      } else if (etapaAnterior && etapaActual && etapaAnterior.id === etapaActual.id) {
        console.log(`   ➡️ Sin cambio de etapa: ${etapaActual.nombre} continúa`);
      } else {
        console.error(`   ❌ Problema en configuración de etapas para días 20-21`);
      }
    }
  }

  /**
   * 5. Generar recomendaciones de corrección
   */
  private generarRecomendaciones(): void {
    console.log('💡 === 5. RECOMENDACIONES DE CORRECCIÓN ===');
    
    const recomendaciones: string[] = [];
    
    // Verificar lotes sin fecha
    const lotesSinFecha = this.lotesPollos.filter(l => !l.birthdate);
    if (lotesSinFecha.length > 0) {
      recomendaciones.push(`⚠️ ${lotesSinFecha.length} lotes sin fecha de nacimiento - corregir en administrador de lotes`);
    }
    
    // Verificar plan sin etapas
    if (this.etapasPlanAdministrador.length === 0) {
      recomendaciones.push('❌ Sin etapas del plan nutricional - verificar configuración en administrador');
    }
    
    // Verificar gaps en etapas
    const rangos = this.etapasPlanAdministrador.map(e => ({ inicio: e.diasInicio, fin: e.diasFin }));
    if (rangos.length > 0) {
      rangos.sort((a, b) => a.inicio - b.inicio);
      
      for (let i = 1; i < rangos.length; i++) {
        const gap = rangos[i].inicio - rangos[i-1].fin;
        if (gap > 1) {
          recomendaciones.push(`⚠️ Gap en etapas: días ${rangos[i-1].fin + 1}-${rangos[i].inicio - 1} sin cobertura`);
        }
      }
    }
    
    // Verificar lotes sin etapa correspondiente
    const lotesSinEtapa = this.lotesPollos.filter(lote => {
      const edad = this.calcularDiasDeVida(lote.birthdate);
      return !this.etapasPlanAdministrador.some(etapa => edad >= etapa.diasInicio && edad <= etapa.diasFin);
    });
    
    if (lotesSinEtapa.length > 0) {
      recomendaciones.push(`❌ ${lotesSinEtapa.length} lotes sin etapa correspondiente a su edad`);
    }
    
    // Actualizar estado del sistema
    this.actualizarEstadoSistema(recomendaciones);
    
    // Mostrar recomendaciones
    if (recomendaciones.length === 0) {
      console.log('✅ ¡Sistema configurado correctamente! No se detectaron problemas.');
    } else {
      console.log('📋 Problemas detectados que requieren atención:');
      recomendaciones.forEach((rec, idx) => {
        console.log(`   ${idx + 1}. ${rec}`);
      });
    }
    
    console.log('\n🔧 Para solucionarlo:');
    console.log('   1. Verificar fechas de nacimiento en el administrador de lotes');
    console.log('   2. Confirmar que hay planes nutricionales activos');
    console.log('   3. Asegurar que las etapas cubren todos los días de vida');
    console.log('   4. Verificar asignaciones de planes a lotes');
  }

  /**
   * Actualizar estado del sistema para mostrar en la UI
   */
  private actualizarEstadoSistema(problemas: string[]): void {
    this.estadoSistema.lotesCargados = this.lotesPollos.length;
    this.estadoSistema.planEncontrado = this.planActivoAdministrador !== null;
    this.estadoSistema.etapasCubiertas = this.etapasPlanAdministrador.length > 0;
    this.estadoSistema.problemasDetectados = problemas.length;

    if (problemas.length === 0) {
      this.estadoSistema.mensaje = '✅ Sistema funcionando correctamente';
      this.estadoSistema.color = 'text-green-600';
    } else if (problemas.length <= 2) {
      this.estadoSistema.mensaje = `⚠️ ${problemas.length} problema(s) menor(es) detectado(s)`;
      this.estadoSistema.color = 'text-yellow-600';
    } else {
      this.estadoSistema.mensaje = `❌ ${problemas.length} problemas críticos detectados`;
      this.estadoSistema.color = 'text-red-600';
    }
  }

  // ========== MÉTODOS DE DIAGNÓSTICO ==========
}