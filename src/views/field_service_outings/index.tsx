import { Page, Text, View } from '@react-pdf/renderer';
import { Document } from '@views/components';
import { IconLogo } from '@views/components/icons';
import styles from './index.styles';
import { OutingsPDFProps } from './index.types';

const OutingsSchedulePDF = ({ monthName, cong_name, weekdays, cells, updatedAt, lastModifiedBy }: OutingsPDFProps) => {
  // Fragmentar las celdas en semanas (filas de N días activos)
  const numCols = weekdays.length;
  const rows = [];
  for (let i = 0; i < cells.length; i += numCols) {
    rows.push(cells.slice(i, i + numCols));
  }

  return (
    <Document title={`Salidas de predicación - ${monthName}`} lang="es-ES">
      <Page size="A4" orientation="landscape" style={styles.body}>
        {/* Encabezado */}
        <View style={styles.headerContainer}>
          <View style={styles.logoTitleContainer}>
            <IconLogo />
            <View>
              <Text style={styles.title}>Salidas de predicación</Text>
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

                    {/* Listado de Salidas para este día */}
                    <View style={styles.outingsWrapper}>
                      {cell.outings.map((outing) => {
                        const isCancelled = outing.isCancelled;
                        const isAssigned = outing.isAssigned;

                        let badgeStyle = styles.assignedBadge;
                        let timeStyle = styles.assignedTimeText;
                        let infoStyle = styles.assignedInfoText;
                        let brotherStyle = styles.assignedBrotherText;

                        if (isCancelled) {
                          badgeStyle = styles.cancelledBadge;
                          timeStyle = styles.cancelledTimeText;
                          infoStyle = styles.cancelledInfoText;
                          brotherStyle = styles.cancelledBrotherText;
                        } else if (!isAssigned) {
                          badgeStyle = styles.unassignedBadge;
                          timeStyle = styles.unassignedTimeText;
                          infoStyle = styles.unassignedInfoText;
                          brotherStyle = styles.unassignedBrotherText;
                        }

                        return (
                          <View key={outing.id} style={[styles.outingBadge, badgeStyle]}>
                            {/* Hora */}
                            <Text style={[styles.timeText, timeStyle]}>
                              {outing.time}
                            </Text>
                            
                            {/* Nombre del Hermano */}
                            <Text style={[styles.brotherText, brotherStyle]}>
                              {isCancelled ? 'Suspendida' : outing.brotherName}
                            </Text>

                            {/* Lugar de Reunión */}
                            {!isCancelled && (
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

export default OutingsSchedulePDF;
