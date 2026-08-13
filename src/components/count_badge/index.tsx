import { Box } from '@mui/material';
import Typography from '@components/typography';

/**
 * El número que acompaña a un rótulo: cuántas solicitudes hay en esa pestaña,
 * cuántas personas en la lista, cuántos oradores en el circuito.
 *
 * ── Por qué se saca aquí ─────────────────────────────────────────────────
 *
 * Este dibujo ya existía, pero escondido dentro de
 * `@components/tab_label_with_badge`, así que solo lo tenían las pestañas
 * —cinco sitios—. Los demás contadores de la app metían el número DENTRO del
 * texto y cada uno con su puntuación: "Personas: 100" con dos puntos, "Tu
 * circuito (12)" y "Otras congregaciones (8)" con paréntesis.
 *
 * Meter el número en la frase tiene un problema que no es de gusto: el
 * contador deja de ser un dato y pasa a ser parte del título, así que no se
 * puede mirar de un vistazo ni distinguir de lo que lo nombra.
 *
 * ── Lo que NO es ─────────────────────────────────────────────────────────
 *
 * No es `@components/badge`, que es la píldora de un ESTADO ("Suspendido",
 * "Asignado a Juan"). Un estado se lee; un contador se cuenta. Por eso este es
 * cuadrado, corto y de ancho fijo: en una lista de pestañas, todos los números
 * ocupan lo mismo y no bailan al cambiar de 9 a 10.
 */
const CountBadge = ({
  value,
  color = 'var(--ink)',
}: {
  value: number;
  /**
   * La tinta del número. Por defecto, la del texto normal.
   *
   * Era `'inherit'`, que sonaba bien —«hereda la del rótulo que acompaña»— y
   * no lo hacía: no hay ningún ancestro que ponga color, así que subía hasta
   * el `rgba(0, 0, 0, 0.87)` por defecto de MUI. Negro fijo, en los diez
   * temas. En modo oscuro el «100» de Personas quedaba a 1,27:1 sobre su
   * propio fondo — un número gris oscuro sobre azul oscuro, ilegible.
   *
   * Las pestañas (`@components/tab_label_with_badge`) sí pasan un color
   * propio, así que aquellas nunca dependieron de esto.
   */
  color?: string;
}) => (
  <Box
    sx={{
      backgroundColor: 'var(--accent-150)',
      borderRadius: 'var(--shape-xs)',
      // Cuadrado y con ancho MÍNIMO, no fijo. El mínimo es lo que hace que
      // todos los números de una fila de pestañas ocupen lo mismo y no bailen
      // al pasar de 9 a 10. Pero fijo del todo se quedaba corto: "100"
      // —los cien hermanos de la lista de personas— pide 22 dentro de una caja
      // de 24, o sea que cabía por un pelo, y con una cifra más se habría
      // salido. Con el mínimo y un poco de relleno, crece cuando hace falta.
      // Medido: una y dos cifras miden 24 las dos —o sea que el salto de 9 a
      // 10 sigue sin moverse—, tres miden 30 y cuatro, 36.
      minWidth: '24px',
      height: '24px',
      padding: '0 4px',
      boxSizing: 'border-box',
      flexShrink: 0,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontSize: '13px',
    }}
  >
    <Typography className="body-small-semibold" sx={{ color }}>
      {value.toString()}
    </Typography>
  </Box>
);

export default CountBadge;
