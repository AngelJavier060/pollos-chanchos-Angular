import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgChartsModule, ChartConfiguration, ChartOptions } from 'ng2-charts';
import { VentasService } from '../../shared/services/ventas.service';

@Component({
  selector: 'app-dashboard-charts',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  template: `
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">Panel de Control</h1>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="bg-white border rounded p-4">
        <h2 class="font-semibold mb-2">Tendencia diaria (unidades)</h2>
        <canvas baseChart
          [data]="lineChartData"
          [options]="lineChartOptions"
          [type]="'line'">
        </canvas>
      </div>

      <div class="bg-white border rounded p-4">
        <h2 class="font-semibold mb-2">Comparativa por día</h2>
        <canvas baseChart
          [data]="barChartData"
          [options]="barChartOptions"
          [type]="'bar'">
        </canvas>
      </div>

      <div class="bg-white border rounded p-4">
        <h2 class="font-semibold mb-2">Distribución por tipo</h2>
        <canvas baseChart
          [data]="doughnutChartData"
          [options]="doughnutChartOptions"
          [type]="'doughnut'">
        </canvas>
      </div>
    </div>
  </div>
  `
})
export class DashboardChartsComponent implements OnInit {
  // Datos agregados
  private days: string[] = [];
  private huevosPorDia: number[] = [];
  private animalesPorDia: number[] = [];

  // Line chart (total por día)
  public lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [
      { data: [], label: 'Huevos', borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.2)', tension: 0.3, fill: 'origin' },
      { data: [], label: 'Animales', borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,0.2)', tension: 0.3, fill: 'origin' }
    ]
  };
  public lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    plugins: { legend: { position: 'bottom' } },
    scales: { y: { beginAtZero: true } }
  };

  // Bar chart (comparativa)
  public barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [
      { data: [], label: 'Huevos', backgroundColor: 'rgba(37,99,235,0.6)' },
      { data: [], label: 'Animales', backgroundColor: 'rgba(22,163,74,0.6)' }
    ]
  };
  public barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: { legend: { position: 'bottom' } },
    scales: { y: { beginAtZero: true } }
  };

  // Doughnut (distribución total)
  public doughnutChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: ['Huevos', 'Animales'],
    datasets: [
      { data: [0, 0], backgroundColor: ['#60a5fa', '#86efac'], hoverBackgroundColor: ['#3b82f6', '#22c55e'] }
    ]
  };
  public doughnutChartOptions: ChartOptions<'doughnut'> = { responsive: true, plugins: { legend: { position: 'bottom' } } };

  constructor(private ventasService: VentasService) {}

  ngOnInit(): void {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-based
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);

    const fmt = (d: Date) => `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

    const from = fmt(start);
    const to = fmt(end);

    const totalDays = end.getDate();
    this.days = Array.from({ length: totalDays }, (_, i) => (i + 1).toString().padStart(2, '0'));
    this.huevosPorDia = Array(totalDays).fill(0);
    this.animalesPorDia = Array(totalDays).fill(0);

    // Cargar ventas de huevos
    this.ventasService.listarVentasHuevos(from, to).subscribe({
      next: data => {
        for (const v of (data || [])) {
          const d = this.parseDay(v.fecha);
          if (d >= 1 && d <= totalDays) this.huevosPorDia[d - 1] += Number(v.cantidad) || 0;
        }
        this.refreshCharts();
      },
      error: () => { this.refreshCharts(); }
    });

    // Cargar ventas de animales
    this.ventasService.listarVentasAnimales(from, to).subscribe({
      next: data => {
        for (const v of (data || [])) {
          const d = this.parseDay(v.fecha);
          if (d >= 1 && d <= totalDays) this.animalesPorDia[d - 1] += Number(v.cantidad) || 0;
        }
        this.refreshCharts();
      },
      error: () => { this.refreshCharts(); }
    });
  }

  private parseDay(f: any): number {
    // Acepta array [yyyy,mm,dd] o string 'yyyy-MM-dd'
    if (Array.isArray(f) && f.length >= 3) return Number(f[2]) || 0;
    try { return Number(String(f).split('T')[0].split('-')[2]) || 0; } catch { return 0; }
  }

  private refreshCharts(): void {
    const totalHuevos = this.huevosPorDia.reduce((a, b) => a + b, 0);
    const totalAnimales = this.animalesPorDia.reduce((a, b) => a + b, 0);

    this.lineChartData = {
      labels: this.days,
      datasets: [
        { data: [...this.huevosPorDia], label: 'Huevos', borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.2)', tension: 0.3, fill: 'origin' },
        { data: [...this.animalesPorDia], label: 'Animales', borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,0.2)', tension: 0.3, fill: 'origin' }
      ]
    };

    this.barChartData = {
      labels: this.days,
      datasets: [
        { data: [...this.huevosPorDia], label: 'Huevos', backgroundColor: 'rgba(37,99,235,0.6)' },
        { data: [...this.animalesPorDia], label: 'Animales', backgroundColor: 'rgba(22,163,74,0.6)' }
      ]
    };

    this.doughnutChartData = {
      labels: ['Huevos', 'Animales'],
      datasets: [ { data: [totalHuevos, totalAnimales], backgroundColor: ['#60a5fa', '#86efac'], hoverBackgroundColor: ['#3b82f6', '#22c55e'] } ]
    };
  }
}
