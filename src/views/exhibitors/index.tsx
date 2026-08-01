import { Text, View } from '@react-pdf/renderer';
import { Document } from '@views/components';
import {
  PdfBadge,
  PdfDiamond,
  PdfGrid,
  Sheet,
  color,
  fechaPie,
  size,
  text,
} from '@views/design';
import type { PdfGridCell } from '@views/design';
import { ExhibitorPDFProps, ExhibitorPDFTurnItem } from './index.types';

/**
 * Documento 6 · Programa de exhibidores. Un mes, una hoja, apaisada.
 *
 * La misma cuadrícula que Salidas de predicación: son el mismo documento con
 * distinto contenido, así que comparten `PdfGrid`. Los días van arriba, en el
 * encabezado; las semanas, en el canalón de la izquierda. La semana se lee en
 * horizontal y «mi día» en vertical.
 *
 * El responsable del turno lleva el rombo, la misma marca que el precursor en
 * Grupos de predicación.
 */
const Turno = ({
  turn,
  dense,
}: {
  turn: ExhibitorPDFTurnItem;
  dense: boolean;
}) => {
  const primerResponsable = turn.assignments.findIndex((a) => a.isResponsible);
  const cuerpo = dense ? size.label : size.meta;

  return (
    <View style={{ marginTop: dense ? 1.5 : 2.5 }}>
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: 3,
        }}
      >
        <Text style={{ fontSize: cuerpo, fontWeight: 700, color: color.ink }}>
          {turn.time}
        </Text>
        {turn.location ? (
          <Text
            style={{
              fontSize: cuerpo,
              fontWeight: 500,
              color: color.secondary,
              flex: 1,
            }}
          >
            {turn.location}
          </Text>
        ) : null}
      </View>

      {turn.isCancelled ? (
        <View style={{ alignSelf: 'flex-start', marginTop: 1 }}>
          <PdfBadge tone="danger">Suspendido</PdfBadge>
        </View>
      ) : turn.assignments.length === 0 ? (
        <View style={{ alignSelf: 'flex-start', marginTop: 1 }}>
          <PdfBadge tone="empty">Sin asignar</PdfBadge>
        </View>
      ) : (
        turn.assignments.map((ass, idx) => (
          // Fila y no <Text>: el rombo se dibuja, y un dibujo no cabe dentro
          // de una línea de texto en react-pdf.
          <View
            key={idx}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <Text style={{ fontSize: cuerpo, fontWeight: 600 }}>
              {ass.name}
            </Text>
            {idx === primerResponsable ? <PdfDiamond /> : null}
          </View>
        ))
      )}
    </View>
  );
};

const ExhibitorsPDF = ({
  monthName,
  cong_name,
  weekdays,
  cells,
  updatedAt,
}: ExhibitorPDFProps) => {
  const semanas = Math.ceil(cells.length / weekdays.length);
  const masTurnosEnUnDia = cells.reduce(
    (n, cell) => (cell.type === 'empty' ? n : Math.max(n, cell.turns.length)),
    0
  );
  const dense = semanas * masTurnosEnUnDia > 8;

  const celdas: PdfGridCell[] = cells.map((cell) =>
    cell.type === 'empty'
      ? { filler: true }
      : {
          dayNum: cell.dayNum,
          inactive: cell.turns.length === 0,
          inactiveReason: cell.turns.length === 0 ? 'Sin turnos' : undefined,
          content: (
            <View>
              {cell.turns.map((turn) => (
                <Turno key={turn.id} turn={turn} dense={dense} />
              ))}
            </View>
          ),
        }
  );

  const semanaDe = Array.from({ length: semanas }, (_, i) => `Semana ${i + 1}`);

  return (
    <Document title="Programa de exhibidores" lang="es-ES">
      <Sheet
        congregation={cong_name}
        period={monthName}
        title="Programa de exhibidores"
        subtitle={
          <>
            <Text style={text.sheetSubtitle}>
              El responsable de turno lleva{' '}
            </Text>
            <PdfDiamond size={5.5} />
          </>
        }
        documentName="Programa de exhibidores"
        updatedAt={fechaPie(updatedAt)}
        landscape
      >
        <PdfGrid
          columns={weekdays.length}
          headers={weekdays}
          rowLabels={semanaDe}
          cells={celdas}
          dense={dense}
        />
      </Sheet>
    </Document>
  );
};

export default ExhibitorsPDF;
