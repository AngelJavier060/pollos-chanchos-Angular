import { Component, OnInit } from '@angular/core';
import { AuthDirectService } from '../../core/services/auth-direct.service';
import { User } from '../../shared/models/user.model';

// Interface para lotes históricos
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
  selector: 'app-chanchos-historico',
  templateUrl: './chanchos-historico.component.html',
  styleUrls: ['./chanchos-historico.component.scss']
})
export class ChanchosHistoricoComponent implements OnInit {
  user: User | null = null;
  
  // Variables principales
  lotesHistoricos: LoteHistorico[] = [];
  loading = false;
  
  // Filtros
  filtroFecha = '';
  filtroMotivo = '';
  
  // Estadísticas
  estadisticas = {
    totalLotesCerrados: 0,
    totalVentas: 0,
    mortalidadPromedio: 0,
    rentabilidadPromedio: 0
  };

  constructor(private authService: AuthDirectService) {
    this.user = this.authService.currentUserValue;
  }

  ngOnInit(): void {
    this.cargarHistorico();
  }

  /**
   * Cargar datos del histórico
   */
  cargarHistorico(): void {
    this.loading = true;
    
    // TODO: Implementar llamada al backend
    // Por ahora simulamos datos
    setTimeout(() => {
      this.lotesHistoricos = [
        {
          loteId: 1,
          codigo: 'CH-001',
          fechaInicio: '2023-06-01',
          fechaCierre: '2023-12-15',
          motivoCierre: 'Ciclo completado',
          animalesIniciales: 25,
          animalesVendidos: 22,
          animalesMuertos: 3,
          consumoTotalAlimento: 1200,
          valorTotalVentas: 11000,
          rentabilidad: 8500
        },
        {
          loteId: 2,
          codigo: 'CH-002',
          fechaInicio: '2023-07-15',
          fechaCierre: '2024-01-20',
          motivoCierre: 'Venta completa',
          animalesIniciales: 30,
          animalesVendidos: 28,
          animalesMuertos: 2,
          consumoTotalAlimento: 1450,
          valorTotalVentas: 14000,
          rentabilidad: 10200
        }
      ];
      
      this.calcularEstadisticas();
      this.loading = false;
    }, 1000);
  }

  /**
   * Calcular estadísticas del histórico
   */
  calcularEstadisticas(): void {
    if (this.lotesHistoricos.length === 0) return;
    
    this.estadisticas.totalLotesCerrados = this.lotesHistoricos.length;
    this.estadisticas.totalVentas = this.lotesHistoricos.reduce((total, lote) => total + lote.valorTotalVentas, 0);
    
    const mortalidadTotal = this.lotesHistoricos.reduce((total, lote) => 
      total + (lote.animalesMuertos / lote.animalesIniciales * 100), 0);
    this.estadisticas.mortalidadPromedio = mortalidadTotal / this.lotesHistoricos.length;
    
    const rentabilidadTotal = this.lotesHistoricos.reduce((total, lote) => total + lote.rentabilidad, 0);
    this.estadisticas.rentabilidadPromedio = rentabilidadTotal / this.lotesHistoricos.length;
  }

  /**
   * Formatear fecha
   */
  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
  }

  /**
   * Calcular duración del ciclo
   */
  calcularDuracion(fechaInicio: string, fechaCierre: string): number {
    const inicio = new Date(fechaInicio);
    const cierre = new Date(fechaCierre);
    const diffTime = Math.abs(cierre.getTime() - inicio.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Obtener color de rentabilidad
   */
  getColorRentabilidad(rentabilidad: number): string {
    if (rentabilidad > 8000) return 'text-green-600';
    if (rentabilidad > 5000) return 'text-yellow-600';
    return 'text-red-600';
  }
} 