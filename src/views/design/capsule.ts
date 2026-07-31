/**
 * Las medidas de la cápsula de color. En su propio fichero para que
 * `Blocks.tsx` solo exporte componentes y el recargado en caliente de Vite
 * siga funcionando ahí (`react-refresh/only-export-components`).
 *
 * El porqué de la cápsula está contado en `Blocks.tsx`, junto al componente.
 */
export const CAPSULA = { ancho: 3, margen: 6, recorte: 4 };

/**
 * Sitio para la cápsula y el `relative` que la sujeta. Va junto al resto de
 * los estilos del bloque que la lleva.
 */
export const withCapsule = () => ({
  position: 'relative' as const,
  paddingLeft: CAPSULA.margen * 2 + CAPSULA.ancho,
});
