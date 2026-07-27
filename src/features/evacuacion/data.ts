import { PlanEvacuacion } from '@definition/evacuacion';

/**
 * Paleta de colores del Plan de Evacuación.
 * Se comparte entre la vista 2D (SVG) y la vista 3D (Three.js).
 */
export const COLORES = {
  // Tema Clean Apple / Architectural Clay (Light Mode)
  emergencia: '#EF4444',
  zonaA: '#3B82F6', // Azul claro/premium
  zonaB: '#F59E0B', // Ambar premium
  extintor: '#EF4444',
  ruta: '#10B981', // Verde esmeralda suave
  fondo2D: '#F8FAFC', // Slate 50
  pared3D: '#FFFFFF', // Blanco puro
  suelo3D: '#F1F5F9', // Slate 100
} as const;

/**
 * Plan de Evacuación del Salón del Reino — Congregación Elda Centro.
 *
 * TEXTO LITERAL del documento oficial (PDF de 27-3-2025). No se resume ni se
 * reescribe: ver el aviso en @definition/evacuacion.
 */
export const PLAN_EVACUACION: PlanEvacuacion = {
  updatedAt: '2026-07-27T00:00:00.000Z',
  anio: '2025',
  fechaDocumento: '27-3-2025',
  direccion: 'C. Hernán Cortés, 6, 03600 Elda, Alicante',
  tiempoMaximo: 4,
  estructuraMando: [
    {
      rol: 'Jefe de Emergencias',
      nombre: 'Fermín Amorós',
      responsabilidades: [
        'Supervisión y análisis del protocolo y del equipo físico-humano',
        'Aviso por micrófono para la evacuación (de acuerdo con el coordinador del Cuerpo de Ancianos)',
        'Aviso a los servicios de emergencias',
      ],
    },
    {
      rol: 'Auxiliar de Emergencias',
      nombre: 'César Amorós',
      responsabilidades: [
        'Sustitución del Jefe de Emergencias en caso de ausencia.',
        'Sustitución, en caso de ausencia, de uno de los Jefes de Evacuación.',
        'Redactar informe de los simulacros y cada vez que actúe el equipo.',
      ],
    },
    {
      rol: 'Jefe de Intervención',
      nombre: 'Andrés Rico D.',
      responsabilidades: [],
    },
    {
      rol: 'Auxiliar de Intervención',
      nombre: 'Federico Ortega',
      responsabilidades: [],
    },
  ],
  procedimientoIntervencion: {
    aviso: 'Este protocolo sólo se activará en casos necesarios',
    pasos: [
      'Desconexión eléctrica del aparato o desconexión total de la corriente eléctrica.',
      'Búsqueda y neutralización del peligro. Extinción del posible fuego* (extintores 1 a 5)',
      'Análisis de la situación y comunicación al jefe de emergencias.',
    ],
    nota: '* En caso necesario.',
  },
  equipos: [
    {
      id: 'evacuacion-a',
      nombre: 'Equipo de Evacuación A',
      color: COLORES.zonaA,
      zona: 'A',
      miembros: [
        { posicion: 'A1', nombre: 'Jonathan Izquierdo', esResponsable: true },
        { posicion: 'A2', nombre: 'Samuel Lázaro' },
        { posicion: 'A3', nombre: 'Alejandro Amorós' },
      ],
      procedimiento: [
        'Se desaloja comenzando por la sala B y siguiendo por el auditorio principal desde la última fila.',
        'Responsable verifica los aseos.',
      ],
    },
    {
      id: 'evacuacion-b',
      nombre: 'Equipo de Evacuación B',
      color: COLORES.zonaB,
      zona: 'B',
      miembros: [
        { posicion: 'B1', nombre: 'Rubén Santiago', esResponsable: true },
        { posicion: 'B2', nombre: 'Pablo Albertos' },
        { posicion: 'B3', nombre: 'Carlos Saca Jr.' },
      ],
      procedimiento: [
        'Se comienza con la sección del auditorio a la izquierda de la plataforma desde delante hacia atrás.',
        'Se sigue con auditorio principal desde plataforma hasta la tercera fila.',
      ],
    },
    {
      id: 'sanitario',
      nombre: 'Equipo Sanitario',
      color: COLORES.emergencia,
      miembros: [{ nombre: 'Carlos Saca M.' }, { nombre: 'Marcos Bochenek' }],
      procedimiento: [
        'Atención y evacuación de heridos.',
        'Comunicar al Jefe de Emergencias la necesidad de avisar a servicios sanitarios.',
        'Solicitar a los Jefes de Evacuación si uno de los evacuados necesita asistencia especial.',
        'Custodia del botiquín de emergencias.',
      ],
    },
  ],
  normasEquipos: [
    'Cada miembro debe ocupar su puesto tan pronto se dé la señal para la evacuación.',
    'Cada miembro deberá de llevar y utilizar una pequeña linterna.',
  ],
  reglasEspeciales: [
    'En caso de que la puerta principal esté bloqueada, se verificarán los aseos, se cerrará la puerta de acceso al auditorio y se procederá al desalojo de la zona B en primer lugar. A continuación el equipo A hará el desalojo de su zona sin intervenir los encargados de las puertas y con la salvedad del encargado de la sala B, que sólo evacua dicha sala.',
    'En caso de que la salida de emergencia esté bloqueada, se hará el desalojo de la zona A primero y luego el equipo B desalojará su zona sin intervenir tráfico ni puerta y el orden será: 1º rincón 2ª plataforma hacia atrás.',
    'Se ha de impedir la entrada en el Salón de nuevo (responsables de evacuación).',
    'A medida de que cada uno acaba su cometido, debe abandonar el Salón.',
    'Todos los responsables han de asegurarse de que cada miembro está en su puesto.',
    'El tiempo máximo para la evacuación será de 4 minutos.',
  ],
  extintores: [
    { id: 1, tipo: 'Polvo ABC' },
    { id: 2, tipo: 'Polvo ABC' },
    { id: 3, tipo: 'Polvo ABC' },
    { id: 4, tipo: 'Polvo ABC' },
    { id: 5, tipo: 'Polvo ABC' },
    { id: 6, tipo: 'CO\u2082' },
  ],
};

