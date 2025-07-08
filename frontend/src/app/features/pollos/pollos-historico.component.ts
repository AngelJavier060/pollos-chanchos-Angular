import { Component, OnInit } from '@angular/core';
import { AuthDirectService } from '../../core/services/auth-direct.service';
import { User } from '../../shared/models/user.model';

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

@Component({
  selector: 'app-pollos-historico',
  templateUrl: './pollos-historico.component.html',
  styleUrls: ['./pollos-historico.component.scss']
})
export class PollosHistoricoComponent implements OnInit {
  user: User | null = null;
  
  // Histórico de lotes cerrados (simulación)
  lotesHistoricos: LoteHistorico[] = [
    {
      loteId: 100,
      codigo: 'POL-2024-001',
      fechaInicio: '2024-01-01',
      fechaCierre: '2024-01-15',
      motivoCierre: 'Lote agotado por ventas/mortalidad',
      animalesIniciales: 50,
      animalesVendidos: 45,
      animalesMuertos: 5,
      consumoTotalAlimento: 125.5,
      valorTotalVentas: 1350.75,
      rentabilidad: 1037.25
    },
    {
      loteId: 101,
      codigo: 'POL-2024-002',
      fechaInicio: '2024-01-10',
      fechaCierre: '2024-01-25',
      motivoCierre: 'Lote agotado por ventas/mortalidad',
      animalesIniciales: 30,
      animalesVendidos: 28,
      animalesMuertos: 2,
      consumoTotalAlimento: 78.2,
      valorTotalVentas: 840.60,
      rentabilidad: 645.10
    },
    {
      loteId: 102,
      codigo: 'POL-2024-003',
      fechaInicio: '2024-01-20',
      fechaCierre: '2024-02-05',
      motivoCierre: 'Lote agotado por ventas/mortalidad',
      animalesIniciales: 75,
      animalesVendidos: 70,
      animalesMuertos: 5,
      consumoTotalAlimento: 189.3,
      valorTotalVentas: 2100.50,
      rentabilidad: 1627.25
    }
  ];

  // Filtros y búsqueda
  busqueda = '';
  filtroFecha = '';
  filtroRentabilidad = '';
  
  // Paginación
  paginaActual = 1;
  itemsPorPagina = 10;

  constructor(private authService: AuthDirectService) {
    this.user = this.authService.currentUserValue;
  }

  ngOnInit(): void {
    this.cargarHistoricoLotes();
  }

  /**
   * Método trackBy para optimizar el renderizado de la tabla
   */
  trackByLote(index: number, lote: LoteHistorico): number {
    return lote.loteId || index;
  }

  /**
   * Cargar histórico de lotes
   */
  cargarHistoricoLotes(): void {
    // Aquí se haría la llamada al servicio
    // this.loteService.getHistoricoLotes().subscribe(...)
    
    console.log('📚 Cargando histórico de lotes:', this.lotesHistoricos.length);
  }

  /**
   * Obtener lotes filtrados
   */
  getLotesFiltrados(): LoteHistorico[] {
    let lotesFiltrados = [...this.lotesHistoricos];

    // Filtrar por búsqueda
    if (this.busqueda.trim()) {
      lotesFiltrados = lotesFiltrados.filter(lote => 
        lote.codigo.toLowerCase().includes(this.busqueda.toLowerCase()) ||
        lote.motivoCierre.toLowerCase().includes(this.busqueda.toLowerCase())
      );
    }

    // Filtrar por fecha
    if (this.filtroFecha) {
      lotesFiltrados = lotesFiltrados.filter(lote => 
        lote.fechaCierre >= this.filtroFecha
      );
    }

    // Filtrar por rentabilidad
    if (this.filtroRentabilidad) {
      lotesFiltrados = lotesFiltrados.filter(lote => {
        switch(this.filtroRentabilidad) {
          case 'alta': return lote.rentabilidad >= 1000;
          case 'media': return lote.rentabilidad >= 500 && lote.rentabilidad < 1000;
          case 'baja': return lote.rentabilidad < 500;
          default: return true;
        }
      });
    }

    return lotesFiltrados;
  }

  /**
   * Obtener lotes paginados
   */
  getLotesPaginados(): LoteHistorico[] {
    const lotesFiltrados = this.getLotesFiltrados();
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    return lotesFiltrados.slice(inicio, fin);
  }

  /**
   * Obtener número total de páginas
   */
  getTotalPaginas(): number {
    return Math.ceil(this.getLotesFiltrados().length / this.itemsPorPagina);
  }

  /**
   * Cambiar página
   */
  cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina >= 1 && nuevaPagina <= this.getTotalPaginas()) {
      this.paginaActual = nuevaPagina;
    }
  }

  /**
   * Obtener estadísticas generales
   */
  getEstadisticasGenerales() {
    const lotes = this.getLotesFiltrados();
    
    return {
      totalLotes: lotes.length,
      totalAnimalesIniciales: lotes.reduce((total, lote) => total + lote.animalesIniciales, 0),
      totalAnimalesVendidos: lotes.reduce((total, lote) => total + lote.animalesVendidos, 0),
      totalAnimalesMuertos: lotes.reduce((total, lote) => total + lote.animalesMuertos, 0),
      totalConsumoAlimento: lotes.reduce((total, lote) => total + lote.consumoTotalAlimento, 0),
      totalVentas: lotes.reduce((total, lote) => total + lote.valorTotalVentas, 0),
      rentabilidadTotal: lotes.reduce((total, lote) => total + lote.rentabilidad, 0),
      rentabilidadPromedio: lotes.length > 0 ? 
        lotes.reduce((total, lote) => total + lote.rentabilidad, 0) / lotes.length : 0,
      tasaMortalidad: lotes.reduce((total, lote) => total + lote.animalesIniciales, 0) > 0 ?
        (lotes.reduce((total, lote) => total + lote.animalesMuertos, 0) / 
         lotes.reduce((total, lote) => total + lote.animalesIniciales, 0)) * 100 : 0
    };
  }

  /**
   * Formatear fecha
   */
  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Calcular duración del lote
   */
  calcularDuracion(fechaInicio: string, fechaCierre: string): number {
    const inicio = new Date(fechaInicio);
    const cierre = new Date(fechaCierre);
    return Math.floor((cierre.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Obtener color de rentabilidad
   */
  getColorRentabilidad(rentabilidad: number): string {
    if (rentabilidad >= 1000) return 'text-green-600';
    if (rentabilidad >= 500) return 'text-yellow-600';
    return 'text-red-600';
  }

  /**
   * Obtener icono de rentabilidad
   */
  getIconoRentabilidad(rentabilidad: number): string {
    if (rentabilidad >= 1000) return 'fas fa-arrow-up';
    if (rentabilidad >= 500) return 'fas fa-minus';
    return 'fas fa-arrow-down';
  }

  /**
   * Calcular tasa de supervivencia
   */
  calcularTasaSupervivencia(animalesIniciales: number, animalesMuertos: number): number {
    if (animalesIniciales === 0) return 0;
    return ((animalesIniciales - animalesMuertos) / animalesIniciales) * 100;
  }

  /**
   * Exportar datos (placeholder)
   */
  exportarDatos(): void {
    const datos = this.getLotesFiltrados();
    console.log('📊 Exportando datos del histórico:', datos);
    alert('🎯 Función de exportación en desarrollo...');
  }

  /**
   * Limpiar filtros
   */
  limpiarFiltros(): void {
    this.busqueda = '';
    this.filtroFecha = '';
    this.filtroRentabilidad = '';
    this.paginaActual = 1;
  }
} 