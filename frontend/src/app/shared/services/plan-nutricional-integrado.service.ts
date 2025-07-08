import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
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

  // Definiciones estándar de etapas
  private readonly ETAPAS_POLLOS_ESTANDAR = [
    {
      nombre: 'Inicio',
      diasEdad: { min: 1, max: 14 },
      tipoAlimento: 'Pre-iniciador',
      consumoDiario: { min: 25, max: 40 },
      descripcion: 'Desarrollo inicial del sistema digestivo. Alimento de alta digestibilidad.'
    },
    {
      nombre: 'Desarrollo',
      diasEdad: { min: 15, max: 28 },
      tipoAlimento: 'Iniciador',
      consumoDiario: { min: 50, max: 90 },
      descripcion: 'Crecimiento acelerado y desarrollo muscular. Incremento de proteína.'
    },
    {
      nombre: 'Engorde',
      diasEdad: { min: 29, max: 42 },
      tipoAlimento: 'Finalizador',
      consumoDiario: { min: 100, max: 120 },
      descripcion: 'Maximización del peso final. Enfoque en conversión alimenticia.'
    }
  ];

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

  constructor(
    private planAlimentacionService: PlanAlimentacionService,
    private productService: ProductService
  ) {}

  /**
   * Obtener plan activo integrado para un tipo de animal
   */
  obtenerPlanActivo(tipoAnimal: 'pollos' | 'chanchos'): Observable<PlanIntegrado | null> {
    console.log(`🔍 Buscando plan activo para ${tipoAnimal}...`);
    
    return forkJoin({
      planes: this.planAlimentacionService.getAllPlanes(),
      productos: this.productService.getProducts()
    }).pipe(
      map(({ planes, productos }) => {
        // Filtrar planes por tipo de animal
        const planesDelTipo = planes.filter(plan => 
          plan.animalName?.toLowerCase() === tipoAnimal ||
          plan.animal?.name?.toLowerCase() === tipoAnimal
        );

        if (planesDelTipo.length === 0) {
          console.warn(`⚠️ No se encontraron planes para ${tipoAnimal}`);
          return this.crearPlanPorDefecto(tipoAnimal, productos);
        }

        // Tomar el primer plan activo o el más reciente
        const planActivo = planesDelTipo.find(p => p.active) || planesDelTipo[0];
        
        return this.convertirAPlanIntegrado(planActivo, productos, tipoAnimal);
      }),
      catchError(error => {
        console.error('❌ Error al obtener plan activo:', error);
        // Retornar plan por defecto en caso de error
        return this.productService.getProducts().pipe(
          map((productos: Product[]) => this.crearPlanPorDefecto(tipoAnimal, productos))
        );
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
   * Convertir plan del admin a plan integrado
   */
  private convertirAPlanIntegrado(plan: PlanAlimentacion, productos: Product[], tipoAnimal: 'pollos' | 'chanchos'): PlanIntegrado {
    const etapas: EtapaCrecimiento[] = [];

    if (plan.detalles && plan.detalles.length > 0) {
      // Usar detalles del plan del admin
      etapas.push(...plan.detalles.map(detalle => this.convertirDetalleAEtapa(detalle, productos, tipoAnimal)));
    } else {
      // Usar etapas estándar si no hay detalles
      const etapasEstandar = tipoAnimal === 'pollos' ? this.ETAPAS_POLLOS_ESTANDAR : this.ETAPAS_CHANCHOS_ESTANDAR;
      etapas.push(...etapasEstandar.map(etapa => this.crearEtapaEstandar(etapa, productos, tipoAnimal)));
    }

    return {
      id: plan.id || 0,
      name: plan.name || `Plan ${tipoAnimal}`,
      description: plan.description || `Plan de alimentación para ${tipoAnimal}`,
      tipoAnimal,
      etapas,
      activo: plan.active || false
    };
  }

  /**
   * Convertir detalle del plan a etapa
   */
  private convertirDetalleAEtapa(detalle: PlanDetalle, productos: Product[], tipoAnimal: 'pollos' | 'chanchos'): EtapaCrecimiento {
    const producto = productos.find(p => p.id === detalle.product.id);
    const etapasEstandar = tipoAnimal === 'pollos' ? this.ETAPAS_POLLOS_ESTANDAR : this.ETAPAS_CHANCHOS_ESTANDAR;
    
    // Buscar etapa estándar correspondiente para obtener información adicional
    const etapaEstandar = etapasEstandar.find(e => 
      detalle.dayStart >= e.diasEdad.min && detalle.dayStart <= e.diasEdad.max
    );

    return {
      id: detalle.id,
      nombre: etapaEstandar?.nombre || `Etapa ${detalle.dayStart}-${detalle.dayEnd}`,
      diasEdad: { min: detalle.dayStart, max: detalle.dayEnd },
      tipoAlimento: detalle.product.name,
      consumoDiario: etapaEstandar?.consumoDiario || { min: 50, max: 100 },
      producto: {
        id: detalle.product.id,
        name: detalle.product.name,
        stock: producto?.quantity || detalle.product.stock || 0
      },
      quantityPerAnimal: detalle.quantityPerAnimal,
      frequency: detalle.frequency || 'DIARIA',
      instructions: detalle.instructions,
      descripcion: etapaEstandar?.descripcion || 'Etapa de crecimiento'
    };
  }

  /**
   * Crear etapa estándar
   */
  private crearEtapaEstandar(etapaEstandar: any, productos: Product[], tipoAnimal: 'pollos' | 'chanchos'): EtapaCrecimiento {
    // Buscar producto que coincida con el tipo de alimento
    const producto = productos.find(p => 
      p.name.toLowerCase().includes(etapaEstandar.tipoAlimento.toLowerCase()) ||
      p.name.toLowerCase().includes(etapaEstandar.nombre.toLowerCase())
    ) || productos[0]; // Fallback al primer producto disponible

    return {
      nombre: etapaEstandar.nombre,
      diasEdad: etapaEstandar.diasEdad,
      tipoAlimento: etapaEstandar.tipoAlimento,
      consumoDiario: etapaEstandar.consumoDiario,
      producto: {
        id: producto?.id || 1,
        name: producto?.name || etapaEstandar.tipoAlimento,
        stock: producto?.quantity || 0
      },
      quantityPerAnimal: (etapaEstandar.consumoDiario.min + etapaEstandar.consumoDiario.max) / 2000, // Promedio en kg
      frequency: 'DIARIA',
      descripcion: etapaEstandar.descripcion
    };
  }

  /**
   * Crear plan por defecto cuando no hay plan en admin
   */
  private crearPlanPorDefecto(tipoAnimal: 'pollos' | 'chanchos', productos: Product[]): PlanIntegrado {
    const etapasEstandar = tipoAnimal === 'pollos' ? this.ETAPAS_POLLOS_ESTANDAR : this.ETAPAS_CHANCHOS_ESTANDAR;
    
    const etapas = etapasEstandar.map(etapa => this.crearEtapaEstandar(etapa, productos, tipoAnimal));

    return {
      id: 0,
      name: `Plan Estándar ${tipoAnimal}`,
      description: `Plan de alimentación estándar para ${tipoAnimal} (generado automáticamente)`,
      tipoAnimal,
      etapas,
      activo: true
    };
  }
}
