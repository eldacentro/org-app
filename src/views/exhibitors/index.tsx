import { Text, View } from '@react-pdf/renderer';
import { Document } from '@views/components';
import {
  PdfGrid,
  PdfNote,
  Sheet,
  color,
  fechaCorta,
  space,
  text,
} from '@views/design';
import { ExhibitorPDFProps, ExhibitorPDFTurnItem } from './index.types';

/**
 * Programa de exhibidores del mes.
 *
 * Va sobre el sistema de diseño de los PDF (`PDF_DESIGN_SYSTEM.md`), igual que
 * Salidas de predicación: son el mismo documento con distinto contenido, así
 * que comparten `PdfGrid` y no dos copias de la misma cuadrícula.
 */

/** Un turno dentro de una celda del calendario. */
const Turno = ({ turn }: { turn: ExhibitorPDFTurnItem }) => {
  const estado = turn.isCancelled
    ? { acento: color.danger, fondo: color.dangerSoft, tinta: color.danger }
    : turn.isAssigned
      ? { acento: color.accent, fondo: color.accentSoft, tinta: color.ink }
      : { acento: color.warn, fondo: color.warnSoft, tinta: color.warn };

  // Solo el PRIMER responsable lleva la marca, aunque datos antiguos tuvieran
  // más de uno señalado.
  const primerResponsable = turn.assignments.findIndex((a) => a.isResponsible);

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
      <Text style={{ ...text.label, fontSize: 7.2, color: estado.tinta }}>
        {turn.time}
      </Text>

      {turn.isCancelled ? (
        <Text
          style={{
            ...text.body,
            fontSize: 8,
            fontWeight: 600,
            color: color.danger,
            textDecoration: 'line-through',
          }}
        >
          Suspendido
        </Text>
      ) : turn.assignments.length === 0 ? (
        <Text
          style={{
            ...text.body,
            fontSize: 8,
            fontWeight: 600,
            color: color.warn,
          }}
        >
          Sin asignar
        </Text>
      ) : (
        turn.assignments.map((ass, idx) => (
          <Text
            key={idx}
            style={{
              ...text.body,
              fontSize: 8,
              fontWeight: idx === primerResponsable ? 700 : 400,
              color: color.ink,
            }}
          >
            {ass.name}
            {idx === primerResponsable ? ' (R)' : ''}
          </Text>
        ))
      )}
    </PdfNote>
  );
};

const ExhibitorsPDF = ({
  monthName,
  cong_name,
  weekdays,
  cells,
  updatedAt,
}: ExhibitorPDFProps) => {
  const footerDate = fechaCorta(updatedAt);

  // Se parte por SEMANAS enteras, nunca por media. Igual que en Salidas.
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
    <Document title={`Exhibidores - ${monthName}`} lang="es-ES">
      {hojas.map((celdasHoja, hojaIdx) => (
        <Sheet
          key={hojaIdx}
          congregation={cong_name}
          meta={
            hojas.length > 1
              ? `${monthName} · Hoja ${hojaIdx + 1} de ${hojas.length}`
              : monthName
          }
          title="Programa de exhibidores"
          landscape
          footerMeta={
            footerDate ? `Última actualización · ${footerDate}` : monthName
          }
        >
          <PdfGrid
            weekdays={weekdays}
            cells={celdasHoja.map((cell) =>
              cell.type === 'empty'
                ? {}
                : {
                    dayNum: cell.dayNum,
                    content: (
                      <View>
                        {cell.turns.map((turn) => (
                          <Turno key={turn.id} turn={turn} />
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

export default ExhibitorsPDF;
