import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from '@react-pdf/renderer';

/** Una asignación dentro de un slot del S-13. */
export type S13Assignment = {
  name: string;
  dateAssigned: string;
  dateCompleted: string;
  isCampaign: boolean;
};

/** Una fila de territorio del S-13 (vacía si `numero` está vacío). */
export type S13TerritoryRow = {
  numero: string;
  lastCompleted: string;
  assignments: S13Assignment[]; // hasta 8 (4 grupos × 2 líneas)
};

/** Una hoja del S-13 (un Territory Type, hasta 20 territorios). */
export type S13Sheet = {
  serviceYear: string;
  territoryType: string;
  rows: S13TerritoryRow[]; // exactamente 20 (rellenadas con vacías)
};

export type S13Data = { sheets: S13Sheet[] };

const BORDER = '#000';
const THICK = '2.5px';
const THIN = '1px';

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 36,
    fontSize: 8,
    fontFamily: 'Helvetica',
  },
  title: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Helvetica',
  },
  metaRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 },
  metaLabel: { fontSize: 11, paddingBottom: 1 },
  metaValueSY: {
    fontSize: 11,
    textAlign: 'center',
    width: 65,
    borderBottom: `1.5px solid ${BORDER}`,
    marginHorizontal: 8,
    paddingBottom: 1,
  },
  metaValueTT: {
    fontSize: 11,
    flexGrow: 1,
    borderBottom: `1.5px solid ${BORDER}`,
    marginLeft: 8,
    paddingBottom: 1,
    paddingLeft: 4,
  },

  table: { border: `${THICK} solid ${BORDER}` },

  // anchos de columna
  cTerr: { width: '6.5%' },
  cLast: { width: '13.5%' },
  cGroup: { width: '20%' },

  // celdas de cabecera
  headRow: { flexDirection: 'row', borderBottom: `${THICK} solid ${BORDER}` },
  headCellTall: {
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    borderRight: `${THICK} solid ${BORDER}`,
    paddingHorizontal: 2,
    fontSize: 8,
    paddingTop: 4,
    paddingBottom: 4,
  },
  groupHead: { borderRight: `${THICK} solid ${BORDER}` },
  groupHeadTitle: {
    textAlign: 'center',
    paddingVertical: 3,
    borderBottom: `${THIN} solid ${BORDER}`,
    fontSize: 8,
  },
  groupHeadSubRow: { flexDirection: 'row', flex: 1 },
  groupHeadSub: {
    flex: 1,
    textAlign: 'center',
    fontSize: 7,
    paddingVertical: 3,
    justifyContent: 'center',
  },
  groupHeadSubDivider: { borderRight: `${THIN} solid ${BORDER}` },

  // cuerpo
  bodyRow: {
    flexDirection: 'row',
    borderBottom: `${THIN} solid ${BORDER}`,
    height: 31, // Altura fija para cuadrar bien 20 filas en A4
  },
  bodyTerr: {
    width: '6.5%',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    borderRight: `${THICK} solid ${BORDER}`,
    fontSize: 9,
  },
  bodyLast: {
    width: '13.5%',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    borderRight: `${THICK} solid ${BORDER}`,
    fontSize: 8,
  },
  bodyGroup: {
    width: '20%',
    borderRight: `${THICK} solid ${BORDER}`,
  },
  
  // Líneas dentro del grupo
  slotLine: { 
    flex: 1, 
    flexDirection: 'row',
    position: 'relative',
  },
  slotLineDivider: { borderBottom: `${THIN} solid ${BORDER}` },
  
  slotColLeft: {
    flex: 1,
    borderRight: `${THIN} solid ${BORDER}`,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
  slotColRight: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },

  slotNameAbsolute: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    textAlign: 'center',
    fontSize: 7,
    backgroundColor: '#fff', // Para tapar la línea central un poco si el nombre es largo
  },
  dateText: {
    fontSize: 7,
  },

  footnote: { fontSize: 8.5, marginTop: 8 },
  formCode: { fontSize: 9.5, marginTop: 2 },
});

