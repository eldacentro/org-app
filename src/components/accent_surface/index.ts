import { SxProps } from '@mui/material';

/**
 * Marcar una tarjeta con el color de su categoría (zona, grupo, estado…).
 *
 * Sustituye a la "uñita": el `borderLeft: 5px solid <color>` que había copiado
 * en veintitantos ficheros, con cuatro grosores distintos (2, 3, 4 y 5px).
 *
 * Por qué no era bonito, y no es cuestión de gusto: un borde recto pegado al
 * canto de una caja redondeada PELEA con la propia esquina — el color llega
 * hasta el borde superior, se corta en seco donde empieza la curva y deja dos
 * muescas. Cuanto más redonda es la tarjeta, peor se ve, y acabamos de subir
 * todos los radios.
 *
 * Lo de aquí es una cápsula: una barrita de 4px con SU PROPIO radio completo,
 * metida dentro del margen y más corta que la tarjeta. Al no tocar ningún
 * canto, no hay nada con lo que pelear; y como es redonda, pertenece a la
 * misma familia de formas que el resto. Encima va un lavado del mismo color al
 * 6%, que es lo que hace que la fila entera se lea como "de esta categoría" de
 * un vistazo, sin depender de una línea de 4px.
 *
 * Uso:
 *
 * ```tsx
 * <Box sx={{ ...tarjeta, ...accentSurface(zone.color) }}>
 * ```
 *
 * Incluye el `paddingLeft` que el contenido necesita para no montarse sobre la
 * cápsula, así que no hay que acordarse de añadirlo.
 */
export const accentSurface = (
  color: string,
  options?: {
    /** El lavado de fondo. Quítalo si la tarjeta ya tiene un fondo propio. */
    tint?: boolean;
    /** Fondo sobre el que se mezcla el lavado. Por defecto, la tarjeta. */
    surface?: string;
  }
): SxProps => {
  const { tint = true, surface = 'var(--card)' } = options ?? {};

  return {
    position: 'relative',
    // 12 de margen + 4 de cápsula + 12 de aire = 28. El contenido nunca la pisa.
    paddingLeft: '28px',

    ...(tint && {
      backgroundColor: `color-mix(in srgb, ${color} 6%, ${surface})`,
    }),

    '&::before': {
      content: '""',
      position: 'absolute',
      left: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      width: '4px',
      // Más corta que la tarjeta a propósito: así se ve que está DENTRO y no
      // que la tarjeta tiene un canto pintado.
      height: 'calc(100% - 24px)',
      minHeight: '16px',
      borderRadius: 'var(--shape-full)',
      backgroundColor: color,
    },
  };
};

export default accentSurface;
