import {
  AlertaGestacion,
  ChanchaGestacion,
  EstadoGestacionBadge,
  EtapaGestacion,
  StatsGestacion
} from './gestacion-chancha.interface';

export const DIAS_GESTACION_TOTAL = 114;

export const ETAPAS_GESTACION: EtapaGestacion[] = [
  { nombre: 'Confirmación', nombreCorto: 'Confirmación', dias: '1–21', diasLabel: 'Días 1-21', inicio: 1, fin: 21 },
  { nombre: 'Gestación temprana', nombreCorto: 'Temprana', dias: '22–35', diasLabel: 'Días 22-35', inicio: 22, fin: 35 },
  { nombre: 'Gestación media', nombreCorto: 'Media', dias: '36–85', diasLabel: 'Días 36-85', inicio: 36, fin: 85 },
  { nombre: 'Pre-parto', nombreCorto: 'Pre-parto', dias: '86–107', diasLabel: 'Días 86-107', inicio: 86, fin: 107 },
  { nombre: 'Parto', nombreCorto: 'Parto', dias: '108–114', diasLabel: 'Días 108-114', inicio: 108, fin: 114 }
];

export function parseFechaLocal(fechaISO: string): Date {
  const [y, m, d] = fechaISO.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function diasTranscurridos(fechaISO: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const ins = parseFechaLocal(fechaISO);
  ins.setHours(0, 0, 0, 0);
  return Math.floor((hoy.getTime() - ins.getTime()) / 86400000);
}

export function fechaPartoEstimada(fechaISO: string): Date {
  const d = parseFechaLocal(fechaISO);
  d.setDate(d.getDate() + DIAS_GESTACION_TOTAL);
  return d;
}

export function formatFechaEs(fechaISO: string): string {
  return parseFechaLocal(fechaISO).toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export function formatFechaDesdeDate(date: Date): string {
  return date.toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export function getEtapaIdx(fechaISO: string): number {
  const d = diasTranscurridos(fechaISO);
  return ETAPAS_GESTACION.findIndex(e => d >= e.inicio && d <= e.fin);
}

export function getEtapaNombre(fechaISO: string): string {
  const idx = getEtapaIdx(fechaISO);
  const d = diasTranscurridos(fechaISO);
  if (idx >= 0) return ETAPAS_GESTACION[idx].nombre;
  if (d > DIAS_GESTACION_TOTAL) return 'Completado';
  return 'Sin iniciar';
}

export function getEstadoGestacion(fechaISO: string): EstadoGestacionBadge {
  const d = diasTranscurridos(fechaISO);
  if (d < 0) return { label: 'Pendiente', cls: 'badge-gray' };
  if (d <= 21) return { label: 'Confirmación', cls: 'badge-info' };
  if (d <= 85) return { label: 'Gestando', cls: 'badge-success' };
  if (d <= 107) return { label: 'Pre-parto', cls: 'badge-warning' };
  if (d <= 114) return { label: '¡Parto próximo!', cls: 'badge-danger' };
  return { label: 'Parida', cls: 'badge-gray' };
}

export function progresoPorcentaje(fechaISO: string): number {
  return Math.min(100, Math.max(0, Math.round((diasTranscurridos(fechaISO) / DIAS_GESTACION_TOTAL) * 100)));
}

export function calcularStats(chanchas: ChanchaGestacion[]): StatsGestacion {
  return {
    total: chanchas.length,
    gestando: chanchas.filter(c => {
      const d = diasTranscurridos(c.fechaInseminacion);
      return d >= 0 && d <= DIAS_GESTACION_TOTAL;
    }).length,
    preParto: chanchas.filter(c => {
      const d = diasTranscurridos(c.fechaInseminacion);
      return d >= 86 && d <= DIAS_GESTACION_TOTAL;
    }).length,
    paridas: chanchas.filter(c => diasTranscurridos(c.fechaInseminacion) > DIAS_GESTACION_TOTAL).length
  };
}

export function calcularAlertas(chanchas: ChanchaGestacion[]): AlertaGestacion[] {
  const alertas: AlertaGestacion[] = [];
  for (const c of chanchas) {
    const d = diasTranscurridos(c.fechaInseminacion);
    if (d >= 108 && d <= DIAS_GESTACION_TOTAL) {
      alertas.push({ chancha: c, tipo: 'danger' });
    } else if (d >= 86 && d < 108) {
      alertas.push({ chancha: c, tipo: 'warning' });
    }
  }
  return alertas;
}

export function diasRestantes(fechaISO: string): number {
  return Math.max(0, DIAS_GESTACION_TOTAL - diasTranscurridos(fechaISO));
}
