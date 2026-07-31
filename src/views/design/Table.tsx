import { Text, View } from '@react-pdf/renderer';
import { color, radius, space, stroke, text } from './tokens';

/**
 * LA TABLA. Implementa `PDF_DESIGN_SYSTEM.md` §3.2.
 *
 * **R8 · Tablas sin jaula.** Cebra en las filas pares en lugar de líneas, y
 * NUNCA bordes verticales. La única línea es la de debajo del encabezado.
 *
 * Una rejilla completa dice «cada casilla es una casilla», y eso solo hace
 * falta cuando hay que rellenarla a mano. Las columnas ya están alineadas: eso
 * las separa.
 *
 * **R10 · Lo que se busca, en 600.** La columna del nombre o de la hora va en
 * cuerpo fuerte; las fechas cortas, en 8/600 secundaria.
 */

export type PdfTableColumn = {
  key: string;
  header: string;
  /** Ancho en puntos, o `flex: true` para que se coma lo que sobre. */
  width?: number;
  flex?: boolean;
  /** Lo que se busca: nombre, hora. */
  strong?: boolean;
  /** Fecha corta u otro dato de apoyo. */
  muted?: boolean;
  align?: 'left' | 'right';
};

export type PdfTableRow = Record<string, string>;

const PdfTable = ({
  columns,
  rows,
  dense = false,
  emptyText,
}: {
  columns: PdfTableColumn[];
  rows: PdfTableRow[];
  dense?: boolean;
  emptyText?: string;
}) => {
  const padY = dense ? 3 : 4.5;
  const size = dense ? 8.2 : text.body.fontSize;

  const anchoDe = (col: PdfTableColumn) =>
    col.flex ? { flex: 1 } : { width: col.width };

  if (rows.length === 0) {
    return emptyText ? (
      <Text
        style={{
          fontSize: 8.5,
          fontStyle: 'italic',
          color: color.faint,
          textAlign: 'center',
          paddingVertical: space.md,
        }}
      >
        {emptyText}
      </Text>
    ) : null;
  }

  return (
    <View>
      <View
        fixed
        minPresenceAhead={40}
        style={{
          display: 'flex',
          flexDirection: 'row',
          paddingVertical: 4,
          paddingHorizontal: 9,
          borderBottom: `${stroke.hairline}px solid ${color.border}`,
        }}
      >
        {columns.map((col) => (
          <Text
            key={col.key}
            style={{
              ...text.label,
              ...anchoDe(col),
              textAlign: col.align ?? 'left',
              paddingRight: col.align === 'right' ? 0 : space.md,
            }}
          >
            {col.header}
          </Text>
        ))}
      </View>

      {rows.map((row, idx) => {
        const cebra = idx % 2 === 1;
        const ultima = idx === rows.length - 1;

        return (
          <View
            key={idx}
            wrap={false}
            style={{
              display: 'flex',
              flexDirection: 'row',
              paddingVertical: padY,
              paddingHorizontal: 9,
              ...(cebra && { backgroundColor: color.zebra }),
              // La última fila con cebra lleva su propio radio inferior: si no,
              // el rectángulo asoma por la curva de la tarjeta (R5).
              ...(cebra &&
                ultima && {
                  borderBottomLeftRadius: radius.inner,
                  borderBottomRightRadius: radius.inner,
                }),
            }}
          >
            {columns.map((col) => (
              <Text
                key={col.key}
                style={{
                  ...(col.strong ? text.bodyStrong : text.body),
                  ...(col.muted && {
                    fontSize: 8,
                    fontWeight: 600,
                    color: color.secondary,
                  }),
                  fontSize: col.muted ? 8 : size,
                  ...anchoDe(col),
                  textAlign: col.align ?? 'left',
                  // Sin este hueco, un valor largo toca el de la columna de al
                  // lado y las dos se leen como una sola.
                  paddingRight: col.align === 'right' ? 0 : space.md,
                }}
              >
                {row[col.key] || '—'}
              </Text>
            ))}
          </View>
        );
      })}
    </View>
  );
};

export default PdfTable;
