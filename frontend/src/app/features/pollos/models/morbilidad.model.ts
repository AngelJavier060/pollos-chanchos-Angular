export interface RegistroMorbilidad {
  id?: number;
  loteId: string;
  loteName?: string;
  fechaRegistro: Date;
  cantidadEnfermos: number;
  enfermedad: Enfermedad;
  sintomas: string[];
  tratamiento?: Tratamiento;
  estado: EstadoEnfermedad;
  observaciones?: string;
  usuarioRegistro?: string;
  fechaRecuperacion?: Date;
  fechaMuerte?: Date;
  derivadoAMortalidad?: boolean;
  severidad: 'leve' | 'moderada' | 'grave' | 'critica';
  ubicacion?: string;
  aislado: boolean;
}

export interface Enfermedad {
  id: number;
  nombre: string;
  descripcion?: string;
  esContagiosa: boolean;
  requiereAislamiento: boolean;
  tiempoRecuperacion: number; // días
  color: string;
  sintomasComunes: string[];
}

export interface Tratamiento {
  id: number;
  nombre: string;
  descripcion: string;
  medicamento?: string;
  dosis?: string;
  duracion: number; // días
  costo?: number;
  efectividad: number; // porcentaje
}

export interface EstadoEnfermedad {
  id: number;
  nombre: string;
  descripcion: string;
  color: string;
  esTerminal: boolean;
}

export interface EstadisticasMorbilidad {
  totalEnfermos: number;
  porcentajeMorbilidad: number;
  enfermedadMasFrecuente: string;
  tendencia: 'subiendo' | 'bajando' | 'estable';
  enfermosPorDia: { fecha: string; cantidad: number }[];
  enfermosPorEnfermedad: { enfermedad: string; cantidad: number; porcentaje: number }[];
  tasaRecuperacion: number;
  tasaMortalidad: number;
}

export interface AlertaMorbilidad {
  id: number;
  tipo: 'brote' | 'aislamiento' | 'tratamiento' | 'seguimiento';
  titulo: string;
  mensaje: string;
  loteAfectado?: number;
  fechaCreacion: Date;
  leida: boolean;
  prioridad: 'alta' | 'media' | 'baja';
  accionRequerida?: string;
}

// Estados predefinidos de enfermedad
export const ESTADOS_ENFERMEDAD: EstadoEnfermedad[] = [
  {
    id: 1,
    nombre: 'En Tratamiento',
    descripcion: 'Animal recibiendo medicación',
    color: '#2563EB',
    esTerminal: false
  },
  {
    id: 2,
    nombre: 'En Observación',
    descripcion: 'Bajo monitoreo médico',
    color: '#D97706',
    esTerminal: false
  },
  {
    id: 3,
    nombre: 'Recuperándose',
    descripcion: 'Mostrando signos de mejoría',
    color: '#059669',
    esTerminal: false
  },
  {
    id: 4,
    nombre: 'Recuperado',
    descripcion: 'Sin síntomas, saludable',
    color: '#10B981',
    esTerminal: true
  },
  {
    id: 5,
    nombre: 'Empeorado',
    descripcion: 'Condición deteriorándose',
    color: '#DC2626',
    esTerminal: false
  },
  {
    id: 6,
    nombre: 'Fallecido',
    descripcion: 'Murió debido a la enfermedad',
    color: '#374151',
    esTerminal: true
  }
];

// Enfermedades comunes en pollos
export const ENFERMEDADES_COMUNES: Enfermedad[] = [
  {
    id: 1,
    nombre: 'Gripe Aviar',
    descripcion: 'Infección viral del sistema respiratorio',
    esContagiosa: true,
    requiereAislamiento: true,
    tiempoRecuperacion: 7,
    color: '#DC2626',
    sintomasComunes: ['Tos', 'Estornudos', 'Decaimiento', 'Falta de apetito', 'Secreción nasal']
  },
  {
    id: 2,
    nombre: 'Coccidiosis',
    descripcion: 'Infección parasitaria intestinal',
    esContagiosa: true,
    requiereAislamiento: false,
    tiempoRecuperacion: 5,
    color: '#7C3AED',
    sintomasComunes: ['Diarrea con sangre', 'Deshidratación', 'Pérdida de peso', 'Debilidad']
  },
  {
    id: 3,
    nombre: 'Newcastle',
    descripcion: 'Enfermedad viral altamente contagiosa',
    esContagiosa: true,
    requiereAislamiento: true,
    tiempoRecuperacion: 10,
    color: '#B91C1C',
    sintomasComunes: ['Síntomas nerviosos', 'Diarrea verde', 'Problemas respiratorios', 'Mortalidad alta']
  },
  {
    id: 4,
    nombre: 'Salmonelosis',
    descripcion: 'Infección bacteriana digestiva',
    esContagiosa: true,
    requiereAislamiento: true,
    tiempoRecuperacion: 14,
    color: '#EA580C',
    sintomasComunes: ['Diarrea amarillenta', 'Fiebre', 'Letargo', 'Deshidratación']
  },
  {
    id: 5,
    nombre: 'Estrés Térmico',
    descripcion: 'Problemas por temperaturas extremas',
    esContagiosa: false,
    requiereAislamiento: false,
    tiempoRecuperacion: 3,
    color: '#EAB308',
    sintomasComunes: ['Jadeo excesivo', 'Alas caídas', 'Búsqueda de sombra', 'Reducción del consumo']
  },
  {
    id: 6,
    nombre: 'Bronquitis Infecciosa',
    descripcion: 'Infección viral respiratoria',
    esContagiosa: true,
    requiereAislamiento: true,
    tiempoRecuperacion: 21,
    color: '#2563EB',
    sintomasComunes: ['Tos seca', 'Estertores', 'Secreción nasal', 'Reducción de postura']
  }
];

// Tratamientos disponibles
export const TRATAMIENTOS_DISPONIBLES: Tratamiento[] = [
  {
    id: 1,
    nombre: 'Antibiótico de Amplio Espectro',
    descripcion: 'Para infecciones bacterianas generales',
    medicamento: 'Enrofloxacina',
    dosis: '10mg/kg',
    duracion: 5,
    costo: 25.00,
    efectividad: 85
  },
  {
    id: 2,
    nombre: 'Antiparasitario',
    descripcion: 'Para tratar coccidiosis y otros parásitos',
    medicamento: 'Toltrazuril',
    dosis: '20mg/L agua',
    duracion: 3,
    costo: 15.00,
    efectividad: 90
  },
  {
    id: 3,
    nombre: 'Antiviral',
    descripcion: 'Para infecciones virales',
    medicamento: 'Interferón',
    dosis: '5ml/L agua',
    duracion: 7,
    costo: 45.00,
    efectividad: 70
  },
  {
    id: 4,
    nombre: 'Electrolitos',
    descripcion: 'Para rehidratación y recuperación',
    medicamento: 'Suero electrolítico',
    dosis: '2g/L agua',
    duracion: 3,
    costo: 8.00,
    efectividad: 95
  },
  {
    id: 5,
    nombre: 'Vitaminas y Minerales',
    descripcion: 'Suplemento nutricional para fortalecer defensas',
    medicamento: 'Complejo vitamínico',
    dosis: '1ml/L agua',
    duracion: 10,
    costo: 20.00,
    efectividad: 80
  }
];
