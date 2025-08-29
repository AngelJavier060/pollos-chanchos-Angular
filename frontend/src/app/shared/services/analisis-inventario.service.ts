import { Injectable } from '@angular/core';
import { Observable, combineLatest, of } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { LoteService } from '../../features/lotes/services/lote.service';
import { ProductService } from './product.service';
import { PlanNutricionalIntegradoService } from './plan-nutricional-integrado.service';
import { PlanAlimentacionService } from '../../features/plan-nutricional/services/plan-alimentacion.service';
import { Lote } from '../../features/lotes/interfaces/lote.interface';
import { Product } from '../models/product.model';

export interface ConsumoAlimentoData {
  periodo: string;
  consumoTotal: number;
  costoTotal: number;
  consumoPorPollo: number;
  costoPorPollo: number;
}

export interface AnalisisLoteData {
  lote: Lote;
  consumoTotalKg: number;
  costoTotalLote: number;
  costoPorPollo: number;
  pollosVivos: number;
  pollosMuertos: number;
  estadoLote: 'activo' | 'inactivo';
  diasVida: number;
  rendimiento: number;
  rentabilidad: number;
}

export interface InventarioAnalisis {
  // Consumo por períodos
  consumoSemanal: ConsumoAlimentoData[];
  consumoMensual: ConsumoAlimentoData[];
  consumoAnual: ConsumoAlimentoData[];
  
  // Análisis por lote
  analisisPorLote: AnalisisLoteData[];
  
  // Totales generales
  totalPollosVivos: number;
  totalPollosMuertos: number;
  totalConsumoAlimento: number;
  totalCostoAlimento: number;
  
  // Promedios
  promedioConsumoPorPollo: number;
  promedioCostoPorPollo: number;
  promedioRentabilidad: number;

