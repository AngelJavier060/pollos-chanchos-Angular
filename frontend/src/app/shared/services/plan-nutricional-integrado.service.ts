import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { PlanAlimentacionService, PlanAlimentacion, PlanDetalle } from '../../features/plan-nutricional/services/plan-alimentacion.service';
import { ProductService } from './product.service';
import { Product } from '../models/product.model';

// Interfaces específicas para la integración
export interface EtapaCrecimiento {
  id?: number;
  nombre: string;
  diasEdad: { min: number, max: number };
  tipoAlimento: string;
  consumoDiario: { min: number, max: number }; // gramos por animal
  producto: {
    id: number;
    name: string;
    stock: number;
  };
  quantityPerAnimal: number; // kg por animal por día
  frequency: string;
  instructions?: string;
  descripcion: string;
  esActual?: boolean;
  completada?: boolean;
  // ✅ Metadatos del plan de origen (principal)
  planId?: number;
  planNombre?: string;
}

export interface PlanIntegrado {
  id: number;
  name: string;
  description: string;
  tipoAnimal: 'pollos' | 'chanchos';
  etapas: EtapaCrecimiento[];
  activo: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PlanNutricionalIntegradoService {

  // ✅ CACHE PARA EVITAR LLAMADAS MÚLTIPLES INNECESARIAS
  private planesCache: Map<string, PlanIntegrado | null> = new Map();
  private cacheExpiration: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos en milisegundos

  // ❌ CONSTANTES DESHABILITADAS - SOLO USAR DATOS REALES DEL ADMINISTRADOR
  // Las siguientes constantes NO se usan más. El sistema debe obtener
  // los datos únicamente del módulo de administrador > Plan Nutricional > Etapas
  
  /*
  private readonly ETAPAS_POLLOS_ESTANDAR = [
    // Estos rangos ficticios ya no se usan:
    // { nombre: 'Inicio', diasEdad: { min: 1, max: 14 } }
    // { nombre: 'Desarrollo', diasEdad: { min: 15, max: 28 } }
    // { nombre: 'Engorde', diasEdad: { min: 29, max: 42 } }
  ];
  */

  private readonly ETAPAS_CHANCHOS_ESTANDAR = [
    {
      nombre: 'Lechones',
      diasEdad: { min: 7, max: 30 },
      tipoAlimento: 'Pre-iniciador',
      consumoDiario: { min: 100, max: 500 }, // gramos
      descripcion: 'Transición de leche materna a alimento sólido'
    },
    {
      nombre: 'Destete',
      diasEdad: { min: 30, max: 70 },
      tipoAlimento: 'Iniciador',
      consumoDiario: { min: 500, max: 1200 },
      descripcion: 'Adaptación completa a alimento sólido'
    },
    {
      nombre: 'Crecimiento',
      diasEdad: { min: 70, max: 120 },
      tipoAlimento: 'Crecimiento',
      consumoDiario: { min: 1200, max: 2000 },
      descripcion: 'Desarrollo del esqueleto y masa muscular'
    },
    {
      nombre: 'Engorde',
      diasEdad: { min: 120, max: 180 },
      tipoAlimento: 'Finalizador',
      consumoDiario: { min: 2000, max: 3000 },
      descripcion: 'Acumulación de grasa y peso final'
    }
  ];

  // ✅ NUEVO: Determinar si un plan pertenece al tipo de animal solicitado (singulares/plurales/sinónimos)
  private esPlanDelTipo(plan: any, tipoAnimal: 'pollos' | 'chanchos'): boolean {
    const nombreAnimal = plan.animalName?.toLowerCase() || '';
    const objetoAnimal = plan.animal?.name?.toLowerCase() || '';
    const nombrePlan = plan.name?.toLowerCase() || '';
    const descripcion = plan.description?.toLowerCase() || '';

    const idAnimalRaw = plan.animal?.id ?? plan.animalId ?? null;
    const idAnimalNum = idAnimalRaw != null ? Number(idAnimalRaw) : null;
    if (idAnimalNum != null && !Number.isNaN(idAnimalNum)) {
      if (tipoAnimal === 'pollos' && idAnimalNum === 1) return true;
      if (tipoAnimal === 'chanchos' && idAnimalNum === 2) return true;
    }

    const terminosPollos = ['pollo', 'pollos', 'ave', 'aves', 'gallina', 'gallinas'];
    const terminosChanchos = ['chancho', 'chanchos', 'cerdo', 'cerdos', 'porcino', 'porcinos'];
    const terminos = tipoAnimal === 'pollos' ? terminosPollos : terminosChanchos;

    const fuente = `${nombreAnimal} ${objetoAnimal} ${nombrePlan} ${descripcion}`;
    const fuenteNorm = fuente.toLowerCase();

    const coincide = terminos.some(t => fuenteNorm.includes(t));
    return coincide;
  }

  constructor(
    private planAlimentacionService: PlanAlimentacionService,
    private productService: ProductService
  ) {}

  /**
   * Obtener plan activo integrado para un tipo de animal - SOLO DATOS REALES DEL ADMINISTRADOR
   */
  obtenerPlanActivo(tipoAnimal: 'pollos' | 'chanchos'): Observable<PlanIntegrado | null> {
    console.log(`🔍 Buscando plan REAL del administrador para ${tipoAnimal}...`);
    
    // ✅ VERIFICAR CACHE PRIMERO
    const cacheKey = `plan_${tipoAnimal}`;
    const tiempoActual = Date.now();
    const tiempoExpiracion = this.cacheExpiration.get(cacheKey) || 0;
    
    if (tiempoActual < tiempoExpiracion && this.planesCache.has(cacheKey)) {
      const planCacheado = this.planesCache.get(cacheKey);
      console.log(`✅ Usando plan CACHEADO para ${tipoAnimal}:`, planCacheado);
      return of(planCacheado);
    }
    
    console.log(`🔄 Cache expirado o no existe, consultando backend para ${tipoAnimal}...`);
    
    return forkJoin({
      planes: this.planAlimentacionService.getAllPlanes(),
      productos: this.productService.getProducts()
    }).pipe(
      map(({ planes, productos }) => {
        console.log('📋 Planes recibidos del administrador:', planes);
        console.log('🚨 DEBUG DETALLADO DE PLANES:');
        planes.forEach((plan, index) => {
          console.log(`  Plan ${index + 1}:`, {
            id: plan.id,
            name: plan.name,
            animalName: plan.animalName,
            animal: plan.animal,
            active: plan.active,
            description: plan.description
          });
        });
        
        // Filtrar planes por tipo de animal - SOLO DATOS REALES
        // ✅ BUSCAR PLANES QUE CORRESPONDAN AL TIPO DE ANIMAL (singular/plural y sinónimos)
        const planesDelTipo = planes.filter(plan => this.esPlanDelTipo(plan, tipoAnimal));

        console.log(`🎯 Planes encontrados para ${tipoAnimal}:`, planesDelTipo);
        console.log(`🚨 FILTRADO DETALLADO para ${tipoAnimal}:`);
        planes.forEach((plan, index) => {
          const incluido = this.esPlanDelTipo(plan, tipoAnimal);
          console.log(`  Plan ${index + 1}: "${plan.name}" → ¿Incluido?: ${incluido ? '✅ SÍ' : '❌ NO'}`);
        });

        if (planesDelTipo.length === 0) {
          console.error(`❌ NO SE ENCONTRARON PLANES REALES para ${tipoAnimal} en el administrador`);
          console.error('💡 SOLUCIÓN: Crear plan nutricional en el módulo de administrador');
          console.error('🚨 PLANES DISPONIBLES EN EL SISTEMA:');
          planes.forEach((plan, index) => {
            console.error(`  ${index + 1}. "${plan.name}" - Animal: "${plan.animalName || plan.animal?.name || 'NO DEFINIDO'}"`);
          });
          
          // ✅ GUARDAR NULL EN CACHE PARA EVITAR LLAMADAS REPETIDAS
          this.planesCache.set(cacheKey, null);
          this.cacheExpiration.set(cacheKey, Date.now() + this.CACHE_DURATION);
          console.log(`💾 NULL guardado en cache para ${tipoAnimal} (no hay planes)`);
          
          return null; // NO usar fallback - forzar a usar datos reales
        }

        // ✅ OBTENER TODOS LOS PLANES DEL TIPO DE ANIMAL Y COMBINAR SUS ETAPAS
        console.log(`🔍 Obteniendo detalles de TODOS los ${planesDelTipo.length} planes de ${tipoAnimal}...`);
        
        // Obtener detalles de TODOS los planes del tipo de animal
        const observablesDetalles = planesDelTipo.map(plan => 
          this.planAlimentacionService.getDetallesByPlan(plan.id!)
        );
        
        return forkJoin(observablesDetalles).pipe(
          map(todosLosDetalles => {
            console.log('📊 Detalles obtenidos de todos los planes:', todosLosDetalles);

            // ✅ Construir etapas preservando el plan de origen de cada detalle
            const etapas: EtapaCrecimiento[] = [];
            todosLosDetalles.forEach((detalles, idx) => {
              const planOrigen = planesDelTipo[idx];
              (detalles || []).forEach((detalle: PlanDetalle) => {
                const etapa = this.convertirDetalleAEtapa(detalle, productos, tipoAnimal, planOrigen);
                etapas.push(etapa);
              });
            });

            // Crear un plan integrado virtual con todas las etapas preservando el plan de origen
            const planIntegrado: PlanIntegrado = {
              id: 0,
              name: `Plan Integrado ${tipoAnimal.charAt(0).toUpperCase() + tipoAnimal.slice(1)}`,
              description: `Plan combinado de ${planesDelTipo.length} planes para ${tipoAnimal}`,
              tipoAnimal,
              etapas,
              activo: true
            };

            console.log('✅ Plan integrado final con TODAS las etapas (con plan de origen):', planIntegrado);
            planIntegrado.etapas.forEach((etapa, index) => {
              console.log(`  Etapa ${index + 1}:`, {
                nombre: etapa.nombre,
                diasEdad: etapa.diasEdad,
                tipoAlimento: etapa.tipoAlimento,
                producto: etapa.producto?.name,
                planOrigen: etapa.planNombre
              });
            });

            // ✅ GUARDAR EN CACHE
            this.planesCache.set(cacheKey, planIntegrado);
            this.cacheExpiration.set(cacheKey, Date.now() + this.CACHE_DURATION);
            console.log(`💾 Plan combinado guardado en cache para ${tipoAnimal}`);

            return planIntegrado;
          })
        );
      }),
      // Aplanar el Observable anidado
      switchMap(result => result || of(null)),
      catchError(error => {
        console.error('❌ Error crítico al obtener plan del administrador:', error);
        console.error('🚨 NO SE PUEDE CONTINUAR SIN DATOS REALES DEL ADMINISTRADOR');
        return of(null); // Retornar null en lugar de fallback
      })
    );
  }

  /**
   * Determinar etapa actual según edad del lote
   */
  determinarEtapaActual(edadDias: number, etapas: EtapaCrecimiento[]): EtapaCrecimiento | null {
    if (!etapas || etapas.length === 0) return null;

    const etapaActual = etapas.find(etapa => 
      edadDias >= etapa.diasEdad.min && edadDias <= etapa.diasEdad.max
    );

    if (etapaActual) {
      console.log(`✅ Etapa determinada para ${edadDias} días: ${etapaActual.nombre}`);
      return { ...etapaActual, esActual: true };
    }

    console.warn(`⚠️ No se encontró etapa para ${edadDias} días`);
    return null;
  }

  /**
   * Calcular cantidad recomendada para un lote
   */
  calcularCantidadRecomendada(cantidadAnimales: number, etapa: EtapaCrecimiento): number {
    if (!etapa) return 0;
    
    // Usar quantityPerAnimal si está disponible, sino calcular desde consumoDiario
    if (etapa.quantityPerAnimal) {
      return etapa.quantityPerAnimal * cantidadAnimales;
    }
    
    // Usar el promedio del rango de consumo diario y convertir a kg
    const promedioConsumo = (etapa.consumoDiario.min + etapa.consumoDiario.max) / 2;
    return (promedioConsumo / 1000) * cantidadAnimales; // Convertir gramos a kg
  }

  /**
   * Calcular días de alcance del stock
   */
  calcularDiasAlcance(stockDisponible: number, consumoDiario: number): number {
    if (consumoDiario <= 0) return 0;
    return Math.floor(stockDisponible / consumoDiario);
  }

  /**
   * Determinar si el stock está bajo
   */
  isStockBajo(stockDisponible: number, consumoDiario: number, diasMinimos: number = 7): boolean {
    const diasAlcance = this.calcularDiasAlcance(stockDisponible, consumoDiario);
    return diasAlcance < diasMinimos;
  }

  /**
   * Obtener progreso dentro de la etapa actual
   */
  calcularProgresoEtapa(edadDias: number, etapa: EtapaCrecimiento): { progreso: number, dia: number, duracion: number } {
    if (!etapa) return { progreso: 0, dia: 0, duracion: 0 };

    const diaEnEtapa = edadDias - etapa.diasEdad.min + 1;
    const duracionEtapa = etapa.diasEdad.max - etapa.diasEdad.min + 1;
    const progreso = Math.min(100, (diaEnEtapa / duracionEtapa) * 100);

    return {
      progreso: Math.max(0, progreso),
      dia: Math.max(1, diaEnEtapa),
      duracion: duracionEtapa
    };
  }

  /**
   * Convertir plan del admin a plan integrado - SOLO DATOS REALES
   */
  private convertirAPlanIntegrado(plan: PlanAlimentacion, productos: Product[], tipoAnimal: 'pollos' | 'chanchos'): PlanIntegrado {
    const etapas: EtapaCrecimiento[] = [];

    console.log('🔄 Convirtiendo plan del administrador:', plan);
    console.log('📊 Detalles del plan:', plan.detalles);
    console.log('🔍 DETALLES RECIBIDOS del plan:', plan.detalles?.length, plan.detalles);

    if (plan.detalles && plan.detalles.length > 0) {
      // ✅ USAR ÚNICAMENTE DATOS REALES DEL ADMINISTRADOR
      console.log('✅ Usando etapas REALES del administrador');
      
      // ✅ CONVERTIR TODOS LOS DETALLES DEL ADMINISTRADOR A ETAPAS
      etapas.push(...plan.detalles.map(detalle => this.convertirDetalleAEtapa(detalle, productos, tipoAnimal)));
      
    } else {
      // ❌ NO USAR FALLBACK - FORZAR DATOS REALES
      console.error('❌ NO HAY DETALLES EN EL PLAN DEL ADMINISTRADOR');
      console.error('💡 SOLUCIÓN: Configurar etapas en Plan Nutricional > Etapas del administrador');
      console.error('📋 Plan recibido:', plan);
      
      // Retornar plan vacío para forzar configuración en el administrador
      return {
        id: plan.id || 0,
        name: plan.name || `Plan ${tipoAnimal}`,
        description: plan.description || `Plan de alimentación para ${tipoAnimal}`,
        tipoAnimal,
        etapas: [], // Etapas vacías para forzar configuración
        activo: plan.active || false
      };
    }

    console.log('✅ Plan integrado creado con etapas REALES:', etapas);

    return {
      id: plan.id || 0,
      name: plan.name || `Plan ${tipoAnimal}`,
      description: plan.description || `Plan de alimentación para ${tipoAnimal}`,
      tipoAnimal,
      etapas,
      activo: plan.active || false
    };
  }
  // ❌ MÉTODO ELIMINADO - Ya no se crean etapas estándar
  // El sistema debe usar únicamente datos reales del administrador
  
  /*
  private crearEtapaEstandar() {
    // Este método ya no se usa - solo datos reales del administrador
  }
  */

  /**
   * Convertir detalle del plan a etapa - SOLO DATOS REALES DEL ADMINISTRADOR
   */
  private convertirDetalleAEtapa(
    detalle: PlanDetalle,
    productos: Product[],
    tipoAnimal: 'pollos' | 'chanchos',
    planOrigen?: PlanAlimentacion
  ): EtapaCrecimiento {
    const producto = productos.find(p => p.id === detalle.product.id);

    console.log('🔄 Procesando detalle REAL del administrador:', detalle);
    console.log('📅 Rango de días REAL:', `${detalle.dayStart} - ${detalle.dayEnd} días`);
    console.log('🍽️ Producto REAL:', detalle.product.name);

    const dayStartNum = Number(detalle.dayStart);
    const dayEndNum = Number(detalle.dayEnd);
    const qtyPerAnimalNum = Number(detalle.quantityPerAnimal);

    const etapaReal: EtapaCrecimiento = {
      id: detalle.id,
      nombre: `Etapa ${dayStartNum}-${dayEndNum}`,
      diasEdad: {
        min: dayStartNum,
        max: dayEndNum
      },
      tipoAlimento: detalle.product.name,
      consumoDiario: {
        min: Math.round(qtyPerAnimalNum * 1000 * 0.8),
        max: Math.round(qtyPerAnimalNum * 1000 * 1.2)
      },
      producto: {
        id: detalle.product.id,
        name: detalle.product.name,
        stock: producto?.quantity || detalle.product.stock || 0
      },
      quantityPerAnimal: qtyPerAnimalNum,
      frequency: detalle.frequency || 'DIARIA',
      instructions: detalle.instructions,
      descripcion: `Etapa de ${dayStartNum} a ${dayEndNum} días con ${detalle.product.name}`,
      planId: planOrigen?.id,
      planNombre: planOrigen?.name
    };

    console.log('✅ Etapa REAL creada:', etapaReal);
    return etapaReal;
  }

  // ❌ MÉTODO ELIMINADO - Ya no se crean planes por defecto
  // El sistema debe forzar el uso de datos reales del administrador
  
  /*
  private crearPlanPorDefecto() {
    // Este método ya no se usa - solo datos reales del administrador
    // Si no hay plan en el admin, el sistema debe mostrar error
  }
  */

  /**
   * ✅ MÉTODO PARA LIMPIAR CACHE - Útil cuando se actualizan los planes en el administrador
   */
  limpiarCache(): void {
    this.planesCache.clear();
    this.cacheExpiration.clear();
    console.log('🗑️ Cache de planes limpiado');
  }

  /**
   * ✅ MÉTODO PARA FORZAR RECARGA DE UN PLAN ESPECÍFICO
   */
  recargarPlan(tipoAnimal: 'pollos' | 'chanchos'): Observable<PlanIntegrado | null> {
    const cacheKey = `plan_${tipoAnimal}`;
    this.planesCache.delete(cacheKey);
    this.cacheExpiration.delete(cacheKey);
    console.log(`🔄 Forzando recarga del plan para ${tipoAnimal}`);
    return this.obtenerPlanActivo(tipoAnimal);
  }

  /**
   * 🚨 MÉTODO TEMPORAL PARA LIMPIAR CACHE Y RECARGAR INMEDIATAMENTE
   */
  forzarRecargaCompleta(): void {
    console.log('🔄 FORZANDO RECARGA COMPLETA - Limpiando todo el cache...');
    this.limpiarCache();
    // El próximo llamado a obtenerPlanActivo() consultará el backend
  }
}
