import { Text, View } from '@react-pdf/renderer';
import { Document } from '@views/components';
import {
  PdfEmpty,
  PdfNote,
  PdfSection,
  PdfTable,
  Sheet,
  color,
  space,
  text,
} from '@views/design';
import type { PdfTableColumn } from '@views/design';
import { CircuitVisitType } from '@definition/circuit_visit';
import { fmtDayEs, fmtRangeEs } from '@features/circuit_visit/shared/fmtDayEs';

export type CircuitVisitPdfPreachingRow = {
  date: string;
  time: string;
  location: string;
  companionName: string; // hermano que acompaña al CO
  spouseCompanions: string; // hermanas con la esposa (texto ya formateado)
};

// El programa de comidas no distingue entre comida y cena: una comida es una
// comida, y la sección ya se llama así.
export type CircuitVisitPdfMealRow = {
  date: string;
  hostName: string;
};

export type CircuitVisitPdfShepherdingRow = {
  date: string;
  time: string;
  brotherName: string;
  elderName: string;
};

/**
 * Las reuniones de siempre —entre semana y fin de semana— durante la semana de
 * la visita. No se guardan en la visita: el día y la hora salen de Ajustes de
 * congregación, y quien monta el PDF ya las trae resueltas a fecha.
 */
export type CircuitVisitPdfMeetingRow = {
  label: string;
  date: string;
  time: string;
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

const fmtDay = fmtDayEs;

/**
 * Quita el tratamiento —"Hno.", "Hermano", "Hna.", "Hermana"— del principio de
 * un nombre.
 *
 * La app nunca lo añade: viene de cómo esté escrito el nombre en Ajustes. Pero
 * en esta hoja el nombre aparece también como rótulo de columna, y ahí va en
 * versalitas: un "CON HNO. JUAN ANTONIO PÉREZ" ocupa dos líneas y grita. Solo
 * afecta a lo que se imprime; lo guardado no se toca.
 */
const sinTratamiento = (nombre: string) =>
  nombre.replace(/^\s*(hno\.?|hna\.?|hermano|hermana)\s+/i, '').trim();

/**
 * A partir de cuántas filas el programa se aprieta para caber en una hoja.
 * Medido renderizando y contando páginas, no calculado (regla §5.6 del
 * sistema): con 15 filas entra holgado y con 16 se iba a una segunda hoja.
 */
const DENSIDAD = { holgado: 15 };

/** Una cita del itinerario. */
type Cita = {
  label: string;
  date: string;
  time: string;
  place?: string;
  /** Las de siempre se pintan más discretas que las especiales. */
  habitual?: boolean;
};

const CitaBloque = ({ cita, dense }: { cita: Cita; dense: boolean }) => (
  <PdfNote
    accent={cita.habitual ? color.line : color.accent}
    soft={cita.habitual ? color.white : color.accentSoft}
    style={{
      paddingVertical: dense ? space.xs + 1 : space.sm + 1,
      marginBottom: space.sm - 1,
    }}
  >
    <Text
      style={{
        ...text.body,
        fontSize: dense ? 9 : 9.8,
        fontWeight: 700,
      }}
    >
      {cita.label}
    </Text>
    <Text
      style={{
        ...text.body,
        fontSize: dense ? 8.4 : 9.2,
        fontWeight: 500,
        color: cita.habitual ? color.muted : color.accent,
        marginTop: 1,
      }}
    >
      {[fmtDay(cita.date), cita.time, cita.place].filter(Boolean).join('  ·  ')}
    </Text>
  </PdfNote>
);

/**
 * Reparte las citas en las DOS columnas del itinerario: las de siempre a un
 * lado y las especiales al otro. Si un lado se queda vacío, media hoja en
 * blanco al lado de dos bloques queda peor que no tener cuadrícula, así que se
 * parte por la mitad lo que haya.
 */
const repartirEnDosColumnas = (habituales: Cita[], especiales: Cita[]) => {
  if (habituales.length > 0 && especiales.length > 0) {
    return [habituales, especiales];
  }

  const todas = [...habituales, ...especiales];
  const corte = Math.ceil(todas.length / 2);

  return [todas.slice(0, corte), todas.slice(corte)];
};

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

  // El itinerario lleva las cuatro reuniones de la semana: las dos de siempre
  // —a las que va toda la congregación— y las especiales de la visita. En dos
  // columnas y no en lista: en vertical se comían cuatro bloques de alto y
  // empujaban el programa a una segunda hoja.
  const porFecha = (a: Cita, b: Cita) =>
    `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);

  const habituales: Cita[] = regularMeetings
    .map((meeting) => ({ ...meeting, habitual: true }))
    .sort(porFecha);

  const especiales: Cita[] = [
    ...(visit.meeting_pioneers
      ? [{ label: 'Reunión con precursores', ...visit.meeting_pioneers }]
      : []),
    ...(visit.meeting_elders
      ? [
          {
            label: 'Reunión con ancianos y siervos ministeriales',
            ...visit.meeting_elders,
          },
        ]
      : []),
  ].sort(porFecha);

  const [izquierda, derecha] = repartirEnDosColumnas(habituales, especiales);
  const hayItinerario = habituales.length + especiales.length > 0;

  const visitorName = coName
    ? `${coName}${coSpouseName ? ` y ${coSpouseName}` : ''}`
    : 'Programa de la visita';

  // Las filas de las tres tablas son lo único que crece sin control; el resto
  // de la hoja mide siempre lo mismo.
  const dense =
    mealsRows.length + shepherdingRows.length + preachingRows.length >
    DENSIDAD.holgado;

  // Los anchos de la tabla de predicación dependen de si hay esposa: la
  // columna "con ella" solo existe cuando la hay, y si no se recalculan, la
  // tabla se queda corta y deja una quinta parte de la hoja en blanco.
  const columnasPredicacion: PdfTableColumn[] = [
    {
      key: 'dia',
      header: 'Día',
      width: coSpouseName ? '19%' : '24%',
      emphasis: true,
    },
    {
      key: 'hora',
      header: 'Hora',
      width: coSpouseName ? '11%' : '14%',
      muted: true,
    },
    {
      key: 'lugar',
      header: 'Punto de salida',
      width: coSpouseName ? '27%' : '34%',
    },
    {
      key: 'con',
      header: `Con ${coName}`,
      width: coSpouseName ? '21.5%' : '28%',
    },
    ...(coSpouseName
      ? [
          {
            key: 'conElla',
            header: `Con ${coSpouseName}`,
            width: '21.5%',
          } as PdfTableColumn,
        ]
      : []),
  ];

  return (
    <Document title="Visita del Superintendente de Circuito" lang={lang}>
      <Sheet
        congregation={congregation}
        meta={fmtRangeEs(visit.date_start, visit.date_end)}
        title="Visita del superintendente de circuito"
        subtitle={visitorName}
        paginated
        footerMeta={fmtRangeEs(visit.date_start, visit.date_end)}
      >
        <PdfSection title="Itinerario de reuniones" dense={dense}>
          {hayItinerario ? (
            <View
              style={{ display: 'flex', flexDirection: 'row', gap: space.md }}
            >
              {[izquierda, derecha].map((columna, col) => (
                <View key={col} style={{ flexGrow: 1, flexBasis: 0 }}>
                  {columna.map((cita, idx) => (
                    <CitaBloque
                      key={`${cita.date}_${cita.time}_${idx}`}
                      cita={cita}
                      dense={dense}
                    />
                  ))}
                </View>
              ))}
            </View>
          ) : (
            <PdfEmpty>Sin reuniones programadas.</PdfEmpty>
          )}
        </PdfSection>

        <PdfSection title="Programa de comidas" dense={dense}>
          <PdfTable
            dense={dense}
            emptyText="Sin comidas asignadas."
            columns={[
              { key: 'dia', header: 'Día', width: '30%', emphasis: true },
              { key: 'quien', header: 'Anfitrión', width: '70%' },
            ]}
            rows={mealsRows.map((meal) => ({
              dia: fmtDay(meal.date),
              quien: meal.hostName,
            }))}
          />
        </PdfSection>

        <PdfSection title="Visitas" dense={dense}>
          <PdfTable
            dense={dense}
            emptyText="Sin visitas de pastoreo programadas."
            columns={[
              { key: 'dia', header: 'Día', width: '19%', emphasis: true },
              { key: 'hora', header: 'Hora', width: '11%', muted: true },
              { key: 'hermano', header: 'Hermano visitado', width: '35%' },
              { key: 'anciano', header: 'Anciano acompañante', width: '35%' },
            ]}
            rows={shepherdingRows.map((sv) => ({
              dia: fmtDay(sv.date),
              hora: sv.time,
              hermano: sv.brotherName,
              anciano: sv.elderName,
            }))}
          />
        </PdfSection>

        <PdfSection title="Programa de predicación" dense={dense}>
          <PdfTable
            dense={dense}
            emptyText="Sin salidas de predicación."
            columns={columnasPredicacion}
            rows={preachingRows.map((row) => ({
              dia: fmtDay(row.date),
              hora: row.time,
              lugar: row.location,
              con: row.companionName,
              conElla: row.spouseCompanions,
            }))}
          />
        </PdfSection>
      </Sheet>
    </Document>
  );
};

export default CircuitVisitProgramDoc;
