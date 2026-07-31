import { Text, View } from '@react-pdf/renderer';
import { Document } from '@views/components';
import { PdfSection, Sheet, fechaCorta } from '@views/design';
import { StyleSheet } from '@react-pdf/renderer';
import registerFonts from '@views/registerFonts';
import {
  ResponsabilidadesType,
  DepartamentoExtended,
} from '@definition/responsabilidades';

registerFonts();

// ─── inline styles (no StyleSheet import needed above – registerFonts does it) ──
const styles = StyleSheet.create({
  // Section

  // Chips row (cuerpo de ancianos)
  chipsRow: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  chip: {
    backgroundColor: '#e8f0fb',
    borderRadius: 8,
    paddingVertical: 2.2,
    paddingHorizontal: 6,
  },
  chipText: {
    fontSize: 9.3,
    color: '#306CB4',
    fontWeight: 600,
  },
  // Table (cargos)
  table: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1.5,
  },
  tableRow: {
    display: 'flex',
    flexDirection: 'row',
    paddingVertical: 2.2,
    paddingHorizontal: 4.5,
    borderBottom: '0.5 solid #eef2fa',
  },
  tableRowAlt: {
    backgroundColor: '#f7f9fe',
  },
  tableColLabel: {
    width: '45%',
    fontSize: 9.3,
    color: '#444',
    fontWeight: 600,
  },
  tableColValue: {
    flex: 1,
    fontSize: 9.3,
    color: '#1a1a2e',
  },
  // Department cards (Masonry 2-columns)
  masonryContainer: {
    display: 'flex',
    flexDirection: 'row',
    gap: 8,
  },
  masonryColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  deptCard: {
    width: '100%',
    border: '0.5 solid #dde3f0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  deptHeader: {
    backgroundColor: '#306CB4',
    paddingVertical: 3,
    paddingHorizontal: 7.5,
  },
  deptHeaderText: {
    fontSize: 9.3,
    fontWeight: 700,
    color: '#ffffff',
  },
  deptBody: {
    padding: '5.2 7.5',
    display: 'flex',
    flexDirection: 'column',
    gap: 4.5,
  },
  // Contenedor Resp./Aux.: apilado en tarjetas normales, en paralelo en las anchas
  deptInfoCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3.7,
  },
  deptInfoRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: 15,
  },
  deptPerson: {
    display: 'flex',
    flexDirection: 'column',
  },
  deptPersonWide: {
    flex: 1,
  },
  deptLabel: {
    fontSize: 6.4,
    fontWeight: 700,
    color: '#306CB4',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 0.7,
  },
  deptValue: {
    fontSize: 9,
    color: '#1a1a2e',
  },
  deptMembersLabel: {
    fontSize: 6.4,
    fontWeight: 700,
    color: '#306CB4',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 1.5,
    marginBottom: 2.2,
  },
  deptMembersWrap: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2.2,
  },
  deptMemberChip: {
    backgroundColor: '#f0f4fc',
    borderRadius: 4,
    paddingVertical: 1.5,
    paddingHorizontal: 3.7,
  },
  deptMemberText: {
    fontSize: 8.5,
    color: '#2c2c2c',
  },
  // Footer
});

const MONTHS_ES = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
];

export type TemplateResponsabilidadesProps = {
  data: ResponsabilidadesType;
  congregation: string;
  /** fn to resolve person_uid → display name */
  resolveName: (uid: string) => string;
};

