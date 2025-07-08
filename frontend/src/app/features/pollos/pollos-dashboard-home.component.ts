import { Component, OnInit } from '@angular/core';
import { AuthDirectService } from '../../core/services/auth-direct.service';
import { User } from '../../shared/models/user.model';
import { LoteService } from '../lotes/services/lote.service';
import { PlanAlimentacionService, PlanDetalle } from '../plan-nutricional/services/plan-alimentacion.service';
import { Lote } from '../lotes/interfaces/lote.interface';

@Component({
  selector: 'app-pollos-dashboard-home',
  templateUrl: './pollos-dashboard-home.component.html',
  styleUrls: ['./pollos-dashboard.component.scss']
})
export class PollosDashboardHomeComponent implements OnInit {
  user: User | null = null;
  
  // Variables para lotes de pollos
  lotesPollos: Lote[] = [];
  lotesActivos: Lote[] = [];
  loading = false;
  
  // Variables para etapas de alimentación
  etapasAlimentacion: PlanDetalle[] = [];
  selectedDate = new Date();
  
  // Variables para registro diario
  registrosDiarios: { [loteId: number]: RegistroDiario } = {};

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
   * Método trackBy para optimizar el renderizado de la lista de lotes
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
   * Obtener la fecha seleccionada en formato string para el input date
   */
  getSelectedDateString(): string {
    return this.selectedDate.toISOString().split('T')[0];
  }

  /**
   * Validar que el registro tiene los datos mínimos necesarios
   */
  validarRegistro(lote: Lote): boolean {
    if (!lote.id) return false;
    
    const registro = this.getRegistroDiario(lote.id);
    return registro.cantidadAplicada > 0 && registro.animalesVivos > 0;
  }

  /**
   * Obtener rendimiento general (simulado)
   */
  getRendimientoGeneral(): number {
    if (this.lotesActivos.length === 0) return 0;
    
    // Simulación basada en promedio de días de vida y cantidad
    let rendimientoPromedio = 0;
    let totalLotes = 0;
    
    this.lotesActivos.forEach(lote => {
      const diasVida = this.calcularDiasDeVida(lote.birthdate);
      if (diasVida > 0) {
        // Simular rendimiento basado en días de vida (mejor rendimiento entre 21-42 días)
        const rendimiento = diasVida > 21 && diasVida < 42 ? 
          Math.min(95, 80 + (diasVida - 21) * 0.7) : 
          Math.max(75, 90 - Math.abs(diasVida - 35) * 0.5);
        rendimientoPromedio += rendimiento;
        totalLotes++;
      }
    });
    
    return totalLotes > 0 ? Math.round(rendimientoPromedio / totalLotes) : 85;
  }

  /**
   * Obtener eficiencia alimentaria (simulado)
   */
  getEficienciaAlimentaria(): number {
    if (this.lotesActivos.length === 0) return 0;
    
    // Simulación basada en el número de animales y etapas
    const totalAnimales = this.getTotalAnimales();
    const etapasDisponibles = this.etapasAlimentacion.length;
    
    // Más etapas y más animales = mejor eficiencia
    const eficienciaBase = 78;
    const bonusEtapas = Math.min(12, etapasDisponibles * 2);
    const bonusAnimales = Math.min(10, totalAnimales / 100);
    
    return Math.round(eficienciaBase + bonusEtapas + bonusAnimales);
  }

