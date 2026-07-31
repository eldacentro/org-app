import { Text, View } from '@react-pdf/renderer';
import { Document } from '@views/components';
import { PdfBadge, PdfGrid, Sheet, color, fechaPie } from '@views/design';
import type { PdfGridCell } from '@views/design';
import { OutingsPDFProps, OutingPDFItem } from './index.types';

/**
 * Documento 7 · Salidas de predicación. **Un mes, una hoja**, apaisada.
 *
 * Cuadrícula de celdas sueltas: cada día es una tarjetita con su borde y su
 * radio, separadas por un hueco. Una línea por salida — hora, punto y quien
 * dirige.
 */
const Salida = ({ outing }: { outing: OutingPDFItem }) => (
  <View style={{ marginTop: 2 }}>
    <View
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
      }}
    >
      <Text style={{ fontSize: 8, fontWeight: 700, color: color.ink }}>
        {outing.time}
      </Text>
      <Text
        style={{
          fontSize: 8,
          fontWeight: 500,
          color: color.secondary,
          flex: 1,
        }}
      >
        {outing.location}
      </Text>
    </View>

    {outing.isCancelled ? (
      <View style={{ alignSelf: 'flex-start', marginTop: 1 }}>
        <PdfBadge tone="danger">Suspendida</PdfBadge>
      </View>
    ) : outing.isAssigned ? (
      <Text style={{ fontSize: 8, fontWeight: 600, color: color.ink }}>
        {outing.brotherName}
      </Text>
    ) : (
      <View style={{ alignSelf: 'flex-start', marginTop: 1 }}>
        <PdfBadge tone="empty">Sin asignar</PdfBadge>
      </View>
    )}
  </View>
);

const OutingsSchedulePDF = ({
  monthName,
  cong_name,
  weekdays,
  cells,
  updatedAt,
}: OutingsPDFProps) => {
  const semanas = Math.ceil(cells.length / weekdays.length);
  const dense = semanas > 4;

  const celdas: PdfGridCell[] = cells.map((cell, i) =>
    cell.type === 'empty'
      ? { inactive: true }
      : {
          dayNum: cell.dayNum,
          dayName: weekdays[i % weekdays.length].slice(0, 3),
          inactive: cell.outings.length === 0,
          inactiveReason: cell.outings.length === 0 ? 'Sin salidas' : undefined,
          content: (
            <View>
              {cell.outings.map((outing) => (
                <Salida key={outing.id} outing={outing} />
              ))}
            </View>
          ),
        }
  );

  return (
    <Document title="Salidas de predicación" lang="es-ES">
      <Sheet
        congregation={cong_name}
        period={monthName}
        title="Salidas de predicación"
        subtitle="Puntos de salida y quién dirige cada una"
        documentName="Salidas de predicación"
        updatedAt={fechaPie(updatedAt)}
        landscape
      >
        <PdfGrid columns={weekdays.length} cells={celdas} dense={dense} />
      </Sheet>
    </Document>
  );
};

export default OutingsSchedulePDF;
