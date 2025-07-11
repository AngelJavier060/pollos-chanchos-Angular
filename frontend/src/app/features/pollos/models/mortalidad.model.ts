export interface RegistroMortalidad {
  id?: number;
  loteId: number;
  loteName?: string;
  fechaRegistro: Date;
  cantidadMuertos: number;
  causa: CausaMortalidad;
  observaciones?: string;
  usuarioRegistro?: string;
  peso?: number;
  edad: number;
  tratamientoPrevio?: string;
  ubicacion?: string;
  confirmado: boolean;
}

export interface CausaMortalidad {
  id: number;
  nombre: string;
  descripcion?: string;
  esContagiosa: boolean;
  requiereAislamiento: boolean;
  color: string;
}

export interface EstadisticasMortalidad {
  totalMuertes: number;
  porcentajeMortalidad: number;
  causaMasFrecuente: string;
  tendencia: 'subiendo' | 'bajando' | 'estable';
  muertesPorDia: { fecha: string; cantidad: number }[];
  muertesPorCausa: { causa: string; cantidad: number; porcentaje: number }[];
}

export interface AlertaMortalidad {
  id: number;
  tipo: 'critica' | 'advertencia' | 'informativa';
  titulo: string;
  mensaje: string;
  loteAfectado?: number;
  fechaCreacion: Date;
  leida: boolean;
  accionRequerida?: string;
}

// Causas predefinidas comunes
export const CAUSAS_MORTALIDAD: CausaMortalidad[] = [
  {
    id: 1,
    nombre: 'Enfermedad Respiratoria',
    descripcion: 'Problemas del sistema respiratorio',
    esContagiosa: true,
    requiereAislamiento: true,
    color: '#DC2626'
  },
  {
    id: 2,
    nombre: 'Problemas Digestivos',
    descripcion: 'Diarrea, problemas intestinales',
    esContagiosa: false,
    requiereAislamiento: false,
    color: '#D97706'
  },
  {
    id: 3,
    nombre: 'Estrés por Calor',
    descripcion: 'Muerte por altas temperaturas',
    esContagiosa: false,
    requiereAislamiento: false,
    color: '#EAB308'
  },
  {
    id: 4,
    nombre: 'Parasitosis',
    descripcion: 'Infestación parasitaria',
    esContagiosa: true,
    requiereAislamiento: true,
    color: '#7C3AED'
  },
  {
    id: 5,
    nombre: 'Lesiones/Trauma',
    descripcion: 'Heridas, fracturas, peleas',
    esContagiosa: false,
    requiereAislamiento: false,
    color: '#059669'
  },
  {
    id: 6,
    nombre: 'Causa Desconocida',
    descripcion: 'Sin causa aparente identificada',
    esContagiosa: false,
    requiereAislamiento: false,
    color: '#6B7280'
  }
];
