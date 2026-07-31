import { Text, View } from '@react-pdf/renderer';
import { Document } from '@views/components';
import {
  PdfGrid,
  PdfNote,
  Sheet,
  color,
  space,
  text,
  fechaCorta,
} from '@views/design';
import { OutingsPDFProps, OutingPDFItem } from './index.types';

/**
 * Salidas de predicación del mes.
 *
 * Reconstruido sobre el sistema de diseño de los PDF
 * (`PDF_DESIGN_SYSTEM.md`). La cuadrícula la dibuja `PdfGrid`, que es quien
 * arregla los dos defectos que tenía —las verticales que no llegaban abajo y
 * las esquinas de abajo blancas—; están contados en la regla §5.3.
 */

/** Una salida dentro de una celda del calendario. */
const Salida = ({
  outing,
  showLocation,
  dense,
}: {
  outing: OutingPDFItem;
  showLocation: boolean;
  dense: boolean;
}) => {
  // El color dice el ESTADO, no adorna: azul asignada, ámbar sin asignar,
  // rojo suspendida.
  const estado = outing.isCancelled
    ? { acento: color.danger, fondo: color.dangerSoft, tinta: color.danger }
    : outing.isAssigned
      ? { acento: color.accent, fondo: color.accentSoft, tinta: color.ink }
      : { acento: color.warn, fondo: color.warnSoft, tinta: color.warn };

  return (
    <PdfNote
      accent={estado.acento}
      soft={estado.fondo}
      style={{
        paddingVertical: dense ? 1.4 : space.xs,
        paddingRight: space.sm,
        marginBottom: dense ? 1.6 : space.xs,
      }}
    >
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: space.sm - 1,
        }}
      >
        <Text
          style={{
            ...text.label,
            fontSize: dense ? 6.6 : 7.2,
            color: estado.tinta,
          }}
        >
          {outing.time}
        </Text>
        <Text
          style={{
            ...text.body,
            fontSize: dense ? 7.4 : 8,
            fontWeight: 600,
            color: estado.tinta,
            flex: 1,
            ...(outing.isCancelled && {
              textDecoration: 'line-through' as const,
            }),
          }}
        >
          {outing.isCancelled ? 'Suspendida' : outing.brotherName}
        </Text>
      </View>

      {!outing.isCancelled && showLocation && outing.location ? (
        <Text style={{ ...text.body, fontSize: 7.4, color: color.muted }}>
          {outing.location}
        </Text>
      ) : null}
    </PdfNote>
  );
};

const OutingsSchedulePDF = ({
  monthName,
  cong_name,
  weekdays,
  cells,
  updatedAt,
}: OutingsPDFProps) => {
  const footerDate = fechaCorta(updatedAt);

  // El mes entero en UNA hoja: es lo que se cuelga en el tablón, y partido en
  // dos deja de servir para eso.
  //
  // Como el número de semanas no lo decide el diseño —hay meses de cuatro
  // filas y de seis—, la hoja se aprieta sola cuando hay más (regla §5.6 del
  // sistema).
  const semanas = Math.ceil(cells.length / weekdays.length);
  const dense = semanas > 4;

  return (
    <Document title={`Salidas de predicación - ${monthName}`} lang="es-ES">
      <Sheet
        congregation={cong_name}
        meta={monthName}
        title="Salidas de predicación"
        landscape
        footerMeta={
          footerDate ? `Última actualización · ${footerDate}` : monthName
        }
      >
        <PdfGrid
          weekdays={weekdays}
          dense={dense}
          cells={cells.map((cell, i) =>
            cell.type === 'empty'
              ? {}
              : {
                  dayNum: cell.dayNum,
                  content: (
                    <View>
                      {cell.outings.map((outing) => (
                        <Salida
                          key={outing.id}
                          outing={outing}
                          dense={dense}
                          // El punto de salida, solo en domingo: entre semana
                          // es siempre el mismo, y repetirlo en cada celda
                          // llena la hoja de una línea que nadie lee.
                          showLocation={weekdays[i % weekdays.length]
                            .toLowerCase()
                            .startsWith('d')}
                        />
                      ))}
                    </View>
                  ),
                }
          )}
        />
      </Sheet>
    </Document>
  );
};

export default OutingsSchedulePDF;
