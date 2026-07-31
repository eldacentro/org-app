/**
 * La fecha corta del pie: "Última actualización · dd/mm/aaaa".
 *
 * Estaba copiada A MANO en cinco plantillas, con el mismo bloque de cinco
 * líneas cada vez. Va en su propio fichero y no junto a los componentes para
 * que el recargado en caliente de Vite siga funcionando en aquel
 * (`react-refresh/only-export-components`).
 */
export const fechaCorta = (iso?: string) => {
  if (!iso) return '';

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');

  return `${dd}/${mm}/${d.getFullYear()}`;
};
