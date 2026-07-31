import { Text, View } from '@react-pdf/renderer';
import { Document } from '@views/components';
import {
  PdfBadge,
  PdfDiamond,
  PdfGrid,
  Sheet,
  color,
  fechaPie,
  space,
  text,
} from '@views/design';
import type { PdfGridCell } from '@views/design';
import { ExhibitorPDFProps, ExhibitorPDFTurnItem } from './index.types';

/**
 * Documento 6 · Programa de exhibidores. Un mes, una hoja, apaisada.
 *
 * La misma cuadrícula que Salidas de predicación: son el mismo documento con
 * distinto contenido, así que comparten `PdfGrid`.
 *
 * El responsable del turno lleva el rombo, la misma marca que el precursor en
 * Grupos de predicación.
 */
const Turno = ({ turn }: { turn: ExhibitorPDFTurnItem }) => {
  const primerResponsable = turn.assignments.findIndex((a) => a.isResponsible);

  return (
    <View style={{ marginTop: 2 }}>
      <Text style={{ fontSize: 8, fontWeight: 700, color: color.ink }}>
        {turn.time}
      </Text>

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
          <Text
            key={idx}
            style={{ fontSize: 8.5, fontWeight: 600, color: color.ink }}
          >
            {ass.name}
            {idx === primerResponsable ? <PdfDiamond /> : null}
          </Text>
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
  const dense = semanas > 4;

  const celdas: PdfGridCell[] = cells.map((cell, i) =>
    cell.type === 'empty'
      ? { inactive: true }
      : {
          dayNum: cell.dayNum,
          dayName: weekdays[i % weekdays.length].slice(0, 3),
          inactive: cell.turns.length === 0,
          inactiveReason: cell.turns.length === 0 ? 'Sin turnos' : undefined,
          content: (
            <View>
              {cell.turns.map((turn) => (
                <Turno key={turn.id} turn={turn} />
              ))}
            </View>
          ),
        }
  );

  return (
    <Document title="Programa de exhibidores" lang="es-ES">
      <Sheet
        congregation={cong_name}
        period={monthName}
        title="Programa de exhibidores"
        subtitle="Exhibidores públicos · turnos y responsables"
        documentName="Programa de exhibidores"
        updatedAt={fechaPie(updatedAt)}
        landscape
      >
        <PdfGrid columns={weekdays.length} cells={celdas} dense={dense} />

        <Text style={{ ...text.meta, color: color.faint, marginTop: space.md }}>
          <PdfDiamond /> responsable del turno
        </Text>
      </Sheet>
    </Document>
  );
};

export default ExhibitorsPDF;
