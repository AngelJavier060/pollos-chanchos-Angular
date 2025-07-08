import { Component, OnInit } from '@angular/core';
import { AuthDirectService } from '../../core/services/auth-direct.service';
import { User } from '../../shared/models/user.model';
import { LoteService } from '../lotes/services/lote.service';
import { PlanAlimentacionService, PlanDetalle } from '../plan-nutricional/services/plan-alimentacion.service';
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

  // Simulación de stock de inventario
  private stockSimulado = {
    concentrado: 500,
    maiz: 300,
    soya: 200,
    balanceado: 150
  };

  // Simulación de historial de registros por lote
  private historialSimulado: { [loteId: number]: RegistroHistorial[] } = {
    1: [
      { fecha: '2024-01-15', cantidad: 2.5, animalesVivos: 15, observaciones: 'Consumo normal' },
      { fecha: '2024-01-14', cantidad: 2.5, animalesVivos: 15, observaciones: 'Sin novedad' }
    ],
    2: [
      { fecha: '2024-01-15', cantidad: 8.0, animalesVivos: 25, observaciones: 'Consumo óptimo' },
      { fecha: '2024-01-14', cantidad: 8.0, animalesVivos: 25, animalesVendidos: 2, valorVenta: 300.00, observaciones: 'Venta parcial' }
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

  constructor(
    private authService: AuthDirectService,
    private loteService: LoteService,
    private planService: PlanAlimentacionService
  ) {
    this.user = this.authService.currentUserValue;
  }

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  /**
   * Método trackBy para optimizar el renderizado
   */
  trackByLote(index: number, lote: Lote): number {
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
  }

  /**
   * Cerrar modal
   */
  cerrarModal(): void {
    this.modalAbierto = false;
    this.loteSeleccionado = null;
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
      loteId: this.loteSeleccionado?.id || 0,
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
      loteId: 0,
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