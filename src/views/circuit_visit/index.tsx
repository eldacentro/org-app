import { ReactNode } from 'react';
import { Page, Text, View } from '@react-pdf/renderer';
import {
  AccentCapsule,
  Document,
  accentCapsuleSurface,
} from '@views/components';
import { IconLogo } from '@views/components/icons';
import { CircuitVisitType } from '@definition/circuit_visit';
import { fmtDayEs, fmtRangeEs } from '@features/circuit_visit/shared/fmtDayEs';
import { COLOR_CAPSULA, PAGE_PADDING, styles } from './index.styles';

export type CircuitVisitPdfPreachingRow = {
  date: string;
  time: string;
  location: string;
  companionName: string; // hermano que acompaña al CO
  spouseCompanions: string; // hermanas con la esposa (texto ya formateado)
};

// El programa de comidas no distingue entre comida y cena: una comida es una
// comida, y la sección ya se llama así. `CircuitVisitMeal` tiene un campo
// `note` que nadie rellena —no hay ningún sitio en la app donde escribirlo— y
// que aquí salía entre paréntesis detrás del anfitrión; era la única puerta por
// la que podía colarse un "(Cena)" en la hoja.
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

const fmtRange = (visit: CircuitVisitType) =>
  fmtRangeEs(visit.date_start, visit.date_end);

/**
 * Quita el tratamiento —"Hno.", "Hermano", "Hna.", "Hermana"— del principio de
 * un nombre.
 *
 * La app nunca lo añade: viene de cómo esté escrito el nombre del
 * superintendente en Ajustes de congregación. Pero en esta hoja el nombre
 * aparece también como rótulo de columna, y ahí va en VERSALITAS: un "CON HNO.
 * JUAN ANTONIO PÉREZ" ocupa dos líneas y grita. En un programa impreso el
 * tratamiento no aporta nada — se sabe de quién se habla.
 *
 * Solo afecta a lo que se imprime; lo guardado en Ajustes no se toca.
 */
const sinTratamiento = (nombre: string) =>
  nombre.replace(/^\s*(hno\.?|hna\.?|hermano|hermana)\s+/i, '').trim();

/**
 * A partir de cuántas filas el programa se aprieta para caber en una hoja.
 *
 * Medido renderizando el PDF y contando páginas, no calculado: con nombres
 * largos de verdad ("Familia Martínez Rodríguez", "Rafael Ibáñez Cremades",
 * que ocupan dos líneas en las columnas estrechas), 15 filas es lo último que
 * entra en el tamaño normal — con 16 ya se va a una segunda hoja.
 *
 * Por encima de 15 la hoja pasa sola a la densidad apretada, que aguanta al
 * menos 25 filas: cinco comidas, seis visitas de pastoreo y catorce salidas de
 * predicación, más de lo que trae ninguna visita real.
 */
const DENSIDAD = { holgado: 15 };

