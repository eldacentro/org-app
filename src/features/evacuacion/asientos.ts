import { COLORES } from './data';

/**
 * Asientos reales del Salón del Reino.
 *
 * Las POSICIONES salen del SVG del plano oficial (3840x2160) —el mismo dibujo
 * que está colgado en la pared— convertidas a las coordenadas lógicas del plano
 * de evacuación (SALON: 180 x 78,65):
 *
 *   x_logica = (x_svg + 23 - 117,9) * 180 / 3505,3
 *   y_logica = (y_svg + 35 - 312,3) * 78,65 / 1520,9
 *
 * El CONTEO por columna lo dio el responsable mirando el salón, y manda sobre
 * el dibujo: el plano tiene cuatro asientos que ya no están.
 *
 *   Sala B ................ 7 · 6                          = 13
 *   Auditorio principal ... 6+2 · 9 · 7 · 7 · 9 · 9 · 9 · 9 · 7 = 74
 *   Izquierda plataforma .. 9 · 10 · 11                    = 30
 *
 * LA PLATAFORMA ESTÁ A LA DERECHA: los asientos miran hacia allí, y la fila de
 * ATRÁS es la de más a la izquierda. Importa para el orden del desalojo.
 *
 * LO QUE ESTO ARREGLA: la app dibujaba el auditorio en nueve FILAS horizontales.
 * El salón lo tiene en nueve COLUMNAS. Salía girado 90 grados respecto al cartel
 * de la pared, y por eso no se reconocía.
 */

export type BloqueAsientos = {
  id: string;
  nombre: string;
  /** Quién se encarga de desalojarlo, según el plan. */
  zona: 'A' | 'B' | 'AB';
  color: string;
  /** Lo que dice el procedimiento sobre este bloque, en una frase. */
  detalle: string;
  /** Coordenadas lógicas [x, y] del centro de cada asiento. */
  asientos: [number, number][];
};

/**
 * La mesa del área de sonido.
 *
 * CÓMO ESTÁ PUESTO EL RINCÓN, que costó entenderlo:
 *
 *  · la columna 1 empieza ARRIBA con los DOS ASIENTOS DE LOS DEL SONIDO,
 *    luego un hueco de paso, y debajo sus seis de auditorio;
 *  · la columna 2 no tiene los de arriba: ahí está la mesa. Le quedan seis, y
 *    por eso tiene menos que la tercera — no llega a la pared, topa con ella;
 *  · la mesa va en la columna 2, ENFRENTE de esos dos asientos del sonido.
 *
 * Se dibuja porque un obstáculo al fondo del auditorio es justo lo que hay que
 * saber antes de que haga falta. Los dos asientos de detrás se dibujan como los
 * demás porque en una evacuación son dos personas más que salen.
 */
export const MESA_SONIDO = {
  x: 82.9,
  // Centrada entre los huecos primero (8.85) y segundo (12.86): está ENFRENTE
  // de los dos asientos del sonido, que son los de la columna de al lado.
  y: 10.86,
  ancho: 2.36,
  // Dos huecos de rejilla (4.01 cada uno): cubre justo el largo de esos dos
  // asientos, que es lo que mide la mesa de verdad.
  alto: 8.02,
};

