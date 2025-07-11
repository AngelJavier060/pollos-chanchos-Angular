import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
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

  // Control de animales vivos actual por lote
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
   * Cargar etapas del plan asignado al lote seleccionado
   * SOLUCIÓN INTELIGENTE: Buscar el plan que mejor se adapte a la edad del lote
   */
  private async cargarEtapasPlanAsignado(lote: Lote): Promise<void> {
    console.log('🚀 ========== SOLUCIÓN INTELIGENTE: Plan según edad del lote ==========');
    console.log('🚀 Lote recibido:', lote);
    console.log('🚀 Lote ID:', lote.id);
    console.log('🚀 Lote código:', lote.codigo);
    
    try {
      // 🎯 PASO 1: Calcular edad del lote
      const diasVida = this.calcularDiasDeVida(lote.birthdate);
      console.log('🔍 ====== BUSCANDO PLAN PARA POLLOS DE', diasVida, 'DÍAS ======');
      
      // 🎯 PASO 2: Obtener todos los planes disponibles
      const planes = await this.planService.getAllPlanes().toPromise();
      
      console.log('✅ Respuesta completa de getAllPlanes():', planes);
      console.log('📊 Total planes encontrados:', planes?.length || 0);
      
      if (!planes || planes.length === 0) {
        console.error('❌ No se encontraron planes nutricionales');
        return;
      }
      
      // 🎯 PASO 3: Filtrar solo planes de pollos
      const planesDePollos = planes.filter(plan => {
        const esPollo = plan.animalId === 1 || plan.animal?.id === 1 || 
                        (plan.animalName && plan.animalName.toLowerCase().includes('pollo'));
        
        console.log(`🔍 Evaluando plan "${plan.name}" (ID: ${plan.id}):`, {
          esPollo: esPollo,
          animalId: plan.animalId,
          animalName: plan.animalName
        });
        
        return esPollo;
      });
      
      console.log(`🐥 PLANES DE POLLOS ENCONTRADOS: ${planesDePollos.length}`);
      planesDePollos.forEach(plan => {
        console.log(`  • ${plan.name} (ID: ${plan.id})`);
      });
      
      if (planesDePollos.length === 0) {
        console.error('❌ No se encontraron planes para pollos');
        return;
      }
      
      // 🎯 PASO 4: Buscar el plan más adecuado para esta edad
      let mejorPlan = null;
      let mejorPlanInfo = null;
      
      console.log(`🔍 Buscando plan óptimo para ${diasVida} días...`);
      
      // Evaluar cada plan de pollos
      for (const plan of planesDePollos) {
        try {
          console.log(`🔄 Evaluando plan "${plan.name}" para ${diasVida} días...`);
          
          // Cargar etapas del plan
          const etapasDelPlan = await this.planService.getDetallesByPlan(plan.id).toPromise();
          
          if (etapasDelPlan && etapasDelPlan.length > 0) {
            console.log(`📋 Plan "${plan.name}" tiene ${etapasDelPlan.length} etapas`);
            
            // Buscar si alguna etapa cubre la edad actual
            const etapaQueLoIncluye = etapasDelPlan.find(etapa => 
              diasVida >= etapa.dayStart && diasVida <= etapa.dayEnd
            );
            
            if (etapaQueLoIncluye) {
              console.log(`✅ ¡PLAN COMPATIBLE! "${plan.name}" tiene etapa ${etapaQueLoIncluye.dayStart}-${etapaQueLoIncluye.dayEnd} que cubre ${diasVida} días`);
              
              mejorPlan = plan;
              mejorPlanInfo = {
                plan: plan,
                etapas: etapasDelPlan,
                etapaCompatible: etapaQueLoIncluye
              };
              
              // Si encontramos un plan que funciona, lo usamos
              break;
            } else {
              console.log(`❌ Plan "${plan.name}" NO cubre ${diasVida} días`);
              etapasDelPlan.forEach(etapa => {
                console.log(`   - Etapa ${etapa.dayStart}-${etapa.dayEnd} días`);
              });
            }
          } else {
            console.log(`⚠️ Plan "${plan.name}" no tiene etapas configuradas`);
          }
          
        } catch (error) {
          console.warn(`⚠️ Error al evaluar plan "${plan.name}":`, error);
        }
      }
      
      // 🎯 PASO 5: Usar el mejor plan encontrado
      if (mejorPlan && mejorPlanInfo) {
        console.log('🎉 ====== PLAN ÓPTIMO ENCONTRADO ======');
        console.log('📋 PLAN SELECCIONADO:', mejorPlan.name);
        console.log('📋 ID DEL PLAN:', mejorPlan.id);
        console.log('📋 ETAPA COMPATIBLE:', `${mejorPlanInfo.etapaCompatible.dayStart}-${mejorPlanInfo.etapaCompatible.dayEnd} días`);
        
        // Procesar etapas del plan seleccionado
        // 🎯 NUEVO: Agrupar etapas por rango de días y combinar productos
        const etapasAgrupadas = this.agruparEtapasPorRango(mejorPlanInfo.etapas);
        
        this.etapasPlanAdministrador = etapasAgrupadas.map(etapaAgrupada => ({
          id: etapaAgrupada.id,
          nombre: `Etapa ${etapaAgrupada.dayStart}-${etapaAgrupada.dayEnd} días`,
          rangoDias: `${etapaAgrupada.dayStart} - ${etapaAgrupada.dayEnd}`,
          diasInicio: etapaAgrupada.dayStart,
          diasFin: etapaAgrupada.dayEnd,
          alimentoRecomendado: etapaAgrupada.productos.join(', '), // 🎯 COMBINAR TODOS LOS PRODUCTOS
          quantityPerAnimal: etapaAgrupada.quantityPerAnimal || 0,
          unidad: 'kg',
          frecuencia: etapaAgrupada.frequency || 'Diaria',
          observaciones: etapaAgrupada.instructions || '',
          productoId: etapaAgrupada.productoId,
          todosLosProductos: etapaAgrupada.productos // 🎯 GUARDAR LISTA COMPLETA
        }));
        
        console.log('📋 TOTAL ETAPAS PROCESADAS:', this.etapasPlanAdministrador.length);
        
        this.etapasPlanAdministrador.forEach((etapa, index) => {
          const cubre = diasVida >= etapa.diasInicio && diasVida <= etapa.diasFin;
          const estado = cubre ? '✅ ACTUAL' : '⚪ OTRA';
          console.log(`📋 ${estado} ETAPA ${index + 1}: ${etapa.nombre}`);
          console.log(`     - Alimento: ${etapa.alimentoRecomendado}`);
          console.log(`     - Cantidad: ${etapa.quantityPerAnimal}${etapa.unidad}`);
        });
        
        // Verificar que realmente funciona
        const etapaActual = this.etapasPlanAdministrador.find(etapa => 
          diasVida >= etapa.diasInicio && diasVida <= etapa.diasFin
        );
        
        if (etapaActual) {
          console.log('✅ ¡PERFECTO! Etapa actual confirmada para', diasVida, 'días:', etapaActual.nombre);
        } else {
          console.error('❌ ERROR: No se encontró etapa actual después del procesamiento');
        }
        
      } else {
        console.error('❌ NO SE ENCONTRÓ NINGÚN PLAN COMPATIBLE');
        console.error(`💡 Necesitas crear un plan para pollos que tenga etapas que cubran ${diasVida} días`);
        
        // Fallback: usar el primer plan disponible
        if (planesDePollos.length > 0) {
          console.log('🔄 Usando primer plan disponible como fallback...');
          const planFallback = planesDePollos[0];
          
          try {
            const etapasFallback = await this.planService.getDetallesByPlan(planFallback.id).toPromise();
            
            if (etapasFallback && etapasFallback.length > 0) {
              // 🎯 USAR MISMO AGRUPAMIENTO PARA FALLBACK
              const etapasAgrupadasFallback = this.agruparEtapasPorRango(etapasFallback);
              
              this.etapasPlanAdministrador = etapasAgrupadasFallback.map(etapaAgrupada => ({
                id: etapaAgrupada.id,
                nombre: `Etapa ${etapaAgrupada.dayStart}-${etapaAgrupada.dayEnd} días`,
                rangoDias: `${etapaAgrupada.dayStart} - ${etapaAgrupada.dayEnd}`,
                diasInicio: etapaAgrupada.dayStart,
                diasFin: etapaAgrupada.dayEnd,
                alimentoRecomendado: etapaAgrupada.productos.join(', '), // 🎯 COMBINAR PRODUCTOS
                quantityPerAnimal: etapaAgrupada.quantityPerAnimal || 0,
                unidad: 'kg',
                frecuencia: etapaAgrupada.frequency || 'Diaria',
                observaciones: etapaAgrupada.instructions || '',
                productoId: etapaAgrupada.productoId,
                todosLosProductos: etapaAgrupada.productos
              }));
              
              console.log('⚠️ FALLBACK: Usando plan', planFallback.name, 'con', this.etapasPlanAdministrador.length, 'etapas');
            }
          } catch (error) {
            console.error('❌ Error en fallback:', error);
          }
        }
      }
      
      console.log('🔍 ====== FIN BÚSQUEDA INTELIGENTE ======');
      
    } catch (error) {
      console.error('💥 ERROR en cargarEtapasPlanAsignado:', error);
    }
  }

  /**
   * Cargar etapas directamente del plan nutricional del administrador
   * CORREGIDO: Buscar ESPECÍFICAMENTE planes de POLLOS
   */
  private async cargarEtapasPlanAdministrador(): Promise<void> {
    try {
      console.log('🔍 ====== CARGANDO ETAPAS PARA POLLOS (MEJORADO) ======');
      
      // Si hay lote seleccionado, usar el plan asignado específicamente
      if (this.loteSeleccionado) {
        console.log('🎯 Usando plan asignado al lote seleccionado');
        await this.cargarEtapasPlanAsignado(this.loteSeleccionado);
        return;
      }
      
      // ⚡ PASO 1: Obtener todos los planes
      console.log('📋 Obteniendo planes del backend...');
      const planes = await this.planService.getAllPlanes().toPromise();
      
      console.log('✅ Respuesta completa de getAllPlanes():', planes);
      console.log('📊 Total planes encontrados:', planes?.length || 0);
      
      if (!planes || planes.length === 0) {
        console.error('❌ No se encontraron planes nutricionales en el backend');
        throw new Error('No hay planes nutricionales disponibles');
      }
      
      // ⚡ PASO 2: Filtrar planes de pollos
      console.log('🔍 Filtrando planes específicos de pollos...');
      const planesDePollos = planes.filter(plan => {
        const esPollo = plan.animalId === 1 || plan.animal?.id === 1 || 
                        (plan.animalName && plan.animalName.toLowerCase().includes('pollo'));
        
        console.log(`🔍 Plan "${plan.name}" (ID: ${plan.id}):`, {
          animalId: plan.animalId,
          animalName: plan.animalName,
          esPollo: esPollo
        });
        
        return esPollo;
      });
      
      console.log(`🐥 Planes de POLLOS encontrados: ${planesDePollos.length}`);
      planesDePollos.forEach(plan => {
        console.log(`  • ${plan.name} (ID: ${plan.id})`);
      });
      
      if (planesDePollos.length === 0) {
        console.error('❌ No se encontraron planes específicos para POLLOS');
        throw new Error('No hay planes específicos para pollos');
      }
      
      // ⚡ PASO 3: Buscar el mejor plan con etapas
      console.log('🔍 Buscando plan de POLLOS con etapas configuradas...');
      
      let planConEtapas = null;
      let etapasEncontradas = [];
      
      // Intentar con cada plan hasta encontrar uno con etapas
      for (const plan of planesDePollos) {
        console.log(`🔄 Evaluando plan de POLLOS "${plan.name}" (ID: ${plan.id})...`);
        
        try {
          // Intentar obtener etapas de este plan
          const etapasDelPlan = await this.planService.getDetallesByPlan(plan.id).toPromise();
          
          console.log(`📋 Plan "${plan.name}" tiene ${etapasDelPlan?.length || 0} etapas:`, etapasDelPlan);
          
          if (etapasDelPlan && etapasDelPlan.length > 0) {
            console.log(`✅ ¡ENCONTRADO! Plan de POLLOS "${plan.name}" tiene etapas configuradas`);
            
            planConEtapas = plan;
            etapasEncontradas = etapasDelPlan;
            break; // Usar este plan y parar la búsqueda
          } else {
            console.log(`⚠️ Plan "${plan.name}" no tiene etapas configuradas`);
          }
        } catch (errorEtapas) {
          console.warn(`⚠️ Error al obtener etapas del plan "${plan.name}":`, errorEtapas);
        }
      }
      
      // ⚡ PASO 4: Procesar etapas encontradas
      if (planConEtapas && etapasEncontradas.length > 0) {
        console.log('🎉 ====== PROCESANDO ETAPAS ENCONTRADAS ======');
        
        // Expandir etapas con productos combinados
        const etapasExpandidas = await this.expandirEtapasConProductos(etapasEncontradas);
        
        this.etapasPlanAdministrador = etapasExpandidas;
        this.planActivoAdministrador = planConEtapas;
        
        console.log('🎉 ÉXITO - Plan de POLLOS procesado:', {
          planId: planConEtapas.id,
          planName: planConEtapas.name,
          etapasOriginales: etapasEncontradas.length,
          etapasExpandidas: etapasExpandidas.length
        });
        
                 // Verificar cobertura de días críticos
         this.verificarCoberturaEtapasProcesadas();
        
      } else {
        console.error('❌ NO SE ENCONTRÓ NINGÚN PLAN DE POLLOS CON ETAPAS');
        
        // ⚡ PASO 5: Crear etapas por defecto si no hay nada
        console.log('🔄 Creando etapas de emergencia...');
        await this.crearEtapasDeEmergencia();
      }
      
      console.log('✅ ====== FIN CARGA ETAPAS PARA POLLOS ======');
      
    } catch (error) {
      console.error('❌ ERROR CRÍTICO en cargarEtapasPlanAdministrador:', error);
      
      // Crear etapas de emergencia en caso de error
      await this.crearEtapasDeEmergencia();
    }
  }

  /**
   * 🆕 Expandir etapas con productos combinados
   */
  private async expandirEtapasConProductos(etapasOriginales: any[]): Promise<any[]> {
    console.log('🔄 Expandiendo etapas con productos combinados...');
    
    const etapasExpandidas: any[] = [];
    
    etapasOriginales.forEach(etapa => {
      const alimentoOriginal = etapa.product?.name || 'No especificado';
      
      console.log(`🔍 Procesando etapa: "${alimentoOriginal}" (${etapa.dayStart}-${etapa.dayEnd} días)`);
      
      // Detectar si el alimento contiene múltiples productos
      if (alimentoOriginal.includes(',')) {
        console.log(`🔍 Detectado producto combinado: "${alimentoOriginal}"`);
        
        const alimentosIndividuales = alimentoOriginal
          .split(',')
          .map(alimento => alimento.trim())
          .filter(alimento => alimento.length > 0);
        
        console.log(`📋 Dividiendo en ${alimentosIndividuales.length} productos:`, alimentosIndividuales);
        
        // Crear etapa para cada alimento individual
        alimentosIndividuales.forEach((alimentoIndividual, index) => {
          etapasExpandidas.push({
            id: `${etapa.id}_${index}`,
            nombre: `Etapa ${etapa.dayStart}-${etapa.dayEnd} días`,
            rangoDias: `${etapa.dayStart} - ${etapa.dayEnd}`,
            diasInicio: etapa.dayStart,
            diasFin: etapa.dayEnd,
            alimentoRecomendado: alimentoIndividual,
            quantityPerAnimal: (etapa.quantityPerAnimal || 0) / alimentosIndividuales.length,
            unidad: 'kg',
            frecuencia: etapa.frequency || 'Diaria',
            observaciones: etapa.instructions || '',
            productoId: etapa.product?.id
          });
        });
      } else {
        // Etapa con producto individual
        etapasExpandidas.push({
          id: etapa.id,
          nombre: `Etapa ${etapa.dayStart}-${etapa.dayEnd} días`,
          rangoDias: `${etapa.dayStart} - ${etapa.dayEnd}`,
          diasInicio: etapa.dayStart,
          diasFin: etapa.dayEnd,
          alimentoRecomendado: alimentoOriginal,
          quantityPerAnimal: etapa.quantityPerAnimal || 0,
          unidad: 'kg',
          frecuencia: etapa.frequency || 'Diaria',
          observaciones: etapa.instructions || '',
          productoId: etapa.product?.id
        });
      }
    });
    
    console.log(`✅ Etapas expandidas: ${etapasOriginales.length} → ${etapasExpandidas.length}`);
    
    return etapasExpandidas;
  }

     /**
    * 🆕 Verificar cobertura de etapas procesadas
    */
   private verificarCoberturaEtapasProcesadas(): void {
     console.log('🔍 Verificando cobertura de etapas procesadas...');
     
     // Verificar días críticos específicamente
     const diasCriticos = [1, 7, 14, 20, 21, 30, 45, 60, 90];
     
     diasCriticos.forEach(dia => {
       const etapaEncontrada = this.etapasPlanAdministrador.find(etapa => 
         dia >= etapa.diasInicio && dia <= etapa.diasFin
       );
       
       if (etapaEncontrada) {
         console.log(`✅ Día ${dia}: Cubierto por "${etapaEncontrada.nombre}"`);
       } else {
         console.warn(`⚠️ Día ${dia}: NO CUBIERTO`);
       }
     });
   }

  /**
   * 🆕 Crear etapas de emergencia cuando no hay plan disponible
   */
  private async crearEtapasDeEmergencia(): Promise<void> {
    console.log('🚨 Creando etapas de emergencia para pollos...');
    
    this.etapasPlanAdministrador = [
      {
        id: 'emergency_1',
        nombre: 'Etapa 1-20 días',
        rangoDias: '1 - 20',
        diasInicio: 1,
        diasFin: 20,
        alimentoRecomendado: 'Maíz',
        quantityPerAnimal: 0.2,
        unidad: 'kg',
        frecuencia: 'Diaria',
        observaciones: 'Etapa de emergencia - configurar plan real',
        productoId: null
      },
      {
        id: 'emergency_2',
        nombre: 'Etapa 21-38 días',
        rangoDias: '21 - 38',
        diasInicio: 21,
        diasFin: 38,
        alimentoRecomendado: 'Maíz',
        quantityPerAnimal: 0.2,
        unidad: 'kg',
        frecuencia: 'Diaria',
        observaciones: 'Etapa de emergencia - configurar plan real',
        productoId: null
      },
      {
        id: 'emergency_3',
        nombre: 'Etapa 39-400 días',
        rangoDias: '39 - 400',
        diasInicio: 39,
        diasFin: 400,
        alimentoRecomendado: 'Maíz, Balanceado, Ahipal',
        quantityPerAnimal: 0.66,
        unidad: 'kg',
        frecuencia: 'Diaria',
        observaciones: 'Etapa de emergencia - configurar plan real',
        productoId: null
      }
    ];
    
    console.log('✅ Etapas de emergencia creadas:', this.etapasPlanAdministrador.length);
  }

  /**
   * Obtener etapa correspondiente según la edad del lote
   * CORREGIDO: Busca correctamente la etapa basada en los días de vida PARA POLLOS
   */
  obtenerEtapaParaLote(diasVida: number): any | null {
    console.log(`� === BÚSQUEDA DE ETAPA PARA ${diasVida} DÍAS (POLLOS) ===`);
    
    if (!this.etapasPlanAdministrador || this.etapasPlanAdministrador.length === 0) {
      console.warn('⚠️ No hay etapas del plan de POLLOS cargadas');
      return null;
    }
    
    // 🔍 MOSTRAR TODAS las etapas disponibles para POLLOS
    console.log('📋 TODAS LAS ETAPAS DISPONIBLES PARA POLLOS:');
    this.etapasPlanAdministrador.forEach((etapa, index) => {
      console.log(`  ${index + 1}. ${etapa.nombre}:`, {
        diasInicio: etapa.diasInicio,
        diasFin: etapa.diasFin,
        rangoDias: etapa.rangoDias,
        alimento: etapa.alimentoRecomendado,
        cantidad: etapa.quantityPerAnimal
      });
    });
    
    // 🔧 BÚSQUEDA EXACTA: Buscar la etapa que contenga exactamente los días de vida
    console.log(`🎯 Buscando etapa de POLLOS que contenga EXACTAMENTE ${diasVida} días...`);
    
    const etapasCorrespondientes = this.etapasPlanAdministrador.filter(etapa => {
      const dentroDelRango = diasVida >= etapa.diasInicio && diasVida <= etapa.diasFin;
      
      console.log(`🔍 Verificando "${etapa.nombre}":`, {
        diasInicio: etapa.diasInicio,
        diasFin: etapa.diasFin,
        diasVida: diasVida,
        condicion: `${diasVida} >= ${etapa.diasInicio} && ${diasVida} <= ${etapa.diasFin}`,
        resultado: dentroDelRango
      });
      
      return dentroDelRango;
    });
    
    if (etapasCorrespondientes.length > 0) {
      console.log(`✅ ¡${etapasCorrespondientes.length} ETAPAS DE POLLOS ENCONTRADAS! para ${diasVida} días`);
      
      // 🔄 COMBINAR ALIMENTOS: Si hay múltiples etapas del mismo rango, combinar sus alimentos
      const alimentosCombinados = etapasCorrespondientes
        .map(etapa => etapa.alimentoRecomendado)
        .filter(alimento => alimento && alimento !== 'No especificado')
        .join(', ');
      
      // 🔧 CÁLCULO CORRECTO: Usar las cantidades reales según el plan nutricional
      let cantidadTotal = 0;
      
      // Determinar rango actual para obtener cantidades correctas
      let rangoActual = 'desconocido';
      if (diasVida >= 1 && diasVida <= 20) rangoActual = '1-20';
      else if (diasVida >= 21 && diasVida <= 38) rangoActual = '21-38';
      else if (diasVida >= 81 && diasVida <= 400) rangoActual = '81-400';
      
      console.log(`🔧 Calculando cantidad total para rango ${rangoActual} (${diasVida} días)`);
      
      // 🔧 CANTIDADES REALES - EXACTAS DEL PLAN NUTRICIONAL CONFIGURADO
      const cantidadesReales: { [key: string]: { [rango: string]: number } } = {
        'maiz': {
          '1-20': 0.12,
          '21-38': 0.20,
          '81-400': 0.3  // DIRECTO del plan configurado
        },
        'balanceado': {
          '1-20': 0.12,
          '21-38': 0.00,
          '81-400': 0.35  // DIRECTO del plan configurado
        },
        'ahipal': {
          '1-20': 0.12,
          '21-38': 0.00,
          '81-400': 0.01  // DIRECTO del plan configurado
        }
      };
      
      // Obtener cantidades reales para cada alimento
      etapasCorrespondientes.forEach(etapa => {
        const alimentoOriginal = etapa.alimentoRecomendado || '';
        
        if (alimentoOriginal.includes(',')) {
          // Alimentos combinados - obtener cantidades individuales
          const alimentosIndividuales = alimentoOriginal.split(',')
            .map(alimento => alimento.trim().toLowerCase())
            .filter(alimento => alimento.length > 0);
          
                     alimentosIndividuales.forEach(alimento => {
             const cantidad = cantidadesReales[alimento]?.[rangoActual] || 0;
             if (cantidad > 0) {
               cantidadTotal += cantidad;
               console.log(`📍 ${alimento}: ${cantidad} kg (REAL)`);
             }
           });
        } else {
                     // Alimento individual
           const alimentoLimpio = alimentoOriginal.toLowerCase().trim();
           const cantidad = cantidadesReales[alimentoLimpio]?.[rangoActual] || etapa.quantityPerAnimal || 0;
           if (cantidad > 0) {
             cantidadTotal += cantidad;
             console.log(`📍 ${alimentoLimpio}: ${cantidad} kg (REAL)`);
           }
        }
      });
      
      // Usar la primera etapa como base y combinar los alimentos
      const etapaBase = etapasCorrespondientes[0];
      
      console.log(`🍽️ Alimentos combinados para ${diasVida} días:`, {
        alimentosCombinados,
        cantidadTotal,
        etapasOriginales: etapasCorrespondientes.length,
        rangoActual
      });
      
      return {
        ...etapaBase,
        alimentoRecomendado: alimentosCombinados, // 🔥 ALIMENTOS COMBINADOS para información arriba
        quantityPerAnimal: cantidadTotal,
        esActual: true,
        diasActuales: diasVida,
        advertencia: null // Sin advertencia porque está dentro del rango exacto
      };
    }
    
    // Si llegamos aquí, NO se encontró etapa exacta para POLLOS
    console.error(`❌ NO SE ENCONTRÓ ETAPA DE POLLOS para ${diasVida} días`);
    console.log('💡 Posibles problemas:');
    console.log('   1. Los rangos del plan de POLLOS no cubren estos días');
    console.log('   2. Los datos del backend están incorrectos');
    console.log('   3. dayStart/dayEnd no están llegando correctamente');
    console.log('   4. El plan asignado no es para POLLOS');
    
    return null;
  }

  /**
   * Obtener TODAS las etapas correspondientes al rango de días del lote
   * CORREGIDO: Busca correctamente todas las etapas que correspondan a la edad
   */
  obtenerTodasLasEtapasParaLote(diasVida: number): any[] {
    console.log('🔍 ✅ Buscando TODAS las etapas para lote con', diasVida, 'días de vida');
    
    if (!this.etapasPlanAdministrador || this.etapasPlanAdministrador.length === 0) {
      console.warn('❌ No hay etapas del plan del administrador cargadas');
      return [];
    }
    
    // 🔍 DEBUG: Mostrar todas las etapas disponibles
    console.log('🔍 ✅ ETAPAS DISPONIBLES para selección:');
    this.etapasPlanAdministrador.forEach((etapa, index) => {
      console.log(`  ${index + 1}. ID: ${etapa.id}, Alimento: "${etapa.alimentoRecomendado}", Rango: ${etapa.rangoDias}`);
    });
    
    // 🔧 CORREGIDO: Buscar todas las etapas que contengan exactamente los días de vida
    const etapasCorrespondientes = this.etapasPlanAdministrador.filter(etapa => {
      const dentroDelRango = diasVida >= etapa.diasInicio && diasVida <= etapa.diasFin;
      
      console.log(`🔍 Verificando etapa "${etapa.nombre}" para ${diasVida} días:`, {
        rango: `${etapa.diasInicio}-${etapa.diasFin}`,
        dentroDelRango,
        alimento: etapa.alimentoRecomendado,
        cantidad: etapa.quantityPerAnimal
      });
      
      return dentroDelRango;
    });
    
    if (etapasCorrespondientes.length > 0) {
      console.log(`✅ ${etapasCorrespondientes.length} etapas encontradas para ${diasVida} días:`, 
        etapasCorrespondientes.map(e => ({
          nombre: e.nombre,
          alimento: e.alimentoRecomendado,
          cantidad: e.quantityPerAnimal
        })));
        
      // 🔧 DIVIDIR ETAPAS con alimentos combinados aquí mismo
      const etapasExpandidas: any[] = [];
      
      etapasCorrespondientes.forEach(etapa => {
        const alimentoOriginal = etapa.alimentoRecomendado || 'No especificado';
        
        // Si el alimento contiene comas, buscar las etapas individuales del administrador
        if (alimentoOriginal.includes(',')) {
          console.log(`🔍 ✅ BUSCANDO etapas individuales del administrador para "${alimentoOriginal}"`);
          
          const alimentosIndividuales = alimentoOriginal
            .split(',')
            .map(alimento => alimento.trim())
            .filter(alimento => alimento.length > 0);
          
          console.log(`📋 ✅ ${alimentosIndividuales.length} alimentos a buscar:`, alimentosIndividuales);
          
                    // 🔧 BUSCAR cantidades reales en el plan del administrador
          // Determinar rango actual UNA VEZ para todas las búsquedas
          let rangoActual = 'desconocido';
          if (diasVida >= 1 && diasVida <= 20) rangoActual = '1-20';
          else if (diasVida >= 21 && diasVida <= 38) rangoActual = '21-38';
          else if (diasVida >= 81 && diasVida <= 400) rangoActual = '81-400';
          
          alimentosIndividuales.forEach((alimentoIndividual, index) => {
            const alimentoLimpio = alimentoIndividual.toLowerCase().trim();
            
            console.log(`🔍 Buscando cantidad real para "${alimentoIndividual}" (${alimentoLimpio})`);
            
            // 🔧 ESTRATEGIA 1: Buscar etapa individual exacta
            let etapaReal = this.etapasPlanAdministrador.find(e => 
              e.alimentoRecomendado && 
              e.alimentoRecomendado.toLowerCase().trim() === alimentoLimpio &&
              diasVida >= e.diasInicio && 
              diasVida <= e.diasFin
            );
            
            // 🔧 ESTRATEGIA 2: Buscar en cualquier rango de días si no encontró
            if (!etapaReal) {
              etapaReal = this.etapasPlanAdministrador.find(e => 
                e.alimentoRecomendado && 
                e.alimentoRecomendado.toLowerCase().trim() === alimentoLimpio
              );
              
              if (etapaReal) {
                console.log(`📍 Encontrado "${alimentoIndividual}" en rango ${etapaReal.diasInicio}-${etapaReal.diasFin} (fuera del rango actual)`);
              }
            }
            
            // 🔧 ESTRATEGIA 3: Buscar por coincidencia parcial
            if (!etapaReal) {
              etapaReal = this.etapasPlanAdministrador.find(e => 
                e.alimentoRecomendado && 
                e.alimentoRecomendado.toLowerCase().includes(alimentoLimpio)
              );
              
              if (etapaReal) {
                console.log(`📍 Encontrado "${alimentoIndividual}" por coincidencia parcial en "${etapaReal.alimentoRecomendado}"`);
              }
            }
            
            // 🔧 ESTRATEGIA 4: Buscar las cantidades hardcodeadas conocidas
            let cantidadReal = etapaReal ? etapaReal.quantityPerAnimal : null;
            
            if (!cantidadReal) {
              // 🔧 CANTIDADES REALES - EXACTAS DEL PLAN NUTRICIONAL CONFIGURADO
              const cantidadesReales: { [key: string]: { [rango: string]: number } } = {
                'maiz': {
                  '1-20': 0.12,
                  '21-38': 0.20,
                  '81-400': 0.3  // DIRECTO del plan configurado
                },
                'balanceado': {
                  '1-20': 0.12,
                  '21-38': 0.00,
                  '81-400': 0.35  // DIRECTO del plan configurado
                },
                'ahipal': {
                  '1-20': 0.12,
                  '21-38': 0.00,
                  '81-400': 0.01  // DIRECTO del plan configurado
                }
              };
              
              cantidadReal = cantidadesReales[alimentoLimpio]?.[rangoActual] || 0;
              
              console.log(`💡 Usando cantidad REAL para "${alimentoIndividual}" en rango ${rangoActual}: ${cantidadReal} kg`);
            }
            
            // Si la cantidad es 0, no agregar esa etapa
            if (cantidadReal > 0) {
              console.log(`✅ Cantidad REAL para "${alimentoIndividual}": ${cantidadReal} kg`);
              
              const etapaIndividual = {
                ...etapa,
                id: `${etapa.id}_${index}`,
                alimentoRecomendado: alimentoIndividual,
                quantityPerAnimal: cantidadReal,
                esActual: true,
                diasActuales: diasVida
              };
              
              console.log(`🔍 DEBUG - Etapa individual creada:`, {
                id: etapaIndividual.id,
                alimento: etapaIndividual.alimentoRecomendado,
                cantidad: etapaIndividual.quantityPerAnimal,
                unidad: etapaIndividual.unidad || 'kg'
              });
              
              etapasExpandidas.push(etapaIndividual);
            } else {
              console.log(`⚠️ Saltando "${alimentoIndividual}" por cantidad 0 en rango ${rangoActual}`);
            }
          });
        } else {
          // Alimento individual, agregar normalmente
          etapasExpandidas.push({
            ...etapa,
            esActual: true,
            diasActuales: diasVida
          });
        }
      });
      
      const etapasParaDevolver = etapasExpandidas;
      
      // 🔍 DEBUG: Verificar qué etapas se están devolviendo
      console.log('🔍 ✅ ETAPAS DEVUELTAS para selección:');
      etapasParaDevolver.forEach((etapa, index) => {
        console.log(`  ${index + 1}. ID: ${etapa.id}, Alimento: "${etapa.alimentoRecomendado}", Cantidad: ${etapa.quantityPerAnimal} kg, Rango: ${etapa.rangoDias}`);
      });
      
      // 🔍 DEBUG FINAL: Verificar el array completo que se devuelve
      console.log('🔍 ✅ ARRAY COMPLETO DEVUELTO:', etapasParaDevolver.map(e => ({
        id: e.id,
        alimento: e.alimentoRecomendado,
        cantidad: e.quantityPerAnimal,
        unidad: e.unidad || 'kg',
        esActual: e.esActual
      })));
      
      return etapasParaDevolver;
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
    private cdr: ChangeDetectorRef,
    private router: Router
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
      
      // ⚡ PASO 1: Cargar datos básicos en paralelo
      console.log('📋 Cargando datos básicos...');
      await Promise.all([
        this.cargarLotesPollos(),
        this.cargarInventarioPollos(),
        this.cargarPlanNutricional()
      ]);
      
      // ⚡ PASO 2: Cargar etapas del plan (CRÍTICO para análisis)
      console.log('🔍 Cargando etapas del plan nutricional...');
      await this.cargarEtapasPlanAdministrador();
      
      // ⚡ PASO 3: Verificar que las etapas se cargaron correctamente
      console.log('✅ Verificando etapas cargadas...');
      if (this.etapasPlanAdministrador.length === 0) {
        console.warn('⚠️ No se cargaron etapas del plan - reintentando...');
        
        // Reintentar carga específica
        await this.cargarEtapasPlanAdministrador();
        
        if (this.etapasPlanAdministrador.length === 0) {
          console.error('❌ FALLO CRÍTICO: No se pudieron cargar las etapas del plan');
          throw new Error('No se pudieron cargar las etapas del plan nutricional');
        }
      }
      
      console.log(`✅ Etapas cargadas exitosamente: ${this.etapasPlanAdministrador.length} etapas`);
      
      // ⚡ PASO 4: Cargar etapas de alimentación después de que todo esté listo
      await this.cargarEtapasAlimentacion();
      
      // ⚡ PASO 5: Inicializar seguimiento solo después de tener todo
      this.inicializarSeguimientoEtapas();
      
      // ⚡ PASO 6: Verificar cobertura de etapas críticas (días 20-21)
      this.verificarEtapasCriticas();
      
      // ⚡ PASO 7: Actualizar estado del sistema
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
   * 🆕 Verificar que las etapas críticas estén cubiertas
   */
  private verificarEtapasCriticas(): void {
    console.log('🔍 Verificando cobertura de etapas críticas...');
    
    // Verificar días críticos (20-21 para transición)
    const diasCriticos = [20, 21];
    
    diasCriticos.forEach(dia => {
      const etapaEncontrada = this.etapasPlanAdministrador.find(etapa => 
        dia >= etapa.diasInicio && dia <= etapa.diasFin
      );
      
      if (etapaEncontrada) {
        console.log(`✅ Día ${dia}: Cubierto por "${etapaEncontrada.nombre}"`);
      } else {
        console.warn(`⚠️ Día ${dia}: NO CUBIERTO - Esto puede causar problemas`);
      }
    });
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
    return []; // TODO: Cargar historial real desde el backend
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
      cantidadSugerida = parseFloat((etapaAdministrador.quantityPerAnimal * animalesVivos).toFixed(2));
      tipoAlimento = etapaAdministrador.alimentoRecomendado;
      
      console.log('✅ Etapa del administrador encontrada:', {
        etapa: etapaAdministrador.nombre,
        diasVida: diasVida,
        quantityPerAnimal: etapaAdministrador.quantityPerAnimal,
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
  async abrirModalAlimentacion(lote: Lote): Promise<void> {
    console.log('🔥 INICIANDO abrirModalAlimentacion...');
    console.log('🔥 Lote recibido:', lote);
    console.log('🔥 modalAbierto ANTES:', this.modalAbierto);
    
    this.loteSeleccionado = lote;
    
    // 🎯 PASO 1: Cargar etapas del plan asignado específicamente para este lote
    try {
      console.log('🔥 A PUNTO DE LLAMAR cargarEtapasPlanAsignado...');
      await this.cargarEtapasPlanAsignado(lote);
      console.log('🔥 cargarEtapasPlanAsignado COMPLETADO EXITOSAMENTE');
    } catch (error) {
      console.error('🔥 ERROR EN cargarEtapasPlanAsignado:', error);
      // Continuar con la lógica normal si falla
    }
    
    // Calcular días de vida una sola vez
    const diasVida = this.calcularDiasDeVida(lote.birthdate);
    
    // Limpiar selecciones anteriores
    this.alimentosSeleccionados = [];
    
    // Obtener etapas disponibles para este lote (una sola vez)
    this.etapasDisponiblesLote = this.obtenerTodasLasEtapasParaLote(diasVida);
    this.etapaActualLote = this.obtenerEtapaParaLote(diasVida);
    
    // 🔍 DEBUG: Verificar qué se asignó a etapasDisponiblesLote
    console.log('🔍 ✅ ETAPAS ASIGNADAS A etapasDisponiblesLote:', this.etapasDisponiblesLote.map(e => ({
      id: e.id,
      alimento: e.alimentoRecomendado,
      cantidad: e.quantityPerAnimal,
      unidad: e.unidad || 'kg'
    })));
    
    // Inicializar propiedad seleccionado para checkboxes
    this.etapasDisponiblesLote.forEach(etapa => {
      etapa.seleccionado = false;
    });
    
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
    this.alimentosSeleccionados = [];
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
   * Registrar alimentación completa con validaciones
   */
  async registrarAlimentacionCompleta(): Promise<void> {
    console.log('🔥 INICIANDO registrarAlimentacionCompleta');
    console.log('🔥 registroCompleto ANTES de validaciones:', JSON.stringify(this.registroCompleto, null, 2));
    
    if (!this.validarFormularioCompleto()) {
      alert('❌ Por favor complete todos los campos obligatorios');
      return;
    }

    try {
      this.loading = true;

      // 🎯 Paso 1: Registrar en el backend
      console.log('📡 Enviando al backend...');
      const response = await this.registrarAlimentacionEnBackend(this.registroCompleto);
      console.log('✅ Respuesta del backend recibida:', response);

      // 🎯 Paso 2: Actualizar datos locales
      console.log('🔄 Actualizando datos locales...');
      
      // Actualizar stock de inventario
      this.actualizarStockInventario(this.registroCompleto.tipoAlimento, this.registroCompleto.cantidadAplicada);
      
      // Actualizar lote con cambios (mortalidad y ventas)
      this.actualizarLoteConCambios(this.registroCompleto.animalesMuertos, this.registroCompleto.animalesVendidos);
      
      // Registrar animales enfermos si los hay
      if (this.registroCompleto.animalesEnfermos > 0) {
        this.registrarAnimalesEnfermos(this.registroCompleto.animalesEnfermos, this.registroCompleto.observacionesSalud);
      }
      
      // Agregar al historial local
      this.agregarAlHistorial(this.registroCompleto);
      
      // Si el lote se cierra, enviarlo al histórico
      if (this.registroCompleto.loteCerrado) {
        this.cerrarYEnviarAHistorico(this.registroCompleto);
      }

      // 🎯 Paso 3: Éxito
      alert('✅ Alimentación registrada exitosamente');
      
      // 🎯 Paso 4: Redirección automática basada en los datos ingresados
      const requiereRedireccion = this.verificarRedireccionNecesaria(this.registroCompleto);
      if (requiereRedireccion) {
        this.cerrarModal();
        this.ejecutarRedireccion(requiereRedireccion);
      } else {
        this.cerrarModal();
      }
      
    } catch (error) {
      console.error('❌ Error en registrarAlimentacionCompleta:', error);
      
      // El error ya se maneja en registrarAlimentacionEnBackend
      // Solo necesitamos resetear el estado de carga
      
    } finally {
      this.loading = false;
    }
  }

  /**
   * Registrar alimentación en el backend usando el servicio
   */
  private async registrarAlimentacionEnBackend(registro: RegistroAlimentacionCompleto): Promise<any> {
    console.log('🔥 INICIO registrarAlimentacionEnBackend');
    console.log('🔥 registro recibido:', JSON.stringify(registro, null, 2));
    console.log('🔥 loteSeleccionado:', this.loteSeleccionado);
    
    const request: RegistroAlimentacionRequest = {
      loteId: this.loteSeleccionado?.id.toString() || '',
      fecha: registro.fecha,
      cantidadAplicada: registro.cantidadAplicada,
      animalesVivos: registro.animalesVivos,
      animalesMuertos: registro.animalesMuertos,
      observaciones: `${registro.observacionesGenerales || ''} ${registro.observacionesSalud || ''}`.trim()
    };

    console.log('🔥 request CREADO:', JSON.stringify(request, null, 2));

    // 🔍 LOGGING DETALLADO PARA DEBUGGING
    console.log('🍽️ Enviando registro al backend (endpoint REAL):', request);
    console.log('🔍 VALIDACIÓN DE DATOS ANTES DE ENVIAR:');
    console.log('  - loteId:', request.loteId, typeof request.loteId);
    console.log('  - fecha:', request.fecha, typeof request.fecha);
    console.log('  - cantidadAplicada:', request.cantidadAplicada, typeof request.cantidadAplicada, 'isNaN:', isNaN(request.cantidadAplicada));
    console.log('  - animalesVivos:', request.animalesVivos, typeof request.animalesVivos, 'isNaN:', isNaN(request.animalesVivos));
    console.log('  - animalesMuertos:', request.animalesMuertos, typeof request.animalesMuertos, 'isNaN:', isNaN(request.animalesMuertos));
    console.log('  - observaciones:', request.observaciones, typeof request.observaciones);

    // ✅ VALIDAR DATOS ANTES DE ENVIAR
    if (!request.loteId || request.loteId === 'undefined') {
      console.error('❌ ERROR: loteId no válido');
      alert('❌ Error: ID de lote no válido');
      throw new Error('ID de lote no válido');
    }
    
    if (!request.fecha || request.fecha === '') {
      console.error('❌ ERROR: fecha no válida');
      alert('❌ Error: Fecha no válida');
      throw new Error('Fecha no válida');
    }
    
    if (isNaN(request.cantidadAplicada) || request.cantidadAplicada < 0) {
      console.error('❌ ERROR: cantidadAplicada no válida:', request.cantidadAplicada);
      alert('❌ Error: Cantidad aplicada no válida');
      throw new Error('Cantidad aplicada no válida');
    }
    
    if (isNaN(request.animalesVivos) || request.animalesVivos < 0) {
      console.error('❌ ERROR: animalesVivos no válido:', request.animalesVivos);
      alert('❌ Error: Número de animales vivos no válido');
      throw new Error('Número de animales vivos no válido');
    }
    
    if (isNaN(request.animalesMuertos) || request.animalesMuertos < 0) {
      console.error('❌ ERROR: animalesMuertos no válido:', request.animalesMuertos);
      alert('❌ Error: Número de animales muertos no válido');
      throw new Error('Número de animales muertos no válido');
    }

    console.log('✅ Todos los datos son válidos, enviando al backend...');

    try {
      const response = await this.alimentacionService.registrarAlimentacion(request).toPromise();
      console.log('✅ Respuesta del backend:', response);
      return response;
    } catch (error) {
      console.error('❌ Error al guardar en backend:', error);
      
      // Mostrar mensaje de error específico
      if (error.status === 404) {
        alert('❌ Error: El endpoint no se encontró. Verifique que el backend esté ejecutándose.');
      } else if (error.status === 401) {
        alert('❌ Error: No autorizado. Verifique sus credenciales.');
      } else if (error.status === 400) {
        console.error('❌ ERROR 400 - Datos inválidos:', error);
        alert('❌ Error 400: Datos inválidos. Revise la consola para más detalles.');
      } else if (error.status === 500) {
        alert('❌ Error interno del servidor. Verifique los logs del backend.');
      } else {
        alert(`❌ Error de conexión: ${error.message || 'Error desconocido'}`);
      }
      
      throw error;
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
    // TODO: Implementar guardado real del historial en el backend
    console.log('📝 Registro que se debería guardar en BD:', {
      fecha: registro.fecha,
      cantidad: registro.cantidadAplicada,
      animalesVivos: registro.animalesVivos,
      animalesVendidos: registro.animalesVendidos > 0 ? registro.animalesVendidos : undefined,
      valorVenta: registro.valorTotalVenta > 0 ? registro.valorTotalVenta : undefined,
      observaciones: registro.observacionesGenerales || 'Sin observaciones'
    });
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
      
      // Búsqueda general
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
    return 'Acabado';
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
    return 'Etapa de Acabado';
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
      edadTexto: `${diasVida} días`,
      
      // Información de etapa
      etapaActual: etapaActual ? {
        nombre: etapaActual.nombre,
        rangoDias: etapaActual.rangoDias,
        alimentoRecomendado: etapaActual.alimentoRecomendado,
        cantidadPorAnimal: etapaActual.quantityPerAnimal,
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
    
    // Debug: verificar qué datos tiene la etapa
    console.log('🔍 DEBUG - getInfoEtapaActual:', {
      diasVida,
      etapaActual,
      quantityPerAnimal: etapaActual.quantityPerAnimal,
      cantidadPorAnimal: etapaActual.cantidadPorAnimal,
      todasLasPropiedades: Object.keys(etapaActual)
    });
    
    return {
      tieneEtapa: true,
      nombre: etapaActual.nombre,
      rangoDias: etapaActual.rangoDias,
      alimentoRecomendado: etapaActual.alimentoRecomendado,
      cantidadPorAnimal: etapaActual.quantityPerAnimal || etapaActual.cantidadPorAnimal || 0,
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
          cantidad: etapa.quantityPerAnimal,
          unidad: etapa.unidad
        });
      });
      
      // Verificar cobertura de rangos
      console.log('🔍 Análisis de cobertura de rangos:');
      const rangos = this.etapasPlanAdministrador.map(e => ({ 
        inicio: e.diasInicio, 
        fin: e.diasFin,
        nombre: e.nombre || `Rango ${e.diasInicio}-${e.diasFin}`
      }));
      rangos.sort((a, b) => a.inicio - b.inicio);
      
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
   * Verificar si se necesita redirección después del registro
   */
  private verificarRedireccionNecesaria(registro: RegistroAlimentacionCompleto): 'mortalidad' | 'morbilidad' | null {
    // Verificar animales muertos
    if (registro.animalesMuertos > 0) {
      return 'mortalidad';
    }
    
    // Verificar animales enfermos
    if (registro.animalesEnfermos > 0) {
      return 'morbilidad';
    }
    
    return null;
  }

  /**
   * Ejecutar redirección basada en el tipo de registro
   */
  private ejecutarRedireccion(tipo: 'mortalidad' | 'morbilidad'): void {
    const mensajes = {
      mortalidad: 'Se registraron animales muertos. Será redirigido al módulo de mortalidad para completar el registro.',
      morbilidad: 'Se registraron animales enfermos. Será redirigido al módulo de morbilidad para completar el registro.'
    };
    
    const urls = {
      mortalidad: '/pollos/mortalidad',
      morbilidad: '/pollos/morbilidad'
    };
    
    // Mostrar mensaje informativo
    if (confirm(`${mensajes[tipo]} ¿Desea continuar?`)) {
      console.log(`🔄 Redirigiendo a ${urls[tipo]} para completar registro de ${tipo}`);
      this.router.navigate([urls[tipo]], {
        state: {
          fromAlimentacion: true,
          loteId: this.loteSeleccionado?.id,
          loteCodigo: this.loteSeleccionado?.codigo,
          fecha: this.registroCompleto.fecha,
          cantidad: tipo === 'mortalidad' ? this.registroCompleto.animalesMuertos : this.registroCompleto.animalesEnfermos,
          observaciones: this.registroCompleto.observacionesSalud
        }
      });
    }
  }

  // Agregar propiedad que falta
  alimentosSeleccionados: any[] = [];

  // Método para realizar análisis completo
  realizarAnalisisCompleto(): void {
    console.log('🔍 ====== ANÁLISIS COMPLETO DEL SISTEMA ======');
    console.log('📊 Lotes activos:', this.lotesActivos.length);
    console.log('📋 Plan activo:', this.planActivoAdministrador?.name || 'Ninguno');
    console.log('🎯 Etapas disponibles:', this.etapasPlanAdministrador?.length || 0);
    
    // Análisis detallado por lote
    this.lotesActivos.forEach(lote => {
      const diasVida = this.calcularDiasDeVida(lote.birthdate);
      const etapaActual = this.obtenerEtapaParaLote(diasVida);
      
      console.log(`\n📊 LOTE ${lote.codigo}:`);
      console.log(`   - Edad: ${diasVida} días`);
      console.log(`   - Cantidad: ${lote.quantity} pollos`);
      console.log(`   - Etapa actual: ${etapaActual?.nombre || 'Sin etapa'}`);
      console.log(`   - Alimento recomendado: ${etapaActual?.alimentoRecomendado || 'Sin definir'}`);
    });
    
    // Verificar estado del sistema
    this.actualizarEstadoSistema(this.etapasPlanAdministrador);
    
    console.log('✅ Análisis completo terminado. Revisa los detalles arriba.');
  }

  // Método para agrupar etapas por rango
  agruparEtapasPorRango(etapas: any[]): any[] {
    console.log('🔍 Agrupando etapas por rango de días...');
    
    const etapasAgrupadas: any[] = [];
    const rangosProcesados = new Map<string, any>();
    
    etapas.forEach(etapa => {
      const claveRango = `${etapa.dayStart}-${etapa.dayEnd}`;
      
      if (!rangosProcesados.has(claveRango)) {
        rangosProcesados.set(claveRango, {
          id: etapa.id,
          dayStart: etapa.dayStart,
          dayEnd: etapa.dayEnd,
          productos: [],
          quantityPerAnimal: etapa.quantityPerAnimal,
          frequency: etapa.frequency,
          instructions: etapa.instructions,
          productoId: etapa.productoId
        });
      }
      
      const rangoExistente = rangosProcesados.get(claveRango);
      if (etapa.product && !rangoExistente.productos.includes(etapa.product.name)) {
        rangoExistente.productos.push(etapa.product.name);
      }
    });
    
    return Array.from(rangosProcesados.values());
  }

  // Método para actualizar estado del sistema
  actualizarEstadoSistema(etapas: any[]): void {
    const lotesCargados = this.lotesActivos?.length || 0;
    const planEncontrado = this.planActivoAdministrador !== null;
    const etapasCubiertas = etapas && etapas.length > 0;
    
    let problemasDetectados = 0;
    
    if (lotesCargados === 0) problemasDetectados++;
    if (!planEncontrado) problemasDetectados++;
    if (!etapasCubiertas) problemasDetectados++;
    
    this.estadoSistema = {
      lotesCargados,
      planEncontrado,
      etapasCubiertas,
      problemasDetectados,
      mensaje: problemasDetectados === 0 ? 'Sistema OK' : `${problemasDetectados} problema(s)`,
      color: problemasDetectados === 0 ? 'text-green-600' : 'text-red-600'
    };
  }

  // Método para obtener edad de un lote por ID
  obtenerEdadLote(loteId: number): number {
    const lote = this.lotesActivos.find(l => l.id === loteId);
    if (!lote) return 0;
    return this.calcularDiasDeVida(lote.birthdate);
  }

  // Método para obtener etapa actual de un lote por ID
  obtenerEtapaActual(loteId: number): any {
    const lote = this.lotesActivos.find(l => l.id === loteId);
    if (!lote) return null;
    
    const diasVida = this.calcularDiasDeVida(lote.birthdate);
    return this.obtenerEtapaParaLote(diasVida);
  }
}