/**
 * LA MARCA, SACADA DE LA APLICACIÓN.
 *
 * Los mismos valores que `src/global/*.css`. No se elige aquí ningún color a
 * ojo: si el vídeo y la aplicación no son exactamente el mismo azul, se nota
 * al ponerlos uno al lado del otro.
 */
export const color = {
  fondo: 'rgb(15, 33, 63)',
  fondoClaro: 'rgb(240, 244, 250)',
  acento: 'rgb(59, 114, 196)',
  acentoOscuro: 'rgb(31, 64, 122)',
  acento150: 'rgb(224, 232, 245)',
  blanco: 'rgb(255, 255, 255)',
  tenue: 'rgba(255, 255, 255, 0.62)',
} as const;

/**
 * Las curvas de la aplicación (`--ease-standard`, `--ease-emphasized`).
 *
 * Las dos son *ease-out*: salen rápido y frenan al llegar. Nada rebota — un
 * rebote es lo primero que delata un vídeo hecho con una plantilla.
 */
export const curva = {
  estandar: [0.2, 0, 0, 1] as const,
  enfatica: [0.05, 0.7, 0.1, 1] as const,
};

/** Segundos → fotogramas, a 30 por segundo. */
export const seg = (s: number) => Math.round(s * 30);

/**
 * El logotipo de texto: la última palabra en extranegrita y el resto en medium.
 * Misma regla que `src/utils/wordmark.ts` en la aplicación.
 */
export const partirWordmark = (nombre: string) => {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  const marca = palabras.pop() ?? '';

  return { lugar: palabras.join(' '), marca };
};
