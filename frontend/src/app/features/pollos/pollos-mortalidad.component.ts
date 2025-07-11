import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthDirectService } from '../../core/services/auth-direct.service';
import { LoteService } from '../lotes/services/lote.service';
import { User } from '../../shared/models/user.model';
import { Lote } from '../lotes/interfaces/lote.interface';

// Interfaces para mortalidad
export interface CausaMortalidad {
  id: number;
  nombre: string;
  descripcion: string;
  color: string;
}

export interface RegistroMortalidad {
  id?: number;
  loteId: number;
  cantidadMuertos: number;
  causa: CausaMortalidad;
  observaciones: string;
  peso: number;
  edad: number;
  ubicacion: string;
  confirmado: boolean;
  fechaRegistro: Date;
  usuarioRegistro: string;
}

export interface EstadisticasMortalidad {
  totalMuertes: number;
  totalLotes: number;
  tasaPromedioMortalidad: number;
  principalesCausas: { causa: string; porcentaje: number; cantidad: number }[];
  tendenciaSemanal: { fecha: string; muertes: number }[];
  alertas: AlertaMortalidad[];
}

export interface AlertaMortalidad {
  id: number;
  tipo: 'critica' | 'advertencia' | 'informativa';
  titulo: string;
  mensaje: string;
  fechaCreacion: Date;
  leida: boolean;
  loteId?: number | null;
}

// Causas predefinidas
export const CAUSAS_MORTALIDAD: CausaMortalidad[] = [
  { id: 1, nombre: 'Enfermedad Respiratoria', descripcion: 'Problemas respiratorios', color: '#ff6b6b' },
  { id: 2, nombre: 'Enfermedad Digestiva', descripcion: 'Problemas digestivos', color: '#4ecdc4' },
  { id: 3, nombre: 'Problemas Cardíacos', descripcion: 'Fallos cardíacos', color: '#45b7d1' },
  { id: 4, nombre: 'Stress Térmico', descripcion: 'Estrés por temperatura', color: '#f9ca24' },
  { id: 5, nombre: 'Deficiencias Nutricionales', descripcion: 'Problemas nutricionales', color: '#6c5ce7' },
  { id: 6, nombre: 'Lesiones Físicas', descripcion: 'Heridas o traumatismos', color: '#feca57' },
  { id: 7, nombre: 'Problemas Genéticos', descripcion: 'Defectos genéticos', color: '#ff9ff3' },
  { id: 8, nombre: 'Causas Desconocidas', descripcion: 'Origen no determinado', color: '#95a5a6' },
  { id: 9, nombre: 'Otras Causas', descripcion: 'Otros factores', color: '#74b9ff' }
];

@Component({
  selector: 'app-pollos-mortalidad',
  templateUrl: './pollos-mortalidad.component.html',
  styleUrls: ['./pollos-dashboard.component.scss']
})
export class PollosMortalidadComponent implements OnInit, OnDestroy {
  user: User | null = null;
  
  // Variables principales
  registrosMortalidad: RegistroMortalidad[] = [];
  estadisticas: EstadisticasMortalidad | null = null;
  alertas: AlertaMortalidad[] = [];
  lotes: Lote[] = [];
  causasMortalidad: CausaMortalidad[] = CAUSAS_MORTALIDAD;
  
  // Variables de control de UI
  mostrarModalRegistro = false;
  mostrarModalEstadisticas = false;
  mostrarModalAlertas = false;
  cargando = false;
  
  // Filtros
  filtroLote: number | null = null;
  filtroFechaInicio: string = '';
  filtroFechaFin: string = '';
  filtroCausa: string = '';
  
  // Formulario de nuevo registro
  nuevoRegistro: Partial<RegistroMortalidad> = {
    cantidadMuertos: 1,
    observaciones: '',
    peso: 0,
    edad: 0,
    ubicacion: '',
    confirmado: false
  };
  
  // Suscripciones
  private subscriptions: Subscription = new Subscription();

  constructor(
    private authService: AuthDirectService,
    private loteService: LoteService
  ) {}