  // Totales de compras por animal (suma de productos comprados)
  costoComprasPorAnimal?: {
    pollos: number;
    chanchos: number;
    otros: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AnalisisInventarioService {
  
  // Costos promedio por tipo de alimento (precio por kg)
  private readonly costosAlimento: { [key: string]: number } = {
    'concentrado': 2.8,
    'maíz': 1.2,
    'maiz': 1.2,
    'balanceado': 2.5,
    'ahipal': 1.8,
    'preinicial': 3.2,
    'inicial': 2.9,
    'crecimiento': 2.6,
    'acabado': 2.4,
    'engorde': 2.3
  };

  constructor(
    private loteService: LoteService,
    private productService: ProductService,
    private planNutricionalService: PlanNutricionalIntegradoService,
    private planAlimentacionService: PlanAlimentacionService
  ) {}

  /**
   * Obtener análisis completo del inventario con datos reales de planes nutricionales
   */
  getAnalisisInventario(): Observable<InventarioAnalisis> {
    console.log('🔍 [AnalisisInventario] Iniciando carga de datos...');
    
    return combineLatest([
      this.loteService.getLotes().pipe(
        tap(lotes => console.log('✅ [AnalisisInventario] Lotes cargados:', lotes.length, lotes)),
        catchError(error => {
          console.error('❌ [AnalisisInventario] Error cargando lotes:', error);
          return of([]); // Fallback a array vacío
        })
      ),
      this.productService.getProducts().pipe(
        tap(productos => console.log('✅ [AnalisisInventario] Productos cargados:', productos.length, productos)),
        catchError(error => {
          console.error('❌ [AnalisisInventario] Error cargando productos:', error);
          return of([]); // Fallback a array vacío
        })
      ),
      this.planAlimentacionService.getAllPlanes().pipe(
        tap(planes => console.log('✅ [AnalisisInventario] Planes cargados:', planes.length, planes)),
        catchError(error => {
          console.error('❌ [AnalisisInventario] Error cargando planes:', error);
          return of([]); // Fallback a array vacío
        })
      )
    ]).pipe(
      // 🔁 Antes de analizar, si existe un plan de pollos, obtener sus detalles reales
      switchMap(([lotes, productos, planes]) => {
        console.log('🔍 [AnalisisInventario] Datos combinados recibidos:', {
          lotes: lotes.length,
          productos: productos.length, 
          planes: planes.length
        });

        // Filtrar solo lotes de pollos
        const lotesPollos = lotes.filter(lote => 
          lote.race?.animal?.name?.toLowerCase().includes('pollo') ||
          lote.race?.animal?.id === 1
        );
        
        console.log('🐔 [AnalisisInventario] Lotes de pollos encontrados:', lotesPollos.length, lotesPollos);

        // Si no hay datos, devolver análisis vacío pero funcional
        if (lotes.length === 0 && productos.length === 0 && planes.length === 0) {
          console.warn('⚠️ [AnalisisInventario] No hay datos disponibles, devolviendo análisis vacío');
          return of(this.getAnalisisVacio());
        }
        // Detectar un plan de pollos para asegurar que tenga detalles
        const planPolloSimple = planes.find(plan => {
          const animalName = plan.animal?.name?.toLowerCase() || plan.animalName?.toLowerCase() || '';
          const planName = plan.name?.toLowerCase() || '';
          return animalName.includes('pollo') || planName.includes('pollo') || plan.animalId === 1;
        });

        if (planPolloSimple?.id) {
          console.log('🔄 Cargando detalles del plan de pollos para análisis real. Plan ID:', planPolloSimple.id);
          return this.planAlimentacionService.getDetallesByPlan(planPolloSimple.id).pipe(
            map(detalles => {
              // Inyectar detalles en el array de planes
              const planesConDetalles = planes.map(p => p.id === planPolloSimple.id ? { ...p, detalles } : p);

              // Análisis por lote usando datos reales de planes nutricionales
              const analisisPorLote = this.analizarLotesConPlanesReales(lotesPollos, planesConDetalles, productos);
              console.log('📊 [AnalisisInventario] Análisis por lote completado:', analisisPorLote.length);

              // Consumo por períodos
              const consumoSemanal = this.generarConsumoSemanal(analisisPorLote);
              const consumoMensual = this.generarConsumoMensual(analisisPorLote);
              const consumoAnual = this.generarConsumoAnual(analisisPorLote);

              // Totales
              const totalPollosVivos = analisisPorLote.reduce((total, lote) => total + lote.pollosVivos, 0);
              const totalPollosMuertos = analisisPorLote.reduce((total, lote) => total + lote.pollosMuertos, 0);
              const totalConsumoAlimento = analisisPorLote.reduce((total, lote) => total + lote.consumoTotalKg, 0);
              const totalCostoAlimento = analisisPorLote.reduce((total, lote) => total + lote.costoTotalLote, 0);

              // Promedios
              const promedioConsumoPorPollo = totalPollosVivos > 0 ? totalConsumoAlimento / totalPollosVivos : 0;
              const promedioCostoPorPollo = totalPollosVivos > 0 ? totalCostoAlimento / totalPollosVivos : 0;
              const promedioRentabilidad = analisisPorLote.length > 0 ?
                analisisPorLote.reduce((total, lote) => total + lote.rentabilidad, 0) / analisisPorLote.length : 0;

              const resultado = {
                consumoSemanal,
                consumoMensual,
                consumoAnual,
                analisisPorLote,
                totalPollosVivos,
                totalPollosMuertos,
                totalConsumoAlimento,
                totalCostoAlimento,
                promedioConsumoPorPollo,
                promedioCostoPorPollo,
                promedioRentabilidad,
                costoComprasPorAnimal: this.calcularTotalesComprasPorAnimal(productos)
              };

              console.log('✅ [AnalisisInventario] Análisis completado exitosamente (con detalles):', resultado);
              return resultado;
            })
          );
        }

        // Si no hay plan de pollos, continuar con análisis estándar (posible estimación)
        const analisisPorLote = this.analizarLotesConPlanesReales(lotesPollos, planes, productos);
        console.log('📊 [AnalisisInventario] Análisis por lote completado (sin detalles adicionales):', analisisPorLote.length);

        const consumoSemanal = this.generarConsumoSemanal(analisisPorLote);
        const consumoMensual = this.generarConsumoMensual(analisisPorLote);
        const consumoAnual = this.generarConsumoAnual(analisisPorLote);

        const totalPollosVivos = analisisPorLote.reduce((total, lote) => total + lote.pollosVivos, 0);
        const totalPollosMuertos = analisisPorLote.reduce((total, lote) => total + lote.pollosMuertos, 0);
        const totalConsumoAlimento = analisisPorLote.reduce((total, lote) => total + lote.consumoTotalKg, 0);
        const totalCostoAlimento = analisisPorLote.reduce((total, lote) => total + lote.costoTotalLote, 0);

        const promedioConsumoPorPollo = totalPollosVivos > 0 ? totalConsumoAlimento / totalPollosVivos : 0;
        const promedioCostoPorPollo = totalPollosVivos > 0 ? totalCostoAlimento / totalPollosVivos : 0;
        const promedioRentabilidad = analisisPorLote.length > 0 ?
          analisisPorLote.reduce((total, lote) => total + lote.rentabilidad, 0) / analisisPorLote.length : 0;

        const resultado = {
          consumoSemanal,
          consumoMensual,
          consumoAnual,
          analisisPorLote,
          totalPollosVivos,
          totalPollosMuertos,
          totalConsumoAlimento,
          totalCostoAlimento,
          promedioConsumoPorPollo,
          promedioCostoPorPollo,
          promedioRentabilidad,
          costoComprasPorAnimal: this.calcularTotalesComprasPorAnimal(productos)
        };

        console.log('✅ [AnalisisInventario] Análisis completado exitosamente (estándar):', resultado);
        return of(resultado);
      }),
      catchError(error => {
        console.error('❌ [AnalisisInventario] Error crítico en análisis:', error);
        console.error('❌ [AnalisisInventario] Stack trace:', error.stack);
        
        // En caso de error, devolver análisis vacío pero funcional
        const analisisVacio = this.getAnalisisVacio();
        console.log('🔄 [AnalisisInventario] Devolviendo análisis vacío por error:', analisisVacio);
        
        return of(analisisVacio);
      })
    );
  }

  /**
   * Analizar lotes individuales - MÉTODO OBSOLETO
   * @deprecated Usar analizarLotesConPlanesReales() que usa datos reales del plan nutricional
   */
  private analizarLotes(lotes: Lote[]): AnalisisLoteData[] {
    return lotes.map(lote => {
      const diasVida = this.calcularDiasDeVida(lote.birthdate);
      const consumoEstimado = this.calcularConsumoEstimado(lote, diasVida);
      const costoEstimado = this.calcularCostoEstimado(consumoEstimado, diasVida);
      const pollosVivos = lote.quantity || 0;
      const pollosMuertos = this.calcularPollosMuertos(lote);
      const costoPorPollo = pollosVivos > 0 ? costoEstimado / pollosVivos : 0;
      const rendimiento = this.calcularRendimiento(lote, diasVida);
      const rentabilidad = this.calcularRentabilidad(lote, costoEstimado);

      return {
        lote,
        consumoTotalKg: consumoEstimado,
        costoTotalLote: costoEstimado,
        costoPorPollo,
        pollosVivos,
        pollosMuertos,
        estadoLote: pollosVivos > 0 ? 'activo' : 'inactivo',
        diasVida,
        rendimiento,
        rentabilidad
      };
    });
  }

  /**
   * Analizar lotes individuales usando planes nutricionales reales
   */
  private analizarLotesConPlanesReales(lotes: Lote[], planes: any[], productos: Product[]): AnalisisLoteData[] {
    console.log('🔍 Analizando lotes con planes reales...');
    console.log('📋 Planes disponibles:', planes.length);
    
    // Mostrar información de todos los planes para debugging
    planes.forEach((plan, index) => {
      console.log(`  Plan ${index + 1}:`, {
        id: plan.id,
        name: plan.name,
        animal: plan.animal?.name || plan.animalName,
        detalles: plan.detalles?.length || 0
      });
    });

    return lotes.map(lote => {
      const diasVida = this.calcularDiasDeVida(lote.birthdate);
      
      // ✅ BUSCAR PLAN PARA POLLOS - Mejorada la búsqueda
      const planPollo = planes.find(plan => {
        const animalName = plan.animal?.name?.toLowerCase() || plan.animalName?.toLowerCase() || '';
        const planName = plan.name?.toLowerCase() || '';
        
        return animalName.includes('pollo') || 
               animalName.includes('chicken') ||
               planName.includes('pollo') ||
               planName.includes('chicken') ||
               plan.animalId === 1; // ID directo para pollos
      });
      
      if (planPollo) {
        console.log(`✅ Plan encontrado para pollos: "${planPollo.name}" (${planPollo.detalles?.length || 0} etapas)`);
      } else {
        console.warn('❌ No se encontró plan nutricional para pollos');
        console.log('🔍 Planes disponibles para debugging:', planes.map(p => ({
          name: p.name,
          animal: p.animal?.name || p.animalName,
          animalId: p.animalId
        })));
      }
      
      // Calcular consumo y costo usando datos reales del plan
      const { consumoEstimado, costoEstimado } = this.calcularConsumoYCostoReales(
        lote, diasVida, planPollo, productos
      );
      
      const pollosVivos = lote.quantity || 0;
      const pollosMuertos = this.calcularPollosMuertos(lote);
      const costoPorPollo = pollosVivos > 0 ? costoEstimado / pollosVivos : 0;
      const rendimiento = this.calcularRendimiento(lote, diasVida);
      const rentabilidad = this.calcularRentabilidad(lote, costoEstimado);

      return {
        lote,
        consumoTotalKg: consumoEstimado,
        costoTotalLote: costoEstimado,
        costoPorPollo,
        pollosVivos,
        pollosMuertos,
        estadoLote: pollosVivos > 0 ? 'activo' : 'inactivo',
        diasVida,
        rendimiento,
        rentabilidad
      };
    });
  }

  /**
   * Calcular consumo y costo usando datos reales del plan nutricional
   */
  private calcularConsumoYCostoReales(
    lote: Lote, 
    diasVida: number, 
    planPollo: any, 
    productos: Product[]
  ): { consumoEstimado: number; costoEstimado: number } {
    if (!planPollo || !planPollo.detalles || planPollo.detalles.length === 0) {
      console.warn('No se encontró plan nutricional para pollos, usando valores estimados');
      return {
        consumoEstimado: this.calcularConsumoEstimado(lote, diasVida),
        costoEstimado: this.calcularCostoEstimado(this.calcularConsumoEstimado(lote, diasVida), diasVida)
      };
    }

    const pollosVivos = lote.quantity || 0;
    let consumoTotalKg = 0;
    let costoTotal = 0;

    // ✅ BUSCAR TODAS LAS ETAPAS/PRODUCTOS que corresponden a los días de vida
    let etapasCorrespondientes = planPollo.detalles.filter((detalle: any) => 
      diasVida >= detalle.dayStart && diasVida <= detalle.dayEnd
    );

    if (etapasCorrespondientes.length > 0) {
      console.log(`📊 Calculando para lote ${lote.id} - ${diasVida} días:`);
      console.log(`🔍 Encontradas ${etapasCorrespondientes.length} etapas/productos para rango de días`);
      
      // ✅ SUMAR TODOS LOS PRODUCTOS DE LAS ETAPAS CORRESPONDIENTES
      let cantidadTotalDiariaKg = 0;
      let costoTotalDiario = 0;
      const productosUsados: any[] = [];

      etapasCorrespondientes.forEach((etapa: any) => {
        const cantidadProductoKg = etapa.quantityPerAnimal || 0;
        cantidadTotalDiariaKg += cantidadProductoKg;

        // Calcular costo de este producto específico
        const producto = productos.find(p => p.id === etapa.product.id);
        let costoProducto = 0;
        
        if (producto && producto.price_unit) {
          costoProducto = cantidadProductoKg * producto.price_unit;
        } else {
          const nombreProducto = etapa.product.name?.toLowerCase() || '';
          const costoPorKg = this.obtenerCostoPorNombreProducto(nombreProducto);
          costoProducto = cantidadProductoKg * costoPorKg;
        }
        
        costoTotalDiario += costoProducto;
        
        productosUsados.push({
          nombre: etapa.product.name,
          cantidadKg: cantidadProductoKg,
          costoUnitario: costoProducto / cantidadProductoKg,
          costoTotal: costoProducto
        });

        console.log(`  🥬 ${etapa.product.name}: ${cantidadProductoKg} kg/día`);
      });

      // ✅ CALCULAR TOTALES PARA TODO EL LOTE
      consumoTotalKg = pollosVivos * cantidadTotalDiariaKg * diasVida;
      costoTotal = pollosVivos * costoTotalDiario * diasVida;

      console.log(`📋 RESUMEN CÁLCULO REAL:`, {
        diasVida,
        pollosVivos,
        etapaRango: `${etapasCorrespondientes[0].dayStart}-${etapasCorrespondientes[0].dayEnd} días`,
        productosEnEtapa: productosUsados.length,
        cantidadTotalPorAnimalPorDia: `${cantidadTotalDiariaKg} kg`,
        consumoTotalLote: `${Math.round(consumoTotalKg * 100) / 100} kg`,
        costoTotalLote: `$${Math.round(costoTotal * 100) / 100}`,
        productosDetalle: productosUsados
      });

    } else {
      // 🔄 Si no hay etapa que cubra exactamente los días de vida, usar la etapa más cercana
      const etapasOrdenadas = [...planPollo.detalles].sort((a: any, b: any) => a.dayStart - b.dayStart);
      const primera = etapasOrdenadas[0];
      const ultima = etapasOrdenadas[etapasOrdenadas.length - 1];

      if (diasVida < primera.dayStart) {
        console.warn(`No hay etapa para ${diasVida} días (antes del rango). Usando primera etapa ${primera?.dayStart}-${primera?.dayEnd}.`);
        etapasCorrespondientes = [primera];
      } else if (diasVida > ultima.dayEnd) {
        console.warn(`No hay etapa para ${diasVida} días (después del rango). Usando última etapa ${ultima?.dayStart}-${ultima?.dayEnd}.`);
        etapasCorrespondientes = [ultima];
      } else {
        console.warn(`No se encontró etapa para ${diasVida} días, usando estimación`);
        return {
          consumoEstimado: this.calcularConsumoEstimado(lote, diasVida),
          costoEstimado: this.calcularCostoEstimado(this.calcularConsumoEstimado(lote, diasVida), diasVida)
        };
      }

      // Continuar con cálculo utilizando la etapa más cercana
      let cantidadTotalDiariaKg = 0;
      let costoTotalDiario = 0;
      const productosUsados: any[] = [];

      etapasCorrespondientes.forEach((etapa: any) => {
        const cantidadProductoKg = etapa.quantityPerAnimal || 0;
        cantidadTotalDiariaKg += cantidadProductoKg;

        const producto = productos.find(p => p.id === etapa.product.id);
        let costoProducto = 0;
        if (producto && producto.price_unit) {
          costoProducto = cantidadProductoKg * producto.price_unit;
        } else {
          const nombreProducto = etapa.product.name?.toLowerCase() || '';
          const costoPorKg = this.obtenerCostoPorNombreProducto(nombreProducto);
          costoProducto = cantidadProductoKg * costoPorKg;
        }
        costoTotalDiario += costoProducto;
        productosUsados.push({
          nombre: etapa.product.name,
          cantidadKg: cantidadProductoKg,
          costoUnitario: cantidadProductoKg ? costoProducto / cantidadProductoKg : 0,
          costoTotal: costoProducto
        });
      });

      consumoTotalKg = pollosVivos * cantidadTotalDiariaKg * diasVida;
      costoTotal = pollosVivos * costoTotalDiario * diasVida;
    }

    return {
      consumoEstimado: consumoTotalKg,
      costoEstimado: costoTotal
    };
  }

  /**
   * Calcular días de vida de un lote
   */
  private calcularDiasDeVida(fechaNacimiento: Date | null): number {
    if (!fechaNacimiento) return 0;
    
    const hoy = new Date();
    const fechaNac = new Date(fechaNacimiento);
    const diffTime = Math.abs(hoy.getTime() - fechaNac.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calcular consumo estimado basado en edad del lote - MÉTODO OBSOLETO
   * @deprecated Los datos ahora se obtienen del plan nutricional real
   */
  private calcularConsumoEstimado(lote: Lote, diasVida: number): number {
    const pollosVivos = lote.quantity || 0;
    let consumoDiarioPorPollo = 0;

    // Consumo por etapa de crecimiento
    if (diasVida <= 20) {
      consumoDiarioPorPollo = 0.025; // 25g por día
    } else if (diasVida <= 38) {
      consumoDiarioPorPollo = 0.075; // 75g por día
    } else if (diasVida <= 60) {
      consumoDiarioPorPollo = 0.120; // 120g por día
    } else {
      consumoDiarioPorPollo = 0.150; // 150g por día
    }

    return pollosVivos * consumoDiarioPorPollo * diasVida;
  }

  /**
   * Calcular costo estimado del alimento - MÉTODO OBSOLETO
   * @deprecated Los costos ahora se obtienen del precio real de los productos
   */
  private calcularCostoEstimado(consumoKg: number, diasVida: number): number {
    let costoPromedioPorKg = 0;

    // Costo por etapa (diferentes tipos de alimento)
    if (diasVida <= 20) {
      costoPromedioPorKg = this.costosAlimento['preinicial'] || 3.2;
    } else if (diasVida <= 38) {
      costoPromedioPorKg = this.costosAlimento['inicial'] || 2.9;
    } else if (diasVida <= 60) {
      costoPromedioPorKg = this.costosAlimento['crecimiento'] || 2.6;
    } else {
      costoPromedioPorKg = this.costosAlimento['acabado'] || 2.4;
    }

    return consumoKg * costoPromedioPorKg;
  }

  /**
   * Calcular pollos muertos estimados
   */
  private calcularPollosMuertos(lote: Lote): number {
    // Estimación basada en mortalidad promedio del 3-5%
    const pollosIniciales = lote.quantity || 0;
    const mortalidadPromedio = 0.04; // 4%
    return Math.floor(pollosIniciales * mortalidadPromedio);
  }

  /**
   * Calcular rendimiento del lote
   */
  private calcularRendimiento(lote: Lote, diasVida: number): number {
    const pollosVivos = lote.quantity || 0;
    const pollosIniciales = pollosVivos + this.calcularPollosMuertos(lote);
    
    if (pollosIniciales === 0) return 0;
    
    const supervivencia = (pollosVivos / pollosIniciales) * 100;
    const eficienciaEdad = Math.max(0, 100 - (diasVida * 0.5)); // Penalización por edad
    
    return Math.round((supervivencia + eficienciaEdad) / 2);
  }

  /**
   * Calcular rentabilidad estimada
   */
  private calcularRentabilidad(lote: Lote, costoAlimento: number): number {
    const pollosVivos = lote.quantity || 0;
    const precioVentaPromedio = 15; // $15 por pollo
    const ingresosEstimados = pollosVivos * precioVentaPromedio;
    const costosOtros = pollosVivos * 2; // Otros costos estimados
    const costoTotal = costoAlimento + costosOtros;
    
    if (costoTotal === 0) return 0;
    
    return Math.round(((ingresosEstimados - costoTotal) / costoTotal) * 100);
  }

  /**
   * Generar datos de consumo semanal
   */
  private generarConsumoSemanal(analisisPorLote: AnalisisLoteData[]): ConsumoAlimentoData[] {
    const semanas: ConsumoAlimentoData[] = [];
    const hoy = new Date();
    
    for (let i = 3; i >= 0; i--) {
      const fechaSemana = new Date(hoy);
      fechaSemana.setDate(hoy.getDate() - (i * 7));
      
      const consumoSemanal = analisisPorLote.reduce((total, lote) => {
        const consumoDiario = lote.consumoTotalKg / Math.max(1, lote.diasVida);
        return total + (consumoDiario * 7);
      }, 0);
      
      const costoSemanal = analisisPorLote.reduce((total, lote) => {
        const costoDiario = lote.costoTotalLote / Math.max(1, lote.diasVida);
        return total + (costoDiario * 7);
      }, 0);
      
      const totalPollos = analisisPorLote.reduce((total, lote) => total + lote.pollosVivos, 0);
      
      semanas.push({
        periodo: `Semana ${i + 1}`,
        consumoTotal: Math.round(consumoSemanal * 100) / 100,
        costoTotal: Math.round(costoSemanal * 100) / 100,
        consumoPorPollo: totalPollos > 0 ? Math.round((consumoSemanal / totalPollos) * 1000) / 1000 : 0,
        costoPorPollo: totalPollos > 0 ? Math.round((costoSemanal / totalPollos) * 100) / 100 : 0
      });
    }
    
    return semanas;
  }

  /**
   * Generar datos de consumo mensual
   */
  private generarConsumoMensual(analisisPorLote: AnalisisLoteData[]): ConsumoAlimentoData[] {
    const meses: ConsumoAlimentoData[] = [];
    const hoy = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const fechaMes = new Date(hoy);
      fechaMes.setMonth(hoy.getMonth() - i);
      
      const consumoMensual = analisisPorLote.reduce((total, lote) => {
        const consumoDiario = lote.consumoTotalKg / Math.max(1, lote.diasVida);
        return total + (consumoDiario * 30);
      }, 0);
      
      const costoMensual = analisisPorLote.reduce((total, lote) => {
        const costoDiario = lote.costoTotalLote / Math.max(1, lote.diasVida);
        return total + (costoDiario * 30);
      }, 0);
      
      const totalPollos = analisisPorLote.reduce((total, lote) => total + lote.pollosVivos, 0);
      
      meses.push({
        periodo: fechaMes.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
        consumoTotal: Math.round(consumoMensual * 100) / 100,
        costoTotal: Math.round(costoMensual * 100) / 100,
        consumoPorPollo: totalPollos > 0 ? Math.round((consumoMensual / totalPollos) * 1000) / 1000 : 0,
        costoPorPollo: totalPollos > 0 ? Math.round((costoMensual / totalPollos) * 100) / 100 : 0
      });
    }
    
    return meses;
  }

  /**
   * Generar datos de consumo anual
   */
  private generarConsumoAnual(analisisPorLote: AnalisisLoteData[]): ConsumoAlimentoData[] {
    const años: ConsumoAlimentoData[] = [];
    const hoy = new Date();
    
    for (let i = 2; i >= 0; i--) {
      const año = hoy.getFullYear() - i;
      
      const consumoAnual = analisisPorLote.reduce((total, lote) => {
        const consumoDiario = lote.consumoTotalKg / Math.max(1, lote.diasVida);
        return total + (consumoDiario * 365);
      }, 0);
      
      const costoAnual = analisisPorLote.reduce((total, lote) => {
        const costoDiario = lote.costoTotalLote / Math.max(1, lote.diasVida);
        return total + (costoDiario * 365);
      }, 0);
      
      const totalPollos = analisisPorLote.reduce((total, lote) => total + lote.pollosVivos, 0);
      
      años.push({
        periodo: año.toString(),
        consumoTotal: Math.round(consumoAnual * 100) / 100,
        costoTotal: Math.round(costoAnual * 100) / 100,
        consumoPorPollo: totalPollos > 0 ? Math.round((consumoAnual / totalPollos) * 1000) / 1000 : 0,
        costoPorPollo: totalPollos > 0 ? Math.round((costoAnual / totalPollos) * 100) / 100 : 0
      });
    }
    
    return años;
  }

  /**
   * Obtener costo por kg basado en el nombre del producto (fallback)
   */
  private obtenerCostoPorNombreProducto(nombreProducto: string): number {
    const nombre = nombreProducto.toLowerCase();
    
    // Mapear nombres de productos a costos conocidos
    if (nombre.includes('maiz') || nombre.includes('maíz')) {
      return this.costosAlimento['maiz'] || 1.2;
    }
    if (nombre.includes('balanceado')) {
      return this.costosAlimento['balanceado'] || 2.5;
    }
    if (nombre.includes('ahipal')) {
      return this.costosAlimento['ahipal'] || 1.8;
    }
    if (nombre.includes('concentrado')) {
      return this.costosAlimento['concentrado'] || 2.8;
    }
    if (nombre.includes('preinicial') || nombre.includes('pre-inicial')) {
      return this.costosAlimento['preinicial'] || 3.2;
    }
    if (nombre.includes('inicial')) {
      return this.costosAlimento['inicial'] || 2.9;
    }
    if (nombre.includes('crecimiento')) {
      return this.costosAlimento['crecimiento'] || 2.6;
    }
    if (nombre.includes('acabado') || nombre.includes('finalizador')) {
      return this.costosAlimento['acabado'] || 2.4;
    }
    
    // Valor por defecto
    return 2.0;
  }

  /**
   * Obtener análisis vacío para casos de error
   */
  private getAnalisisVacio(): InventarioAnalisis {
    return {
      consumoSemanal: [],
      consumoMensual: [],
      consumoAnual: [],
      analisisPorLote: [],
      totalPollosVivos: 0,
      totalPollosMuertos: 0,
      totalConsumoAlimento: 0,
      totalCostoAlimento: 0,
      promedioConsumoPorPollo: 0,
      promedioCostoPorPollo: 0,
      promedioRentabilidad: 0,
      costoComprasPorAnimal: { pollos: 0, chanchos: 0, otros: 0 }
    };
  }

  /**
   * Calcular la suma de compras por animal desde el inventario de productos.
   * Fórmula: sum(quantity * price_unit) agrupado por animal (pollos/chanchos/otros)
   */
  private calcularTotalesComprasPorAnimal(productos: Product[]): { pollos: number; chanchos: number; otros: number } {
    let pollos = 0;
    let chanchos = 0;
    let otros = 0;

    productos.forEach(p => {
      const cantidad = Number(p.quantity) || 0;
      const precio = Number(p.price_unit) || 0;
      const total = cantidad * precio;

      const name = (p.animal?.name || '').toLowerCase();
      const byId = p.animal_id;
      const nombreProd = (
        (p.name || '') + ' ' + (p.typeFood?.name || '') + ' ' + (p.category?.name || '')
      ).toLowerCase();

      const esPollo = name.includes('pollo') || nombreProd.includes('pollo') || nombreProd.includes('ave') || nombreProd.includes('broiler') || byId === 1;
      const esChancho = name.includes('chancho') || name.includes('cerdo') || nombreProd.includes('chancho') || nombreProd.includes('cerdo') || nombreProd.includes('porcino') || byId === 2;

      if (esPollo) pollos += total;
      else if (esChancho) chanchos += total;
      else otros += total;
    });

    // Redondeo a 2 decimales
    const r = (n: number) => Math.round(n * 100) / 100;
    return { pollos: r(pollos), chanchos: r(chanchos), otros: r(otros) };
  }
}
