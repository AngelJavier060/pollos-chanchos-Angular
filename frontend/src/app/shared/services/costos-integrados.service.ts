import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { CostosOperacionService } from '../../features/inventario/services/costos-operacion.service';
import { CostosManoObraService } from '../../features/inventario/services/costos-mano-obra.service';
import { CostosFijosService } from '../../features/inventario/services/costos-fijos.service';
import { CostosLogisticaService } from '../../features/inventario/services/costos-logistica.service';
import { CostosSanidadService } from '../../features/inventario/services/costos-sanidad.service';
import { MorbilidadService } from '../../features/pollos/services/morbilidad.service';
import {
  CostosDirectos,
  CostosIndirectos,
  CostosIndirectosPeriodo,
  ResultadoProrrateo,
  ProrrateoPorLote,
  MetodoProrrateo,
  AnalisisLoteCompleto,
  AnimalesResumen,
  CostosUnitarios,
  PesoResumen,
  AnalisisRentabilidad,
  PeriodoAnalisis,
  determinarEstadoRentabilidad,
  calcularDiasActivos
} from '../models/analisis-financiero.model';

@Injectable({
  providedIn: 'root'
})
export class CostosIntegradosService {
  constructor(
    private costosOperacionService: CostosOperacionService,
    private costosManoObraService: CostosManoObraService,
    private costosFijosService: CostosFijosService,
    private costosLogisticaService: CostosLogisticaService,
    private costosSanidadService: CostosSanidadService,
    private morbilidadService: MorbilidadService
  ) {}

  /**
   * Obtiene todos los costos indirectos de un período
   */
  obtenerCostosIndirectosPeriodo(desde: Date, hasta: Date): Observable<CostosIndirectosPeriodo> {
    const desdeStr = desde.toISOString().split('T')[0];
    const hastaStr = hasta.toISOString().split('T')[0];

    console.log(`[CostosIntegrados] Obteniendo costos indirectos del período: ${desdeStr} a ${hastaStr}`);

    return forkJoin({
      operacion: this.costosOperacionService.listar({ desde: desdeStr, hasta: hastaStr }).pipe(catchError(() => of([]))),
      manoObra: this.costosManoObraService.listar({ desde: desdeStr, hasta: hastaStr }).pipe(catchError(() => of([]))),
      fijos: this.costosFijosService.listar({ desde: desdeStr, hasta: hastaStr }).pipe(catchError(() => of([]))),
      logistica: this.costosLogisticaService.listar({ desde: desdeStr, hasta: hastaStr }).pipe(catchError(() => of([])))
    }).pipe(
      map(data => {
        console.log('[CostosIntegrados] Datos recibidos del backend:', {
          operacion: data.operacion.length + ' registros',
          manoObra: data.manoObra.length + ' registros',
          fijos: data.fijos.length + ' registros',
          logistica: data.logistica.length + ' registros'
        });

        console.log('[CostosIntegrados] Registros de costos fijos:', data.fijos);

        const totalOperacion = this.sumarCostos(data.operacion);
        const totalManoObra = this.sumarCostos(data.manoObra);
        const totalFijos = this.sumarCostos(data.fijos);
        const totalLogistica = this.sumarCostos(data.logistica);

        console.log('[CostosIntegrados] Totales calculados:', {
          totalOperacion,
          totalManoObra,
          totalFijos,
          totalLogistica,
          totalGeneral: totalOperacion + totalManoObra + totalFijos + totalLogistica
        });

        return {
          operacion: data.operacion,
          manoObra: data.manoObra,
          fijos: data.fijos,
          logistica: data.logistica,
          totalOperacion,
          totalManoObra,
          totalFijos,
          totalLogistica,
          totalGeneral: totalOperacion + totalManoObra + totalFijos + totalLogistica
        };
      })
    );
  }

