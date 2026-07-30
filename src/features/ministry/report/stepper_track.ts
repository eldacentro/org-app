import { SxProps, Theme } from '@mui/material';

/**
 * El carril de un editor de −/+ (horas, crédito de horas, cursos bíblicos).
 *
 * Antes esto eran tres piezas sueltas dentro de una caja de 180px con
 * `space-between`: el − de 40, el número de 100 y el + de 40 suman exactamente
 * 180, así que el reparto no dejaba NI UN PÍXEL entre ellos — se tocaban. Y
 * encima el campo del número medía 59 de alto contra los 40 de los botones, de
 * modo que ni siquiera estaban alineados: era un rectángulo con dos círculos
 * incrustados en los costados.
 *
 * Ahora es UN control. El carril pone la superficie y el radio; dentro, los dos
 * signos son blancos táctiles sin dibujo propio y el número se queda con TODO
 * el espacio de en medio (`flex: 1`), que es lo que lo deja centrado de verdad
 * entre los dos y no "centrado dentro de su cajita".
 *
 * Las cuentas: 4 de relleno + 40 + 96 + 40 + 4 = 184.
 */
export const STEPPER_TRACK: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  width: '184px',
  minWidth: '184px',
  height: '48px',
  padding: '4px',
  backgroundColor: 'var(--accent-100)',
  borderRadius: 'var(--shape-full)',
  transition: 'background-color var(--motion-fast) var(--ease-standard)',
  // Dentro del carril el campo no es una superficie aparte: es el hueco de en
  // medio. Se dobla el selector (`.X.X`) por lo mismo que lo hace el bloque
  // «EL CAMPO» de `global/index.css` — para ganarle sin `!important`.
  '.MuiFormControl-root': {
    flex: '1 1 auto',
    minWidth: 0,
  },
  '.MuiOutlinedInput-root.MuiOutlinedInput-root': {
    backgroundColor: 'transparent',
    borderRadius: 'var(--shape-full)',
    minHeight: '40px',
    height: '40px',
    padding: 0,
  },
  '.MuiOutlinedInput-root.MuiOutlinedInput-root:hover': {
    backgroundColor: 'transparent',
  },
  '.MuiInputBase-input': {
    textAlign: 'center',
    padding: 0,
  },
};
