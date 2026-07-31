import { Text, View } from '@react-pdf/renderer';
import { Document, fechaCorta } from '@views/components';
import { PdfGrid, PdfNote, Sheet, color, space, text } from '@views/design';
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
}: {
  outing: OutingPDFItem;
  showLocation: boolean;
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
        paddingVertical: space.xs,
        paddingRight: space.sm,
        marginBottom: space.xs,
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
        <Text style={{ ...text.label, fontSize: 7.2, color: estado.tinta }}>
          {outing.time}
        </Text>
        <Text
          style={{
            ...text.body,
            fontSize: 8,
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

  // Un mes no cabe de una vez en apaisado: se parte en hojas de tres semanas.
  // El corte va por SEMANAS enteras, nunca por la mitad de una — medido: con
  // cuatro filas la última se salía por abajo y el marco quedaba cortado.
  const SEMANAS_POR_HOJA = 3;
  const semanas: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += weekdays.length) {
    semanas.push(cells.slice(i, i + weekdays.length));
  }
  const hojas: (typeof cells)[] = [];
  for (let i = 0; i < semanas.length; i += SEMANAS_POR_HOJA) {
    hojas.push(semanas.slice(i, i + SEMANAS_POR_HOJA).flat());
  }

  return (
    <Document title={`Salidas de predicación - ${monthName}`} lang="es-ES">
      {hojas.map((celdasHoja, hojaIdx) => (
        <Sheet
          key={hojaIdx}
          congregation={cong_name}
          meta={
            hojas.length > 1
              ? `${monthName} · Hoja ${hojaIdx + 1} de ${hojas.length}`
              : monthName
          }
          title="Salidas de predicación"
          landscape
          footerMeta={
            footerDate ? `Última actualización · ${footerDate}` : monthName
          }
        >
          <PdfGrid
            weekdays={weekdays}
            cells={celdasHoja.map((cell, i) =>
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
      ))}
    </Document>
  );
};

export default OutingsSchedulePDF;
