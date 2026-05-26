import { Page, Text, View } from '@react-pdf/renderer';
import { Document } from '@views/components';
import { IconLogo } from '@views/components/icons';
import styles from './index.styles';
import { OutingsPDFProps } from './index.types';

const OutingsSchedulePDF = ({ monthName, cong_name, weeks, updatedAt, lastModifiedBy }: OutingsPDFProps) => {
  return (
    <Document title={`Salidas de predicación - ${monthName}`} lang="es-ES">
      <Page size="A4" orientation="landscape" style={styles.body}>
        {/* Header */}
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

        {/* Weeks Grid */}
        <View style={styles.gridContainer}>
          {weeks.map((week) => (
            <View key={week.weekOf} style={styles.weekCard} wrap={false}>
              {/* Week Header */}
              <View style={styles.weekHeader}>
                <Text style={styles.weekTitle}>{week.weekLabel}</Text>
              </View>

              {/* Outings List */}
              <View style={styles.outingsList}>
                {week.outings.length === 0 ? (
                  <Text style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic', padding: 4 }}>
                    Sin salidas programadas
                  </Text>
                ) : (
                  week.outings.map((outing) => {
                    const isCancelled = outing.isCancelled;
                    const isAssigned = outing.isAssigned;

                    return (
                      <View key={outing.id} style={styles.outingRow}>
                        {/* Day/Date Col */}
                        <Text style={[styles.dayCol, isCancelled && styles.cancelledText]}>
                          {outing.dayLabel}
                        </Text>

                        {/* Time Col */}
                        <Text style={[styles.timeCol, isCancelled && styles.cancelledText]}>
                          {outing.time}
                        </Text>

                        {/* Location Col */}
                        <Text style={[styles.locationCol, isCancelled && styles.cancelledText]}>
                          {isCancelled ? '—' : outing.location}
                        </Text>

                        {/* Brother Col */}
                        <Text
                          style={[
                            styles.brotherCol,
                            !isAssigned && !isCancelled && styles.unassignedText,
                            isCancelled && styles.cancelledText,
                          ]}
                        >
                          {isCancelled ? 'Suspendida' : outing.brotherName}
                        </Text>
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Footer */}
        {updatedAt && (
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {lastModifiedBy
                ? `Última actualización: ${new Date(updatedAt).toLocaleString()} (${lastModifiedBy})`
                : `Última actualización: ${new Date(updatedAt).toLocaleString()}`}
            </Text>
            <Text style={styles.footerText}>Organized</Text>
          </View>
        )}
      </Page>
    </Document>
  );
};

export default OutingsSchedulePDF;
