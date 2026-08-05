import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthDirectService } from '../../core/services/auth-direct.service';
import { User } from '../../shared/models/user.model';
import { LoteService } from '../lotes/services/lote.service';
import { PlanAlimentacionService, PlanDetalle } from '../plan-nutricional/services/plan-alimentacion.service';
import { AlimentacionService, RegistroAlimentacionRequest } from '../pollos/services/alimentacion.service';
import { PlanNutricionalIntegradoService } from '../../shared/services/plan-nutricional-integrado.service';
import { RegistroDiarioService, RegistroDiarioCompleto } from '../../shared/services/registro-diario.service';
import { Lote } from '../lotes/interfaces/lote.interface';
import { ProductService } from '../../shared/services/product.service';
import { InventarioService } from '../pollos/services/inventario.service';
import { InventarioEntradasService } from '../../shared/services/inventario-entradas.service';

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
  // Peso promedio del animal (kg)
  pesoAnimal: number;
  
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
  productoId?: number;
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
  // Mapas auxiliares para estadísticas rápidas (paridad visual con Pollos)
  private estadisticasLotes: Map<string, {
    chanchosRegistrados: number;
    chanchosVivos: number;
    mortalidadTotal: number;
    porcentajeMortalidad: number;
    tieneDatos: boolean;
  }> = new Map();
  private morbilidadPorLote: Map<string, number> = new Map();
  
  // Modal de alimentación completo
  modalAbierto = false;
  loteSeleccionado: Lote | null = null;
  inventarioAutomaticoActivado = true;
  
  // Mensajes de UI para validación de stock
  uiMessageError: string = '';
  uiMessageSuccess: string = '';
  
  // Registro completo
  registroCompleto: RegistroAlimentacionCompleto = {
    fecha: '',
    hora: '',
    cantidadAplicada: 0,
    tipoAlimento: '',
    animalesVivos: 0,
    animalesMuertos: 0,
    animalesEnfermos: 0,
    pesoAnimal: 0,
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
    private planNutricionalService: PlanNutricionalIntegradoService,
    private registroDiarioService: RegistroDiarioService,
    private productService: ProductService,
    private inventarioService: InventarioService,
    private router: Router,
    private alimentacionService: AlimentacionService,
    private invEntradasService: InventarioEntradasService
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

    const fechaNac = new Date(fechaNacimiento);
    const hoy = new Date();
    if (isNaN(fechaNac.getTime())) return 0;

    fechaNac.setHours(0, 0, 0, 0);
    hoy.setHours(0, 0, 0, 0);

    const diffTime = hoy.getTime() - fechaNac.getTime();
    return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  }

  // ===== Helpers de formato y estadísticas para UI tipo Pollos =====
  formatLoteCodigo(valor: any): string {
    if (valor == null) return 'Lote001';
    const raw = String(valor).trim();
    const digits = (raw.match(/\d+/g) || []).join('');
    const last3 = (digits || '1').slice(-3);
    const num = Number(last3) || 1;
    return `Lote${num.toString().padStart(3, '0')}`;
  }

  /**
   * Calcular meses y días exactos desde la fecha de nacimiento hasta hoy.
   * Los días son el remanente después de los meses calendario (0–31), no el total de días de vida.
   */
  private calcularMesesYDiasDesde(fecha: Date | string | null): { meses: number; dias: number } {
    if (!fecha) return { meses: 0, dias: 0 };

    const inicio = typeof fecha === 'string' ? new Date(fecha) : new Date(fecha);
    const hoy = new Date();

    if (isNaN(inicio.getTime())) return { meses: 0, dias: 0 };

    inicio.setHours(0, 0, 0, 0);
    hoy.setHours(0, 0, 0, 0);

    let meses = (hoy.getFullYear() - inicio.getFullYear()) * 12 + (hoy.getMonth() - inicio.getMonth());
    if (hoy.getDate() < inicio.getDate()) {
      meses -= 1;
    }

    const referencia = new Date(inicio);
    referencia.setMonth(referencia.getMonth() + meses);

    const diffMs = hoy.getTime() - referencia.getTime();
    const dias = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    return { meses: Math.max(0, meses), dias };
  }

  getEdadEnMesesTexto(lote: Lote | null): string {
    if (!lote || !lote.birthdate) return '0 meses';
    const { meses, dias } = this.calcularMesesYDiasDesde(lote.birthdate);
    const mesesTxt = meses === 1 ? '1 mes' : `${meses} meses`;
    if (dias <= 0) return mesesTxt;
    const diasTxt = dias === 1 ? '1 día' : `${dias} días`;
    return `${mesesTxt} y ${diasTxt}`;
  }

  getChanchosRegistrados(lote: Lote): number {
    return lote.quantityOriginal || lote.quantity || 0;
  }

  getEstadisticasLote(lote: Lote): {
    chanchosRegistrados: number;
    chanchosVivos: number;
    mortalidadTotal: number;
    porcentajeMortalidad: number;
    tieneDatos: boolean;
  } {
    if (lote.id && this.estadisticasLotes.has(String(lote.id))) {
      return this.estadisticasLotes.get(String(lote.id))!;
    }
    const chanchosRegistrados = lote.quantityOriginal || lote.quantity || 0;
    const chanchosVivos = lote.quantity || 0;
    const mortalidadTotal = lote.quantityOriginal ? Math.max(0, chanchosRegistrados - chanchosVivos) : 0;
    const porcentajeMortalidad = chanchosRegistrados > 0 ? (mortalidadTotal / chanchosRegistrados) * 100 : 0;
    const tieneDatos = !!lote.quantityOriginal;
    const info = { chanchosRegistrados, chanchosVivos, mortalidadTotal, porcentajeMortalidad, tieneDatos };
    if (lote.id) this.estadisticasLotes.set(String(lote.id), info);
    return info;
  }

  calcularMorbilidadActual(lote: Lote): number {
    return this.morbilidadPorLote.get(String(lote.id || '')) || 0;
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
              seleccionado: true,
              productosDetalle: [
                {
                  nombre: etapa.producto?.name || etapa.tipoAlimento,
                  cantidad: parseFloat((etapa.quantityPerAnimal || (etapa.consumoDiario.min / 1000)).toFixed(2)),
                  unidad: 'kg'
                }
              ],
              dayStart: etapa.diasEdad?.min,
              dayEnd: etapa.diasEdad?.max,
              productoId: etapa.producto?.id
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
      pesoAnimal: 0,
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
      pesoAnimal: 0,
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
    // Sincronizar cantidad aplicada con el total calculado
    this.registroCompleto.cantidadAplicada = this.getCantidadTotalAlimentosSeleccionados();
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
   * Cantidad sugerida según la etapa actual del plan
   */
  getCantidadSugeridaEtapaActual(): number {
    if (!this.etapaActualChanchos) return 0;
    const animales = this.loteSeleccionado?.quantity || 0;
    const total = (this.etapaActualChanchos.quantityPerAnimal || 0) * animales;
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

  /**
   * Registrar con inventario automático usando el servicio integrado
   */
  /**
   * ✅ Validar stock disponible ANTES de registrar consumo (FEFO Estricto - Chanchos)
   * Consulta directamente entradas FEFO vigentes en lugar de inventario consolidado
   */
  private async validarStockAntesDeRegistrar(): Promise<{ ok: boolean; faltantes: Array<{ nombre: string; requerido: number; disponible: number }> }> {
    const faltantes: Array<{ nombre: string; requerido: number; disponible: number }> = [];
    const animales = this.loteSeleccionado?.quantity || 0;

    // Obtener stock válido por PRODUCTO desde entradas FEFO vigentes
    let stockValido: Record<string, number> = {};
    try {
      stockValido = await this.invEntradasService.stockValidoAgrupado().toPromise() || {};
      console.log('🔎 [Chanchos] stockValidoAgrupado keys:', Object.keys(stockValido || {}));
    } catch (e) {
      console.error('❌ Error obteniendo stock válido agrupado:', e);
      stockValido = {};
    }

    // Obtener lista de productos para matching por nombre
    let productosCache: any[] = [];
    try {
      productosCache = await this.productService.getProducts({} as any).toPromise() || [];
    } catch (e) {
      console.warn('⚠️ No se pudo cargar cache de productos:', e);
      productosCache = [];
    }

    // Función para normalizar texto
    const normalizarTexto = (v: any): string => {
      return (v ?? '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    };

    // Función para buscar candidatos por nombre
    const candidatosPorNombre = (nombre: string): any[] => {
      const n = normalizarTexto(nombre);
      const exactos = (productosCache || []).filter(p => normalizarTexto(p?.name) === n);
      if (exactos.length > 0) {
        return exactos;
      }
      // Búsqueda parcial
      return (productosCache || []).filter(p => {
        const pn = normalizarTexto(p?.name);
        return pn.includes(n) || n.includes(pn);
      });
    };

    // Validar cada alimento seleccionado
    for (const al of this.alimentosSeleccionados) {
      const cantidadRequerida = parseFloat(((al.quantityPerAnimal || 0) * animales).toFixed(3));
      if (cantidadRequerida <= 0) continue;

      let disponible = 0;
      const productoId = al.productoId;
      const nombreProducto = al.alimentoRecomendado;

      // 1. Buscar por ID primero en stock válido
      if (Number.isFinite(Number(productoId))) {
        disponible = Number(stockValido[String(productoId)] || 0);
        console.log(`🔍 [Chanchos] Stock por ID ${productoId} (${nombreProducto}):`, disponible);
      }

      // 2. Fallback: buscar por nombre si no hay ID o no hay stock
      if (disponible <= 0 && nombreProducto) {
        const candidatos = candidatosPorNombre(nombreProducto);
        console.log(`🔍 [Chanchos] Candidatos para "${nombreProducto}":`, candidatos.map(c => ({ id: c?.id, name: c?.name })));
        
        for (const candidato of candidatos) {
          const pid = Number(candidato?.id);
          if (Number.isFinite(pid)) {
            const stockCandidato = Number(stockValido[String(pid)] || 0);
            disponible += stockCandidato;
            console.log(`  ➡️ Candidato ID ${pid}: ${stockCandidato} kg`);
          }
        }
      }

      // 3. Último recurso: consultar entradas directamente
      if (disponible <= 0 && Number.isFinite(Number(productoId))) {
        try {
          const entradas = await this.invEntradasService.listarPorProducto(Number(productoId)).toPromise();
          const total = (entradas || []).reduce((sum, e: any) => sum + Number(e?.stockBaseRestante || 0), 0);
          if (Number.isFinite(total)) disponible = total;
          console.log(`🔁 [Chanchos] Fallback entradas[pid=${productoId}] total=`, total);
        } catch (e) {
          console.warn('No se pudo consultar entradas para pid', productoId, e);
        }
      }

      // Comparar: si lo requerido es mayor que lo disponible, agregar a faltantes
      console.log(`📊 [Chanchos] "${nombreProducto}": requerido ${cantidadRequerida} kg, disponible ${disponible} kg`);
      if (cantidadRequerida > disponible + 1e-6) {
        faltantes.push({
          nombre: nombreProducto || `Producto ID ${productoId}`,
          requerido: cantidadRequerida,
          disponible: disponible
        });
      }
    }

    console.log('🧪 [Chanchos] Validación stock - faltantes:', faltantes);
    return { ok: faltantes.length === 0, faltantes };
  }

  /**
   * ✅ Registrar solicitudes de recarga en localStorage para que el Admin lo vea en Inventario
   */
  private async registrarSolicitudesRecarga(faltantes: Array<{ nombre: string; requerido: number; disponible: number }>): Promise<void> {
    try {
      const key = 'pc_recharge_requests';
      const ahora = new Date().toISOString();
      const raw = localStorage.getItem(key) || '[]';
      const lista = JSON.parse(raw);
      const nuevos = faltantes.map(f => ({
        productName: f.nombre,
        name: f.nombre,
        requestedAt: ahora,
        loteCodigo: this.loteSeleccionado?.codigo || '',
        cantidadRequerida: f.requerido,
        cantidadDisponible: f.disponible,
        tipoAnimal: 'Chanchos'
      }));
      const merged = Array.isArray(lista) ? [...lista, ...nuevos] : nuevos;
      localStorage.setItem(key, JSON.stringify(merged));
      console.log('✅ Solicitudes de recarga registradas para chanchos:', nuevos);
    } catch (e) {
      console.error('❌ Error registrando solicitudes de recarga:', e);
    }
  }

  async registrarConInventarioAutomatico(): Promise<void> {
    // Limpiar mensajes previos
    this.uiMessageError = '';
    this.uiMessageSuccess = '';

    if (!this.loteSeleccionado) {
      this.uiMessageError = '⚠️ Seleccione un lote válido.';
      return;
    }

    // Validación mínima del peso
    if (this.registroCompleto.pesoAnimal == null || this.registroCompleto.pesoAnimal <= 0) {
      const continuar = confirm('No ingresó un peso válido para el animal. ¿Desea continuar sin este dato?');
      if (!continuar) return;
    }

    // ✅ VALIDAR STOCK ANTES DE CONTINUAR
    const validacion = await this.validarStockAntesDeRegistrar();
    if (!validacion.ok) {
      const detalle = validacion.faltantes
        .map(f => `• ${f.nombre}: requerido ${f.requerido.toFixed(2)} kg, disponible ${f.disponible.toFixed(2)} kg`)
        .join('\n');
      
      await this.registrarSolicitudesRecarga(validacion.faltantes);
      
      this.uiMessageError = `❌ No hay suficiente stock para completar el registro.\n\n${detalle}\n\n` +
        `Se notificó al administrador para recargar los productos. ` +
        `Por favor, vuelva a intentar cuando el stock esté disponible.`;
      
      // Scroll al mensaje de error
      setTimeout(() => {
        const errorElement = document.querySelector('.alert-error');
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
      
      return;
    }

    // Determinar alimento y cantidad
    const tipoAlimento = (this.alimentosSeleccionados[0]?.alimentoRecomendado
      || this.etapaActualChanchos?.alimentoRecomendado
      || this.registroCompleto.tipoAlimento
      || '').toString();

    const cantidadTotal = Number(this.registroCompleto.cantidadAplicada || this.getCantidadSugeridaEtapaActual() || 0);

    const registro: RegistroDiarioCompleto = {
      loteId: String(this.loteSeleccionado.id || this.registroCompleto.loteId),
      loteCodigo: String(this.loteSeleccionado.codigo || ''),
      fecha: this.registroCompleto.fecha ? new Date(this.registroCompleto.fecha) : new Date(),
      animalesMuertos: Number(this.registroCompleto.animalesMuertos || 0),
      animalesEnfermos: Number(this.registroCompleto.animalesEnfermos || 0),
      // No enviar tipoAlimento/cantidadAlimento aquí para evitar doble descuento
      observaciones: `Peso animal promedio: ${Number(this.registroCompleto.pesoAnimal || 0)} kg. ${this.registroCompleto.observacionesGenerales || ''}`.trim(),
      usuario: this.user?.username || 'Sistema'
    };

    this.registroDiarioService.procesarRegistroDiarioCompleto(registro).subscribe({
      next: async (res) => {
        console.log('✅ Registro procesado:', res);
        // Descontar inventario por cada alimento seleccionado (similar a Pollos)
        try {
          const loteIdStr = String(this.loteSeleccionado?.id || this.loteSeleccionado?.codigo || '');
          // ✅ Cargar cache de productos para evitar llamadas remotas getProductById (405 en prod)
          let productosCache: any[] = [];
          try {
            productosCache = await this.productService.getProducts({} as any).toPromise() || [];
          } catch (e) {
            console.warn('⚠️ No se pudo cargar cache de productos:', e);
          }
          const llamadas = this.alimentosSeleccionados.map(async (al) => {
            // Cantidad por este alimento = cantidadPorAnimal * animales del lote
            const cantidad = parseFloat(((al.quantityPerAnimal || 0) * (this.loteSeleccionado?.quantity || 0)).toFixed(3));
            if (cantidad <= 0) return null;

            // Obtener producto para extraer typeFoodId (si tenemos productoId es directo)
            // ✅ Evitar llamada remota getProductById (causa 405 en producción): usar cache local
            let tipoAlimentoId: number | null = null;
            let productId: number | null = al.productoId || null;
            if (productId) {
              try {
                const prod = (productosCache || []).find((p: any) => Number(p?.id) === Number(productId));
                if (prod) {
                  tipoAlimentoId = (prod as any)?.typeFood?.id || (prod as any)?.typeFood_id || null;
                  productId = (prod as any)?.id ?? productId;
                }
              } catch (e) {
                console.warn('⚠️ No se pudo resolver product por ID desde cache', al.productoId, e);
              }
            }

            // Fallback: buscar por nombre si no tuvimos productId o fallo anterior
            if (!tipoAlimentoId && al.alimentoRecomendado) {
              try {
                const lista = await this.productService.getProducts({ name: al.alimentoRecomendado } as any).toPromise();
                const prod: any = Array.isArray(lista) && lista.length > 0 ? lista[0] : null;
                tipoAlimentoId = (prod as any)?.typeFood?.id || (prod as any)?.typeFood_id || null;
              } catch (e) {
                console.warn('⚠️ No se pudo buscar producto por nombre', al.alimentoRecomendado, e);
              }
            }

            const payload: any = {
              loteId: loteIdStr,
              cantidadKg: cantidad,
              observaciones: `Alimentación diaria - ${al.alimentoRecomendado}`,
              nombreProducto: al.alimentoRecomendado
            };
            if (productId) payload.productId = productId;
            const tipoNum = Number(tipoAlimentoId);
            if (Number.isFinite(tipoNum)) payload.tipoAlimentoId = tipoNum;
            if ((!payload.nombreProducto || payload.nombreProducto.trim() === '') &&
                (payload.tipoAlimentoId === undefined || payload.tipoAlimentoId === null)) {
              console.warn('⏭️ Saltando consumo: falta nombreProducto y tipoAlimentoId para', al);
              return null;
            }
            console.log('📦 Registrando consumo en inventario (chanchos):', payload);
            try {
              const resp: any = await this.inventarioService.registrarConsumoAlimento(payload).toPromise();
              return { alimento: al.alimentoRecomendado, solicitado: cantidad, resp };
            } catch (err: any) {
              console.error('❌ Error registrando consumo para', al.alimentoRecomendado, err);
              return { alimento: al.alimentoRecomendado, solicitado: cantidad, error: err };
            }
          });
          const respuestas: any[] = (await Promise.all(llamadas))?.filter(Boolean) as any[];
          console.log('✅ Resultados de consumos (chanchos):', respuestas);

          // Fallback: si no hubo consumos efectivos y el usuario ingresó manualmente un tipo y cantidad, registrar por nombre
          if ((!respuestas || respuestas.length === 0) && tipoAlimento && cantidadTotal > 0) {
            const payloadManual: any = {
              loteId: loteIdStr,
              cantidadKg: cantidadTotal,
              observaciones: `Alimentación diaria (manual) - ${tipoAlimento}`,
              nombreProducto: tipoAlimento
            };
            console.log('📦 Fallback consumo manual (chanchos):', payloadManual);
            try {
              const resp: any = await this.inventarioService.registrarConsumoAlimento(payloadManual).toPromise();
              console.log('✅ Consumo manual registrado', resp);
            } catch (err) {
              console.error('❌ Error en consumo manual de inventario:', err);
            }
          }
        } catch (e) {
          console.error('❌ Error descontando inventario por alimento(s) (chanchos):', e);
        }
        // Guardar en historial de alimentación (plan-ejecucion DEBUG)
        try {
          const req: RegistroAlimentacionRequest = {
            loteId: String(this.loteSeleccionado?.id || this.registroCompleto.loteId),
            fecha: this.registroCompleto.fecha || new Date().toISOString().split('T')[0],
            cantidadAplicada: Number(this.registroCompleto.cantidadAplicada || this.getCantidadSugeridaEtapaActual() || 0),
            animalesVivos: Number(this.loteSeleccionado?.quantity || this.registroCompleto.animalesVivos || 0),
            animalesMuertos: Number(this.registroCompleto.animalesMuertos || 0),
            observaciones: (`Peso animal promedio: ${Number(this.registroCompleto.pesoAnimal || 0)} kg. ` + (this.registroCompleto.observacionesGenerales || '')).trim()
          };
          await this.alimentacionService.registrarAlimentacion(req).toPromise();
          console.log('📚 Histórico de alimentación actualizado (plan-ejecucion DEBUG).');
        } catch (err) {
          console.warn('⚠️ No se pudo registrar en histórico de alimentación (plan-ejecucion DEBUG):', err);
        }

        alert('Registro de alimentación guardado y consumo descontado del inventario.');
        const muertos = Number(this.registroCompleto.animalesMuertos || 0);
        const enfermos = Number(this.registroCompleto.animalesEnfermos || 0);
        if (muertos > 0) {
          this.router.navigate(['/chanchos/mortalidad'], { queryParams: { loteId: this.loteSeleccionado?.id || this.registroCompleto.loteId, cantidad: muertos } });
        } else if (enfermos > 0) {
          this.router.navigate(['/chanchos/morbilidad'], { queryParams: { loteId: this.loteSeleccionado?.id || this.registroCompleto.loteId, cantidad: enfermos } });
        } else {
          this.cerrarModal();
        }
      },
      error: (err) => {
        console.error('❌ Error al procesar registro diario:', err);
        alert('Ocurrió un error al guardar el registro.');
      }
    });
  }
}