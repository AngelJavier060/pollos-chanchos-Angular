import { Component, OnInit } from '@angular/core';
import { AuthDirectService } from '../../core/services/auth-direct.service';
import { User } from '../../shared/models/user.model';
import { LoteService } from '../lotes/services/lote.service';
import { PlanAlimentacionService, PlanDetalle } from '../plan-nutricional/services/plan-alimentacion.service';
import { PlanNutricionalIntegradoService } from '../../shared/services/plan-nutricional-integrado.service';
import { Lote } from '../lotes/interfaces/lote.interface';

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
  loteId: string;
  usuarioId: number;
  stockAnterior: number;
  stockPosterior: number;
  
  // Estado del lote
  loteCerrado: boolean;
  motivoCierre: string;
}

// Interfaces para visualización dinámica de sub-etapas (similar a Pollos)
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
  dayStart: number;
  dayEnd: number;
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
  loteId: string;
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
  selector: 'app-chanchos-alimentacion',
  templateUrl: './chanchos-alimentacion.component.html',
  styleUrls: ['./chanchos-dashboard.component.scss']
})
export class ChanchosAlimentacionComponent implements OnInit {
  user: User | null = null;
  
  // Variables principales
  lotesChanchos: Lote[] = [];
  lotesActivos: Lote[] = [];
  etapasAlimentacion: PlanDetalle[] = [];
  loading = false;
  selectedDate = new Date();
  
