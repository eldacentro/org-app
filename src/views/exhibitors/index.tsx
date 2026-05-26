import { Page, Text, View } from '@react-pdf/renderer';
import { Document } from '@views/components';
import { IconLogo } from '@views/components/icons';
import styles from './index.styles';
import { ExhibitorPDFProps } from './index.types';

const ExhibitorsPDF = ({ monthName, cong_name, weekdays, cells, updatedAt, lastModifiedBy }: ExhibitorPDFProps) => {
  const numCols = weekdays.length;
  const rows = [];
  for (let i = 0; i < cells.length; i += numCols) {
    rows.push(cells.slice(i, i + numCols));
  }

  return (
    <Document title={`Exhibidores - ${monthName}`} lang="es-ES">
      <Page size="A4" orientation="landscape" style={styles.body}>
        {/* Encabezado */}
        <View style={styles.headerContainer}>
          <View style={styles.logoTitleContainer}>
            <IconLogo />
            <View>
              <Text style={styles.title}>Programa de Exhibidores</Text>
              <Text style={styles.subtitle}>{cong_name || 'Elda - Centro'}</Text>
            </View>
          </View>
          <Text style={styles.monthTitle}>{monthName}</Text>
        </View>

        {/* Cuadrícula de Calendario */}
        <View style={styles.calendarContainer}>
          {/* Encabezados de los Días de la Semana */}
          <View style={styles.weekdaysHeader}>
            {weekdays.map((day) => (
              <View key={day} style={styles.weekdayCell}>
                <Text style={styles.weekdayText}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Filas de Semanas */}
          {rows.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.weekRow}>
              {row.map((cell, cellIdx) => {
                if (cell.type === 'empty') {
                  return <View key={`empty-${rowIdx}-${cellIdx}`} style={styles.emptyCell} />;
                }

                return (
                  <View key={`day-${cell.dayNum}`} style={styles.cell}>
                    {/* Número del Día */}
                    <Text style={styles.dayNumber}>{cell.dayNum}</Text>

                    {/* Listado de Turnos para este día */}
                    <View style={styles.turnsWrapper}>
                      {cell.turns.map((turn) => {
                        const isCancelled = turn.isCancelled;
                        const isAssigned = turn.isAssigned;

                        let badgeStyle = styles.assignedBadge;
                        let timeStyle = styles.assignedTimeText;
                        let locationStyle = styles.assignedLocationText;

                        if (isCancelled) {
                          badgeStyle = styles.cancelledBadge;
                          timeStyle = styles.cancelledTimeText;
                          locationStyle = styles.cancelledLocationText;
                        } else if (!isAssigned) {
                          badgeStyle = styles.unassignedBadge;
                          timeStyle = styles.unassignedTimeText;
                          locationStyle = styles.unassignedLocationText;
                        }

                        return (
                          <View key={turn.id} style={[styles.turnBadge, badgeStyle]}>
                            {/* Hora */}
                            <Text style={[styles.timeText, timeStyle]}>
                              {turn.time}
                            </Text>

                            {/* Hermanos */}
                            {isCancelled ? (
                              <Text style={[styles.brotherText, styles.cancelledBrotherText]}>
                                Suspendido
                              </Text>
                            ) : (
                              <View style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {turn.assignments.map((ass, assIdx) => {
                                  let broStyle = styles.assignedBrotherText;
                                  if (ass.isResponsible) {
                                    broStyle = styles.responsibleBrotherText;
                                  }
                                  return (
                                    <Text key={assIdx} style={[styles.brotherText, broStyle]}>
                                      {ass.name} {ass.isResponsible ? '(R)' : ''}
                                    </Text>
                                  );
                                })}
                                {turn.assignments.length === 0 && (
                                  <Text style={[styles.brotherText, styles.unassignedBrotherText]}>
                                    Sin asignar
                                  </Text>
                                )}
                              </View>
                            )}

                            {/* Ubicación */}
                            {!isCancelled && (
                              <Text style={[styles.locationText, locationStyle]}>
                                {turn.location}
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
          ))}
        </View>

        {/* Pie de Página */}
        {updatedAt && (
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {lastModifiedBy
                ? `Última actualización: ${new Date(updatedAt).toLocaleString()} (${lastModifiedBy})`
                : `Última actualización: ${new Date(updatedAt).toLocaleString()}`}
            </Text>
            <Text style={styles.footerText}>eldacentro.com</Text>
          </View>
        )}
      </Page>
    </Document>
  );
};

export default ExhibitorsPDF;
