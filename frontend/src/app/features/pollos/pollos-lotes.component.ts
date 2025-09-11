import { Component, OnInit } from '@angular/core';
import { AuthDirectService } from '../../core/services/auth-direct.service';
import { User } from '../../shared/models/user.model';
import { LoteService } from '../lotes/services/lote.service';
import { Lote } from '../lotes/interfaces/lote.interface';

@Component({
  selector: 'app-pollos-lotes',
  templateUrl: './pollos-lotes.component.html',
  styleUrls: ['./pollos-dashboard.component.scss']
})
export class PollosLotesComponent implements OnInit {
  user: User | null = null;
  
  // Variables para lotes de pollos
  lotesPollos: Lote[] = [];
  lotesFiltrados: Lote[] = [];
  loading = false;
  
  // Variables para filtros y búsqueda
  filtroEstado: string = 'todos'; // todos, activos, finalizados
  filtroRaza: string = 'todos';
  terminoBusqueda: string = '';
  
  // Variables para estadísticas
  estadisticas = {
    totalLotes: 0,
    lotesActivos: 0,
    lotesFinalizados: 0,
    totalAnimales: 0,
    animalesVivos: 0,
    animalesFallecidos: 0,
    rendimientoPromedio: 0
  };

  // Opciones de filtro
  razasDisponibles: string[] = [];

