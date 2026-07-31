import { Page, Text, View } from '@react-pdf/renderer';
import {
  AccentCapsule,
  Document,
  PdfFooter,
  PdfHeader,
  accentCapsuleSurface,
  fechaCorta,
} from '@views/components';
import styles, { COLOR_CAPSULA } from './index.styles';
import { OutingsPDFProps } from './index.types';

const OutingsSchedulePDF = ({
  monthName,
  cong_name,
  weekdays,
  cells,
  updatedAt,
}: OutingsPDFProps) => {
  // Fragmentar las celdas en semanas (filas de N días activos)
  const numCols = weekdays.length;
  const rows = [];
  for (let i = 0; i < cells.length; i += numCols) {
    rows.push(cells.slice(i, i + numCols));
  }

  const footerDate = fechaCorta(updatedAt);

  return (
    <Document title={`Salidas de predicación - ${monthName}`} lang="es-ES">
      <Page size="A4" orientation="landscape" style={styles.body}>
        {/*
         * Wrap all content in contentWrapper so the page structure is clean.
         * Si el contenido es demasiado para una página con fontSize mínimo de 7,
         * considerar reducir los datos de entrada en el servidor.
         */}
        <View style={styles.contentWrapper}>
          <PdfHeader
            congregation={cong_name || 'Elda Centro'}
            meta={monthName}
            title="Salidas de predicación"
          />

          {/* Cuadrícula de Calendario */}
          <View style={styles.calendarContainer}>
            {/* Encabezados de los Días de la Semana */}
            <View style={styles.weekdaysHeader}>
              {weekdays.map((day, idx) => {
                const isLastCol = idx === weekdays.length - 1;
                return (
                  <View
                    key={day}
                    style={[
                      styles.weekdayCell,
                      isLastCol && { borderRight: 0 },
                    ]}
                  >
                    <Text style={styles.weekdayText}>{day}</Text>
                  </View>
                );
              })}
            </View>

            {/* Filas de Semanas */}
            {rows.map((row, rowIdx) => {
              const isLastRow = rowIdx === rows.length - 1;
              return (
                <View key={rowIdx} style={styles.weekRow}>
                  {row.map((cell, cellIdx) => {
                    const isLastCol = cellIdx === row.length - 1;
                    const cellOuterBorders = {
                      borderBottom: isLastRow ? 0 : undefined,
                      borderRight: isLastCol ? 0 : undefined,
                    };

                    if (cell.type === 'empty') {
                      return (
                        <View
                          key={`empty-${rowIdx}-${cellIdx}`}
                          style={[styles.emptyCell, cellOuterBorders]}
                        />
                      );
                    }

                    const isSunday = weekdays[cellIdx]
                      .toLowerCase()
                      .startsWith('d');

                    return (
                      <View
                        key={`day-${cell.dayNum}`}
                        style={[styles.cell, cellOuterBorders]}
                      >
                        {/* Número del Día */}
                        <Text style={styles.dayNumber}>{cell.dayNum}</Text>

                        {/* Listado de Salidas para este día */}
                        <View style={styles.outingsWrapper}>
                          {cell.outings.map((outing) => {
                            const isCancelled = outing.isCancelled;
                            const isAssigned = outing.isAssigned;

                            let badgeStyle = styles.assignedBadge;
                            let timeStyle = styles.assignedTimeText;
                            let infoStyle = styles.assignedInfoText;
                            let brotherStyle = styles.assignedBrotherText;
                            let capsula = COLOR_CAPSULA.asignado;

                            if (isCancelled) {
                              badgeStyle = styles.cancelledBadge;
                              timeStyle = styles.cancelledTimeText;
                              infoStyle = styles.cancelledInfoText;
                              brotherStyle = styles.cancelledBrotherText;
                              capsula = COLOR_CAPSULA.suspendido;
                            } else if (!isAssigned) {
                              capsula = COLOR_CAPSULA.sinAsignar;
                              badgeStyle = styles.unassignedBadge;
                              timeStyle = styles.unassignedTimeText;
                              infoStyle = styles.unassignedInfoText;
                              brotherStyle = styles.unassignedBrotherText;
                            }

                            return (
                              <View
                                key={outing.id}
                                style={[
                                  styles.outingBadge,
                                  accentCapsuleSurface(),
                                  badgeStyle,
                                ]}
                              >
                                {/* La uñita, hecha cápsula: ver
                                    `@views/components/accent_capsule`. */}
                                <AccentCapsule color={capsula} />

                                <View
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    gap: 3,
                                    alignItems: 'flex-start',
                                  }}
                                >
                                  {/* Hora */}
                                  <Text style={[styles.timeText, timeStyle]}>
                                    {outing.time}
                                  </Text>

                                  {/* Nombre del Hermano */}
                                  <Text
                                    style={[
                                      styles.brotherText,
                                      brotherStyle,
                                      { flex: 1 },
                                    ]}
                                  >
                                    {isCancelled
                                      ? 'Suspendida'
                                      : outing.brotherName}
                                  </Text>
                                </View>

                                {/* Lugar de Reunión (Solo Domingos) */}
                                {!isCancelled && isSunday && (
                                  <Text style={[styles.infoText, infoStyle]}>
                                    {outing.location}
                                  </Text>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Footer: fixed at A4 bottom on every page ── */}
          <PdfFooter
          congregation={cong_name || 'Elda Centro'}
          meta={footerDate ? `Última actualización · ${footerDate}` : ''}
          inset={20}
        />
      </Page>
    </Document>
  );
};

export default OutingsSchedulePDF;
