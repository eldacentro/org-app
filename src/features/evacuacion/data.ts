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
 * Datos del Plan de Evacuación del Salón del Reino — Congregación Elda Centro.
 * Este plan es de SOLO LECTURA en la app; se gestiona directamente aquí en el código.
 */
export const PLAN_EVACUACION: PlanEvacuacion = {
  updatedAt: '2026-06-03T00:00:00.000Z',
  tiempoMaximo: 4,
  estructuraMando: [
    {
      rol: 'Jefe de Emergencias',
      nombre: 'Fermín Amorós',
      responsabilidades: [
        'Máxima autoridad durante la emergencia.',
        'Da la orden de evacuación y coordina a todos los equipos.',
        'Decide el fin de la emergencia y la vuelta a la normalidad.',
        'Es el enlace con los servicios de emergencia externos (112).',
      ],
    },
    {
      rol: 'Auxiliar de Emergencias',
      nombre: 'César Amorós',
      responsabilidades: [
        'Apoya al Jefe de Emergencias y le sustituye en su ausencia.',
        'Verifica que todos los equipos han recibido la orden.',
        'Controla el recuento final en el punto de reunión.',
      ],
    },
    {
      rol: 'Jefe de Intervención',
      nombre: 'Andrés Rico D.',
      responsabilidades: [
        'Dirige la primera intervención ante el conato (fuego, humo, etc.).',
        'Coordina el uso de los extintores.',
        'Informa al Jefe de Emergencias del estado del incidente.',
      ],
    },
    {
      rol: 'Auxiliar de Intervención',
      nombre: 'Federico Ortega',
      responsabilidades: [
        'Apoya al Jefe de Intervención en la extinción.',
        'Asegura el corte de suministros (luz, gas) si procede.',
        'Mantiene despejadas las vías de salida.',
      ],
    },
  ],
  equipos: [
    {
      id: 'sanitario',
      nombre: 'Equipo Sanitario',
      color: COLORES.emergencia,
      miembros: [{ nombre: 'Carlos Saca M.' }, { nombre: 'Marcos Bochenek' }],
      procedimiento: [
        'Localizan el botiquín y el material de primeros auxilios.',
        'Atienden a heridos o personas con dificultad para evacuar.',
        'Priorizan el traslado de personas con movilidad reducida.',
        'Informan al Jefe de Emergencias de cualquier herido.',
      ],
    },
    {
      id: 'evacuacion-a',
      nombre: 'Equipo de Evacuación A',
      color: COLORES.zonaA,
      zona: 'A',
      miembros: [
        { posicion: 'A1', nombre: 'Jonathan Izquierdo' },
        { posicion: 'A2', nombre: 'Samuel Lázaro' },
        { posicion: 'A3', nombre: 'Alejandro Amorós' },
      ],
      procedimiento: [
        'A1 (responsable) dirige la evacuación de la Zona A.',
        'Evacúan la Sala B, los aseos y el auditorio principal desde la última fila.',
        'Guían a los presentes hacia la salida más cercana y segura.',
        'Comprueban que no queda nadie en su zona antes de salir.',
        'Confirman a la estructura de mando que la Zona A está despejada.',
      ],
    },
    {
      id: 'evacuacion-b',
      nombre: 'Equipo de Evacuación B',
      color: COLORES.zonaB,
      zona: 'B',
      miembros: [
        { posicion: 'B1', nombre: 'Rubén Santiago' },
        { posicion: 'B2', nombre: 'Pablo Albertos' },
        { posicion: 'B3', nombre: 'Carlos Saca Jr.' },
      ],
      procedimiento: [
        'B1 (responsable) dirige la evacuación de la Zona B.',
        'Evacúan el auditorio a la izquierda de la plataforma (de delante hacia atrás).',
        'Evacúan la plataforma hasta la 3ª fila.',
        'Guían a los presentes hacia la salida más cercana y segura.',
        'Comprueban que no queda nadie en su zona antes de salir.',
        'Confirman a la estructura de mando que la Zona B está despejada.',
      ],
    },
  ],
  normasGenerales: [
    'Mantenga la calma y no corra; camine con paso firme hacia la salida.',
    'Siga en todo momento las indicaciones de los equipos de evacuación.',
    'No se detenga a recoger objetos personales.',
    'No use ascensores; utilice siempre las salidas designadas.',
    'Ayude a las personas mayores, niños y personas con movilidad reducida.',
    'Diríjase al punto de reunión exterior y no regrese al edificio.',
    'No reingrese hasta que el Jefe de Emergencias lo autorice.',
  ],
  extintores: [
    { id: 1, tipo: 'Polvo ABC' },
    { id: 2, tipo: 'Polvo ABC' },
    { id: 3, tipo: 'Polvo ABC' },
    { id: 4, tipo: 'Polvo ABC' },
    { id: 5, tipo: 'Polvo ABC' },
    { id: 6, tipo: 'CO₂' },
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