  ngOnInit(): void {
    this.user = this.authService.currentUserValue;
    this.cargarDatosIniciales();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Cargar datos iniciales
   */
  cargarDatosIniciales(): void {
    this.cargando = true;
    
    // Cargar lotes
    const lotesSub = this.loteService.getLotes().subscribe({
      next: (response: any) => {
        if (response?.status === 200 && response.object) {
          this.lotes = response.object.filter((lote: any) => 
            lote.animal?.name?.toLowerCase().includes('pollo') && 
            lote.status?.toLowerCase() === 'activo'
          );
        }
      },
      error: (error) => console.error('Error al cargar lotes:', error)
    });
    
    this.subscriptions.add(lotesSub);
    
    // TODO: Cargar datos reales de mortalidad desde el backend
    this.calcularEstadisticas();
    
    this.cargando = false;
  }

  /**
   * Registrar nueva mortalidad
   */
  registrarMortalidad(): void {
    if (!this.nuevoRegistro.loteId || !this.nuevoRegistro.causa || !this.nuevoRegistro.cantidadMuertos) {
      alert('Por favor complete todos los campos obligatorios');
      return;
    }
    
    const registro: RegistroMortalidad = {
      id: Date.now(),
      loteId: this.nuevoRegistro.loteId!,
      cantidadMuertos: this.nuevoRegistro.cantidadMuertos!,
      causa: this.nuevoRegistro.causa!,
      observaciones: this.nuevoRegistro.observaciones || '',
      peso: this.nuevoRegistro.peso || 0,
      edad: this.nuevoRegistro.edad || 0,
      ubicacion: this.nuevoRegistro.ubicacion || '',
      confirmado: false,
      fechaRegistro: new Date(),
      usuarioRegistro: this.user?.username || 'Desconocido'
    };
    
    this.registrosMortalidad.unshift(registro);
    this.calcularEstadisticas();
    this.cerrarModalRegistro();
    
    console.log('✅ Mortalidad registrada exitosamente:', registro);
    alert('Mortalidad registrada exitosamente');
  }

  /**
   * Confirmar un registro de mortalidad
   */
  confirmarRegistro(id: number): void {
    if (confirm('¿Está seguro de confirmar este registro de mortalidad?')) {
      const registro = this.registrosMortalidad.find(r => r.id === id);
      if (registro) {
        registro.confirmado = true;
        console.log('✅ Registro confirmado');
      }
    }
  }

  /**
   * Eliminar un registro de mortalidad
   */
  eliminarRegistro(id: number): void {
    if (confirm('¿Está seguro de eliminar este registro? Esta acción no se puede deshacer.')) {
      this.registrosMortalidad = this.registrosMortalidad.filter(r => r.id !== id);
      this.calcularEstadisticas();
      console.log('✅ Registro eliminado');
    }
  }

  /**
   * Marcar alerta como leída
   */
  marcarAlertaLeida(id: number): void {
    const alerta = this.alertas.find(a => a.id === id);
    if (alerta) {
      alerta.leida = true;
      console.log('✅ Alerta marcada como leída');
    }
  }

  /**
   * Calcular estadísticas
   */
  calcularEstadisticas(): void {
    const registros = this.getRegistrosFiltrados();
    
    const totalMuertes = registros.reduce((sum, r) => sum + r.cantidadMuertos, 0);
    const totalLotes = new Set(registros.map(r => r.loteId)).size;
    
    // Calcular principales causas
    const causas = new Map<string, number>();
    registros.forEach(r => {
      const nombreCausa = r.causa.nombre;
      causas.set(nombreCausa, (causas.get(nombreCausa) || 0) + r.cantidadMuertos);
    });

    const principalesCausas = Array.from(causas.entries())
      .map(([causa, cantidad]) => ({
        causa,
        cantidad,
        porcentaje: totalMuertes > 0 ? (cantidad / totalMuertes) * 100 : 0
      }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    // Calcular tendencia semanal
    const tendencia = new Map<string, number>();
    registros.forEach(r => {
      const fecha = new Date(r.fechaRegistro).toISOString().split('T')[0];
      tendencia.set(fecha, (tendencia.get(fecha) || 0) + r.cantidadMuertos);
    });

    const tendenciaSemanal = Array.from(tendencia.entries())
      .map(([fecha, muertes]) => ({ fecha, muertes }))
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
      .slice(-7);

    this.estadisticas = {
      totalMuertes,
      totalLotes,
      tasaPromedioMortalidad: 0, // TODO: Calcular con datos reales
      principalesCausas,
      tendenciaSemanal,
      alertas: this.alertas
    };
  }

  /**
   * Generar alertas
   */
  private generarAlertas(): void {
    this.alertas = [];
    
    // Alerta por alta mortalidad
    const hoy = new Date().toISOString().split('T')[0];
    const muertesHoy = this.registrosMortalidad
      .filter(r => new Date(r.fechaRegistro).toISOString().split('T')[0] === hoy)
      .reduce((sum, r) => sum + r.cantidadMuertos, 0);
    
    if (muertesHoy > 2) {
      this.alertas.push({
        id: Date.now(),
        tipo: 'critica',
        titulo: 'Alta mortalidad detectada',
        mensaje: `Se registraron ${muertesHoy} muertes hoy`,
        fechaCreacion: new Date(),
        leida: false,
        loteId: null
      });
    }
  }

  /**
   * Aplicar filtros a los registros
   */
  aplicarFiltros(): void {
    this.calcularEstadisticas();
  }

  /**
   * Limpiar filtros
   */
  limpiarFiltros(): void {
    this.filtroLote = null;
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.filtroCausa = '';
    this.aplicarFiltros();
  }

  /**
   * Abrir modal de registro
   */
  abrirModalRegistro(): void {
    this.nuevoRegistro = {
      cantidadMuertos: 1,
      observaciones: '',
      peso: 0,
      edad: 0,
      ubicacion: '',
      confirmado: false
    };
    this.mostrarModalRegistro = true;
  }

  /**
   * Cerrar modal de registro
   */
  cerrarModalRegistro(): void {
    this.mostrarModalRegistro = false;
    this.nuevoRegistro = {};
  }

  /**
   * Obtener nombre del lote por ID
   */
  getNombreLote(loteId: number): string {
    const lote = this.lotes.find(l => l.id === loteId);
    return lote ? `Lote ${lote.id} - ${lote.race?.name || 'Sin raza'}` : `Lote ${loteId}`;
  }

  /**
   * Obtener color de la causa de mortalidad
   */
  getColorCausa(causa: CausaMortalidad): string {
    return causa.color;
  }

  /**
   * Obtener registros filtrados para mostrar en la tabla
   */
  getRegistrosFiltrados(): RegistroMortalidad[] {
    let registros = [...this.registrosMortalidad];
    
    if (this.filtroLote) {
      registros = registros.filter(r => r.loteId === this.filtroLote);
    }
    
    if (this.filtroFechaInicio) {
      const fechaInicio = new Date(this.filtroFechaInicio);
      registros = registros.filter(r => new Date(r.fechaRegistro) >= fechaInicio);
    }
    
    if (this.filtroFechaFin) {
      const fechaFin = new Date(this.filtroFechaFin);
      registros = registros.filter(r => new Date(r.fechaRegistro) <= fechaFin);
    }
    
    if (this.filtroCausa) {
      registros = registros.filter(r => r.causa.nombre.toLowerCase().includes(this.filtroCausa.toLowerCase()));
    }
    
    return registros.sort((a, b) => new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime());
  }

  /**
   * Obtener alertas no leídas
   */
  getAlertasNoLeidas(): AlertaMortalidad[] {
    return this.alertas.filter(a => !a.leida);
  }

  /**
   * Obtener clase CSS para el tipo de alerta
   */
  getClaseAlerta(tipo: string): string {
    switch (tipo) {
      case 'critica': return 'bg-red-50 border-red-200 text-red-800';
      case 'advertencia': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'informativa': return 'bg-blue-50 border-blue-200 text-blue-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  }

  /**
   * Formatear fecha para mostrar
   */
  formatearFecha(fecha: Date): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Exportar datos (placeholder)
   */
  exportarDatos(): void {
    console.log('🔄 Exportando datos de mortalidad...');
    alert('Funcionalidad de exportación en desarrollo');
  }

  /**
   * Imprimir reporte (placeholder)
   */
  imprimirReporte(): void {
    console.log('🖨️ Generando reporte para impresión...');
    alert('Funcionalidad de impresión en desarrollo');
  }
}
