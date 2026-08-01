import { ReactNode } from 'react';
import { Text, View } from '@react-pdf/renderer';
import { color, radius, size, space, stroke, text } from './tokens';

/**
 * LA CUADRÍCULA DE CALENDARIO. Implementa `PDF_DESIGN_SYSTEM.md` §3.4.
 *
 * No es una tabla con marco y rayas, sino **celdas sueltas separadas por un
 * hueco**. Cada celda tiene su propio borde y su propio radio, así que no hay
 * ninguna línea que recorrer ni ninguna esquina contra la que pelear — que era
 * de donde salían los dos defectos de la versión anterior (verticales cortas y
 * esquinas blancas).
 *
 * **El día va arriba, en el encabezado de la columna, no dentro de la celda.**
 * Una columna es siempre el mismo día de la semana: decirlo treinta veces es
 * repetir treinta veces lo que se sabe leyendo una. Dentro de la celda quedan
 * solo el numeral y el contenido, y eso es una línea menos por celda — que es
 * lo que hace que quepa el mes entero en la hoja.
 *
 * Las columnas son **solo los días activos**: si la congregación no sale a
 * predicar los lunes, el lunes no ocupa una columna vacía toda la hoja.
 *
 * La celda inactiva —un festivo, un día sin turnos— va sobre franja y **sin
 * borde**: se ve que está ahí y que no hay nada, sin fingir que es una casilla
 * por rellenar.
 */

export type PdfGridCell = {
  dayNum?: number;
  /**
   * Hueco de cuadratura: los días que caen fuera del mes al principio o al
   * final de la rejilla. No se pinta NADA — ni borde ni franja—, porque no es
   * un día sin actividad, es un día que no existe.
   */
  filler?: boolean;
  /** Solo cuando la cuadrícula no lleva encabezados de columna. */
  dayName?: string;
  content?: ReactNode;
  /** Festivo o día sin actividad: franja, sin borde, y el motivo en cursiva. */
  inactive?: boolean;
  inactiveReason?: string;
};

/** El ancho del canalón de la izquierda cuando hay rótulos de fila. */
const CANALON = 14;

const PdfGrid = ({
  columns,
  headers,
  rowLabels,
  cells,
  gap = space.sm,
  dense = false,
}: {
  /** Cuántas columnas: tantas como días activos. */
  columns: number;
  /** Los días de la semana, arriba. Se repiten en cada hoja. */
  headers?: string[];
  /** «Semana 1», «Semana 2»… en el canalón de la izquierda. */
  rowLabels?: string[];
  /** En orden de lectura; se parten en filas de `columns`. */
  cells: PdfGridCell[];
  gap?: number;
  dense?: boolean;
}) => {
  const filas: PdfGridCell[][] = [];
  for (let i = 0; i < cells.length; i += columns) {
    filas.push(cells.slice(i, i + columns));
  }

  const canalon = rowLabels ? CANALON : 0;

  return (
    <View style={{ display: 'flex', flexDirection: 'column', gap }}>
      {headers ? (
        <View
          fixed
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap,
            // El hueco entre encabezado y primera fila es menor que el que
            // separa las filas entre sí: el rótulo pertenece a su columna.
            marginBottom: 3 - gap,
          }}
        >
          {canalon ? <View style={{ width: canalon }} /> : null}
          {headers.map((dia, i) => (
            <Text key={i} style={{ ...text.label, flexGrow: 1, flexBasis: 0 }}>
              {dia}
            </Text>
          ))}
        </View>
      ) : null}

      {filas.map((fila, filaIdx) => (
        <View
          key={filaIdx}
          wrap={false}
          style={{ display: 'flex', flexDirection: 'row', gap }}
        >
          {canalon ? (
            // El rótulo de la fila va GIRADO, leyéndose de abajo arriba. Ocupa
            // así 14 pt de ancho en vez de los 42 que necesita en horizontal, y
            // esos 28 pt se los quedan las celdas, que es donde hacen falta.
            // El giro no mueve la caja, solo lo que se pinta dentro, así que la
            // caja se declara ya con la forma que tendrá el texto girado.
            <View
              style={{
                width: canalon,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  ...text.label,
                  transform: 'rotate(-90deg)',
                  width: 60,
                  textAlign: 'center',
                }}
              >
                {rowLabels?.[filaIdx] ?? ''}
              </Text>
            </View>
          ) : null}

          {fila.map((celda, celdaIdx) =>
            celda.filler ? (
              <View key={celdaIdx} style={{ flexGrow: 1, flexBasis: 0 }} />
            ) : (
              <View
                key={celdaIdx}
                style={{
                  flexGrow: 1,
                  flexBasis: 0,
                  borderRadius: radius.cell,
                  paddingVertical: dense ? 3.5 : space.sm,
                  paddingHorizontal: dense ? 4 : 6,
                  ...(celda.inactive
                    ? { backgroundColor: color.zebra }
                    : {
                        border: `${stroke.hairline}px solid ${color.border}`,
                      }),
                }}
              >
                {celda.dayNum !== undefined ? (
                  <View
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'baseline',
                      gap: 4,
                      marginBottom: dense ? 1 : 2,
                    }}
                  >
                    <Text
                      style={{
                        ...text.calendarNumeral,
                        fontSize: dense
                          ? size.heading
                          : text.calendarNumeral.fontSize,
                        ...(celda.inactive && { color: color.inactive }),
                      }}
                    >
                      {celda.dayNum}
                    </Text>
                    {celda.dayName ? (
                      <Text
                        style={{
                          ...text.label,
                          ...(celda.inactive && { color: color.inactive }),
                        }}
                      >
                        {celda.dayName}
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                {celda.inactive ? (
                  celda.inactiveReason ? (
                    <Text
                      style={{
                        fontSize: size.label,
                        fontStyle: 'italic',
                        color: color.faint,
                      }}
                    >
                      {celda.inactiveReason}
                    </Text>
                  ) : null
                ) : (
                  celda.content
                )}
              </View>
            )
          )}

          {/* Rellena la última fila para que las celdas no se estiren. */}
          {fila.length < columns
            ? Array.from({ length: columns - fila.length }, (_, i) => (
                <View key={`h${i}`} style={{ flexGrow: 1, flexBasis: 0 }} />
              ))
            : null}
        </View>
      ))}
    </View>
  );
};

export default PdfGrid;
