import { Text, View } from '@react-pdf/renderer';
import { Document } from '@views/components';
import {
  PdfCard,
  PdfEmpty,
  PdfTable,
  Sheet,
  color,
  fechaRango,
  periodo,
  space,
  stroke,
  text,
} from '@views/design';
import { CircuitVisitType } from '@definition/circuit_visit';
import { fmtDayEs } from '@features/circuit_visit/shared/fmtDayEs';

export type CircuitVisitPdfPreachingRow = {
  date: string;
  time: string;
  location: string;
  companionName: string;
  spouseCompanions: string;
};

export type CircuitVisitPdfMealRow = { date: string; hostName: string };

export type CircuitVisitPdfShepherdingRow = {
  date: string;
  time: string;
  brotherName: string;
  elderName: string;
};

export type CircuitVisitPdfMeetingRow = {
  label: string;
  date: string;
  time: string;
  place?: string;
};

type Props = {
  visit: CircuitVisitType;
  coName: string;
  coSpouseName: string;
  congregation: string;
  lang: string;
  mealsRows: CircuitVisitPdfMealRow[];
  shepherdingRows: CircuitVisitPdfShepherdingRow[];
  preachingRows: CircuitVisitPdfPreachingRow[];
  regularMeetings: CircuitVisitPdfMeetingRow[];
};

/**
 * Quita el tratamiento del principio de un nombre. La app nunca lo añade —
 * viene de cómo esté escrito en Ajustes—, pero en una hoja impresa no aporta.
 */
const sinTratamiento = (nombre: string) =>
  nombre.replace(/^\s*(hno\.?|hna\.?|hermano|hermana)\s+/i, '').trim();

/** Una de las cuatro reuniones de la banda superior. */
const Reunion = ({
  label,
  when,
  primera,
}: {
  label: string;
  when: { date: string; time: string; place?: string };
  primera: boolean;
}) => (
  <View
    style={{
      flexGrow: 1,
      flexBasis: 0,
      paddingHorizontal: primera ? 0 : space.lg,
      // Hairline INTERIOR, nunca contra el canto de la tarjeta (R7).
      ...(!primera && {
        borderLeft: `${stroke.hairline}px solid ${color.hairline}`,
      }),
    }}
  >
    <Text style={text.label}>{label}</Text>
    <Text style={{ ...text.bodyStrong, marginTop: 2 }}>
      {fmtDayEs(when.date)}
    </Text>
    <Text style={{ ...text.meta, marginTop: 1 }}>
      {[when.time, when.place].filter(Boolean).join(' · ')}
    </Text>
  </View>
);

/**
 * Documento 4 · Visita del superintendente de circuito. **Una hoja.**
 *
 * Banda de cuatro columnas con las reuniones de la semana arriba, y debajo dos
 * columnas asimétricas (1 : 1,25): a la izquierda comidas y pastoreo, a la
 * derecha las salidas de predicación.
 */