export const BLOQUES_ASIENTOS: BloqueAsientos[] = [
  {
    id: 'sala-b',
    nombre: 'Sala B',
    zona: 'A',
    color: COLORES.zonaA,
    detalle:
      'El equipo A empieza el desalojo aquí; después sigue por el auditorio principal desde la última fila.',
    asientos: [
      [52.72, 6.07],
      [52.72, 10.08],
      [52.72, 14.1],
      [52.72, 18.11],
      [52.72, 22.13],
      [52.72, 26.14],
      [52.72, 30.15],
      [59.55, 6.07],
      [59.55, 10.08],
      [59.55, 14.1],
      [59.55, 18.11],
      [59.55, 22.13],
      [59.55, 26.14],
    ],
  },
  {
    id: 'auditorio-a',
    nombre: 'Auditorio principal — filas del fondo',
    zona: 'A',
    color: COLORES.zonaA,
    detalle:
      'Las filas más alejadas de la plataforma. Las desaloja el equipo A, empezando por la de atrás. En la última está la mesa del sonido.',
    asientos: [
      [74.76, 8.85],
      [74.76, 12.86],
      [74.76, 20.89],
      [74.76, 24.9],
      [74.76, 28.92],
      [74.76, 32.93],
      [74.76, 36.95],
      [74.76, 40.96],
      [82.9, 20.89],
      [82.9, 24.9],
      [82.9, 28.92],
      [82.9, 32.93],
      [82.9, 36.95],
      [82.9, 40.96],
      [91.04, 8.85],
      [91.04, 12.86],
      [91.04, 16.88],
      [91.04, 20.89],
      [91.04, 24.9],
      [91.04, 28.92],
      [91.04, 32.93],
      [99.18, 8.85],
      [99.18, 12.86],
      [99.18, 16.88],
      [99.18, 20.89],
      [99.18, 24.9],
      [99.18, 28.92],
      [99.18, 32.93],
      [107.32, 8.85],
      [107.32, 12.86],
      [107.32, 16.88],
      [107.32, 20.89],
      [107.32, 24.9],
      [107.32, 28.92],
      [107.32, 32.93],
      [107.32, 36.95],
      [107.32, 40.96],
      [115.46, 8.85],
      [115.46, 12.86],
      [115.46, 16.88],
      [115.46, 20.89],
      [115.46, 24.9],
      [115.46, 28.92],
      [115.46, 32.93],
      [115.46, 36.95],
      [115.46, 40.96],
    ],
  },
  {
    id: 'auditorio-b',
    nombre: 'Auditorio principal — filas de delante',
    zona: 'B',
    color: COLORES.zonaB,
    detalle: 'Las filas más cercanas a la plataforma. Las desaloja el equipo B.',
    asientos: [
      [123.6, 8.85],
      [123.6, 12.86],
      [123.6, 16.88],
      [123.6, 20.89],
      [123.6, 24.9],
      [123.6, 28.92],
      [123.6, 32.93],
      [123.6, 36.95],
      [123.6, 40.96],
      [131.74, 8.85],
      [131.74, 12.86],
      [131.74, 16.88],
      [131.74, 20.89],
      [131.74, 24.9],
      [131.74, 28.92],
      [131.74, 32.93],
      [131.74, 36.95],
      [131.74, 40.96],
      [139.87, 12.86],
      [139.87, 16.88],
      [139.87, 20.89],
      [139.87, 24.9],
      [139.87, 28.92],
      [139.87, 32.93],
      [139.87, 36.95],
    ],
  },
  {
    id: 'lateral',
    nombre: 'Sección de la izquierda de la plataforma',
    zona: 'B',
    color: COLORES.zonaB,
    detalle: 'La desaloja el equipo B por la salida más cercana.',
    asientos: [
      [148.61, 62.49],
      [152.59, 62.49],
      [156.58, 62.49],
      [160.56, 62.49],
      [164.55, 62.49],
      [168.54, 62.49],
      [172.52, 62.49],
      [176.51, 62.49],
      [180.5, 62.49],
      [144.54, 70.3],
      [148.61, 70.3],
      [152.59, 70.3],
      [156.58, 70.3],
      [160.56, 70.3],
      [164.55, 70.3],
      [168.54, 70.3],
      [172.52, 70.3],
      [176.51, 70.3],
      [180.5, 70.3],
      [140.4, 78.1],
      [144.54, 78.1],
      [148.61, 78.1],
      [152.59, 78.1],
      [156.58, 78.1],
      [160.56, 78.1],
      [164.55, 78.1],
      [168.54, 78.1],
      [172.52, 78.1],
      [176.51, 78.1],
      [180.5, 78.1],
    ],
  },
];