/**
 * Geometría compartida del plano del salón (coordenadas lógicas).
 * El SVG 2D y la escena 3D derivan sus posiciones de estos valores
 * para mantener la coherencia espacial entre ambas vistas.
 */
export type ZonaGeo = {
  id: string;
  equipoId: string;
  label: string;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type ExtintorGeo = {
  id: number;
  x: number;
  y: number;
  esCO2: boolean;
};

export type PilarGeo = { id: string; x: number; y: number; w: number; h: number };

export const SALON = {
  width: 180,
  height: 78.65,
};

export const SALON_OUTLINE = [
  [0.00, 0.00],
  [94.46, 0.00],
  [94.46, 1.62],
  [100.46, 1.62],
  [100.46, 0.00],
  [180.00, 0.00],
  [180.00, 78.65],
  [92.17, 78.65],
  [92.17, 65.27],
  [71.33, 65.27],
  [71.33, 63.20],
  [0.00, 63.20],
  [0.00, 0.00],
];

export const PILARES: PilarGeo[] = [
  { id: 'p1', x: 94.46, y: 35.18, w: 6.00, h: 5.38 },
  { id: 'p2', x: 143.30, y: 35.18, w: 6.00, h: 5.38 },
  { id: 'p3', x: 50.29, y: 34.40, w: 6.00, h: 6.34 },
  { id: 'p4', x: 15.92, y: 34.40, w: 6.00, h: 6.34 },
];

export const PAREDES_INTERNAS = [
  { x: 24.55, y: 11.73, w: 8.40, h: 9.72 },
  { x: 0.07, y: 34.40, w: 15.73, h: 6.34 },
  { x: 15.92, y: -0.01, w: 17.28, h: 21.71 },
  { x: 0.00, y: 0.00, w: 15.92, h: 40.74 },
  { x: 71.46, y: 61.27, w: 15.26, h: 3.86 },
  { x: 92.76, y: 65.13, w: 3.86, h: 12.77 },
  { x: 33.46, y: 34.17, w: 15.57, h: 6.79 },
  { x: 138.34, y: 0.10, w: 4.96, h: 5.38 },
  { x: 17.74, y: 40.88, w: 1.98, h: 11.05 },
  { x: 19.72, y: 40.88, w: 1.98, h: 11.05 },
];

export const SALA_B_WALL = [
  [49.11, 0.12],
  [49.11, 34.07],
  [56.50, 34.07],
  [56.50, 40.74],
  [60.68, 40.74],
  [60.68, 41.33],
];

export const ZONAS: ZonaGeo[] = [
  {
    id: 'zona-a',
    equipoId: 'evacuacion-a',
    label: 'Zona A',
    color: COLORES.zonaA,
    x: 0,
    y: 0,
    w: 99,
    h: 63.2,
  },
  {
    id: 'zona-b',
    equipoId: 'evacuacion-b',
    label: 'Zona B',
    color: COLORES.zonaB,
    x: 99,
    y: 0,
    w: 81,
    h: 78.65,
  },
];

export const EXTINTORES_GEO: ExtintorGeo[] = [
  { id: 1, x: 10.01, y: 41.44, esCO2: false },
  { id: 2, x: 17.31, y: 32.79, esCO2: false },
  { id: 3, x: 62.26, y: 61.86, esCO2: false },
  { id: 4, x: 69.35, y: 34.63, esCO2: false },
  { id: 5, x: 177.99, y: 52.41, esCO2: false },
  { id: 6, x: 9.40, y: 36.44, esCO2: true },
];

export const PUERTAS = [
  { id: 'salida-a', x: 0, y: 52.6, lado: 'izquierda' as const },
  { id: 'salida-b', x: 180, y: 50.15, lado: 'derecha' as const },
];

export const ASIENTOS = [
  { x: 51.14, y: 4.10 },
  { x: 57.95, y: 4.10 },
  { x: 73.15, y: 6.86 },
  { x: 81.28, y: 6.86 },
  { x: 89.41, y: 6.86 },
  { x: 97.55, y: 6.86 },
  { x: 105.68, y: 6.86 },
  { x: 113.81, y: 6.86 },
  { x: 121.94, y: 6.86 },
  { x: 130.07, y: 6.86 },
  { x: 51.14, y: 8.09 },
  { x: 57.95, y: 8.09 },
  { x: 73.15, y: 10.84 },
  { x: 81.28, y: 10.84 },
  { x: 89.41, y: 10.84 },
  { x: 97.55, y: 10.84 },
  { x: 105.68, y: 10.84 },
  { x: 113.81, y: 10.84 },
  { x: 121.94, y: 10.84 },
  { x: 130.07, y: 10.84 },
  { x: 138.21, y: 10.84 },
  { x: 51.14, y: 12.07 },
  { x: 57.95, y: 12.07 },
  { x: 73.15, y: 14.83 },
  { x: 81.28, y: 14.83 },
  { x: 89.41, y: 14.83 },
  { x: 97.55, y: 14.83 },
  { x: 105.68, y: 14.83 },
  { x: 113.81, y: 14.83 },
  { x: 121.94, y: 14.83 },
  { x: 130.07, y: 14.83 },
  { x: 138.21, y: 14.83 },
  { x: 51.14, y: 16.05 },
  { x: 57.95, y: 16.05 },
  { x: 73.15, y: 18.81 },
  { x: 81.28, y: 18.81 },
  { x: 89.41, y: 18.81 },
  { x: 97.55, y: 18.81 },
  { x: 105.68, y: 18.81 },
  { x: 113.81, y: 18.81 },
  { x: 121.94, y: 18.81 },
  { x: 130.07, y: 18.81 },
  { x: 138.21, y: 18.81 },
  { x: 51.14, y: 20.03 },
  { x: 57.95, y: 20.03 },
  { x: 73.15, y: 22.79 },
  { x: 81.28, y: 22.79 },
  { x: 89.41, y: 22.79 },
  { x: 97.55, y: 22.79 },
  { x: 105.68, y: 22.79 },
  { x: 113.81, y: 22.79 },
  { x: 121.94, y: 22.79 },
  { x: 130.07, y: 22.79 },
  { x: 138.21, y: 22.79 },
  { x: 51.14, y: 24.02 },
  { x: 57.95, y: 24.02 },
  { x: 73.15, y: 26.77 },
  { x: 81.28, y: 26.77 },
  { x: 89.41, y: 26.77 },
  { x: 97.55, y: 26.77 },
  { x: 105.68, y: 26.77 },
  { x: 113.81, y: 26.77 },
  { x: 121.94, y: 26.77 },
  { x: 130.07, y: 26.77 },
  { x: 138.21, y: 26.77 },
  { x: 51.14, y: 28.00 },
  { x: 73.15, y: 30.76 },
  { x: 81.28, y: 30.76 },
  { x: 89.41, y: 30.76 },
  { x: 97.55, y: 30.76 },
  { x: 105.68, y: 30.76 },
  { x: 113.81, y: 30.76 },
  { x: 121.94, y: 30.76 },
  { x: 130.07, y: 30.76 },
  { x: 138.21, y: 30.76 },
  { x: 73.15, y: 34.74 },
  { x: 81.28, y: 34.74 },
  { x: 97.55, y: 34.74 },
  { x: 105.68, y: 34.74 },
  { x: 113.81, y: 34.74 },
  { x: 121.94, y: 34.74 },
  { x: 130.07, y: 34.74 },
  { x: 138.21, y: 34.74 },
  { x: 73.15, y: 38.72 },
  { x: 81.28, y: 38.72 },
  { x: 105.68, y: 38.72 },
  { x: 113.81, y: 38.72 },
  { x: 121.94, y: 38.72 },
  { x: 130.07, y: 38.72 },
  { x: 147.29, y: 60.43 },
  { x: 151.27, y: 60.43 },
  { x: 155.25, y: 60.43 },
  { x: 159.24, y: 60.43 },
  { x: 163.22, y: 60.43 },
  { x: 167.20, y: 60.43 },
  { x: 171.18, y: 60.43 },
  { x: 175.17, y: 60.43 },
  { x: 179.15, y: 60.43 },
  { x: 143.23, y: 68.18 },
  { x: 147.29, y: 68.18 },
  { x: 151.27, y: 68.18 },
  { x: 155.25, y: 68.18 },
  { x: 159.24, y: 68.18 },
  { x: 163.22, y: 68.18 },
  { x: 167.20, y: 68.18 },
  { x: 171.18, y: 68.18 },
  { x: 175.17, y: 68.18 },
  { x: 179.15, y: 68.18 },
  { x: 139.09, y: 75.92 },
  { x: 143.23, y: 75.92 },
  { x: 147.29, y: 75.92 },
  { x: 151.27, y: 75.92 },
  { x: 155.25, y: 75.92 },
  { x: 159.24, y: 75.92 },
  { x: 163.22, y: 75.92 },
  { x: 167.20, y: 75.92 },
  { x: 171.18, y: 75.92 },
  { x: 175.17, y: 75.92 },
  { x: 179.15, y: 75.92 },
];

/**
 * Salidas del Salón, con la calle a la que dan.
 *
 * Que la etiqueta diga a qué calle sale no es decoración: en una emergencia,
 * "salid por la de Cervantes" se entiende y "salid por la B3" no.
 */
export type SalidaGeo = {
  id: string;
  /** Puesto del plan que la atiende (A3, B3...). */
  puesto: string;
  equipoId: string;
  nombre: string;
  calle: string;
  esEmergencia: boolean;
  x: number;
  y: number;
};

export const SALIDAS: SalidaGeo[] = [
  {
    id: 'principal',
    puesto: 'A3',
    equipoId: 'evacuacion-a',
    nombre: 'Puerta principal',
    calle: 'C. Hernán Cortés',
    esEmergencia: false,
    x: 0,
    y: 50.1,
  },
  {
    id: 'emergencia',
    puesto: 'B3',
    equipoId: 'evacuacion-b',
    nombre: 'Salida de emergencia',
    calle: 'C. Cervantes',
    esEmergencia: true,
    x: 180,
    y: 53.15,
  },
];

/** Dónde se coloca cada miembro de los equipos de evacuación. */
export type PuestoGeo = {
  posicion: string;
  equipoId: string;
  x: number;
  y: number;
};

/**
 * Dónde se planta cada uno cuando suena la señal. Posiciones confirmadas por
 * la congregación, no deducidas del plano en papel:
 * - A2 fuera de los tres aseos, en medio, para verlos todos.
 * - A1 pasada la puerta de la Sala B.
 * - B2 a la altura de entre la 3ª y la 4ª fila del auditorio (contando desde
 *   la plataforma, que es como las cuenta el procedimiento).
 * - B1 entre la 1ª y la 2ª fila de la sección de la izquierda.
 */
export const PUESTOS: PuestoGeo[] = [
  { posicion: 'A1', equipoId: 'evacuacion-a', x: 64, y: 40 },
  { posicion: 'A2', equipoId: 'evacuacion-a', x: 24, y: 26 },
  { posicion: 'A3', equipoId: 'evacuacion-a', x: 4, y: 47 },
  { posicion: 'B1', equipoId: 'evacuacion-b', x: 135, y: 65 },
  { posicion: 'B2', equipoId: 'evacuacion-b', x: 118, y: 23 },
  { posicion: 'B3', equipoId: 'evacuacion-b', x: 175, y: 49 },
];
