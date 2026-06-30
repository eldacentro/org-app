import { Page, Text, View } from '@react-pdf/renderer';
import { Document } from '@views/components';
import { CircuitVisitType } from '@definition/circuit_visit';
import { formatDate } from '@utils/date';
import { styles } from './index.styles';

type Props = {
  visit: CircuitVisitType;
  coName: string;
  lang: string;
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

const mealTypeLabel = (type: 'lunch' | 'dinner') =>
  type === 'lunch' ? 'Almuerzo' : 'Cena';

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

const CircuitVisitProgramDoc = ({ visit, coName, lang }: Props) => {
  const hasItinerary = visit.meeting_pioneers || visit.meeting_elders;

  return (
    <Document title="Visita del Superintendente de Circuito" lang={lang}>
      <Page size={[595.2, 842]} style={styles.body}>
        {/* Cabecera */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            Visita del Superintendente de Circuito
          </Text>
          <Text style={styles.title}>{coName || 'Programa de la visita'}</Text>
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
                  <Text style={[styles.headCell, { width: '30%' }]}>Día</Text>
                  <Text style={[styles.headCell, { width: '25%' }]}>Comida</Text>
                  <Text style={[styles.headCell, { width: '45%' }]}>
                    Anfitrión
                  </Text>
                </View>
              </View>
              {visit.meals.map((meal) => (
                <View key={meal.id} style={styles.row}>
                  <Text style={[styles.cell, { width: '30%' }]}>
                    {fmtDay(meal.date)}
                  </Text>
                  <Text style={[styles.cell, { width: '25%' }]}>
                    {mealTypeLabel(meal.type)}
                  </Text>
                  <Text style={[styles.cell, { width: '45%' }]}>
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

        {/* Programa de predicación */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Programa de predicación</Text>
          {visit.preaching.length > 0 ? (
            <View style={styles.table}>
              <View style={styles.headRow}>
                <View style={styles.row}>
                  <Text style={[styles.headCell, { width: '26%' }]}>Día</Text>
                  <Text style={[styles.headCell, { width: '16%' }]}>Hora</Text>
                  <Text style={[styles.headCell, { width: '36%' }]}>
                    Punto de salida
                  </Text>
                  <Text style={[styles.headCell, { width: '22%' }]}>Grupo</Text>
                </View>
              </View>
              {visit.preaching.map((row) => (
                <View key={row.id} style={styles.row}>
                  <Text style={[styles.cell, { width: '26%' }]}>
                    {fmtDay(row.date)}
                  </Text>
                  <Text style={[styles.cell, { width: '16%' }]}>
                    {row.time || '—'}
                  </Text>
                  <Text style={[styles.cell, { width: '36%' }]}>
                    {row.meetingPoint || '—'}
                  </Text>
                  <Text style={[styles.cell, { width: '22%' }]}>
                    {row.group || '—'}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.empty}>Sin salidas de predicación.</Text>
          )}
        </View>

        <Text style={styles.footer} fixed>
          Congregación Elda Centro
        </Text>
      </Page>
    </Document>
  );
};

export default CircuitVisitProgramDoc;
