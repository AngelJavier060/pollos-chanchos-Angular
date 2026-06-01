import { Lote } from '../../features/lotes/interfaces/lote.interface';
import { ChanchaGestacion } from './gestacion-chancha.interface';

export interface OpcionChanchaLote {
  numero: number;
  etiqueta: string;
  disponible: boolean;
  motivoNoDisponible?: string;
}

export function esLoteChancho(lote: Lote): boolean {
  const n = (lote.race?.animal?.name || '').toLowerCase();
  return (
    n.includes('chancho') ||
    n.includes('cerdo') ||
    n.includes('porc') ||
    lote.race?.animal?.id === 2
  );
}

/** Lote activo de chanchos apto para gestación (hay animales vivos en el lote). */
export function esLoteElegibleGestacion(lote: Lote): boolean {
  if (!esLoteChancho(lote)) return false;
  if ((lote.quantity ?? 0) <= 0) return false;
  if (lote.fechaCierre) return false;
  const hembras = lote.femaleCount ?? 0;
  const proposito = (lote.femalePurpose || '').toLowerCase();
  if (hembras > 0) return true;
  if (proposito.includes('reproduc')) return true;
  return (lote.quantity ?? 0) > 0;
}

/**
 * Hembras vivas estimadas: no más que femaleCount ni que quantity del lote.
 * Si el lote vende o muere animales, quantity baja y se reducen cupos seleccionables.
 */
export function hembrasVivasEnLote(lote: Lote): number {
  const cantidadViva = Math.max(0, Number(lote.quantity) || 0);
  const hembrasRegistradas = Math.max(0, Number(lote.femaleCount) || 0);
  if (hembrasRegistradas > 0) {
    return Math.min(hembrasRegistradas, cantidadViva);
  }
  return cantidadViva;
}

/** Total de cupos definidos en el lote (hembras registradas al crear el lote). */
export function cuposHembrasLote(lote: Lote): number {
  const hembras = Math.max(0, Number(lote.femaleCount) || 0);
  if (hembras > 0) return hembras;
  return hembrasVivasEnLote(lote);
}

/** Nombre visible de la chancha: Chancha-01, Chancha-02… (sin prefijo de lote). */
export function nombreChancha(numero: number): string {
  return `Chancha-${String(numero).padStart(2, '0')}`;
}

/** @deprecated Usar nombreChancha — alias para listas internas */
export function etiquetaChancha(numero: number): string {
  return nombreChancha(numero);
}

/** Texto visible del lote: prioriza el nombre que ingresó el usuario (ej. Lote001), no el código interno (ej. 03001). */
export function etiquetaLote(lote: Lote): string {
  const nom = (lote.name || '').trim();
  if (nom) return nom;
  return (lote.codigo || '').trim() || 'Sin nombre';
}

function ocupaCupo(
  registro: ChanchaGestacion,
  loteId: string,
  numero: number,
  excluirRegistroId?: string | null
): boolean {
  if (excluirRegistroId && registro.id === excluirRegistroId) return false;
  if (registro.loteId !== loteId || registro.numeroEnLote !== numero) return false;
  return registro.activa !== false;
}

export function construirOpcionesChancha(
  lote: Lote,
  registros: ChanchaGestacion[],
  excluirRegistroId?: string | null
): OpcionChanchaLote[] {
  const cupos = cuposHembrasLote(lote);
  const vivas = hembrasVivasEnLote(lote);
  const opciones: OpcionChanchaLote[] = [];

  for (let n = 1; n <= cupos; n++) {
    const etiqueta = etiquetaChancha(n);
    let disponible = true;
    let motivoNoDisponible: string | undefined;

    if (n > vivas) {
      disponible = false;
      motivoNoDisponible = 'No disponible (baja, vendida o lote sin hembras vivas)';
    } else if (registros.some(r => ocupaCupo(r, lote.id!, n, excluirRegistroId))) {
      disponible = false;
      motivoNoDisponible = 'Ya registrada en gestación';
    }

    opciones.push({ numero: n, etiqueta, disponible, motivoNoDisponible });
  }

  return opciones;
}

export function resolverNombreChancha(_lote: Lote | undefined, numero: number): string {
  return nombreChancha(numero);
}
