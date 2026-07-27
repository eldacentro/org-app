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
    asientos: [
      // fila 1 (9 asientos)
      [147.43, 61.11],
      [151.41, 61.11],
      [155.4, 61.11],
      [159.39, 61.11],
      [163.37, 61.11],
      [167.36, 61.11],
      [171.35, 61.11],
      [175.33, 61.11],
      [179.32, 61.11],
      // fila 2 (10 asientos)
      [143.36, 68.91],
      [147.43, 68.91],
      [151.41, 68.91],
      [155.4, 68.91],
      [159.39, 68.91],
      [163.37, 68.91],
      [167.36, 68.91],
      [171.35, 68.91],
      [175.33, 68.91],
      [179.32, 68.91],
      // fila 3 (11 asientos)
      [139.22, 76.72],
      [143.36, 76.72],
      [147.43, 76.72],
      [151.41, 76.72],
      [155.4, 76.72],
      [159.39, 76.72],
      [163.37, 76.72],
      [167.36, 76.72],
      [171.35, 76.72],
      [175.33, 76.72],
      [179.32, 76.72],
    ],
  },
];

/** Capacidad total del salón según el plano. */
export const TOTAL_ASIENTOS = BLOQUES_ASIENTOS.reduce(
  (total, bloque) => total + bloque.asientos.length,
  0
);
