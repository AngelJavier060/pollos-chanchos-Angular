import { Component, OnInit } from '@angular/core';
import { AuthDirectService } from '../../core/services/auth-direct.service';
import { User } from '../../shared/models/user.model';
import { LoteService } from '../lotes/services/lote.service';
import { Lote } from '../lotes/interfaces/lote.interface';

@Component({
  selector: 'app-chanchos-lotes',
  templateUrl: './chanchos-lotes.component.html',
  styleUrls: ['./chanchos-dashboard.component.scss']
})
export class ChanchosLotesComponent implements OnInit {
  user: User | null = null;
  
  // Variables principales
  lotesChanchos: Lote[] = [];
  lotesFiltrados: Lote[] = [];
  loading = false;
  
  // Filtros
  filtros = {
    estado: 'todos', // todos, activos, cerrados
    raza: '',
    busqueda: ''
  };
  
  // Opciones de filtro
  razasDisponibles: string[] = [];
  
  // Estadísticas
  estadisticas = {
    totalLotes: 0,
    lotesActivos: 0,
    totalAnimales: 0,
    promedioEdad: 0
  };

  constructor(
    private authService: AuthDirectService,
    private loteService: LoteService
  ) {
    this.user = this.authService.currentUserValue;
  }

  ngOnInit(): void {
    this.cargarDatos();
  }

  /**
   * Cargar datos iniciales
   */
  async cargarDatos(): Promise<void> {
    this.loading = true;
    try {
      await this.cargarLotes();
      this.calcularEstadisticas();
      this.aplicarFiltros();
    } catch (error) {
      console.error('❌ Error al cargar datos:', error);
    } finally {
      this.loading = false;
    }
  }

  /**
   * Cargar lotes de chanchos
   */
  async cargarLotes(): Promise<void> {
    try {
      const todosLotes = await this.loteService.getLotes().toPromise();
      
      // Filtrar solo lotes de chanchos/cerdos
      this.lotesChanchos = todosLotes.filter(lote => 
        lote.race?.animal?.name?.toLowerCase().includes('chancho') ||
        lote.race?.animal?.name?.toLowerCase().includes('cerdo') ||
        lote.race?.animal?.id === 2
      );
      
      // Extraer razas disponibles
      this.razasDisponibles = [...new Set(
        this.lotesChanchos
          .map(lote => lote.race?.name)
          .filter(raza => raza)
          .map(raza => raza!)
      )];
      
      console.log('🐷 Lotes de chanchos cargados:', this.lotesChanchos.length);
    } catch (error) {
      console.error('❌ Error al cargar lotes:', error);
    }
  }

  /**
   * Calcular estadísticas
   */
  calcularEstadisticas(): void {
    this.estadisticas.totalLotes = this.lotesChanchos.length;
    this.estadisticas.lotesActivos = this.lotesChanchos.filter(lote => lote.quantity > 0).length;
    this.estadisticas.totalAnimales = this.lotesChanchos.reduce((total, lote) => total + lote.quantity, 0);
    
    // Calcular promedio de edad
    const lotesConFecha = this.lotesChanchos.filter(lote => lote.birthdate);
    if (lotesConFecha.length > 0) {
      const edadTotal = lotesConFecha.reduce((total, lote) => total + this.calcularDiasDeVida(lote.birthdate), 0);
      this.estadisticas.promedioEdad = Math.round(edadTotal / lotesConFecha.length);
    }
  }

  /**
   * Aplicar filtros
   */
  aplicarFiltros(): void {
    this.lotesFiltrados = this.lotesChanchos.filter(lote => {
      // Filtro por estado
      if (this.filtros.estado === 'activos' && lote.quantity === 0) return false;
      if (this.filtros.estado === 'cerrados' && lote.quantity > 0) return false;
      
      // Filtro por raza
      if (this.filtros.raza && lote.race?.name !== this.filtros.raza) return false;
      
      // Filtro por búsqueda
      if (this.filtros.busqueda) {
        const busqueda = this.filtros.busqueda.toLowerCase();
        const coincide = 
          lote.name?.toLowerCase().includes(busqueda) ||
          lote.codigo?.toLowerCase().includes(busqueda) ||
          lote.race?.name?.toLowerCase().includes(busqueda);
        if (!coincide) return false;
      }
      
      return true;
    });
  }

  /**
   * Limpiar filtros
   */
  limpiarFiltros(): void {
    this.filtros = {
      estado: 'todos',
      raza: '',
      busqueda: ''
    };
    this.aplicarFiltros();
  }

  /**
   * Calcular días de vida
   */
  calcularDiasDeVida(fechaNacimiento: Date | null): number {
    if (!fechaNacimiento) return 0;
    
    const hoy = new Date();
    const fechaNac = new Date(fechaNacimiento);
    const diffTime = Math.abs(hoy.getTime() - fechaNac.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Formatear fecha
   */
  formatearFecha(fecha: Date | null): string {
    if (!fecha) return 'No definida';
    
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Determinar etapa por edad
   */
  determinarEtapa(diasVida: number): string {
    if (diasVida <= 21) return 'Lechón';
    if (diasVida <= 60) return 'Crecimiento';
    if (diasVida <= 120) return 'Desarrollo';
    if (diasVida <= 180) return 'Engorde';
    return 'Finalización';
  }

  /**
   * Obtener color de la etapa
   */
  getColorEtapa(etapa: string): string {
    switch (etapa) {
      case 'Lechón': return 'bg-pink-100 text-pink-800';
      case 'Crecimiento': return 'bg-green-100 text-green-800';
      case 'Desarrollo': return 'bg-blue-100 text-blue-800';
      case 'Engorde': return 'bg-orange-100 text-orange-800';
      case 'Finalización': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  /**
   * Obtener estado del lote
   */
  getEstadoLote(lote: Lote): { texto: string; clase: string } {
    if (lote.quantity === 0) {
      return { texto: 'Cerrado', clase: 'bg-red-100 text-red-800' };
    } else if (lote.quantity > 0) {
      return { texto: 'Activo', clase: 'bg-green-100 text-green-800' };
    }
    return { texto: 'Inactivo', clase: 'bg-gray-100 text-gray-800' };
  }

  /**
   * Calcular progreso del ciclo productivo (estimado)
   */
  calcularProgreso(diasVida: number): number {
    const cicloCompleto = 180; // días aproximados para un ciclo de chanchos
    return Math.min(100, Math.round((diasVida / cicloCompleto) * 100));
  }

  /**
   * TrackBy para optimizar rendering
   */
  trackByLote(index: number, lote: Lote): number {
    return lote.id || index;
  }
} 