const CircuitVisitProgramDoc = ({
  visit,
  coName: coNameRaw,
  coSpouseName: coSpouseNameRaw,
  congregation,
  lang,
  mealsRows,
  shepherdingRows,
  preachingRows,
  regularMeetings,
}: Props) => {
  const coName = sinTratamiento(coNameRaw);
  const coSpouseName = sinTratamiento(coSpouseNameRaw);

  const reuniones: CircuitVisitPdfMeetingRow[] = [
    ...regularMeetings,
    ...(visit.meeting_pioneers
      ? [{ label: 'Con precursores', ...visit.meeting_pioneers }]
      : []),
    ...(visit.meeting_elders
      ? [{ label: 'Con ancianos y siervos', ...visit.meeting_elders }]
      : []),
  ].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  const filas =
    mealsRows.length + shepherdingRows.length + preachingRows.length;
  const dense = filas > 18;

  const visitante = coName
    ? `${coName}${coSpouseName ? ` y ${coSpouseName}` : ''}`
    : 'Superintendente de circuito';

  return (
    <Document title="Visita del superintendente de circuito" lang={lang}>
      <Sheet
        congregation={congregation}
        period={periodo(visit.date_start, visit.date_end)}
        title="Visita del superintendente de circuito"
        subtitle={`${visitante} · ${fechaRango(visit.date_start, visit.date_end)}`}
        documentName="Visita del superintendente"
        dense={dense}
      >
        <PdfCard
          title="Reuniones de la semana"
          dense={dense}
          style={{ marginBottom: space.lg }}
        >
          {reuniones.length === 0 ? (
            <PdfEmpty>Sin reuniones programadas.</PdfEmpty>
          ) : (
            <View style={{ display: 'flex', flexDirection: 'row' }}>
              {reuniones.map((r, i) => (
                <Reunion
                  key={`${r.date}_${r.time}_${i}`}
                  label={r.label}
                  when={r}
                  primera={i === 0}
                />
              ))}
            </View>
          )}
        </PdfCard>

        <View style={{ display: 'flex', flexDirection: 'row', gap: space.lg }}>
          {/* Izquierda: comidas y pastoreo */}
          <View style={{ flexGrow: 1, flexBasis: 0 }}>
            <PdfCard
              title="Comidas"
              meta={`${mealsRows.length}`}
              flush
              dense={dense}
              style={{ marginBottom: space.lg }}
            >
              <PdfTable
                dense={dense}
                emptyText="Sin comidas asignadas."
                columns={[
                  { key: 'dia', header: 'Día', width: 58, muted: true },
                  {
                    key: 'quien',
                    header: 'Anfitrión',
                    flex: true,
                    strong: true,
                  },
                ]}
                rows={mealsRows.map((m) => ({
                  dia: fmtDayEs(m.date),
                  quien: m.hostName,
                }))}
              />
            </PdfCard>

            <PdfCard
              title="Visitas de pastoreo"
              meta={`${shepherdingRows.length}`}
              flush
              dense={dense}
            >
              <PdfTable
                dense={dense}
                emptyText="Sin visitas programadas."
                columns={[
                  { key: 'dia', header: 'Día', width: 52, muted: true },
                  { key: 'hora', header: 'Hora', width: 30, muted: true },
                  { key: 'quien', header: 'Hermano', flex: true, strong: true },
                  { key: 'anciano', header: 'Anciano', flex: true },
                ]}
                rows={shepherdingRows.map((s) => ({
                  dia: fmtDayEs(s.date),
                  hora: s.time,
                  quien: s.brotherName,
                  anciano: s.elderName,
                }))}
              />
            </PdfCard>
          </View>

          {/* Derecha, algo más ancha: la predicación, que es lo que más crece */}
          <View style={{ flexGrow: 1.25, flexBasis: 0 }}>
            <PdfCard
              title="Salidas de predicación"
              meta={`${preachingRows.length}`}
              flush
              dense={dense}
            >
              <PdfTable
                dense={dense}
                emptyText="Sin salidas de predicación."
                columns={[
                  { key: 'dia', header: 'Día', width: 52, muted: true },
                  { key: 'hora', header: 'Hora', width: 30, muted: true },
                  { key: 'lugar', header: 'Punto de salida', flex: true },
                  {
                    key: 'con',
                    header: `Con ${coName || 'él'}`,
                    flex: true,
                    strong: true,
                  },
                  ...(coSpouseName
                    ? [
                        {
                          key: 'conElla',
                          header: `Con ${coSpouseName}`,
                          flex: true,
                        },
                      ]
                    : []),
                ]}
                rows={preachingRows.map((p) => ({
                  dia: fmtDayEs(p.date),
                  hora: p.time,
                  lugar: p.location,
                  con: p.companionName,
                  conElla: p.spouseCompanions,
                }))}
              />
            </PdfCard>
          </View>
        </View>
      </Sheet>
    </Document>
  );
};

export default CircuitVisitProgramDoc;
