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
const THICK = '1.5px'; // Borde exterior y separadores principales
const THIN = '1px'; // Borde interior
const BG_HEADER = '#E4E4E4';

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

  // anchos de columna (20% para los 4 grupos de asignación, deja 20% para las dos primeras)
  cTerr: { width: '6.5%' },
  cLast: { width: '13.5%' },
  cGroup: { width: '20%' },

  // celdas de cabecera
  headRow: { flexDirection: 'row', borderBottom: `${THICK} solid ${BORDER}`, backgroundColor: BG_HEADER },
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
    flexDirection: 'column',
  },
  
  // Líneas dentro del grupo
  slotLine: { 
    flex: 1, 
    flexDirection: 'column',
  },
  slotLineDivider: { borderBottom: `${THIN} solid ${BORDER}` },
  
  // Nombres (Top half)
  slotNameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottom: `${THIN} solid ${BORDER}`,
  },
  slotName: {
    fontSize: 7,
    textAlign: 'center',
  },

  // Fechas (Bottom half)
  slotDatesContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  slotColLeft: {
    flex: 1,
    borderRight: `${THIN} solid ${BORDER}`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotColRight: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 7,
  },

  footnote: { fontSize: 8.5, marginTop: 8 },
  formCode: { fontSize: 9.5, marginTop: 2 },
});

const GroupHeader = ({ last }: { last: boolean }) => (
  <View style={[styles.cGroup, !last ? styles.groupHead : { borderRight: 'none' }]}>
    <Text style={styles.groupHeadTitle}>Asignado a</Text>
    <View style={styles.groupHeadSubRow}>
      <View style={[styles.groupHeadSub, styles.groupHeadSubDivider]}>
        <Text>Fecha</Text>
        <Text>asignada</Text>
      </View>
      <View style={styles.groupHeadSub}>
        <Text>Fecha</Text>
        <Text>completada</Text>
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
      {/* Mitad superior: Nombre centrado */}
      <View style={styles.slotNameContainer}>
        <Text style={styles.slotName}>
          {a ? (a.name.length > 18 ? a.name.slice(0, 16) + '…' : a.name) + (a.isCampaign ? ' (C)' : '') : ''}
        </Text>
      </View>
      {/* Mitad inferior: Fechas divididas */}
      <View style={styles.slotDatesContainer}>
        <View style={styles.slotColLeft}>
          <Text style={styles.dateText}>{a?.dateAssigned ?? ''}</Text>
        </View>
        <View style={styles.slotColRight}>
          <Text style={styles.dateText}>{a?.dateCompleted ?? ''}</Text>
        </View>
      </View>
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
    <Text style={styles.title}>REGISTRO DE ASIGNACIÓN DE TERRITORIO</Text>

    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>Año de servicio:</Text>
      <Text style={styles.metaValueSY}>{sheet.serviceYear}</Text>
      <Text style={styles.metaLabel}>Tipo de territorio:</Text>
      <Text style={styles.metaValueTT}>{sheet.territoryType}</Text>
    </View>

    <View style={styles.table}>
      {/* Cabecera */}
      <View style={styles.headRow}>
        <View style={[styles.cTerr, styles.headCellTall]}>
          <Text>Núm.</Text>
          <Text>de terr.</Text>
        </View>
        <View style={[styles.cLast, styles.headCellTall]}>
          <Text>Última fecha en</Text>
          <Text>que se</Text>
          <Text>completó*</Text>
        </View>
        {[0, 1, 2, 3].map((i) => (
          <GroupHeader key={i} last={i === 3} />
        ))}
      </View>

      {/* Filas */}
      {sheet.rows.map((row, idx) => {
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
      *Cuando comience una nueva página, anote en esta columna la última fecha en que los territorios se completaron.
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
