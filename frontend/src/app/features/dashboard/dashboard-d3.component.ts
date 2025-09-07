import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as d3 from 'd3';
import { VentasService } from '../../shared/services/ventas.service';
import { LoteService } from '../lotes/services/lote.service';

@Component({
  selector: 'app-dashboard-d3',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">Panel de Control</h1>

    <!-- Filtro de periodo -->
    <div class="bg-white border rounded p-4">
      <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div class="flex items-center gap-2 flex-wrap">
          <label class="text-sm text-gray-600">Periodo</label>
          <select [(ngModel)]="filtroPeriodo" (ngModelChange)="applyPeriod()" class="border rounded px-2 py-1">
            <option value="hoy">Hoy</option>
            <option value="ayer">Ayer</option>
            <option value="semana">Esta semana</option>
            <option value="mes">Mes</option>
            <option value="anio">Año</option>
            <option value="rango">Rango</option>
          </select>
          <input *ngIf="filtroPeriodo==='mes'" [(ngModel)]="mesSeleccion" (ngModelChange)="applyPeriod()" type="month" class="border rounded px-2 py-1" />
          <input *ngIf="filtroPeriodo==='anio'" [(ngModel)]="anioSeleccion" (ngModelChange)="applyPeriod()" type="number" min="2000" max="2100" placeholder="Año" class="w-28 border rounded px-2 py-1" />
          <input *ngIf="filtroPeriodo==='rango'" [(ngModel)]="fechaDesde" type="date" class="border rounded px-2 py-1" />
          <input *ngIf="filtroPeriodo==='rango'" [(ngModel)]="fechaHasta" type="date" class="border rounded px-2 py-1" />
          <button *ngIf="filtroPeriodo==='rango'" (click)="applyPeriod()" class="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-sm">Buscar</button>
        </div>
      </div>
    </div>

    <!-- KPIs de ventas del mes -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div class="bg-blue-50 border border-blue-100 rounded p-4">
        <div class="text-xs uppercase tracking-wide text-blue-700">Unidades vendidas (animales)</div>
        <div class="text-2xl font-bold text-blue-900">{{ totalUnidadesVendidasAnimales }}</div>
      </div>
      <div class="bg-emerald-50 border border-emerald-100 rounded p-4">
        <div class="text-xs uppercase tracking-wide text-emerald-700">Monto vendido (animales)</div>
        <div class="text-2xl font-bold text-emerald-900">{{ totalMontoVendidoAnimales | currency:'USD':'symbol-narrow' }}</div>
      </div>
      <div class="bg-amber-50 border border-amber-100 rounded p-4">
        <div class="text-xs uppercase tracking-wide text-amber-700">Lotes registrados</div>
        <div class="text-2xl font-bold text-amber-900">{{ totalLotes }}</div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="bg-white border rounded p-4">
        <h2 class="font-semibold mb-2">Tendencia diaria (unidades)</h2>
        <div #lineChart class="w-full h-64"></div>
      </div>

      <div class="bg-white border rounded p-4">
        <h2 class="font-semibold mb-2">Comparativa por día</h2>
        <div #barChart class="w-full h-64"></div>
      </div>

      <div class="bg-white border rounded p-4">
        <h2 class="font-semibold mb-2">Distribución por tipo</h2>
        <div #donutChart class="w-full h-64"></div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-white border rounded p-4">
        <h2 class="font-semibold mb-2">Registrados por tipo (inventario actual)</h2>
        <div #invChart class="w-full h-64"></div>
      </div>
      <div class="bg-white border rounded p-4">
        <h2 class="font-semibold mb-2">Gasto de compra por tipo</h2>
        <div #costChart class="w-full h-64"></div>
      </div>
    </div>
  </div>
  `
})
export class DashboardD3Component implements OnInit, OnDestroy {
  @ViewChild('lineChart', { static: true }) lineChartRef!: ElementRef<HTMLDivElement>;
  @ViewChild('barChart', { static: true }) barChartRef!: ElementRef<HTMLDivElement>;
  @ViewChild('donutChart', { static: true }) donutChartRef!: ElementRef<HTMLDivElement>;
  @ViewChild('invChart', { static: true }) invChartRef!: ElementRef<HTMLDivElement>;
  @ViewChild('costChart', { static: true }) costChartRef!: ElementRef<HTMLDivElement>;

  private resizeObserver?: ResizeObserver;

  private labels: string[] = [];
  private huevosPorDia: number[] = [];
  private animalesPorDia: number[] = [];

  // Inventario y costos
  public totalLotes = 0;
  private registrados = { pollos: 0, chanchos: 0 };
  private gastoCompra = { pollos: 0, chanchos: 0 };

  // Ventas totales del mes (animales)
  public totalUnidadesVendidasAnimales = 0;
  public totalMontoVendidoAnimales = 0;

  // Filtro de periodo
  filtroPeriodo: 'hoy'|'ayer'|'semana'|'mes'|'anio'|'rango' = 'mes';
  fechaDesde: string = '';
  fechaHasta: string = '';
  mesSeleccion: string = '';// YYYY-MM
  anioSeleccion: number | null = null;

  constructor(private ventasService: VentasService, private loteService: LoteService) {}

  ngOnInit(): void {
    // Cargar por defecto el mes actual
    this.applyPeriod();
    // Redibujar al redimensionar
    this.resizeObserver = new ResizeObserver(() => { this.drawAll(); this.drawInventoryAndCost(); });
    this.resizeObserver.observe(this.lineChartRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  private parseDay(f: any): number {
    if (Array.isArray(f) && f.length >= 3) return Number(f[2]) || 0;
    try { return Number(String(f).split('T')[0].split('-')[2]) || 0; } catch { return 0; }
  }

  private fmt(d: Date): string {
    return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
  }

  private safeDate(f:any): Date {
    try {
      if (Array.isArray(f) && f.length>=3) return new Date(Number(f[0]), Number(f[1])-1, Number(f[2]));
      const s = String(f);
      return new Date(s.split('T')[0]);
    } catch { return new Date('1970-01-01'); }
  }

  applyPeriod(): void {
    const hoy = new Date();
    let from = '';
    let to = '';
    switch (this.filtroPeriodo) {
      case 'hoy':
        from = to = this.fmt(hoy); break;
      case 'ayer': {
        const a = new Date(hoy); a.setDate(a.getDate()-1); from = to = this.fmt(a); break;
      }
      case 'semana': {
        const d = new Date(hoy);
        const day = d.getDay();
        const diff = (day === 0 ? 6 : day - 1);
        d.setDate(d.getDate()-diff);
        from = this.fmt(d); to = this.fmt(hoy); break;
      }
      case 'mes': {
        if (this.mesSeleccion) {
          const [y,m] = this.mesSeleccion.split('-').map(n=>+n);
          const d1 = new Date(y, m-1, 1);
          const d2 = new Date(y, m, 0);
          from = this.fmt(d1); to = this.fmt(d2);
        } else {
          const d1 = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
          const d2 = new Date(hoy.getFullYear(), hoy.getMonth()+1, 0);
          from = this.fmt(d1); to = this.fmt(d2);
        }
        break;
      }
      case 'anio': {
        const y = this.anioSeleccion || hoy.getFullYear();
        from = `${y}-01-01`; to = `${y}-12-31`; break;
      }
      case 'rango':
        from = this.fechaDesde || ''; to = this.fechaHasta || ''; break;
    }

    const dFrom = from ? new Date(from) : hoy;
    const dTo = to ? new Date(to) : hoy;
    const totalDays = Math.max(1, Math.floor((+dTo - +dFrom)/(1000*60*60*24)) + 1);
    this.labels = Array.from({length: totalDays}, (_,i)=>{
      const d = new Date(dFrom); d.setDate(dFrom.getDate()+i); return d.getDate().toString().padStart(2,'0');
    });
    this.huevosPorDia = Array(totalDays).fill(0);
    this.animalesPorDia = Array(totalDays).fill(0);
    this.totalUnidadesVendidasAnimales = 0;
    this.totalMontoVendidoAnimales = 0;

    // Ventas huevos
    this.ventasService.listarVentasHuevos(from || undefined, to || undefined).subscribe({
      next: data => {
        for (const v of (data || [])) {
          const fd = this.safeDate(v?.fecha);
          if (fd < dFrom || fd > dTo) continue;
          const idx = Math.floor((+fd - +dFrom)/(1000*60*60*24));
          if (idx>=0 && idx<totalDays) this.huevosPorDia[idx] += Number(v?.cantidad) || 0;
        }
        this.drawAll();
      }, error: () => this.drawAll()
    });

    // Ventas animales
    this.ventasService.listarVentasAnimales(from || undefined, to || undefined).subscribe({
      next: data => {
        for (const v of (data || [])) {
          const fd = this.safeDate(v?.fecha);
          if (fd < dFrom || fd > dTo) continue;
          const idx = Math.floor((+fd - +dFrom)/(1000*60*60*24));
          if (idx>=0 && idx<totalDays) this.animalesPorDia[idx] += Number(v?.cantidad) || 0;
          this.totalUnidadesVendidasAnimales += Number(v?.cantidad) || 0;
          this.totalMontoVendidoAnimales += Number(v?.total) || (Number(v?.cantidad)||0) * (Number(v?.precioUnit)||0);
        }
        this.drawAll();
      }, error: () => this.drawAll()
    });

    // Inventario y costos (por birthdate dentro del rango)
    this.loteService.getLotes().subscribe({
      next: lotes => {
        this.totalLotes = (lotes || []).length;
        this.registrados = { pollos: 0, chanchos: 0 };
        this.gastoCompra = { pollos: 0, chanchos: 0 };
        (lotes || []).forEach(l => {
          const bd = (l.birthdate instanceof Date) ? l.birthdate : (l.birthdate ? new Date(l.birthdate) : null);
          if (bd && (bd < dFrom || bd > dTo)) return;
          const animal = (l.race?.animal?.name || '').toLowerCase();
          const qty = Number(l.quantity) || 0;
          const cost = Number(l.cost) || 0;
          if (animal.includes('pollo') || animal.includes('ave') || animal.includes('gallina')) {
            this.registrados.pollos += qty;
            this.gastoCompra.pollos += cost;
          } else if (animal.includes('cerdo') || animal.includes('chancho') || animal.includes('puerco') || animal === 'duroc') {
            this.registrados.chanchos += qty;
            this.gastoCompra.chanchos += cost;
          }
        });
        this.drawInventoryAndCost();
      }, error: () => this.drawInventoryAndCost()
    });
  }

  private drawAll(): void {
    this.drawLine();
    this.drawBars();
    this.drawDonut();
  }

  private clear(el: HTMLElement) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  private drawLine(): void {
    const host = this.lineChartRef.nativeElement;
    this.clear(host);

    const width = host.clientWidth || 300;
    const height = host.clientHeight || 240;
    const margin = { top: 10, right: 16, bottom: 28, left: 36 };

    const svg = d3.select(host).append('svg')
      .attr('width', width)
      .attr('height', height);

    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scalePoint<string>()
      .domain(this.labels)
      .range([0, innerW]);

    const allValues = this.huevosPorDia.map((v,i)=>({d:this.labels[i],v})).concat(
      this.animalesPorDia.map((v,i)=>({d:this.labels[i],v}))
    );
    const maxY = d3.max(allValues, d => d.v) ?? 0;
    const y = d3.scaleLinear().domain([0, maxY * 1.2 + 1]).nice().range([innerH, 0]);

    const line = d3.line<number>()
      .x((_, i) => x(this.labels[i]) ?? 0)
      .y((d) => y(d))
      .curve(d3.curveMonotoneX);

    // Ejes
    g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x).tickValues(this.labels.filter((_,i)=> (i%Math.ceil(this.labels.length/10))===0)));
    g.append('g').call(d3.axisLeft(y));

    // Linea huevos
    g.append('path')
      .datum(this.huevosPorDia)
      .attr('fill', 'none')
      .attr('stroke', '#2563eb')
      .attr('stroke-width', 2)
      .attr('d', line);

    // Linea animales
    g.append('path')
      .datum(this.animalesPorDia)
      .attr('fill', 'none')
      .attr('stroke', '#16a34a')
      .attr('stroke-width', 2)
      .attr('d', line);

    // Interactividad simple: tooltip
    const tooltip = d3.select(host)
      .append('div')
      .style('position', 'absolute')
      .style('pointer-events', 'none')
      .style('background', 'rgba(0,0,0,0.7)')
      .style('color', '#fff')
      .style('padding', '4px 8px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('display', 'none');

    const points = [
      { data: this.huevosPorDia, color: '#2563eb', name: 'Huevos' },
      { data: this.animalesPorDia, color: '#16a34a', name: 'Animales' }
    ];

    points.forEach(p => {
      g.selectAll(`.pt-${p.name}`)
        .data(p.data)
        .enter()
        .append('circle')
        .attr('cx', (_, i) => x(this.labels[i]) ?? 0)
        .attr('cy', d => y(d))
        .attr('r', 3)
        .attr('fill', p.color)
        .on('mouseenter', (event, d) => {
          tooltip.style('display', 'block').text(`${p.name}: ${d}`);
        })
        .on('mousemove', (event) => {
          tooltip.style('left', (event.offsetX + 10) + 'px').style('top', (event.offsetY - 10) + 'px');
        })
        .on('mouseleave', () => tooltip.style('display', 'none'));
    });
  }

  private drawBars(): void {
    const host = this.barChartRef.nativeElement;
    this.clear(host);

    const width = host.clientWidth || 300;
    const height = host.clientHeight || 240;
    const margin = { top: 10, right: 16, bottom: 28, left: 36 };

    const svg = d3.select(host).append('svg')
      .attr('width', width)
      .attr('height', height);

    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand<string>().domain(this.labels).range([0, innerW]).padding(0.2);
    const y = d3.scaleLinear().domain([0, d3.max([...this.huevosPorDia, ...this.animalesPorDia])! * 1.2 + 1]).nice().range([innerH, 0]);

    g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x).tickValues(this.labels.filter((_,i)=> (i%Math.ceil(this.labels.length/10))===0)));
    g.append('g').call(d3.axisLeft(y));

    const groupWidth = x.bandwidth();
    const barW = groupWidth/2;

    // Huevos
    g.selectAll('.bar-h')
      .data(this.huevosPorDia)
      .enter()
      .append('rect')
      .attr('x', (_, i) => (x(this.labels[i]) ?? 0))
      .attr('y', d => y(d))
      .attr('width', barW)
      .attr('height', d => innerH - y(d))
      .attr('fill', '#60a5fa')
      .append('title').text(d => String(d));

    // Animales
    g.selectAll('.bar-a')
      .data(this.animalesPorDia)
      .enter()
      .append('rect')
      .attr('x', (_, i) => (x(this.labels[i]) ?? 0) + barW)
      .attr('y', d => y(d))
      .attr('width', barW)
      .attr('height', d => innerH - y(d))
      .attr('fill', '#86efac')
      .append('title').text(d => String(d));
  }

  private drawDonut(): void {
    const host = this.donutChartRef.nativeElement;
    this.clear(host);

    const width = host.clientWidth || 300;
    const height = host.clientHeight || 240;
    const radius = Math.min(width, height) / 2 - 10;

    const svg = d3.select(host).append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width/2},${height/2})`);

    const totals = [
      { name: 'Huevos', value: d3.sum(this.huevosPorDia) },
      { name: 'Animales', value: d3.sum(this.animalesPorDia) }
    ];

    const color = d3.scaleOrdinal<string>().domain(totals.map(d => d.name)).range(['#3b82f6', '#22c55e']);

    const pie = d3.pie<{name:string; value:number}>().value(d => d.value).sort(null);
    const arc = d3.arc<d3.PieArcDatum<{name:string; value:number}>>().innerRadius(radius*0.6).outerRadius(radius);

    const arcs = svg.selectAll('path')
      .data(pie(totals))
      .enter()
      .append('path')
      .attr('d', arc as any)
      .attr('fill', d => color(d.data.name) as string)
      .append('title').text(d => `${d.data.name}: ${d.data.value}`);
  }

  private drawInventoryAndCost(): void {
    this.drawInventoryBar();
    this.drawCostDonut();
  }

  private drawInventoryBar(): void {
    const host = this.invChartRef.nativeElement;
    this.clear(host);
    const width = host.clientWidth || 300;
    const height = host.clientHeight || 240;
    const margin = { top: 10, right: 16, bottom: 28, left: 40 };
    const svg = d3.select(host).append('svg').attr('width', width).attr('height', height);
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const data = [
      { name: 'Pollos', value: this.registrados.pollos, color: '#3b82f6' },
      { name: 'Chanchos', value: this.registrados.chanchos, color: '#22c55e' }
    ];
    const x = d3.scaleBand<string>().domain(data.map(d => d.name)).range([0, innerW]).padding(0.3);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.value)! * 1.2 + 1]).nice().range([innerH, 0]);
    g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x));
    g.append('g').call(d3.axisLeft(y));
    g.selectAll('.bar-inv').data(data).enter().append('rect')
      .attr('x', d => x(d.name)!)
      .attr('y', d => y(d.value))
      .attr('width', x.bandwidth())
      .attr('height', d => innerH - y(d.value))
      .attr('fill', d => d.color)
      .append('title').text(d => String(d.value));
  }

  private drawCostDonut(): void {
    const host = this.costChartRef.nativeElement;
    this.clear(host);
    const width = host.clientWidth || 300;
    const height = host.clientHeight || 240;
    const radius = Math.min(width, height) / 2 - 10;
    const svg = d3.select(host).append('svg').attr('width', width).attr('height', height)
      .append('g').attr('transform', `translate(${width/2},${height/2})`);
    const data = [
      { name: 'Pollos', value: this.gastoCompra.pollos },
      { name: 'Chanchos', value: this.gastoCompra.chanchos }
    ];
    const color = d3.scaleOrdinal<string>().domain(data.map(d => d.name)).range(['#60a5fa', '#86efac']);
    const pie = d3.pie<{name:string; value:number}>().value(d => d.value).sort(null);
    const arc = d3.arc<d3.PieArcDatum<{name:string; value:number}>>().innerRadius(radius*0.6).outerRadius(radius);
    svg.selectAll('path').data(pie(data)).enter().append('path')
      .attr('d', arc as any)
      .attr('fill', d => color(d.data.name) as string)
      .append('title').text(d => `${d.data.name}: ${d.data.value.toLocaleString('en-US',{style:'currency',currency:'USD'})}`);
  }
}
