import { Text, View } from '@react-pdf/renderer';
import { Document } from '@views/components';
import {
  PdfCard,
  PdfEmpty,
  PdfTable,
  Sheet,
  color,
  periodo,
  semanaDel,
  space,
  stroke,
  text,
} from '@views/design';
import { CircuitVisitType } from '@definition/circuit_visit';
import {
  fmtDayLongEs,
  fmtDayNumEs,
} from '@features/circuit_visit/shared/fmtDayEs';

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

/**
 * Solo el nombre de pila, para los encabezados de las dos columnas de
 * acompañantes. Con el nombre entero, «Con Jonatán Ferrer» ocupaba tres líneas
 * de encabezado y empujaba la tabla hacia abajo; y dentro de la hoja no hay
 * otro Jonatán con quien confundirlo.
 */
const nombreDePila = (nombre: string) => nombre.split(/\s+/)[0] ?? '';

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
      paddingLeft: primera ? 0 : space.md,
      paddingRight: space.md,
      // Hairline INTERIOR, nunca contra el canto de la tarjeta (R7).
      ...(!primera && {
        borderLeft: `${stroke.hairline}px solid ${color.hairline}`,
      }),
    }}
  >
    <Text style={text.label}>
      {[fmtDayLongEs(when.date), when.time].filter(Boolean).join(' · ')}
    </Text>
    <Text style={{ ...text.bodyStrong, marginTop: 2 }}>{label}</Text>
    {when.place ? (
      <Text style={{ ...text.meta, marginTop: 1 }}>{when.place}</Text>
    ) : null}
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
      ? [{ label: 'Reunión con los precursores', ...visit.meeting_pioneers }]
      : []),
    ...(visit.meeting_elders
      ? [{ label: 'Ancianos y siervos ministeriales', ...visit.meeting_elders }]
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
        subtitle={
          <>
            <Text style={text.sheetSubtitle}>
              {`${visitante} · ${semanaDel(visit.date_start, visit.date_end)}`}
            </Text>
            {/* Una hoja sacada de una visita sin publicar tiene que decirlo.
                El PDF enseña lo que hay en pantalla —para eso está: se imprime
                para repasarlo en la reunión de ancianos ANTES de publicar—,
                pero sin esta marca esa misma hoja acaba en el tablón y los
                hermanos leen nombres que aún no se les han comunicado. */}
            {visit.published === false && (
              <Text
                style={{
                  ...text.sheetSubtitle,
                  color: color.warn,
                  fontWeight: 700,
                }}
              >
                {' · BORRADOR (sin publicar)'}
              </Text>
            )}
          </>
        }
        documentName="Visita del superintendente"
        dense={dense}
      >
        <PdfCard
          title="Reuniones de la semana"
          meta="Salón del Reino, salvo indicación"
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
              flush
              dense={dense}
              style={{ marginBottom: space.lg }}
            >
              <PdfTable
                dense={dense}
                emptyText="Sin comidas asignadas."
                columns={[
                  { key: 'dia', header: 'Día', width: 40, muted: true },
                  {
                    key: 'quien',
                    header: 'Anfitrión',
                    flex: true,
                    strong: true,
                  },
                ]}
                rows={mealsRows.map((m) => ({
                  dia: fmtDayNumEs(m.date),
                  quien: m.hostName,
                }))}
              />
            </PdfCard>

            <PdfCard title="Visitas de pastoreo" flush dense={dense}>
              <PdfTable
                dense={dense}
                emptyText="Sin visitas programadas."
                columns={[
                  { key: 'dia', header: 'Día', width: 40, muted: true },
                  { key: 'hora', header: 'Hora', width: 26, muted: true },
                  { key: 'quien', header: 'Hermano', flex: true, strong: true },
                  { key: 'anciano', header: 'Anciano', width: 50 },
                ]}
                rows={shepherdingRows.map((s) => ({
                  dia: fmtDayNumEs(s.date),
                  hora: s.time,
                  quien: s.brotherName,
                  anciano: s.elderName,
                }))}
              />
            </PdfCard>
          </View>

          {/* Derecha, algo más ancha: la predicación, que es lo que más crece */}
          <View style={{ flexGrow: 1.4, flexBasis: 0 }}>
            <PdfCard
              title="Salidas de predicación"
              meta="acompañantes"
              flush
              dense={dense}
            >
              <PdfTable
                dense={dense}
                emptyText="Sin salidas de predicación."
                columns={[
                  { key: 'dia', header: 'Día', width: 40, muted: true },
                  { key: 'hora', header: 'Hora', width: 26, muted: true },
                  { key: 'lugar', header: 'Punto de encuentro', flex: true },
                  {
                    key: 'con',
                    header: `Con ${nombreDePila(coName) || 'él'}`,
                    width: 66,
                    strong: true,
                  },
                  ...(coSpouseName
                    ? [
                        {
                          key: 'conElla',
                          header: `Con ${nombreDePila(coSpouseName)}`,
                          width: 66,
                          strong: true,
                        },
                      ]
                    : []),
                ]}
                rows={preachingRows.map((p) => ({
                  dia: fmtDayNumEs(p.date),
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
