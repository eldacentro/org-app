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
import { ExhibitorPDFProps } from './index.types';

const ExhibitorsPDF = ({
  monthName,
  cong_name,
  weekdays,
  cells,
  updatedAt,
}: ExhibitorPDFProps) => {
  const numCols = weekdays.length;
  const rows = [];
  for (let i = 0; i < cells.length; i += numCols) {
    rows.push(cells.slice(i, i + numCols));
  }

  const footerDate = fechaCorta(updatedAt);

  const pagesData = [];
  for (let i = 0; i < rows.length; i += 2) {
    pagesData.push(rows.slice(i, i + 2));
  }

  return (
    <Document title={`Exhibidores - ${monthName}`} lang="es-ES">
      {pagesData.map((pageRows, pageIdx) => (
        <Page
          key={`page-${pageIdx}`}
          size="A4"
          orientation="landscape"
          style={styles.body}
        >
          <View style={styles.contentWrapper}>
            <PdfHeader
              congregation={cong_name || 'Elda Centro'}
              meta={
                pagesData.length > 1
                  ? `${monthName} · Página ${pageIdx + 1} de ${pagesData.length}`
                  : monthName
              }
              title="Programa de exhibidores"
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
              {pageRows.map((row, rowIdx) => {
                const isLastRow = rowIdx === pageRows.length - 1;
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

                      return (
                        <View
                          key={`day-${cell.dayNum}`}
                          style={[styles.cell, cellOuterBorders]}
                        >
                          {/* Número del Día */}
                          <Text style={styles.dayNumber}>{cell.dayNum}</Text>

                          {/* Listado de Turnos para este día */}
                          <View style={styles.turnsWrapper}>
                            {cell.turns.map((turn) => {
                              const isCancelled = turn.isCancelled;
                              const isAssigned = turn.isAssigned;

                              let badgeStyle = styles.assignedBadge;
                              let timeStyle = styles.assignedTimeText;
                              let capsula = COLOR_CAPSULA.asignado;

                              if (isCancelled) {
                                badgeStyle = styles.cancelledBadge;
                                timeStyle = styles.cancelledTimeText;
                                capsula = COLOR_CAPSULA.suspendido;
                              } else if (!isAssigned) {
                                badgeStyle = styles.unassignedBadge;
                                timeStyle = styles.unassignedTimeText;
                                capsula = COLOR_CAPSULA.sinAsignar;
                              }

                              return (
                                <View
                                  key={turn.id}
                                  style={[
                                    styles.turnBadge,
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
                                      {turn.time}
                                    </Text>
                                  </View>

                                  {/* Hermanos */}
                                  {isCancelled ? (
                                    <Text
                                      style={[
                                        styles.brotherText,
                                        styles.cancelledBrotherText,
                                      ]}
                                    >
                                      Suspendido
                                    </Text>
                                  ) : (
                                    <View
                                      style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 1,
                                      }}
                                    >
                                      {turn.assignments.map((ass, assIdx) => {
                                        let broStyle =
                                          styles.assignedBrotherText;
                                        if (ass.isResponsible) {
                                          broStyle =
                                            styles.responsibleBrotherText;
                                        }
                                        return (
                                          <Text
                                            key={assIdx}
                                            style={[
                                              styles.brotherText,
                                              broStyle,
                                            ]}
                                          >
                                            {ass.name}{' '}
                                            {ass.isResponsible ? '(R)' : ''}
                                          </Text>
                                        );
                                      })}
                                      {turn.assignments.length === 0 && (
                                        <Text
                                          style={[
                                            styles.brotherText,
                                            styles.unassignedBrotherText,
                                          ]}
                                        >
                                          Sin asignar
                                        </Text>
                                      )}
                                    </View>
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

          <PdfFooter
            congregation={cong_name || 'Elda Centro'}
            meta={footerDate ? `Última actualización · ${footerDate}` : ''}
            inset={20}
          />
        </Page>
      ))}
    </Document>
  );
};

export default ExhibitorsPDF;
