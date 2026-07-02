import { Page, Text, View } from '@react-pdf/renderer';
import { Document } from '@views/components';
import { CircuitVisitType } from '@definition/circuit_visit';
import { formatDate } from '@utils/date';
import { styles } from './index.styles';

export type CircuitVisitPdfPreachingRow = {
  date: string;
  time: string;
  location: string;
  companionName: string;      // hermano que acompaña al CO
  spouseCompanions: string;   // hermanas con la esposa (texto ya formateado)
};

type Props = {
  visit: CircuitVisitType;
  coName: string;
  coSpouseName: string;
  congregation: string;
  lang: string;
  preachingRows: CircuitVisitPdfPreachingRow[];
};

const fmtDay = (date: string) => {
  if (!date) return '—';
  try {
    return formatDate(new Date(date), 'EEE d MMM');
  } catch {
    return date;
  }
};

const fmtRange = (visit: CircuitVisitType) => {
  try {
    const start = formatDate(new Date(visit.date_start), 'd MMM');
    const end = formatDate(new Date(visit.date_end), 'd MMM yyyy');
    return `${start} – ${end}`;
  } catch {
    return visit.weekOf;
  }
};

const SpecialMeetingRow = ({
  label,
  when,
}: {
  label: string;
  when: { date: string; time: string; place: string } | null;
}) => {
  if (!when) return null;
  const parts = [fmtDay(when.date), when.time, when.place].filter(Boolean);
  return (
    <View style={styles.itineraryItem}>
      <Text style={styles.itineraryLabel}>{label}</Text>
      <Text style={styles.itineraryWhen}>{parts.join('  •  ')}</Text>
    </View>
  );
};

const CircuitVisitProgramDoc = ({ visit, coName, coSpouseName, congregation, lang, preachingRows }: Props) => {
  const hasItinerary = visit.meeting_pioneers || visit.meeting_elders;

  return (
    <Document title="Visita del Superintendente de Circuito" lang={lang}>
      <Page size={[595.2, 842]} style={styles.body}>
        {/* Cabecera */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            Visita del Superintendente de Circuito
          </Text>
          <Text style={styles.title}>
            {coName || 'Programa de la visita'}
            {coSpouseName ? ` y ${coSpouseName}` : ''}
          </Text>
          <Text style={styles.headerMeta}>{fmtRange(visit)}</Text>
        </View>

        {/* Itinerario de reuniones especiales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Itinerario de reuniones</Text>
          {hasItinerary ? (
            <View>
              <SpecialMeetingRow
                label="Reunión con precursores"
                when={visit.meeting_pioneers}
              />
              <SpecialMeetingRow
                label="Reunión con ancianos y siervos ministeriales"
                when={visit.meeting_elders}
              />
            </View>
          ) : (
            <Text style={styles.empty}>Sin reuniones especiales programadas.</Text>
          )}
        </View>

        {/* Programa de comidas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Programa de comidas</Text>
          {visit.meals.length > 0 ? (
            <View style={styles.table}>
              <View style={styles.headRow}>
                <View style={styles.row}>
                  <Text style={[styles.headCell, { width: '35%' }]}>Día</Text>
                  <Text style={[styles.headCell, { width: '65%' }]}>
                    Anfitrión
                  </Text>
                </View>
              </View>
              {visit.meals.map((meal) => (
                <View key={meal.id} style={styles.row}>
                  <Text style={[styles.cell, { width: '35%' }]}>
                    {fmtDay(meal.date)}
                  </Text>
                  <Text style={[styles.cell, { width: '65%' }]}>
                    {meal.host || '—'}
                    {meal.note ? `  (${meal.note})` : ''}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.empty}>Sin comidas asignadas.</Text>
          )}
        </View>

        {/* Programa de predicación (Salidas de predicación de esta semana) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Programa de predicación</Text>
          {preachingRows.length > 0 ? (
            <View style={styles.table}>
              <View style={styles.headRow}>
                <View style={styles.row}>
                  <Text style={[styles.headCell, { width: '20%' }]}>Día</Text>
                  <Text style={[styles.headCell, { width: '12%' }]}>Hora</Text>
                  <Text style={[styles.headCell, { width: '28%' }]}>
                    Punto de salida
                  </Text>
                  <Text style={[styles.headCell, { width: '20%' }]}>
                    Hno. del CO
                  </Text>
                  {coSpouseName ? (
                    <Text style={[styles.headCell, { width: '20%' }]}>
                      Con {coSpouseName}
                    </Text>
                  ) : null}
                </View>
              </View>
              {preachingRows.map((row, idx) => (
                <View key={`${row.date}_${row.time}_${idx}`} style={styles.row}>
                  <Text style={[styles.cell, { width: '20%' }]}>
                    {fmtDay(row.date)}
                  </Text>
                  <Text style={[styles.cell, { width: '12%' }]}>
                    {row.time || '—'}
                  </Text>
                  <Text style={[styles.cell, { width: '28%' }]}>
                    {row.location || '—'}
                  </Text>
                  <Text style={[styles.cell, { width: '20%' }]}>
                    {row.companionName || '—'}
                  </Text>
                  {coSpouseName ? (
                    <Text style={[styles.cell, { width: '20%' }]}>
                      {row.spouseCompanions || '—'}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.empty}>Sin salidas de predicación.</Text>
          )}
        </View>

        <Text style={styles.footer} fixed>
          {congregation}
        </Text>
      </Page>
    </Document>
  );
};

export default CircuitVisitProgramDoc;