const TemplateResponsabilidades = ({
  data,
  congregation,
  resolveName,
}: TemplateResponsabilidadesProps) => {
  const now = new Date();
  const monthYear = `${MONTHS_ES[now.getMonth()]} ${now.getFullYear()}`;

  // Fecha de "Última actualización" tomada del registro guardado (igual que el
  // PDF de Grupos de predicación), no de la fecha actual.
  const footerDate = fechaCorta(data.updatedAt);

  const resolve = (uid: string) => {
    const name = resolveName(uid);
    return name || uid; // fallback: show raw value if not a uid
  };

  // ── Densidad adaptativa para que SIEMPRE quepa en una página ──
  // El header / cuerpo / cargos tienen altura estable; lo que crece es la
  // sección de departamentos. Con el empaquetado por columnas balanceadas
  // (ver más abajo) 17 departamentos / 30 integrantes en total ya caben de
  // sobra a tamaño completo — antes estos umbrales compensaban un reparto en
  // columnas desbalanceado, así que ahora solo deben achicar la fuente para
  // congregaciones bastante más grandes que la prueba real con la que se
  // verificó esto.
  const deptCount = data.departamentos.length;
  const memberTotal = data.departamentos.reduce(
    (n, dep) =>
      n +
      (dep.type === 'extended'
        ? (dep as DepartamentoExtended).members.length
        : 0),
    0
  );
  const dense = deptCount > 22 || memberTotal > 40;
  const ultra = deptCount > 30 || memberTotal > 60;

  const kd = ultra ? 0.8 : dense ? 0.9 : 1; // factor de escala de la sección
  const r = (n: number) => Math.round(n * kd * 10) / 10;

  // Estilos escalados (se fusionan con los base vía arrays de estilo)
  const dz = {
    header: { paddingVertical: r(2.5), paddingHorizontal: r(6) },
    headerText: { fontSize: r(9.3) },
    body: { paddingVertical: r(4), paddingHorizontal: r(6), gap: r(3.5) },
    infoColGap: { gap: r(3) },
    label: { fontSize: Math.max(6, r(6.4)), marginBottom: 0 },
    value: { fontSize: r(9) },
    membersLabel: {
      fontSize: Math.max(6, r(6.4)),
      marginTop: 1,
      marginBottom: 1.5,
    },
    membersWrap: { gap: r(1.8) },
    memberChip: { paddingVertical: r(1.2), paddingHorizontal: r(3) },
    memberText: { fontSize: r(8.5) },
  };

  return (
    <Document title="Responsabilidades" lang="es">
      <Sheet
        congregation={congregation}
        meta={monthYear}
        title="Responsabilidades"
        paginated
        footerMeta={
          footerDate ? `Última actualización · ${footerDate}` : monthYear
        }
      >
        {/* ── Cuerpo de ancianos ───────────────── */}
        <PdfSection title="Cuerpo de ancianos" dense={dense}>
          <View style={styles.chipsRow}>
            {data.cuerpoAncianos.map((uid, i) => (
              <View key={i} style={styles.chip}>
                <Text style={styles.chipText}>{resolve(uid)}</Text>
              </View>
            ))}
          </View>
        </PdfSection>

        {/* ── Cargos ──────────────────────────── */}
        <PdfSection title="Responsabilidades de ancianos" dense={dense}>
          <View style={styles.table}>
            {data.cargosAncianos.map((item, i) => (
              <View
                key={i}
                style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
              >
                <Text style={styles.tableColLabel}>{item.cargo}</Text>
                <Text style={styles.tableColValue}>
                  {resolve(item.responsable)}
                </Text>
              </View>
            ))}
          </View>
        </PdfSection>

        {/* ── Departamentos ────────────────────── */}
        <PdfSection title="Departamentos" dense={dense}>
          <View style={styles.masonryContainer}>
            {(() => {
              // Antes esto repartía los departamentos alternando por
              // posición (i % 2) sin importar cuánto contenido tenía cada
              // uno — una columna podía terminar mucho más larga que la
              // otra, empujando los últimos departamentos (los más
              // pequeños) a una segunda página aunque sobrara espacio en
              // la otra columna. Ahora cada departamento se asigna a la
              // columna que en ese momento tenga MENOS contenido
              // acumulado (estimado en "líneas"), y usamos 3 columnas en
              // vez de 2 para aprovechar mejor el ancho — así los
              // departamentos chicos (Territorios, Cuentas, etc.) se
              // empaquetan juntos en vez de ocupar una fila completa cada
              // uno.
              const COLUMN_COUNT = 3;

              const estimateUnits = (
                dep: (typeof data.departamentos)[number]
              ) => {
                let units = 1; // encabezado
                units += 1; // responsable (siempre se muestra)
                if (dep.auxiliar) units += 1;

                if (dep.type === 'extended') {
                  const memberCount = (dep as DepartamentoExtended).members
                    .length;
                  if (memberCount > 0) {
                    // a 1/3 de ancho de página caben ~2 chips por línea
                    units += 1 + Math.ceil(memberCount / 2);
                  }
                }

                return units + 0.8; // borde/padding de la tarjeta
              };

              const columns: (typeof data.departamentos)[] = Array.from(
                { length: COLUMN_COUNT },
                () => []
              );
              const columnUnits = new Array(COLUMN_COUNT).fill(0);

              data.departamentos.forEach((dep) => {
                let shortest = 0;
                for (let c = 1; c < COLUMN_COUNT; c++) {
                  if (columnUnits[c] < columnUnits[shortest]) shortest = c;
                }
                columns[shortest].push(dep);
                columnUnits[shortest] += estimateUnits(dep);
              });

              return columns.map((colItems, colIndex) => (
                <View key={colIndex} style={styles.masonryColumn}>
                  {colItems.map((dep) => {
                    const isExtended = dep.type === 'extended';
                    const hasMembers =
                      isExtended &&
                      (dep as DepartamentoExtended).members.length > 0;
                    const auxiliar = dep.auxiliar ? resolve(dep.auxiliar) : '';

                    return (
                      <View key={dep.id} style={styles.deptCard}>
                        <View style={[styles.deptHeader, dz.header]}>
                          <Text style={[styles.deptHeaderText, dz.headerText]}>
                            {dep.name}
                          </Text>
                        </View>
                        <View style={[styles.deptBody, dz.body]}>
                          <View style={[styles.deptInfoCol, dz.infoColGap]}>
                            <View style={styles.deptPerson}>
                              <Text style={[styles.deptLabel, dz.label]}>
                                Responsable
                              </Text>
                              <Text style={[styles.deptValue, dz.value]}>
                                {resolve(dep.responsable) || '—'}
                              </Text>
                            </View>
                            {auxiliar ? (
                              <View style={styles.deptPerson}>
                                <Text style={[styles.deptLabel, dz.label]}>
                                  Auxiliar
                                </Text>
                                <Text style={[styles.deptValue, dz.value]}>
                                  {auxiliar}
                                </Text>
                              </View>
                            ) : null}
                          </View>

                          {hasMembers ? (
                            <View>
                              <Text
                                style={[
                                  styles.deptMembersLabel,
                                  dz.membersLabel,
                                ]}
                              >
                                Integrantes
                              </Text>
                              <View
                                style={[styles.deptMembersWrap, dz.membersWrap]}
                              >
                                {(dep as DepartamentoExtended).members.map(
                                  (uid, i) => (
                                    <View
                                      key={i}
                                      style={[
                                        styles.deptMemberChip,
                                        dz.memberChip,
                                      ]}
                                    >
                                      <Text
                                        style={[
                                          styles.deptMemberText,
                                          dz.memberText,
                                        ]}
                                      >
                                        {resolve(uid)}
                                      </Text>
                                    </View>
                                  )
                                )}
                              </View>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ));
            })()}
          </View>
        </PdfSection>
      </Sheet>
    </Document>
  );
};

export default TemplateResponsabilidades;
