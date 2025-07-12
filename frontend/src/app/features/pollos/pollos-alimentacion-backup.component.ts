import { Component, OnInit } from '@angular/core';
import { LoteService } from '../lotes/services/lote.service';
import { AlimentacionService } from './services/alimentacion.service';
import { Lote } from '../lotes/interfaces/lote.interface';

interface RegistroAlimentacionCompleto {
  fecha: string;
  hora: string;
  cantidadAplicada: number;
  tipoAlimento: string;
  animalesVivos: number;
  animalesMuertos: number;
  animalesEnfermos: number;
  fechaVenta: string;
  animalesVendidos: number;
  precioUnitario: number;
  valorTotalVenta: number;
  observacionesVenta: string;
  observacionesSalud: string;
  observacionesGenerales: string;
  loteId: number;
  usuarioId: number;
  stockAnterior: number;
  stockPosterior: number;
  loteCerrado: boolean;
  motivoCierre: string;
}

@Component({
  selector: 'app-pollos-alimentacion',
  templateUrl: './pollos-alimentacion.component.html',
  styleUrls: ['./pollos-dashboard.component.scss']
})
export class PollosAlimentacionComponent implements OnInit {
  // Propiedades básicas
  lotesActivos: Lote[] = [];
  loteSeleccionado: Lote | null = null;
  modalAbierto = false;
  selectedDate = new Date();
  user: any = { id: 1 }; // Usuario temporal
  registroCompleto: RegistroAlimentacionCompleto = this.getRegistroVacio();

  // Estados de UI
  diagnosticoVisible = false;
  estadoSistema = {
    color: 'text-green-600',
    mensaje: 'Sistema funcionando',
    lotesCargados: 0,
    planEncontrado: true,
    etapasCubiertas: true,
    problemasDetectados: 0
  };

  constructor(
    private loteService: LoteService,
    private alimentacionService: AlimentacionService
  ) {}

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  // Métodos básicos requeridos por el template
  mostrarDiagnostico(): void {
    this.diagnosticoVisible = !this.diagnosticoVisible;
  }

  recargarDatos(): void {
    this.cargarDatosIniciales();
  }

  realizarAnalisisCompleto(): void {
    console.log('Análisis completo iniciado');
  }

  getSelectedDateString(): string {
    return this.selectedDate.toISOString().split('T')[0];
  }

  updateSelectedDate(event: any): void {
    this.selectedDate = new Date(event.target.value);
  }

  formatearFecha(fecha: Date): string {
    return fecha.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getTotalAnimales(): number {
    return this.lotesActivos.reduce((total, lote) => total + (lote.quantity || 0), 0);
  }

  trackByLote(index: number, lote: Lote): number {
    return lote.id || index;
  }

  async cargarDatosIniciales(): Promise<void> {
    try {
      const lotes = await this.loteService.getLotes().toPromise();
      this.lotesActivos = lotes?.filter(lote => 
        lote.race?.animal?.name?.toLowerCase().includes('pollo') ||
        lote.race?.animal?.id === 1
      ) || [];
      
      this.estadoSistema.lotesCargados = this.lotesActivos.length;
      console.log('✅ Datos cargados:', this.lotesActivos.length, 'lotes');
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      this.lotesActivos = [];
    }
  }

  abrirModalAlimentacion(lote: Lote): void {
    this.loteSeleccionado = lote;
    this.registroCompleto = this.getRegistroVacio();
    this.registroCompleto.loteId = lote.id || 0;
    this.registroCompleto.animalesVivos = lote.quantity || 0;
    this.modalAbierto = true;
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    this.loteSeleccionado = null;
  }

  async registrarAlimentacionCompleta(): Promise<void> {
    try {
      console.log('🚀 Registrando alimentación...');

      // Validaciones básicas
      if (!this.loteSeleccionado) {
        alert('❌ No se ha seleccionado un lote');
        return;
      }

      if (this.registroCompleto.cantidadAplicada <= 0) {
        alert('❌ La cantidad debe ser mayor a 0');
        return;
      }

      // Confirmación
      const confirmar = confirm(`¿Confirmar registro de ${this.registroCompleto.cantidadAplicada} kg para el lote ${this.loteSeleccionado.codigo}?`);
      if (!confirmar) return;

      // Preparar datos
      const datosRegistro = {
        loteId: this.loteSeleccionado.codigo || '',
        fecha: this.registroCompleto.fecha,
        cantidadAplicada: this.registroCompleto.cantidadAplicada,
        animalesVivos: this.registroCompleto.animalesVivos,
        animalesMuertos: this.registroCompleto.animalesMuertos,
        observaciones: this.registroCompleto.observacionesGenerales || '',
        usuarioId: this.user?.id || 0
      };

      // Enviar al backend
      const response = await this.alimentacionService.registrarAlimentacion(datosRegistro).toPromise();
      
      if (response) {
        alert('✅ Alimentación registrada exitosamente');
        this.cerrarModal();
        await this.cargarDatosIniciales();
      }

    } catch (error) {
      console.error('❌ Error al registrar:', error);
      alert('❌ Error al registrar alimentación. Verifica los datos e intenta nuevamente.');
    }
  }

  calcularDiasDeVida(fechaNacimiento: Date | null): number {
    if (!fechaNacimiento) return 0;
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const fechaNac = new Date(fechaNacimiento);
    fechaNac.setHours(0, 0, 0, 0);
    
    const diffTime = hoy.getTime() - fechaNac.getTime();
    return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  }

  private getRegistroVacio(): RegistroAlimentacionCompleto {
    const ahora = new Date();
    return {
      fecha: ahora.toISOString().split('T')[0],
      hora: ahora.toTimeString().slice(0, 5),
      cantidadAplicada: 0,
      tipoAlimento: 'Concentrado balanceado',
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
      usuarioId: this.user?.id || 0,
      stockAnterior: 0,
      stockPosterior: 0,
      loteCerrado: false,
      motivoCierre: ''
    };
  }
}