/** Una sección con su título; el contenido lo pone quien la usa. */
const Section = ({
  title,
  compacto,
  children,
}: {
  title: string;
  compacto: boolean;
  children: ReactNode;
}) => (
  <View
    style={compacto ? [styles.section, styles.sectionCompact] : styles.section}
    minPresenceAhead={48}
  >
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const Empty = ({ children }: { children: string }) => (
  <Text style={styles.empty}>{children}</Text>
);

/** Una cita del itinerario: qué reunión es y cuándo (y dónde, si se sabe). */
type Cita = {
  label: string;
  date: string;
  time: string;
  place?: string;
  /** Las de siempre se pintan más discretas que las especiales. */
  habitual?: boolean;
};

const ItineraryRow = ({
  cita,
  compacto,
}: {
  cita: Cita;
  compacto: boolean;
}) => {
  const cuando = [fmtDay(cita.date), cita.time, cita.place].filter(Boolean);

  return (
    <View
      style={[
        styles.itineraryItem,
        accentCapsuleSurface(),
        cita.habitual && styles.itineraryItemHabitual,
        compacto && styles.itineraryItemCompact,
      ].filter(Boolean)}
      wrap={false}
    >
      {/* La uñita, hecha cápsula: ver `@views/components/accent_capsule`. Iba
          como `borderLeft` recto sobre un bloque redondeado, que es justo lo
          que el sistema de diseño prohíbe — el color se cortaba en seco donde
          empezaba la curva y dejaba dos muescas. */}
      <AccentCapsule
        color={cita.habitual ? COLOR_CAPSULA.habitual : COLOR_CAPSULA.especial}
      />

      <Text
        style={[
          styles.itineraryLabel,
          compacto && styles.itineraryLabelCompact,
        ].filter(Boolean)}
      >
        {cita.label}
      </Text>
      <Text
        style={[
          styles.itineraryWhen,
          cita.habitual && styles.itineraryWhenHabitual,
          compacto && styles.itineraryWhenCompact,
        ].filter(Boolean)}
      >
        {cuando.join('  ·  ')}
      </Text>
    </View>
  );
};

/**
 * Reparte las citas en las DOS columnas del itinerario.
 *
 * Lo normal es una columna para cada cosa: las reuniones de siempre a un lado y
 * las especiales de la visita al otro. Pero si un lado se queda vacío —una
 * visita a la que aún no le han puesto las especiales, o unos ajustes de
 * reunión que no se pueden leer— dejar media hoja en blanco al lado de dos
 * bloques queda peor que no tener cuadrícula: en ese caso se parte por la mitad
 * lo que haya.
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
  // —a las que va toda la congregación— y las especiales de la visita.
  //
  // Van en dos columnas, cada grupo en la suya, y no en una sola lista: en
  // vertical se comían cuatro bloques de alto y empujaban el programa a una
  // segunda hoja. En dos columnas ocupan dos, y de paso se lee de un vistazo
  // qué reuniones son las de todas las semanas y cuáles las de esta.
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

  const [columnaIzquierda, columnaDerecha] = repartirEnDosColumnas(
    habituales,
    especiales
  );
  const hayItinerario = habituales.length + especiales.length > 0;

  const range = fmtRange(visit);
  const congName = congregation || 'Elda Centro';

  const visitorName = coName
    ? `${coName}${coSpouseName ? ` y ${coSpouseName}` : ''}`
    : 'Programa de la visita';

  // Los anchos de la tabla de predicación DEPENDEN de si hay esposa: la columna
  // "Con ella" solo se pinta cuando la hay. Antes las anchuras estaban escritas
  // a mano en cada celda y sumaban 100 % con esposa pero solo 80 % sin ella —
  // en las congregaciones donde el superintendente viaja solo, la tabla se
  // quedaba corta y dejaba una quinta parte de la hoja en blanco a la derecha.
  const preachingCols = coSpouseName
    ? ['19%', '11%', '27%', '21.5%', '21.5%']
    : ['24%', '14%', '34%', '28%'];

  // Las filas de las tres tablas son lo único que crece sin control; el resto
  // de la hoja mide siempre lo mismo. Por eso la cuenta es solo de filas.
  const compacto =
    mealsRows.length + shepherdingRows.length + preachingRows.length >
    DENSIDAD.holgado;

  const estiloCelda = compacto
    ? [styles.cell, styles.cellCompact]
    : [styles.cell];
  const estiloFila = (idx: number) =>
    [
      styles.row,
      idx % 2 === 0 && styles.rowAlt,
      compacto && styles.rowCompact,
    ].filter(Boolean);
  const estiloCabecera = compacto
    ? [styles.headCell, styles.headCellCompact]
    : [styles.headCell];

  return (
    <Document title="Visita del Superintendente de Circuito" lang={lang}>
      <Page
        size="A4"
        style={{ padding: PAGE_PADDING, backgroundColor: '#ffffff' }}
      >
        <View style={styles.wrapper}>
          {/* ── Barra de marca ─────────────────────────────────────── */}
          <View style={styles.topBar}>
            <View style={styles.topBarBrand}>
              <IconLogo size={22} />
              <Text style={styles.topBarBrandName}>{congName}</Text>
            </View>
            <Text style={styles.topBarDate}>{range}</Text>
          </View>

          <View
            style={
              compacto
                ? [styles.headerDivider, styles.headerDividerCompact]
                : styles.headerDivider
            }
          />

          <Text
            style={
              compacto ? [styles.title, styles.titleCompact] : styles.title
            }
          >
            Visita del superintendente de circuito
          </Text>
          <Text
            style={
              compacto
                ? [styles.subtitle, styles.subtitleCompact]
                : styles.subtitle
            }
          >
            {visitorName}
          </Text>

          {/* ── Itinerario de reuniones ────────────────────────────── */}
          <Section title="Itinerario de reuniones" compacto={compacto}>
            {hayItinerario ? (
              <View style={styles.itineraryGrid}>
                {[columnaIzquierda, columnaDerecha].map((columna, col) => (
                  <View key={col} style={styles.itineraryColumn}>
                    {columna.map((cita, idx) => (
                      <ItineraryRow
                        key={`${cita.date}_${cita.time}_${idx}`}
                        cita={cita}
                        compacto={compacto}
                      />
                    ))}
                  </View>
                ))}
              </View>
            ) : (
              <Empty>Sin reuniones programadas.</Empty>
            )}
          </Section>

          {/* ── Programa de comidas ────────────────────────────────── */}
          <Section title="Programa de comidas" compacto={compacto}>
            {mealsRows.length > 0 ? (
              <View style={styles.table}>
                {/* `fixed` en la fila de cabecera = si la tabla parte a la
                    página siguiente, sus rótulos se repiten arriba. Solo se
                    repiten mientras SU tabla sigue corriendo: una tabla que
                    terminó en la página anterior no deja su cabecera suelta
                    (comprobado con un programa de dos páginas). */}
                <View style={styles.headRow} fixed>
                  <Text style={[...estiloCabecera, { width: '30%' }]}>Día</Text>
                  <Text style={[...estiloCabecera, { width: '70%' }]}>
                    Anfitrión
                  </Text>
                </View>
                {mealsRows.map((meal, idx) => (
                  <View
                    key={`${meal.date}_${idx}`}
                    style={estiloFila(idx)}
                    wrap={false}
                  >
                    <Text
                      style={[...estiloCelda, styles.cellDay, { width: '30%' }]}
                    >
                      {fmtDay(meal.date)}
                    </Text>
                    <Text style={[...estiloCelda, { width: '70%' }]}>
                      {meal.hostName || '—'}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Empty>Sin comidas asignadas.</Empty>
            )}
          </Section>

          {/* ── Visitas (de pastoreo) ──────────────────────────────── */}
          <Section title="Visitas" compacto={compacto}>
            {shepherdingRows.length > 0 ? (
              <View style={styles.table}>
                <View style={styles.headRow} fixed>
                  <Text style={[...estiloCabecera, { width: '19%' }]}>Día</Text>
                  <Text style={[...estiloCabecera, { width: '11%' }]}>
                    Hora
                  </Text>
                  <Text style={[...estiloCabecera, { width: '35%' }]}>
                    Hermano visitado
                  </Text>
                  <Text style={[...estiloCabecera, { width: '35%' }]}>
                    Anciano acompañante
                  </Text>
                </View>
                {shepherdingRows.map((sv, idx) => (
                  <View
                    key={`${sv.date}_${sv.time}_${idx}`}
                    style={estiloFila(idx)}
                    wrap={false}
                  >
                    {/* Día y hora en columnas separadas, como en el programa de
                        predicación: iban juntas en una sola celda y las dos
                        tablas de la misma hoja se leían distinto. */}
                    <Text
                      style={[...estiloCelda, styles.cellDay, { width: '19%' }]}
                    >
                      {fmtDay(sv.date)}
                    </Text>
                    <Text
                      style={[
                        ...estiloCelda,
                        styles.cellMuted,
                        { width: '11%' },
                      ]}
                    >
                      {sv.time || '—'}
                    </Text>
                    <Text style={[...estiloCelda, { width: '35%' }]}>
                      {sv.brotherName || '—'}
                    </Text>
                    <Text style={[...estiloCelda, { width: '35%' }]}>
                      {sv.elderName || '—'}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Empty>Sin visitas de pastoreo programadas.</Empty>
            )}
          </Section>

          {/* ── Programa de predicación ────────────────────────────── */}
          <Section title="Programa de predicación" compacto={compacto}>
            {preachingRows.length > 0 ? (
              <View style={styles.table}>
                <View style={styles.headRow} fixed>
                  <Text
                    style={[...estiloCabecera, { width: preachingCols[0] }]}
                  >
                    Día
                  </Text>
                  <Text
                    style={[...estiloCabecera, { width: preachingCols[1] }]}
                  >
                    Hora
                  </Text>
                  <Text
                    style={[...estiloCabecera, { width: preachingCols[2] }]}
                  >
                    Punto de salida
                  </Text>
                  <Text
                    style={[...estiloCabecera, { width: preachingCols[3] }]}
                  >
                    Con {coName}
                  </Text>
                  {coSpouseName ? (
                    <Text
                      style={[...estiloCabecera, { width: preachingCols[4] }]}
                    >
                      Con {coSpouseName}
                    </Text>
                  ) : null}
                </View>
                {preachingRows.map((row, idx) => (
                  <View
                    key={`${row.date}_${row.time}_${idx}`}
                    style={estiloFila(idx)}
                    wrap={false}
                  >
                    <Text
                      style={[
                        ...estiloCelda,
                        styles.cellDay,
                        { width: preachingCols[0] },
                      ]}
                    >
                      {fmtDay(row.date)}
                    </Text>
                    <Text
                      style={[
                        ...estiloCelda,
                        styles.cellMuted,
                        { width: preachingCols[1] },
                      ]}
                    >
                      {row.time || '—'}
                    </Text>
                    <Text style={[...estiloCelda, { width: preachingCols[2] }]}>
                      {row.location || '—'}
                    </Text>
                    <Text style={[...estiloCelda, { width: preachingCols[3] }]}>
                      {row.companionName || '—'}
                    </Text>
                    {coSpouseName ? (
                      <Text
                        style={[...estiloCelda, { width: preachingCols[4] }]}
                      >
                        {row.spouseCompanions || '—'}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : (
              <Empty>Sin salidas de predicación.</Empty>
            )}
          </Section>
        </View>

        {/* ── Pie ──────────────────────────────────────────────────── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{congName}</Text>
          <Text
            style={styles.footerText}
            fixed
            render={({ pageNumber, totalPages }) =>
              totalPages > 1 ? `Página ${pageNumber} de ${totalPages}` : range
            }
          />
        </View>
      </Page>
    </Document>
  );
};

export default CircuitVisitProgramDoc;
