import { ReactNode } from 'react';
import { Style } from '@react-pdf/stylesheet';
import { Text, View } from '@react-pdf/renderer';
import { color, radius, space, stroke, text } from './tokens';

/**
 * LA TABLA del sistema.
 *
 * ── La regla ─────────────────────────────────────────────────────────────
 *
 * **Una tabla no lleva rejilla.** Ni líneas verticales entre columnas, ni una
 * línea bajo cada fila. Lo único que se dibuja es una línea bajo la cabecera;
 * las filas se separan con una franja alterna.
 *
 * No es capricho. Una rejilla completa dice "cada casilla es una casilla", y
 * eso solo hace falta cuando hay que rellenarla a mano. Aquí las columnas ya
 * están alineadas —eso las separa— y las líneas solo añaden ruido: se probó
 * con líneas Y franja a la vez y la franja parecía suciedad.
 *
 * La franja empieza en la PRIMERA fila. La cabecera no tiene fondo, así que si
 * la primera fila tampoco lo tuviera quedarían dos blancos seguidos arriba y
 * la cuenta arrancaría mal.
 *
 * ── Cómo se usa ──────────────────────────────────────────────────────────
 *
 * ```tsx
 * <PdfTable
 *   columns={[
 *     { key: 'dia', header: 'Día', width: '19%', emphasis: true },
 *     { key: 'hora', header: 'Hora', width: '11%', muted: true },
 *     { key: 'quien', header: 'Anfitrión', width: '70%' },
 *   ]}
 *   rows={comidas.map((c) => ({ dia: fmt(c.date), hora: c.time, quien: c.host }))}
 *   dense={muchasFilas}
 * />
 * ```
 *
 * `width` en porcentaje y sumando 100. Si una columna depende de los datos —la
 * de "con su esposa" solo existe si el superintendente viene acompañado— se
 * monta el array de columnas antes, no se pinta una columna vacía.
 */

export type PdfTableColumn = {
  key: string;
  header: string;
  /** Porcentaje. Entre todas tienen que sumar 100. */
  width: string;
  /** La columna por la que se busca (casi siempre el día): va en semibold. */
  emphasis?: boolean;
  /** Un dato de apoyo (la hora): va en gris. */
  muted?: boolean;
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
  /** Aprieta la tabla para que quepa más. Lo decide el documento, no la tabla. */
  dense?: boolean;
  /** Qué decir cuando no hay ninguna fila. */
  emptyText?: string;
}) => {
  if (rows.length === 0) {
    return emptyText ? (
      <Text style={{ ...text.body, color: color.muted, fontStyle: 'italic' }}>
        {emptyText}
      </Text>
    ) : null;
  }

  const cellPad = dense ? space.xs : space.sm;
  const cellFont = dense ? 8.6 : text.body.fontSize;
  const headFont = dense ? 7.2 : text.label.fontSize;

  return (
    <View>
      {/* `fixed`: si la tabla parte a la página siguiente, sus rótulos se
          repiten arriba. Solo se repiten mientras SU tabla sigue corriendo. */}
      <View
        fixed
        style={{
          display: 'flex',
          flexDirection: 'row',
          paddingBottom: space.sm,
          borderBottom: `${stroke.thin}px solid ${color.line}`,
        }}
      >
        {columns.map((col) => (
          <Text
            key={col.key}
            style={{
              ...text.label,
              fontSize: headFont,
              width: col.width,
              paddingHorizontal: space.sm,
            }}
          >
            {col.header}
          </Text>
        ))}
      </View>

      {rows.map((row, idx) => (
        <View
          key={idx}
          wrap={false}
          style={{
            display: 'flex',
            flexDirection: 'row',
            paddingVertical: cellPad,
            borderRadius: radius.sm,
            ...(idx % 2 === 0 && { backgroundColor: color.zebra }),
          }}
        >
          {columns.map((col) => (
            <Text
              key={col.key}
              style={{
                ...(col.emphasis ? text.bodyStrong : text.body),
                fontSize: cellFont,
                ...(col.muted && { color: color.muted }),
                width: col.width,
                paddingHorizontal: space.sm,
              }}
            >
              {row[col.key] || '—'}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
};

/**
 * Una fila de "rótulo: valor", para cuando NO hay tabla — dos o tres datos
 * sueltos dentro de una tarjeta.
 *
 * El rótulo y el valor no se separan con una rayita: los separa el color y el
 * peso. Una línea bajo cada dato convierte la hoja en un impreso para rellenar
 * a mano, que es justo lo que estos papeles no son.
 */
export const PdfKeyValue = ({
  label,
  children,
  labelWidth = 90,
  style,
}: {
  label: string;
  children: ReactNode;
  labelWidth?: number;
  style?: Style;
}) => (
  <View
    style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'baseline',
      paddingVertical: space.xs,
      gap: space.md,
      ...style,
    }}
  >
    <Text style={{ ...text.label, width: labelWidth }}>{label}</Text>
    {typeof children === 'string' ? (
      <Text style={{ ...text.bodyStrong, flex: 1 }}>{children}</Text>
    ) : (
      <View style={{ flex: 1 }}>{children}</View>
    )}
  </View>
);

export default PdfTable;