  /**
   * Obtener crecimiento promedio diario (simulado)
   */
  getCrecimientoPromedio(): number {
    if (this.lotesActivos.length === 0) return 0;
    
    // Simulación basada en días de vida promedio
    let diasVidaPromedio = 0;
    let totalLotes = 0;
    
    this.lotesActivos.forEach(lote => {
      const diasVida = this.calcularDiasDeVida(lote.birthdate);
      if (diasVida > 0) {
        diasVidaPromedio += diasVida;
        totalLotes++;
      }
    });
    
    if (totalLotes === 0) return 45;
    
    diasVidaPromedio = diasVidaPromedio / totalLotes;
    
    // Crecimiento típico: 45-55g por día dependiendo de la edad
    if (diasVidaPromedio < 14) return 25;
    if (diasVidaPromedio < 28) return 45;
    if (diasVidaPromedio < 42) return 55;
    return 48;
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
   * Obtener etapa de alimentación actual para un lote
   */
  getEtapaActual(lote: Lote): PlanDetalle | null {
    const diasVida = this.calcularDiasDeVida(lote.birthdate);
    
    return this.etapasAlimentacion.find(etapa => 
      diasVida >= etapa.dayStart && diasVida <= etapa.dayEnd
    ) || null;
  }

  // Calcular cantidad total de alimento para un lote
  calcularCantidadTotal(lote: Lote, etapa: PlanDetalle): number {
    if (!etapa?.quantityPerAnimal || !lote.quantity) return 0;
    
    const cantidadTotalKg = (etapa.quantityPerAnimal * lote.quantity);
    return Math.round(cantidadTotalKg * 100) / 100; // Redondear a 2 decimales
  }

  // Inicializar registro diario para un lote
  inicializarRegistroDiario(lote: Lote): void {
    const loteId = lote.id;
    if (!loteId || this.registrosDiarios[loteId]) return;
    
    const etapa = this.getEtapaActual(lote);
    this.registrosDiarios[loteId] = {
      cantidadAplicada: etapa ? this.calcularCantidadTotal(lote, etapa) : 0,
      animalesVivos: lote.quantity,
      animalesMuertos: 0,
      porcentajeConsumido: 100,
      observaciones: '',
      fecha: new Date()
    };
  }

  // Registrar alimentación diaria
  async registrarAlimentacionDiaria(lote: Lote): Promise<void> {
    const loteId = lote.id;
    if (!loteId) {
      console.error('❌ ID del lote no válido:', lote.codigo);
      return;
    }

    const registro = this.registrosDiarios[loteId];
    const etapa = this.getEtapaActual(lote);
    
    if (!registro || !etapa) {
      console.error('❌ No hay registro o etapa disponible para el lote:', lote.codigo);
      return;
    }

    try {
      console.log('📝 Registrando alimentación para lote:', lote.codigo);
      console.log('📊 Datos del registro:', registro);
      
      // TODO: Aquí integrar con el backend para:
      // 1. Guardar el registro de alimentación
      // 2. Actualizar stock del producto
      // 3. Actualizar cantidad de animales vivos del lote
      
      // Mock del proceso por ahora
      console.log('✅ Alimentación registrada exitosamente');
      console.log(`📉 Stock descontado: ${registro.cantidadAplicada} kg de ${etapa.product?.name || 'producto'}`);
      
      // Limpiar el registro después del éxito
      delete this.registrosDiarios[loteId];
      
    } catch (error) {
      console.error('❌ Error al registrar alimentación:', error);
    }
  }

  // Omitir alimentación del día
  omitirAlimentacion(lote: Lote): void {
    const loteId = lote.id;
    if (!loteId) return;
    
    console.log('⚠️ Alimentación omitida para lote:', lote.codigo);
    delete this.registrosDiarios[loteId];
  }

  // Formatear fecha
  formatearFecha(fecha: Date | null): string {
    if (!fecha) return '';
    
    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Actualizar fecha seleccionada
   */
  updateSelectedDate(event: any): void {
    const fechaString = event.target.value;
    this.selectedDate = new Date(fechaString + 'T00:00:00');
    console.log('📅 Fecha actualizada:', this.formatearFecha(this.selectedDate));
  }

  /**
   * Manejar cambio de fecha
   */
  onDateChange(event: any): void {
    this.selectedDate = event.target.value;
  }

  /**
   * Obtener registro diario para un lote específico
   */
  getRegistroDiario(loteId: number | undefined): RegistroDiario {
    // Validar que loteId sea válido
    if (!loteId) {
      return this.getDefaultRegistroDiario();
    }

    // Si no existe el registro, crearlo
    if (!this.registrosDiarios[loteId]) {
      this.registrosDiarios[loteId] = this.getDefaultRegistroDiario();
    }
    
    return this.registrosDiarios[loteId];
  }

  /**
   * Obtener registro diario por defecto
   */
  private getDefaultRegistroDiario(): RegistroDiario {
    return {
      fecha: this.selectedDate,
      cantidadAplicada: 0,
      animalesVivos: 0,
      animalesMuertos: 0,
      porcentajeConsumido: 100,
      observaciones: ''
    };
  }

  /**
   * Actualizar registro diario
   */
  updateRegistroDiario(loteId: number | undefined, campo: string, event: any): void {
    // Validar que loteId sea válido
    if (!loteId) {
      console.warn('❌ ID del lote no válido para actualizar registro');
      return;
    }

    // Asegurar que el registro existe
    if (!this.registrosDiarios[loteId]) {
      this.registrosDiarios[loteId] = this.getDefaultRegistroDiario();
    }
    
    const valor = event.target.value;
    
    // Actualizar el campo específico
    if (campo === 'observaciones') {
      this.registrosDiarios[loteId][campo] = valor;
    } else {
      const numericValue = Number(valor);
      if (!isNaN(numericValue)) {
        (this.registrosDiarios[loteId] as any)[campo] = numericValue;
      }
    }
    
    console.log(`📝 Registro actualizado para lote ${loteId}:`, campo, valor);
  }

  /**
   * Cargar datos iniciales
   */
  async cargarDatosIniciales(): Promise<void> {
    this.loading = true;
    try {
      await Promise.all([
        this.cargarLotesPollos(),
        this.cargarEtapasAlimentacion()
      ]);
    } catch (error) {
      console.error('Error al cargar datos iniciales:', error);
    } finally {
      this.loading = false;
    }
  }

  /**
   * Cargar lotes de pollos
   */
  async cargarLotesPollos(): Promise<void> {
    try {
      this.loteService.getLotes().subscribe({
        next: (lotes) => {
          // Filtrar solo lotes de pollos (animal.id === 1 generalmente para pollos)
          this.lotesPollos = lotes.filter(lote => 
            lote.race?.animal?.name?.toLowerCase().includes('pollo') ||
            lote.race?.animal?.id === 1
          );
          
          // Filtrar lotes activos (que tienen animales vivos)
          this.lotesActivos = this.lotesPollos.filter(lote => lote.quantity > 0);
          
          console.log('✅ Lotes de pollos cargados:', this.lotesPollos.length);
          console.log('✅ Lotes activos:', this.lotesActivos.length);
        },
        error: (error) => {
          console.error('❌ Error al cargar lotes:', error);
        }
      });
    } catch (error) {
      console.error('❌ Error en cargarLotesPollos:', error);
    }
  }

  /**
   * Cargar etapas de alimentación
   */
  async cargarEtapasAlimentacion(): Promise<void> {
    try {
      this.planService.getVistaGeneralEtapas().subscribe({
        next: (etapas) => {
          // Filtrar etapas de pollos
          this.etapasAlimentacion = etapas.filter(etapa => 
            etapa.animal?.name?.toLowerCase().includes('pollo') ||
            etapa.animal?.id === 1
          );
          
          console.log('✅ Etapas de alimentación cargadas:', this.etapasAlimentacion.length);
        },
        error: (error) => {
          console.error('❌ Error al cargar etapas:', error);
        }
      });
    } catch (error) {
      console.error('❌ Error en cargarEtapasAlimentacion:', error);
    }
  }
}

// Interfaz para el registro diario
interface RegistroDiario {
  cantidadAplicada: number;
  animalesVivos: number;
  animalesMuertos: number;
  porcentajeConsumido: number;
  observaciones: string;
  fecha: Date;
}