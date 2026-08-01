import { Text, View } from '@react-pdf/renderer';
import { Document } from '@views/components';
import {
  PdfBadge,
  PdfBullet,
  PdfGrid,
  Sheet,
  color,
  fechaPie,
  size,
  space,
} from '@views/design';
import type { PdfGridCell } from '@views/design';
import { OutingsPDFProps, OutingPDFItem } from './index.types';

/**
 * Documento 7 · Salidas de predicación. **Un mes, una hoja**, apaisada.
 *
 * Cuadrícula de celdas sueltas: cada día es una tarjetita con su borde y su
 * radio, separadas por un hueco. Los días de la semana van en el encabezado de
 * la cuadrícula; dentro de la celda solo el numeral y una línea por salida —
 * hora, punto y quién dirige.
 *
 * El modo compacto no lo decide el calendario sino el CONTENIDO: un mes de seis
 * semanas con una salida al día cabe de sobra, y uno de cuatro con tres al día
 * no cabe. Lo que llena la hoja son las salidas, así que son ellas las que
 * mandan.
 */
const Salida = ({
  outing,
  dense,
  primero,
}: {
  outing: OutingPDFItem;
  dense: boolean;
  primero: boolean;
}) => {
  const cuerpo = dense ? size.label : size.meta;

  return (
    <View style={{ marginTop: primero ? 0 : dense ? space.sm : space.md }}>
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: 4,
        }}
      >
        {/* La hora, en el azul del numeral: es estructura de la salida, no una
            persona, y así no se confunde con el nombre de debajo. */}
        <Text
          style={{ fontSize: cuerpo, fontWeight: 700, color: color.accentDark }}
        >
          {outing.time}
        </Text>
        <Text
          style={{
            fontSize: cuerpo,
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
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 3,
            marginTop: 1,
          }}
        >
          <PdfBullet />
          <Text style={{ fontSize: cuerpo, fontWeight: 600, color: color.ink }}>
            {outing.brotherName}
          </Text>
        </View>
      ) : (
        <View style={{ alignSelf: 'flex-start', marginTop: 1 }}>
          <PdfBadge tone="empty">Sin asignar</PdfBadge>
        </View>
      )}
    </View>
  );
};

const OutingsSchedulePDF = ({
  monthName,
  cong_name,
  weekdays,
  cells,
  updatedAt,
}: OutingsPDFProps) => {
  const semanas = Math.ceil(cells.length / weekdays.length);
  const masSalidasEnUnDia = cells.reduce(
    (n, cell) => (cell.type === 'empty' ? n : Math.max(n, cell.outings.length)),
    0
  );
  const dense = semanas * masSalidasEnUnDia > 8;

  const celdas: PdfGridCell[] = cells.map((cell) =>
    cell.type === 'empty'
      ? { filler: true }
      : {
          dayNum: cell.dayNum,
          inactive: cell.outings.length === 0,
          inactiveReason: cell.outings.length === 0 ? 'Sin salidas' : undefined,
          content: (
            <View>
              {cell.outings.map((outing, i) => (
                <Salida
                  key={outing.id}
                  outing={outing}
                  dense={dense}
                  primero={i === 0}
                />
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
        documentName="Salidas de predicación"
        updatedAt={fechaPie(updatedAt)}
        landscape
      >
        <PdfGrid
          columns={weekdays.length}
          headers={weekdays}
          cells={celdas}
          dense={dense}
        />
      </Sheet>
    </Document>
  );
};

export default OutingsSchedulePDF;