  // UI dinámica de sub-etapas (similar a Pollos)
  etapasDisponiblesLote: EtapaAlimento[] = [];
  alimentosSeleccionados: EtapaAlimento[] = [];
  planPrincipalNombre: string | null = null;
  planPrincipalRango: { min: number | null, max: number | null } = { min: null, max: null };
  etapaActualChanchos: EtapaAlimento | null = null;
  
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
    loteId: '',
    usuarioId: 0,
    stockAnterior: 0,
    stockPosterior: 0,
    loteCerrado: false,
    motivoCierre: ''
  };

  // Simulación de stock de inventario
  private stockSimulado = {
    concentrado: 500,
    maiz: 300,
    soya: 200,
    balanceado: 150
  };

  // Simulación de historial de registros por lote
  private historialSimulado: { [loteId: string]: RegistroHistorial[] } = {
    '1': [
      { fecha: '2024-01-15', cantidad: 2.5, animalesVivos: 15, observaciones: 'Consumo normal' },
      { fecha: '2024-01-14', cantidad: 2.5, animalesVivos: 15, observaciones: 'Sin novedad' }
    ],
    '2': [
      { fecha: '2024-01-15', cantidad: 8.0, animalesVivos: 25, observaciones: 'Consumo óptimo' },
      { fecha: '2024-01-14', cantidad: 8.0, animalesVivos: 25, animalesVendidos: 2, valorVenta: 300.00, observaciones: 'Venta parcial' }
    ]
  };

  // Control de animales vivos actual por lote (simulación)
  private animalesVivosActuales: { [loteId: string]: number } = {};

  // Histórico de lotes cerrados
  private lotesHistoricos: LoteHistorico[] = [];

  // Información del plan de alimentación por lote
  planInfo: { [loteId: string]: PlanInfo } = {};

  // Datos del modal
  modalData: ModalData = {
    cantidadSugerida: 0,
    tipoAlimento: '',
    etapaNombre: '',
    animalesVivos: 0
  };

  constructor(
    private authService: AuthDirectService,
    private loteService: LoteService,
    private planService: PlanAlimentacionService,
    private planNutricionalService: PlanNutricionalIntegradoService
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
   * Calcular el total de animales en lotes activos
   */
  getTotalAnimales(): number {
    return this.lotesActivos.reduce((total, lote) => total + lote.quantity, 0);
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
   * Determinar la etapa según días de vida del lote
   */
  private determinarEtapaLote(lote: Lote): string {
    const diasVida = this.calcularDiasDeVida(lote.birthdate);
    
    if (diasVida <= 21) return 'Lechón';
    if (diasVida <= 60) return 'Crecimiento';
    if (diasVida <= 120) return 'Desarrollo';
    if (diasVida <= 180) return 'Engorde';
    return 'Finalización';
  }

  /**
   * Abrir modal de alimentación
   */
  abrirModalAlimentacion(lote: Lote): void {
    this.loteSeleccionado = lote;
    this.modalAbierto = true;
    this.inicializarRegistroCompleto();
    this.prepararDatosModal(lote);

    // ==== CARGA DINÁMICA DE SUB-ETAPAS PARA CHANCHOS ====
    const diasVida = this.calcularDiasDeVida(lote.birthdate);
    console.log('🐷 [Chanchos] Días de vida del lote:', diasVida);

    try {
      // Forzar recarga del plan (caché) y obtener plan integrado de chanchos
      this.planNutricionalService.forzarRecargaCompleta();
      this.planNutricionalService.obtenerPlanActivo('chanchos').subscribe({
        next: (planChanchos) => {
          console.log('✅ [Chanchos] Plan nutricional REAL recibido:', planChanchos);
          if (planChanchos && planChanchos.etapas && planChanchos.etapas.length > 0) {
            // Etapas que contienen el día actual (diagnóstico)
            const etapasCorrespondientes = planChanchos.etapas.filter((e: any) =>
              diasVida >= e.diasEdad.min && diasVida <= e.diasEdad.max
            );
            console.log(`🔍 [Chanchos] Etapas para ${diasVida} días:`, etapasCorrespondientes);

            // Determinar plan principal usando TODAS las etapas
            const planPrincipal = this.determinarPlanPrincipal(planChanchos.etapas, diasVida);
            this.planPrincipalNombre = planPrincipal?.nombre || (etapasCorrespondientes[0]?.planNombre || null);
            this.planPrincipalRango = {
              min: planPrincipal?.rango?.min ?? null,
              max: planPrincipal?.rango?.max ?? null
            };
            console.log('🧭 [Chanchos] Plan principal:', this.planPrincipalNombre, this.planPrincipalRango);

            // Filtrar sub-etapas del plan principal SIN limitar al día actual
            let etapasDelPlanPrincipal: any[] = [];
            if (this.planPrincipalRango.min != null && this.planPrincipalRango.max != null) {
              const minP = this.planPrincipalRango.min as number;
              const maxP = this.planPrincipalRango.max as number;
              etapasDelPlanPrincipal = planChanchos.etapas.filter((e: any) => {
                const r = this.extraerRangoDesdeNombre(e.planNombre);
                if (r) return r.min === minP && r.max === maxP;
                return e.diasEdad?.min >= minP && e.diasEdad?.max <= maxP;
              });
              // Unificar por rango para robustez
              const candidatasPorRango = planChanchos.etapas.filter((e: any) => e.diasEdad?.min >= minP && e.diasEdad?.max <= maxP);
              const unicas: any[] = [];
              const vistos = new Set<number | string>();
              [...etapasDelPlanPrincipal, ...candidatasPorRango].forEach((e: any) => {
                const key = e.id ?? `${e.producto?.id}-${e.diasEdad?.min}-${e.diasEdad?.max}`;
                if (!vistos.has(key)) { vistos.add(key); unicas.push(e); }
              });
              etapasDelPlanPrincipal = unicas;
            } else if (this.planPrincipalNombre) {
              etapasDelPlanPrincipal = planChanchos.etapas.filter((e: any) => e.planNombre === this.planPrincipalNombre);
            } else {
              etapasDelPlanPrincipal = etapasCorrespondientes;
            }

            // Ordenar por rango y mapear a etapas disponibles
            const etapasOrdenadas = [...etapasDelPlanPrincipal].sort((a: any, b: any) => {
              if (a.diasEdad?.min !== b.diasEdad?.min) return (a.diasEdad?.min || 0) - (b.diasEdad?.min || 0);
              return (a.diasEdad?.max || 0) - (b.diasEdad?.max || 0);
            });

            this.etapasDisponiblesLote = etapasOrdenadas.map((etapa: any, index: number) => ({
              id: index + 1,
              alimentoRecomendado: etapa.producto?.name || etapa.tipoAlimento,
              quantityPerAnimal: parseFloat((etapa.quantityPerAnimal || (etapa.consumoDiario.min / 1000)).toFixed(2)),
              unidad: 'kg',
              seleccionado: diasVida >= (etapa.diasEdad?.min || 0) && diasVida <= (etapa.diasEdad?.max || 0),
              productosDetalle: [
                {
                  nombre: etapa.producto?.name || etapa.tipoAlimento,
                  cantidad: parseFloat((etapa.quantityPerAnimal || (etapa.consumoDiario.min / 1000)).toFixed(2)),
                  unidad: 'kg'
                }
              ],
              dayStart: etapa.diasEdad?.min,
              dayEnd: etapa.diasEdad?.max
            }));

            // Establecer etapa actual visible en el cintillo (la que contiene el día actual)
            const actual = etapasOrdenadas.find((e: any) => diasVida >= e.diasEdad?.min && diasVida <= e.diasEdad?.max) || etapasOrdenadas[0] || null;
            this.etapaActualChanchos = actual
              ? {
                  id: 0,
                  alimentoRecomendado: actual.producto?.name || actual.tipoAlimento,
                  quantityPerAnimal: parseFloat((actual.quantityPerAnimal || (actual.consumoDiario.min / 1000)).toFixed(2)),
                  unidad: 'kg',
                  seleccionado: true,
                  productosDetalle: [
                    {
                      nombre: actual.producto?.name || actual.tipoAlimento,
                      cantidad: parseFloat((actual.quantityPerAnimal || (actual.consumoDiario.min / 1000)).toFixed(2)),
                      unidad: 'kg'
                    }
                  ],
                  dayStart: actual.diasEdad?.min,
                  dayEnd: actual.diasEdad?.max
                }
              : null;

            this.actualizarAlimentosSeleccionados();
          } else {
            console.warn('⚠️ [Chanchos] No se encontró plan de nutrición. Usando fallback.');
            this.cargarAlimentosFallback(diasVida);
          }
        },
        error: (err) => {
          console.error('❌ [Chanchos] Error obteniendo plan integrado:', err);
          this.cargarAlimentosFallback(diasVida);
        }
      });
    } catch (e) {
      console.error('❌ [Chanchos] Error general al cargar sub-etapas:', e);
      this.cargarAlimentosFallback(diasVida);
    }
  }

  /**
   * Cerrar modal
   */
  cerrarModal(): void {
    this.modalAbierto = false;
    this.loteSeleccionado = null;
    this.etapaActualChanchos = null;
    this.resetearRegistro();
  }

  /**
   * Inicializar registro completo
   */
  private inicializarRegistroCompleto(): void {
    const ahora = new Date();
    this.registroCompleto = {
      fecha: ahora.toISOString().split('T')[0],
      hora: ahora.toTimeString().slice(0, 5),
      cantidadAplicada: 0,
      tipoAlimento: '',
      animalesVivos: this.loteSeleccionado?.quantity || 0,
      animalesMuertos: 0,
      animalesEnfermos: 0,
      fechaVenta: '',
      animalesVendidos: 0,
      precioUnitario: 0,
      valorTotalVenta: 0,
      observacionesVenta: '',
      observacionesSalud: '',
      observacionesGenerales: '',
      loteId: String(this.loteSeleccionado?.id || ''),
      usuarioId: this.user?.id || 0,
      stockAnterior: 0,
      stockPosterior: 0,
      loteCerrado: false,
      motivoCierre: ''
    };
  }

  /**
   * Resetear registro
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
      loteId: '',
      usuarioId: 0,
      stockAnterior: 0,
      stockPosterior: 0,
      loteCerrado: false,
      motivoCierre: ''
    };
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

  // ================= UTILIDADES DE PLAN PRINCIPAL (CHANCHOS) =================
  private extraerRangoDesdeNombre(nombrePlan?: string): { min: number, max: number } | null {
    if (!nombrePlan) return null;
    const fuente = String(nombrePlan).toLowerCase();
    const regex = /(\d+)\s*(?:-|–|—|al|a)\s*(\d+)/i;
    const match = fuente.match(regex);
    if (match) {
      const min = Number(match[1]);
      const max = Number(match[2]);
      if (!isNaN(min) && !isNaN(max) && min > 0 && max >= min) return { min, max };
    }
    return null;
  }

  private determinarPlanPrincipal(etapas: any[], diasVida: number): { nombre: string, rango?: { min: number, max: number } } | null {
    if (!etapas || etapas.length === 0) return null;
    for (const e of etapas) {
      const parsed = this.extraerRangoDesdeNombre(e.planNombre);
      if (parsed && diasVida >= parsed.min && diasVida <= parsed.max) {
        return { nombre: e.planNombre, rango: parsed };
      }
    }
    const nombre = etapas[0]?.planNombre || null;
    if (nombre) {
      const parsed = this.extraerRangoDesdeNombre(nombre);
      return { nombre, rango: parsed || undefined } as any;
    }
    return null;
  }

  // ================= CHECKLIST DE ALIMENTOS (CHANCHOS) =================
  actualizarAlimentosSeleccionados(): void {
    this.alimentosSeleccionados = this.etapasDisponiblesLote.filter(e => e.seleccionado);
  }

  removerAlimento(nombreAlimento: string): void {
    const etapa = this.etapasDisponiblesLote.find(e => e.alimentoRecomendado === nombreAlimento);
    if (etapa) {
      etapa.seleccionado = false;
      this.actualizarAlimentosSeleccionados();
    }
  }

  private cargarAlimentosFallback(diasVida: number): void {
    // Fallback simple: lista vacía y mantener el select manual
    this.etapasDisponiblesLote = [];
    this.alimentosSeleccionados = [];
  }

  // ================= UTILIDADES DE FORMATO / CÁLCULOS =================
  formatearCantidad(valor: number | null | undefined): string {
    const n = Number(valor || 0);
    return n.toFixed(2);
  }

  getCantidadTotalAlimentosSeleccionados(): number {
    const animales = this.loteSeleccionado?.quantity || 0;
    const total = this.alimentosSeleccionados.reduce((acc, a) => acc + (a.quantityPerAnimal || 0) * animales, 0);
    return Number(total.toFixed(2));
  }

  /**
   * Cargar datos iniciales
   */
  async cargarDatosIniciales(): Promise<void> {
    this.loading = true;
    try {
      await this.cargarLotesChanchos();
      await this.cargarEtapasAlimentacion();
    } catch (error) {
      console.error('❌ Error al cargar datos iniciales:', error);
    } finally {
      this.loading = false;
    }
  }

  /**
   * Cargar lotes de chanchos
   */
  async cargarLotesChanchos(): Promise<void> {
    try {
      const lotes = await this.loteService.getLotes().toPromise();
      
      // Filtrar solo lotes de chanchos/cerdos
      this.lotesChanchos = lotes.filter(lote => 
        lote.race?.animal?.name?.toLowerCase().includes('chancho') ||
        lote.race?.animal?.name?.toLowerCase().includes('cerdo') ||
        lote.race?.animal?.id === 2 // Asumiendo que el ID 2 es para cerdos
      );
      
      // Filtrar lotes activos (con animales vivos)
      this.lotesActivos = this.lotesChanchos.filter(lote => lote.quantity > 0);
      
      // Inicializar animales vivos actuales
      this.lotesActivos.forEach(lote => {
        if (lote.id) {
          this.animalesVivosActuales[lote.id] = lote.quantity;
        }
      });
      
      console.log('🐷 Lotes de chanchos cargados:', this.lotesChanchos.length);
      console.log('✅ Lotes activos:', this.lotesActivos.length);
    } catch (error) {
      console.error('❌ Error al cargar lotes de chanchos:', error);
    }
  }

  /**
   * Cargar etapas de alimentación
   */
  async cargarEtapasAlimentacion(): Promise<void> {
    try {
      // TODO: Implementar carga de planes específicos para chanchos
      // Por ahora dejamos vacío
      this.etapasAlimentacion = [];
      console.log('📋 Etapas de alimentación cargadas:', this.etapasAlimentacion.length);
    } catch (error) {
      console.error('❌ Error al cargar etapas de alimentación:', error);
    }
  }
} 