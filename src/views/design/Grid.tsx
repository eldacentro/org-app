import { ReactNode } from 'react';
import { Text, View } from '@react-pdf/renderer';
import { color, radius, space, stroke, text } from './tokens';

/**
 * LA CUADRÍCULA DE CALENDARIO del sistema — Exhibidores y Salidas de
 * predicación.
 *
 * ── El fallo que arregla ─────────────────────────────────────────────────
 *
 * Las dos cuadrículas se dibujaban con el borde de CADA CELDA: cada una ponía
 * su `borderRight` y su `borderBottom`, y a las de la última fila y la última
 * columna se les quitaba. El marco lo ponía el contenedor, con
 * `borderRadius: 16` y `overflow: 'hidden'` para redondear las esquinas.
 *
 * Eso daba las dos cosas que se veían mal:
 *
 * 1. **Las líneas verticales no llegaban abajo.** La raya de una columna es el
 *    borde derecho de sus celdas, así que mide lo que mide la celda. Si la
 *    última fila tiene menos contenido que las de arriba, o si sobra alto en
 *    la hoja, la raya se para donde se acaba el contenido en vez de llegar al
 *    marco.
 *
 * 2. **Las esquinas de abajo se veían blancas.** Las celdas pintan su fondo
 *    blanco hasta el canto, en cuadrado. El contenedor redondea con
 *    `overflow: hidden`, pero en react-pdf ese recorte no llega a los fondos
 *    de los hijos: el cuadrado blanco de la celda tapaba la curva del marco y
 *    parecía que la línea se cortaba y se volvía blanca.
 *
 * ── La regla ─────────────────────────────────────────────────────────────
 *
 * **El marco y las rayas los dibuja la cuadrícula, nunca las celdas.** Las
 * verticales son elementos propios que van de la cabecera al suelo, así que
 * son enteras siempre. Y **ningún hijo llega a una esquina redondeada**: el
 * fondo del cuerpo es el de la cuadrícula, y las celdas son transparentes.
 *
 * Vale para cualquier tabla-calendario, no solo para estas dos.
 */

export type PdfGridCell = {
  /** El número del día. Sin él la celda se pinta como hueco. */
  dayNum?: number;
  content?: ReactNode;
};

const PdfGrid = ({
  weekdays,
  cells,
  rowHeight,
}: {
  /** Las cabeceras de columna. Su número manda: define el ancho de columna. */
  weekdays: string[];
  /** En orden de lectura; se parten en filas de `weekdays.length`. */
  cells: PdfGridCell[];
  /**
   * Alto fijo de cada fila. Si no se da, cada fila mide lo que su contenido —
   * que es lo que se quiere cuando hay pocas semanas.
   */
  rowHeight?: number;
}) => {
  const columnas = weekdays.length;
  const filas: PdfGridCell[][] = [];
  for (let i = 0; i < cells.length; i += columnas) {
    filas.push(cells.slice(i, i + columnas));
  }

  const anchoColumna = `${100 / columnas}%`;

  return (
    <View
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: radius.lg,
        border: `${stroke.thin}px solid ${color.line}`,
        // El fondo lo pone LA CUADRÍCULA, y por eso puede redondear sus
        // esquinas sin que ningún hijo las pise.
        backgroundColor: color.white,
      }}
    >
      {/* ── Cabecera de días ─────────────────────────────────────────── */}
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          backgroundColor: color.accent,
          // Solo las esquinas de ARRIBA: es la tapa del marco.
          borderTopLeftRadius: radius.lg - stroke.thin,
          borderTopRightRadius: radius.lg - stroke.thin,
        }}
      >
        {weekdays.map((dia) => (
          <Text
            key={dia}
            style={{
              width: anchoColumna,
              textAlign: 'center',
              paddingVertical: space.sm,
              fontSize: 8.6,
              fontWeight: 700,
              color: color.white,
            }}
          >
            {dia}
          </Text>
        ))}
      </View>

      {/* ── Cuerpo ───────────────────────────────────────────────────── */}
      <View style={{ position: 'relative', display: 'flex' }}>
        {/* Las verticales, de una pieza y de arriba abajo del cuerpo entero.
            Van en absoluto justo por eso: como elemento en el flujo medirían
            lo que midiera su fila. */}
        {weekdays.slice(1).map((_, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${(100 / columnas) * (i + 1)}%`,
              width: stroke.hair,
              backgroundColor: color.line,
            }}
          />
        ))}

        {filas.map((fila, filaIdx) => (
          <View
            key={filaIdx}
            style={{
              display: 'flex',
              flexDirection: 'row',
              ...(rowHeight ? { height: rowHeight } : {}),
              // La horizontal la pone la fila, menos la última: ahí el suelo
              // ya lo pone el marco, y una raya encima de él se vería doble.
              ...(filaIdx < filas.length - 1 && {
                borderBottom: `${stroke.hair}px solid ${color.line}`,
              }),
            }}
          >
            {fila.map((celda, celdaIdx) => (
              <View
                key={celdaIdx}
                style={{
                  width: anchoColumna,
                  padding: space.xs,
                  display: 'flex',
                  flexDirection: 'column',
                  // Las celdas NO pintan fondo ni bordes. Ni el hueco: un gris
                  // cuadrado en la esquina de abajo era justo lo que rompía la
                  // curva del marco.
                }}
              >
                {celda.dayNum !== undefined && (
                  <Text
                    style={{
                      ...text.label,
                      fontSize: 7.4,
                      marginBottom: space.xs,
                    }}
                  >
                    {celda.dayNum}
                  </Text>
                )}
                {celda.content}
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
};

export default PdfGrid;
