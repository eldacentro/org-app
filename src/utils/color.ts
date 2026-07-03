/**
 * Un <input type="color"> nativo exige un hex real (#rrggbb) — pasarle
 * directamente 'var(--accent-main)' lo deja en negro, porque el navegador
 * no resuelve variables CSS ahí. Convierte --accent-main-base ("r, g, b")
 * a hex al vuelo para que el color de partida de un picker siga el esquema
 * de colores elegido, en vez de quedarse en un azul fijo.
 */
export const getAccentMainHex = (): string => {
  const base = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent-main-base')
    .trim();
  const parts = base.split(',').map((n) => parseInt(n.trim(), 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return '#306CB4';
  return '#' + parts.map((n) => n.toString(16).padStart(2, '0')).join('');
};
