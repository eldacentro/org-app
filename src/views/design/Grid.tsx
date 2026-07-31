import { ReactNode } from 'react';
import { Text, View } from '@react-pdf/renderer';
import { color, radius, space, stroke, text } from './tokens';

/**
 * LA CUADRÍCULA DE CALENDARIO. Implementa `PDF_DESIGN_SYSTEM.md` §3.4.
 *
 * Cambia de raíz respecto a la anterior: ya no es una tabla con marco y rayas,
 * sino **celdas sueltas separadas por un hueco**. Cada celda tiene su propio
 * borde y su propio radio, así que no hay ninguna línea que recorrer ni
 * ninguna esquina contra la que pelear — que era de donde salían los dos
 * defectos de antes (verticales cortas y esquinas blancas).
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
  /** "mar", "jue"… debajo del numeral. */
  dayName?: string;
  content?: ReactNode;
  /** Festivo o día sin actividad: franja, sin borde, y el motivo en cursiva. */
  inactive?: boolean;
  inactiveReason?: string;
};

const PdfGrid = ({
  columns,
  cells,
  gap = space.sm,
  dense = false,
}: {
  /** Cuántas columnas: tantas como días activos. */
  columns: number;
  /** En orden de lectura; se parten en filas de `columns`. */
  cells: PdfGridCell[];
  gap?: number;
  dense?: boolean;
}) => {
  const filas: PdfGridCell[][] = [];
  for (let i = 0; i < cells.length; i += columns) {
    filas.push(cells.slice(i, i + columns));
  }

  return (
    <View style={{ display: 'flex', flexDirection: 'column', gap }}>
      {filas.map((fila, filaIdx) => (
        <View
          key={filaIdx}
          wrap={false}
          style={{ display: 'flex', flexDirection: 'row', gap }}
        >
          {fila.map((celda, celdaIdx) => (
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
                    marginBottom: dense ? 2 : space.xs,
                  }}
                >
                  <Text
                    style={{
                      ...text.calendarNumeral,
                      fontSize: dense ? 11 : text.calendarNumeral.fontSize,
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
                      fontSize: 7.5,
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
          ))}

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
