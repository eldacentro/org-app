import { PropsWithChildren } from 'react';
import Typography from '@components/typography';

/**
 * El recuadro de años que va PEGADO a un campo de fecha: "Edad: 30" junto a la
 * fecha de nacimiento, "Años: 16" junto a la de bautismo.
 *
 * ── Por qué existe ───────────────────────────────────────────────────────
 *
 * Había TRES copias del mismo recuadro con tres geometrías distintas:
 *
 *   · Ficha de persona, nacimiento — ancho automático (101px medidos),
 *     `minHeight: 48`, y envuelto en un `Tooltip`.
 *   · Ficha de persona, bautismo — ancho 120, `height: 48` clavado.
 *   · Registros de publicadores — ancho 150, sin alto, apoyado en que el
 *     padre fuese `alignItems: stretch`.
 *
 * El campo de al lado mide 56. Dos de los tres recuadros medían 48, así que
 * quedaban ocho píxeles cortos y el par se veía descuadrado.
 *
 * ── La altura ────────────────────────────────────────────────────────────
 *
 * No se clava un número: se toma la del campo, y por tres vías porque hay
 * tres formas de colocarlo.
 *
 *   · `alignSelf: stretch` — cuando es hijo directo de la fila. Vale también
 *     cuando la fila se apila en móvil: ahí el eje transversal es el ancho, y
 *     `stretch` lo deja a lo ancho del campo en vez de dejar un tocón de
 *     120px debajo de un campo entero.
 *   · `height: 100%` — cuando va dentro de un envoltorio (el `Tooltip` de la
 *     edad), que es quien se estira de verdad. Ese envoltorio era justo el
 *     motivo de que el `stretch` que ya había puesto el padre no llegara.
 *   · `minHeight` — y si no hay ni una cosa ni la otra, los 56 del campo.
 */
const YearsCount = ({ children }: PropsWithChildren) => {
  return (
    <Typography
      className="h4"
      color="var(--accent-dark)"
      align="center"
      sx={{
        padding: '8px 16px',
        borderRadius: 'var(--shape-sm)',
        backgroundColor: 'var(--accent-150)',
        alignSelf: 'stretch',
        height: '100%',
        minHeight: '56px',
        // Se ajusta a lo que diga, pero con un suelo para que "Edad: 30.4" y
        // "Años: 16.5" —que son de anchos distintos— salgan iguales cuando van
        // uno debajo del otro en la misma pantalla.
        minWidth: '120px',
        flexShrink: 0,
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </Typography>
  );
};

export default YearsCount;