  constructor(
    private authService: AuthDirectService,
    private loteService: LoteService
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
   * Aplicar filtros y búsqueda
   */
  aplicarFiltros(): void {
    let lotesFiltrados = [...this.lotesPollos];

    // Filtro por estado
    if (this.filtroEstado === 'activos') {
      lotesFiltrados = lotesFiltrados.filter(lote => lote.quantity > 0);
    } else if (this.filtroEstado === 'finalizados') {
      lotesFiltrados = lotesFiltrados.filter(lote => lote.quantity === 0);
    }

    // Filtro por raza
    if (this.filtroRaza !== 'todos') {
      lotesFiltrados = lotesFiltrados.filter(lote => 
        lote.race?.name === this.filtroRaza
      );
    }

    // Búsqueda por término
    if (this.terminoBusqueda.trim()) {
      const termino = this.terminoBusqueda.toLowerCase();
      lotesFiltrados = lotesFiltrados.filter(lote =>
        lote.codigo?.toLowerCase().includes(termino) ||
        lote.name?.toLowerCase().includes(termino) ||
        lote.race?.name?.toLowerCase().includes(termino)
      );
    }

    this.lotesFiltrados = lotesFiltrados;
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
   * Formatear fecha para mostrar
   */
  formatearFecha(fecha: Date | null): string {
    if (!fecha) return 'No definida';
    
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Obtener el estado del lote
   */
  getEstadoLote(lote: Lote): { texto: string, clase: string, icono: string } {
    if (lote.quantity > 0) {
      return {
        texto: 'Activo',
        clase: 'bg-green-100 text-green-800 border-green-200',
        icono: 'fas fa-heart'
      };
    } else {
      return {
        texto: 'Finalizado',
        clase: 'bg-gray-100 text-gray-800 border-gray-200',
        icono: 'fas fa-flag-checkered'
      };
    }
  }

  /**
   * Obtener el color de progreso según días de vida
   */
  getColorProgreso(diasVida: number): { fondo: string, barra: string } {
    if (diasVida < 14) {
      return { fondo: 'bg-yellow-100', barra: 'bg-yellow-500' };
    } else if (diasVida < 35) {
      return { fondo: 'bg-blue-100', barra: 'bg-blue-500' };
    } else if (diasVida < 50) {
      return { fondo: 'bg-green-100', barra: 'bg-green-500' };
    } else {
      return { fondo: 'bg-purple-100', barra: 'bg-purple-500' };
    }
  }

  /**
   * Calcular progreso del lote (simula el avance del ciclo productivo)
   */
  calcularProgreso(diasVida: number): number {
    // Asumiendo un ciclo productivo de 60 días
    const cicloCompleto = 60;
    return Math.min(100, Math.round((diasVida / cicloCompleto) * 100));
  }

  /**
   * Simular rendimiento del lote
   */
  simularRendimiento(lote: Lote): number {
    const diasVida = this.calcularDiasDeVida(lote.birthdate);
    // Simular rendimiento basado en días de vida y cantidad inicial vs actual
    if (diasVida === 0) return 0;
    
    // Rendimiento típico: mejor entre 21-42 días
    let rendimientoBase = 85;
    if (diasVida > 21 && diasVida < 42) {
      rendimientoBase = 92;
    } else if (diasVida > 42) {
      rendimientoBase = 88;
    }
    
    // Ajustar por mortalidad simulada
    const factorMortalidad = Math.random() * 0.05; // 0-5% variación
    return Math.max(75, Math.min(98, rendimientoBase - (factorMortalidad * 100)));
  }

  /**
   * Calcular estadísticas generales
   */
  calcularEstadisticas(): void {
    if (this.lotesPollos.length === 0) {
      this.estadisticas = {
        totalLotes: 0,
        lotesActivos: 0,
        lotesFinalizados: 0,
        totalAnimales: 0,
        animalesVivos: 0,
        animalesFallecidos: 0,
        rendimientoPromedio: 0
      };
      return;
    }

    const lotesActivos = this.lotesPollos.filter(lote => lote.quantity > 0);
    const lotesFinalizados = this.lotesPollos.filter(lote => lote.quantity === 0);
    
    this.estadisticas = {
      totalLotes: this.lotesPollos.length,
      lotesActivos: lotesActivos.length,
      lotesFinalizados: lotesFinalizados.length,
      totalAnimales: this.lotesPollos.reduce((total, lote) => total + (lote.quantity || 0), 0),
      animalesVivos: lotesActivos.reduce((total, lote) => total + lote.quantity, 0),
      animalesFallecidos: 0, // Se calcularía con datos reales
      rendimientoPromedio: this.calcularRendimientoPromedio()
    };
  }

  /**
   * Calcular rendimiento promedio
   */
  calcularRendimientoPromedio(): number {
    if (this.lotesPollos.length === 0) return 0;
    
    const rendimientos = this.lotesPollos.map(lote => this.simularRendimiento(lote));
    const suma = rendimientos.reduce((total, rendimiento) => total + rendimiento, 0);
    return Math.round(suma / rendimientos.length);
  }

  /**
   * Exportar datos (placeholder)
   */
  exportarDatos(): void {
    console.log('📊 Exportando datos de lotes...');
    alert('🚀 Funcionalidad de exportación en desarrollo');
  }

  /**
   * Ver detalles del lote (placeholder)
   */
  verDetalleLote(lote: Lote): void {
    console.log('👀 Ver detalles del lote:', lote.codigo);
    alert(`📋 Detalles del lote ${lote.codigo} - ${lote.name}`);
  }

  /**
   * Cargar datos iniciales
   */
  async cargarDatosIniciales(): Promise<void> {
    this.loading = true;
    try {
      await this.cargarLotesPollos();
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
          // Filtrar solo lotes de pollos
          this.lotesPollos = lotes.filter(lote => 
            lote.race?.animal?.name?.toLowerCase().includes('pollo') ||
            lote.race?.animal?.id === 1
          );
          
          // Obtener razas disponibles
          this.razasDisponibles = [...new Set(
            this.lotesPollos
              .map(lote => lote.race?.name)
              .filter(name => name) as string[]
          )];
          
          // Aplicar filtros iniciales
          this.aplicarFiltros();
          
          // Calcular estadísticas
          this.calcularEstadisticas();
          
          console.log('✅ Lotes de pollos cargados:', this.lotesPollos.length);
          console.log('📊 Estadísticas calculadas:', this.estadisticas);
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
   * Manejar cambios en filtros
   */
  onFiltroChange(): void {
    this.aplicarFiltros();
  }

  /**
   * Manejar cambios en búsqueda
   */
  onBusquedaChange(event: any): void {
    this.terminoBusqueda = event.target.value;
    this.aplicarFiltros();
  }

  /**
   * Limpiar filtros
   */
  limpiarFiltros(): void {
    this.filtroEstado = 'todos';
    this.filtroRaza = 'todos';
    this.terminoBusqueda = '';
    this.aplicarFiltros();
  }
} 