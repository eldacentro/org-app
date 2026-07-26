/**
 * Identidad de la versión que corre un dispositivo.
 *
 * El "número de build" son los minutos transcurridos desde 1970 en el momento
 * de compilar (ver vite.config.ts): siempre crece y se compara con un simple
 * menor-que, que es lo que necesitan la oleada de actualización y el panel del
 * administrador. Para las personas, ese número no dice nada — así que aquí se
 * convierte en una fecha, que es lo que de verdad se entiende: "tu app es del
 * 12 de julio".
 */

// Los builds anteriores a este cambio informaban el número de commits del
// historial (y en producción, por el clonado superficial de Vercel, un 10
// pelado). Cualquier valor por debajo de este umbral es uno de aquellos: no se
// puede sacar una fecha de ahí, solo saber que es viejo.
const FIRST_TIMESTAMP_BUILD = 20_000_000; // ≈ año 2008 en minutos desde 1970

export const isTimestampBuild = (build: number) => build >= FIRST_TIMESTAMP_BUILD;

export const buildToDate = (build: number) => {
  if (!isTimestampBuild(build)) return null;

  return new Date(build * 60000);
};

/** "12 jul 2026" a partir del número de build; null si no se puede saber. */
export const formatBuildDate = (build: number | null) => {
  if (build === null) return null;

  const date = buildToDate(build);

  if (!date || Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};
