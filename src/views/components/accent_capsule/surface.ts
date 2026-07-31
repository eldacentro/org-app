/**
 * Las medidas de la cápsula de color y lo que hay que ponerle al BLOQUE que la
 * lleva. Va en su propio fichero porque `index.tsx` solo debe exportar el
 * componente: si exporta además una función, el recargado en caliente de Vite
 * deja de funcionar para ese fichero (`react-refresh/only-export-components`).
 *
 * El porqué de la cápsula está contado en `index.tsx`.
 */

/** El ancho de la barrita y el aire a cada lado, en puntos. */
export const ANCHO = 3;
export const MARGEN = 6;
/** Cuánto se queda corta por arriba y por abajo. */
export const RECORTE = 4;

/**
 * Sitio para la cápsula y el `relative` que la sujeta. Va junto al resto de los
 * estilos del bloque:
 *
 * ```tsx
 * <View style={[styles.bloque, accentCapsuleSurface()]}>
 * ```
 */
export const accentCapsuleSurface = () => ({
  position: 'relative' as const,
  paddingLeft: MARGEN * 2 + ANCHO,
});