const GroupHeader = ({ last }: { last: boolean }) => (
  <View style={[styles.cGroup, !last ? styles.groupHead : { borderRight: 'none' }]}>
    <Text style={styles.groupHeadTitle}>Assigned to</Text>
    <View style={styles.groupHeadSubRow}>
      <View style={[styles.groupHeadSub, styles.groupHeadSubDivider]}>
        <Text>Date</Text>
        <Text>assigned</Text>
      </View>
      <View style={styles.groupHeadSub}>
        <Text>Date</Text>
        <Text>completed</Text>
      </View>
    </View>
  </View>
);

const BodyGroup = ({
  last,
  topAssignment,
  bottomAssignment,
}: {
  last: boolean;
  topAssignment?: S13Assignment;
  bottomAssignment?: S13Assignment;
}) => {
  const renderLine = (a: S13Assignment | undefined, divider: boolean) => (
    <View style={[styles.slotLine, divider ? styles.slotLineDivider : {}]}>
      {/* Celdas de fechas y línea vertical continua */}
      <View style={styles.slotColLeft}>
        <Text style={styles.dateText}>{a?.dateAssigned ?? ''}</Text>
      </View>
      <View style={styles.slotColRight}>
        <Text style={styles.dateText}>{a?.dateCompleted ?? ''}</Text>
      </View>

      {/* Nombre superpuesto centrando en ambas celdas */}
      {a && (
        <Text style={styles.slotNameAbsolute}>
          {a.name.length > 18 ? a.name.slice(0, 16) + '…' : a.name}
          {a.isCampaign ? ' (C)' : ''}
        </Text>
      )}
    </View>
  );

  return (
    <View style={[styles.bodyGroup, last ? { borderRight: 'none' } : {}]}>
      {renderLine(topAssignment, true)}
      {renderLine(bottomAssignment, false)}
    </View>
  );
};

const Sheet = ({ sheet }: { sheet: S13Sheet }) => (
  <Page size="A4" style={styles.page}>
    <Text style={styles.title}>TERRITORY ASSIGNMENT RECORD</Text>

    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>Service Year:</Text>
      <Text style={styles.metaValueSY}>{sheet.serviceYear}</Text>
      <Text style={styles.metaLabel}>Territory Type:</Text>
      <Text style={styles.metaValueTT}>{sheet.territoryType}</Text>
    </View>

    <View style={styles.table}>
      {/* Cabecera */}
      <View style={styles.headRow}>
        <View style={[styles.cTerr, styles.headCellTall]}>
          <Text>Terr.</Text>
          <Text>No.</Text>
        </View>
        <View style={[styles.cLast, styles.headCellTall]}>
          <Text>Last date</Text>
          <Text>completed*</Text>
        </View>
        {[0, 1, 2, 3].map((i) => (
          <GroupHeader key={i} last={i === 3} />
        ))}
      </View>

      {/* Filas */}
      {sheet.rows.map((row, idx) => {
        // La última fila no debe tener borde inferior
        const isLastRow = idx === sheet.rows.length - 1;
        return (
          <View key={idx} style={[styles.bodyRow, isLastRow ? { borderBottom: 'none' } : {}]}>
            <Text style={styles.bodyTerr}>{row.numero}</Text>
            <Text style={styles.bodyLast}>{row.lastCompleted}</Text>
            {[0, 1, 2, 3].map((g) => (
              <BodyGroup
                key={g}
                last={g === 3}
                topAssignment={row.assignments[g]}
                bottomAssignment={row.assignments[g + 4]}
              />
            ))}
          </View>
        );
      })}
    </View>

    <Text style={styles.footnote}>
      *When beginning a new sheet, use this column to record the date on which each territory was last completed.
    </Text>
    <Text style={styles.formCode}>S-13 1/22</Text>
  </Page>
);

const S13Document = ({ data }: { data: S13Data }) => (
  <Document>
    {data.sheets.map((sheet, i) => (
      <Sheet key={i} sheet={sheet} />
    ))}
  </Document>
);

export default S13Document;
