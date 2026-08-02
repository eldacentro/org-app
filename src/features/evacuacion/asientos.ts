import { COLORES } from './data';

/**
 * Asientos reales del Salón del Reino.
 *
 * Extraídos del plano oficial del Salón (SVG de 3840x2160) y convertidos a las
 * mismas coordenadas lógicas que usa el resto del plano de evacuación
 * (SALON: 180 x 78,65). NO están puestos a ojo: el número de asientos que
 * enseñaba la app antes no coincidía con el salón real, y en un plan de
 * evacuación la capacidad de cada zona es justo el dato que importa.
 *
 * Transformación aplicada, por si hay que rehacerla al cambiar el plano:
 *   x_logica = (x_svg - 117,9) * 180 / 3505,3
 *   y_logica = (y_svg - 312,3) * 78,65 / 1520,9
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

export const BLOQUES_ASIENTOS: BloqueAsientos[] = [
  {
    id: 'sala-b',
    nombre: 'Sala B',
    zona: 'A',
    color: COLORES.zonaA,
    detalle: 'El equipo A empieza el desalojo aquí; después sigue por el auditorio principal desde la última fila.',
    asientos: [
      // fila 1 (2 asientos)
      [51.12, 4.26],
      [57.94, 4.26],
      // fila 2 (2 asientos)
      [51.12, 8.28],
      [57.94, 8.28],
      // fila 3 (2 asientos)
      [51.12, 12.29],
      [57.94, 12.29],
      // fila 4 (3 asientos)
      [51.12, 16.3],
      [57.94, 16.3],
      // fila 5 (2 asientos)
      [51.12, 20.32],
      [57.94, 20.32],
      // fila 6 (2 asientos)
      [51.12, 24.33],
      [57.94, 24.33],
      // fila 7 (1 asientos)
      [51.12, 28.35],
    ],
  },
  {
    id: 'auditorio',
    nombre: 'Auditorio principal',
    zona: 'AB',
    color: COLORES.ruta,
    detalle: 'Lo desalojan los dos equipos: el B desde la plataforma hasta la tercera fila, y el A desde la última fila hacia delante.',
    asientos: [
      // fila 1 (8 asientos)
      [73.15, 7.04],
      [81.29, 7.04],
      [89.43, 7.04],
      [97.57, 7.04],
      [105.71, 7.04],
      [113.85, 7.04],
      [121.99, 7.04],
      [130.13, 7.04],
      // fila 2 (9 asientos)
      [73.15, 11.05],
      [81.29, 11.05],
      [89.43, 11.05],
      [97.57, 11.05],
      [105.71, 11.05],
      [113.85, 11.05],
      [121.99, 11.05],
      [130.13, 11.05],
      [138.27, 11.05],
      // fila 3 (9 asientos)
      [73.15, 15.07],
      [81.29, 15.07],
      [89.43, 15.07],
      [97.57, 15.07],
      [105.71, 15.07],
      [113.85, 15.07],
      [121.99, 15.07],
      [130.13, 15.07],
      [138.27, 15.07],
      // fila 4 (9 asientos)
      [73.15, 19.08],
      [81.29, 19.08],
      [89.43, 19.08],
      [97.57, 19.08],
      [105.71, 19.08],
      [113.85, 19.08],
      [121.99, 19.08],
      [130.13, 19.08],
      [138.27, 19.08],
      // fila 5 (9 asientos)
      [73.15, 23.1],
      [81.29, 23.1],
      [89.43, 23.1],
      [97.57, 23.1],
      [105.71, 23.1],
      [113.85, 23.1],
      [121.99, 23.1],
      [130.13, 23.1],
      [138.27, 23.1],
      // fila 6 (9 asientos)
      [73.15, 27.11],
      [81.29, 27.11],
      [89.43, 27.11],
      [97.57, 27.11],
      [105.71, 27.11],
      [113.85, 27.11],
      [121.99, 27.11],
      [130.13, 27.11],
      [138.27, 27.11],
      // fila 7 (9 asientos)
      [73.15, 31.13],
      [81.29, 31.13],
      [89.43, 31.13],
      [97.57, 31.13],
      [105.71, 31.13],
      [113.85, 31.13],
      [121.99, 31.13],
      [130.13, 31.13],
      [138.27, 31.13],
      // fila 8 (9 asientos)
      [73.15, 35.14],
      [81.29, 35.14],
      [105.71, 35.14],
      [113.85, 35.14],
      [121.99, 35.14],
      [130.13, 35.14],
      [138.27, 35.14],
      // fila 9 (6 asientos)
      [73.15, 39.15],
      [81.29, 39.15],
      [105.71, 39.15],
      [113.85, 39.15],
      [121.99, 39.15],
      [130.13, 39.15],
      // fila 10 (1 asientos)
    ],
  },
  {
    id: 'lateral',
    nombre: 'Sección de la izquierda de la plataforma',
    zona: 'B',
    color: COLORES.zonaB,
    detalle: 'El equipo B empieza el desalojo aquí, de delante hacia atrás.',
    // Paso uniforme de 3,98 y el último pegado a la pared. Antes las filas
    // arrancaban donde arrancaban y el hueco que sobraba se lo comía el último
    // asiento, que quedaba a 2,67 del anterior mientras los demás iban a 3,98:
    // se veía como si dos sillas estuvieran pegadas.
    asientos: [
      // fila 1 (9 asientos)
      [146.16, 61.11],
      [150.14, 61.11],
      [154.12, 61.11],
      [158.1, 61.11],
      [162.08, 61.11],
      [166.06, 61.11],
      [170.04, 61.11],
      [174.02, 61.11],
      [178.0, 61.11],
      // fila 2 (10 asientos)
      [142.18, 68.91],
      [146.16, 68.91],
      [150.14, 68.91],
      [154.12, 68.91],
      [158.1, 68.91],
      [162.08, 68.91],
      [166.06, 68.91],
      [170.04, 68.91],
      [174.02, 68.91],
      [178.0, 68.91],
      // fila 3 (11 asientos)
      [138.2, 76.72],
      [142.18, 76.72],
      [146.16, 76.72],
      [150.14, 76.72],
      [154.12, 76.72],
      [158.1, 76.72],
      [162.08, 76.72],
      [166.06, 76.72],
      [170.04, 76.72],
      [174.02, 76.72],
      [178.0, 76.72],
    ],
  },
];

/** Capacidad total del salón según el plano. */
export const TOTAL_ASIENTOS = BLOQUES_ASIENTOS.reduce(
  (total, bloque) => total + bloque.asientos.length,
  0
);