  /**
   * Calcula los costos directos de un lote
   */
  calcularCostosDirectos(
    lote: any,
    costoAlimentacion: number,
    registrosSanidad: any[],
    registrosMorbilidad: any[],
    periodoInicio?: Date,
    periodoFin?: Date
  ): CostosDirectos {
    const compraAnimales = Number(lote?.cost || 0);
    const alimentacion = costoAlimentacion;

    // Sanidad preventiva
    const sanidadPreventiva = registrosSanidad
      .filter(r => String(r?.lote?.id || r?.loteId) === String(lote.id))
      .reduce((sum, r) => {
        const total = Number(r?.total ?? (Number(r?.cantidad || 0) * Number(r?.costoUnitario || 0)));
        return sum + (isNaN(total) ? 0 : total);
      }, 0);

    // Morbilidad (tratamientos curativos)
    const dentroDePeriodo = (fecha: any): boolean => {
      if (!periodoInicio || !periodoFin) return true;
      try {
        const f = new Date(fecha);
        return f >= periodoInicio && f <= periodoFin;
      } catch { return true; }
    };
    const morbilidad = (registrosMorbilidad || [])
      .filter(r => String(r?.loteId) === String(lote.id) && dentroDePeriodo(r?.fechaRegistro || r?.fecha))
      .reduce((sum, r) => {
        const costoTrat = Number(r?.tratamiento?.costo || 0);
        const qty = Number(r?.cantidadEnfermos || 0);
        const parcial = (isNaN(costoTrat) ? 0 : costoTrat) * (isNaN(qty) ? 0 : qty);
        return sum + parcial;
      }, 0);

    const total = compraAnimales + alimentacion + sanidadPreventiva + morbilidad;

    return {
      compraAnimales: Math.round(compraAnimales * 100) / 100,
      alimentacion: Math.round(alimentacion * 100) / 100,
      sanidadPreventiva: Math.round(sanidadPreventiva * 100) / 100,
      morbilidad: Math.round(morbilidad * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  }

  /**
   * Prorratea los costos indirectos entre los lotes según el método seleccionado
   * ACTUALIZADO: Prorratea cada tipo de costo por separado
   */
  prorratearCostos(
    lotes: any[],
    costosIndirectos: CostosIndirectosPeriodo,
    metodo: MetodoProrrateo,
    periodoInicio: Date,
    periodoFin: Date
  ): ResultadoProrrateo {
    const totalAprorratear = costosIndirectos.totalGeneral;

    if (totalAprorratear === 0 || lotes.length === 0) {
      return {
        metodo,
        totalAprorratear: 0,
        asignaciones: new Map(),
        detalles: []
      };
    }

    const detalles: ProrrateoPorLote[] = [];
    let totalBase = 0;

    // Calcular base según el método
    for (const lote of lotes) {
      const diasActivos = calcularDiasActivos(lote, periodoInicio, periodoFin);
      const cantidad = Number(lote?.quantity || 0);
      const pesoPromedio = this.obtenerPesoPromedioPorEspecie(lote);
      const biomasa = cantidad * pesoPromedio;

      let valorBase = 0;
      switch (metodo) {
        case 'dias-animal':
          valorBase = cantidad * diasActivos;
          break;
        case 'cantidad':
          valorBase = cantidad;
          break;
        case 'biomasa':
          valorBase = biomasa;
          break;
      }

      totalBase += valorBase;

      detalles.push({
        loteId: String(lote.id),
        loteCodigo: (lote?.name && String(lote.name).trim()) ? String(lote.name).trim() : (lote?.codigo || `Lote ${lote.id}`),
        diasAnimal: cantidad * diasActivos,
        cantidad,
        biomasa,
        proporcion: 0, // Se calculará después
        costoAsignado: 0 // Se calculará después
      });
    }

    // Calcular proporciones y asignar costos TOTALES
    const asignaciones = new Map<string, number>();

    for (const detalle of detalles) {
      let valorBase = 0;
      switch (metodo) {
        case 'dias-animal':
          valorBase = detalle.diasAnimal;
          break;
        case 'cantidad':
          valorBase = detalle.cantidad;
          break;
        case 'biomasa':
          valorBase = detalle.biomasa;
          break;
      }

      detalle.proporcion = totalBase > 0 ? valorBase / totalBase : 0;
      detalle.costoAsignado = Math.round(detalle.proporcion * totalAprorratear * 100) / 100;

      asignaciones.set(detalle.loteId, detalle.costoAsignado);
    }

    return {
      metodo,
      totalAprorratear: Math.round(totalAprorratear * 100) / 100,
      asignaciones,
      detalles
    };
  }

  /**
   * NUEVO: Prorratea cada tipo de costo indirecto por separado
   * Retorna el desglose detallado por tipo para cada lote
   */
  prorratearCostosPorTipo(
    lotes: any[],
    costosIndirectos: CostosIndirectosPeriodo,
    metodo: MetodoProrrateo,
    periodoInicio: Date,
    periodoFin: Date
  ): Map<string, CostosIndirectos> {
    const resultado = new Map<string, CostosIndirectos>();

    if (lotes.length === 0) return resultado;

    // Calcular bases de prorrateo para cada lote
    const bases = new Map<string, number>();
    let totalBase = 0;

    for (const lote of lotes) {
      const diasActivos = calcularDiasActivos(lote, periodoInicio, periodoFin);
      const cantidad = Number(lote?.quantity || 0);
      const pesoPromedio = this.obtenerPesoPromedioPorEspecie(lote);
      const biomasa = cantidad * pesoPromedio;

      let valorBase = 0;
      switch (metodo) {
        case 'dias-animal':
          valorBase = cantidad * diasActivos;
          break;
        case 'cantidad':
          valorBase = cantidad;
          break;
        case 'biomasa':
          valorBase = biomasa;
          break;
      }

      bases.set(String(lote.id), valorBase);
      totalBase += valorBase;
    }

    // Prorratear cada tipo de costo
    for (const lote of lotes) {
      const loteId = String(lote.id);
      const valorBase = bases.get(loteId) || 0;
      const proporcion = totalBase > 0 ? valorBase / totalBase : 0;

      const operacion = Math.round(proporcion * costosIndirectos.totalOperacion * 100) / 100;
      const manoObra = Math.round(proporcion * costosIndirectos.totalManoObra * 100) / 100;
      const fijos = Math.round(proporcion * costosIndirectos.totalFijos * 100) / 100;
      const logistica = Math.round(proporcion * costosIndirectos.totalLogistica * 100) / 100;
      const total = Math.round((operacion + manoObra + fijos + logistica) * 100) / 100;

      resultado.set(loteId, {
        operacion,
        manoObra,
        fijos,
        logistica,
        total
      });
    }

    return resultado;
  }

  /**
   * Calcula el análisis completo de un lote
   * ACTUALIZADO: Usa desglose detallado de costos indirectos
   */
  calcularAnalisisCompleto(
    lote: any,
    costoAlimentacion: number,
    detalleAlimentos: any[],
    registrosSanidad: any[],
    registrosMorbilidad: any[],
    costosIndirectosDesglosados: CostosIndirectos,
    ventasLote: any[],
    mortalidadLote: any[],
    periodoInicio: Date,
    periodoFin: Date
  ): AnalisisLoteCompleto {
    // Costos directos
    const costosDirectos = this.calcularCostosDirectos(
      lote,
      costoAlimentacion,
      registrosSanidad,
      registrosMorbilidad,
      periodoInicio,
      periodoFin
    );

    // Costos indirectos (ya vienen prorrateados y desglosados)
    const costosIndirectos = costosIndirectosDesglosados;

    // Costo total
    const costoTotal = costosDirectos.total + costosIndirectos.total;

    // Resumen de animales
    const animales = this.calcularAnimalesResumen(lote, mortalidadLote, ventasLote, registrosMorbilidad);

    // Peso y conversión
    const peso = this.calcularPesoResumen(lote, ventasLote, costoAlimentacion, detalleAlimentos);

    // Costos unitarios
    const costos = this.calcularCostosUnitarios(costoTotal, animales, peso);

    // Rentabilidad
    const rentabilidad = this.calcularRentabilidad(lote, ventasLote, costoTotal, animales);

    // Período
    const periodo = this.calcularPeriodoLote(lote, periodoInicio, periodoFin);

    return {
      lote,
      periodo,
      costosDirectos,
      costosIndirectos,
      costoTotal: Math.round(costoTotal * 100) / 100,
      animales,
      costos,
      peso,
      rentabilidad,
      detalleAlimentos
    };
  }

  // ============ HELPERS PRIVADOS ============

  private sumarCostos(registros: any[]): number {
    if (!registros || registros.length === 0) return 0;
    
    return registros.reduce((sum, r) => {
      // Intentar múltiples campos comunes para el monto
      let monto = 0;
      
      if (r?.total !== undefined && r?.total !== null) {
        monto = Number(r.total);
      } else if (r?.monto !== undefined && r?.monto !== null) {
        monto = Number(r.monto);
      } else if (r?.valor !== undefined && r?.valor !== null) {
        monto = Number(r.valor);
      } else if (r?.amount !== undefined && r?.amount !== null) {
        monto = Number(r.amount);
      } else if (r?.cantidad !== undefined && r?.costoUnitario !== undefined) {
        monto = Number(r.cantidad) * Number(r.costoUnitario);
      }
      
      // Validar que sea un número válido
      const montoValido = isNaN(monto) ? 0 : monto;
      
      // Log para debugging (solo en desarrollo)
      if (montoValido > 0) {
        console.log(`[CostosIntegrados] Registro sumado: ${montoValido}`, r);
      }
      
      return sum + montoValido;
    }, 0);
  }

  private obtenerPesoPromedioPorEspecie(lote: any): number {
    const animalId = lote?.race?.animal?.id || 0;
    const animalName = (lote?.race?.animal?.name || '').toLowerCase();

    if (animalId === 1 || animalName.includes('pollo') || animalName.includes('chicken')) {
      return 2.5; // kg promedio pollo
    } else if (animalId === 2 || animalName.includes('chancho') || animalName.includes('cerdo')) {
      return 80; // kg promedio chancho
    }

    return 10; // Default
  }

  private calcularAnimalesResumen(lote: any, mortalidad: any[], ventas: any[], morbilidad: any[]): AnimalesResumen {
    const iniciales = Number(lote?.quantityOriginal || lote?.quantity || 0);
    const muertos = mortalidad.length;
    const vendidos = ventas.reduce((sum, v) => sum + Number(v?.cantidadAnimales || 0), 0);
    const vivos = Number(lote?.quantity || 0);
    const mortalidadPct = iniciales > 0 ? Math.round((muertos / iniciales) * 10000) / 100 : 0;
    // Enfermos: sumar cantidadEnfermos de registros activos (no recuperados ni fallecidos)
    let enfermos = 0;
    try {
      for (const r of (morbilidad || [])) {
        const estado = (r?.estado?.nombre || '').toString().toLowerCase();
        const activo = !r?.fechaRecuperacion && !r?.fechaMuerte && estado !== 'recuperado' && estado !== 'fallecido';
        if (activo) enfermos += Number(r?.cantidadEnfermos || 0);
      }
    } catch {}

    return {
      iniciales,
      enfermos,
      muertos,
      vendidos,
      vivos,
      mortalidadPct
    };
  }

  private calcularPesoResumen(lote: any, ventas: any[], costoAlimentacion: number, detalleAlimentos: any[]): PesoResumen {
    // Peso promedio de venta
    let promedioVenta = 0;
    let totalKg = 0;

    if (ventas.length > 0) {
      const pesoTotal = ventas.reduce((sum, v) => sum + Number(v?.pesoTotal || 0), 0);
      const cantidadTotal = ventas.reduce((sum, v) => sum + Number(v?.cantidadAnimales || 0), 0);
      promedioVenta = cantidadTotal > 0 ? Math.round((pesoTotal / cantidadTotal) * 100) / 100 : 0;
      totalKg = pesoTotal;
    } else {
      // Estimación si no hay ventas
      promedioVenta = this.obtenerPesoPromedioPorEspecie(lote);
      const vendidos = Number(lote?.quantityOriginal || lote?.quantity || 0) - Number(lote?.quantity || 0);
      totalKg = vendidos * promedioVenta;
    }

    // Conversión alimenticia
    const consumoTotal = detalleAlimentos.reduce((sum, d) => sum + Number(d?.consumoKg || 0), 0);
    const conversionAlimenticia = totalKg > 0 ? Math.round((consumoTotal / totalKg) * 100) / 100 : 0;

    return {
      promedioVenta,
      totalKg: Math.round(totalKg * 100) / 100,
      conversionAlimenticia
    };
  }

  private calcularCostosUnitarios(costoTotal: number, animales: AnimalesResumen, peso: PesoResumen): CostosUnitarios {
    const unitarioInicial = animales.iniciales > 0 ? Math.round((costoTotal / animales.iniciales) * 100) / 100 : 0;
    const unitarioVivo = animales.vivos > 0 ? Math.round((costoTotal / animales.vivos) * 100) / 100 : 0;
    const porKg = peso.totalKg > 0 ? Math.round((costoTotal / peso.totalKg) * 100) / 100 : 0;

    return {
      unitarioInicial,
      unitarioVivo,
      porKg
    };
  }

  private calcularRentabilidad(lote: any, ventas: any[], costoTotal: number, animales: AnimalesResumen): AnalisisRentabilidad {
    // Calcular ingresos reales de ventas
    const ingresoTotal = ventas.reduce((sum, v) => sum + Number(v?.montoTotal || 0), 0);
    const precioVenta = animales.vendidos > 0 ? Math.round((ingresoTotal / animales.vendidos) * 100) / 100 : 0;

    const ganancia = ingresoTotal - costoTotal;
    const margen = ingresoTotal > 0 ? Math.round((ganancia / ingresoTotal) * 10000) / 100 : 0;

    const { estado, icono } = determinarEstadoRentabilidad(margen);

    return {
      precioVenta,
      ingresoTotal: Math.round(ingresoTotal * 100) / 100,
      costoTotal: Math.round(costoTotal * 100) / 100,
      ganancia: Math.round(ganancia * 100) / 100,
      margen,
      estado,
      estadoIcon: icono
    };
  }

  private calcularPeriodoLote(lote: any, periodoInicio: Date, periodoFin: Date): PeriodoAnalisis {
    const birthdate = lote.birthdate ? new Date(lote.birthdate) : null;
    const closeDate = lote.closeDate ? new Date(lote.closeDate) : null;

    const inicio = birthdate && birthdate > periodoInicio ? birthdate : periodoInicio;
    const fin = closeDate && closeDate < periodoFin ? closeDate : periodoFin;

    const dias = calcularDiasActivos(lote, periodoInicio, periodoFin);

    return {
      inicio,
      fin,
      dias
    };
  }
}
