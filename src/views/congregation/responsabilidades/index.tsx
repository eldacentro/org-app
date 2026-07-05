import { G, Path, Svg, Text, View } from '@react-pdf/renderer';
import { Document, Page } from '@views/components';
import { StyleSheet } from '@react-pdf/renderer';
import registerFonts from '@views/registerFonts';
import { ResponsabilidadesType, DepartamentoExtended } from '@definition/responsabilidades';

registerFonts();

// ─── inline styles (no StyleSheet import needed above – registerFonts does it) ──
const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontFamily: 'Figtree',
    backgroundColor: '#ffffff',
  },
  contentWrapper: {
    display: 'flex',
    flexDirection: 'column',
    // Reserva el alto del footer (absoluto) para que el contenido no se le solape.
    paddingBottom: 10,
  },
  topBar: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4.5,
  },
  topBarBrand: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7.5,
  },
  topBarBrandName: {
    fontSize: 13.5,
    fontWeight: 700,
    color: '#1a1a2e',
  },
  topBarDate: {
    fontSize: 8.5,
    fontWeight: 500,
    color: '#888888',
  },
  pageTitle: {
    fontSize: 23.5,
    fontWeight: 700,
    color: '#1a1a2e',
    marginBottom: 3,
  },
  pageSubtitle: {
    fontSize: 9.3,
    color: '#306CB4',
    marginBottom: 9,
  },
  headerDivider: {
    borderBottom: '1 solid #d0d7e8',
    marginBottom: 10.5,
  },
  // Section
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: '#306CB4',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4.5,
    borderBottom: '1 solid #d0d7e8',
    paddingBottom: 3,
  },

  sectionWrapper: {
    marginBottom: 7.5,
  },
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
  footer: {
    position: 'absolute',
    bottom: 15,
    left: 20,
    right: 20,
    borderTop: '0.5 solid #e0e0e0',
    paddingTop: 5,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 7,
    color: '#aaaaaa',
  },
});

const MONTHS_ES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
];

const LogoSmall = () => (
  <Svg viewBox="0 0 2881 2572" fill="none" style={{ width: 28, height: 25 }}>
    <G transform="matrix(1,0,0,1,-809.952083,-964.060833)">
      <G transform="matrix(4.166667,0,0,4.166667,0,0)">
        <G>
          <G transform="matrix(1,0,0,1,685.2798,417.6269)">
            <Path
              d="M0,251.699L82.498,251.699C97.263,251.699 109.406,239.327 108.387,223.95C107.469,210.107 95.059,199.802 81.186,199.802L1.026,199.802C-12.685,199.802 -24.821,209.998 -25.868,223.668C-27.056,239.175 -14.855,251.699 0,251.699M80.392,-10.978L2.547,-10.978C-11.638,-10.978 -23.401,0.784 -23.401,14.97C-23.401,29.5 -11.638,40.918 2.547,40.918L80.392,40.918C94.576,40.918 106.341,29.5 106.341,14.97C106.341,0.784 94.576,-10.978 80.392,-10.978M-101.09,-115.822C-37.64,-150.044 57.969,-180.401 123.179,-186.044L125.255,-186.044C166.719,-186.044 200.331,-152.432 200.331,-105.643L200.331,305.727C200.331,334.061 172.993,364.919 139.578,368.973L128.713,370.291C71.911,377.936 -7.953,401.534 -72.261,428.321C-94.881,437.743 -119.7,420.742 -119.7,401.562L-119.7,-79.758C-119.7,-98.014 -112.47,-109.683 -101.09,-115.822"
              fill="rgb(48,108,180)"
            />
          </G>
          <G transform="matrix(1,0,0,1,354.2325,524.4056)">
            <Path
              d="M0,37.725L-39.905,37.725C-54.088,37.725 -65.853,26.307 -65.853,11.777C-65.853,-2.41 -54.088,-14.172 -39.905,-14.172L0,-14.172C14.185,-14.172 25.948,-2.41 25.948,11.777C25.948,26.307 14.185,37.725 0,37.725M40.488,144.712L-42.01,144.712C-56.775,144.712 -68.919,132.34 -67.899,116.963C-66.981,103.12 -54.572,92.815 -40.698,92.815L39.462,92.815C53.172,92.815 65.309,103.011 66.356,116.681C67.544,132.188 55.343,144.712 40.488,144.712M-39.905,-117.966L37.941,-117.966C52.126,-117.966 63.889,-106.204 63.889,-92.017C63.889,-77.487 52.126,-66.069 37.941,-66.069L-39.905,-66.069C-54.088,-66.069 -65.853,-77.487 -65.853,-92.017C-65.853,-106.204 -54.088,-117.966 -39.905,-117.966M141.577,-222.809C78.127,-257.031 -17.481,-287.388 -82.691,-293.031L-84.767,-293.031C-126.231,-293.031 -159.844,-259.419 -159.844,-212.63L-159.844,198.74C-159.844,227.074 -132.506,257.932 -99.09,261.986L-88.226,263.304C-31.423,270.948 48.441,294.547 112.748,321.334C135.369,330.756 160.187,313.754 160.187,294.575L160.187,-186.745C160.187,-205.002 152.957,-216.67 141.577,-222.809"
              fill="rgb(48,108,180)"
            />
          </G>
        </G>
      </G>
    </G>
  </Svg>
);

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
  const footerDate = data.updatedAt
    ? (() => {
        const d = new Date(data.updatedAt);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        return `${dd}/${mm}/${d.getFullYear()}`;
      })()
    : '';

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
      n + (dep.type === 'extended' ? (dep as DepartamentoExtended).members.length : 0),
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
    membersLabel: { fontSize: Math.max(6, r(6.4)), marginTop: 1, marginBottom: 1.5 },
    membersWrap: { gap: r(1.8) },
    memberChip: { paddingVertical: r(1.2), paddingHorizontal: r(3) },
    memberText: { fontSize: r(8.5) },
  };

  return (
    <Document title="Responsabilidades" lang="es">
      <Page>
        <View style={styles.contentWrapper}>
          {/* ── Top bar ─────────────────────────── */}
          <View style={styles.topBar}>
            <View style={styles.topBarBrand}>
              <LogoSmall />
              <Text style={styles.topBarBrandName}>{congregation || 'Elda Centro'}</Text>
            </View>
            <Text style={styles.topBarDate}>{monthYear}</Text>
          </View>

          <View style={styles.headerDivider} />

          <Text style={styles.pageTitle}>Responsabilidades</Text>

          {/* ── Cuerpo de Ancianos ───────────────── */}
          <View style={styles.sectionWrapper}>
            <Text style={styles.sectionTitle}>Cuerpo de Ancianos</Text>
            <View style={styles.chipsRow}>
              {data.cuerpoAncianos.map((uid, i) => (
                <View key={i} style={styles.chip}>
                  <Text style={styles.chipText}>{resolve(uid)}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Cargos ──────────────────────────── */}
          <View style={styles.sectionWrapper}>
            <Text style={styles.sectionTitle}>Responsabilidades de Ancianos</Text>
            <View style={styles.table}>
              {data.cargosAncianos.map((item, i) => (
                <View
                  key={i}
                  style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
                >
                  <Text style={styles.tableColLabel}>{item.cargo}</Text>
                  <Text style={styles.tableColValue}>{resolve(item.responsable)}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Departamentos ────────────────────── */}
          <View style={styles.sectionWrapper}>
            <Text style={styles.sectionTitle}>Departamentos</Text>
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

                const estimateUnits = (dep: typeof data.departamentos[number]) => {
                  let units = 1; // encabezado
                  units += 1; // responsable (siempre se muestra)
                  if (dep.auxiliar) units += 1;

                  if (dep.type === 'extended') {
                    const memberCount = (dep as DepartamentoExtended).members.length;
                    if (memberCount > 0) {
                      // a 1/3 de ancho de página caben ~2 chips por línea
                      units += 1 + Math.ceil(memberCount / 2);
                    }
                  }

                  return units + 0.8; // borde/padding de la tarjeta
                };

                const columns: typeof data.departamentos[] = Array.from(
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
                                <Text style={[styles.deptMembersLabel, dz.membersLabel]}>
                                  Integrantes
                                </Text>
                                <View style={[styles.deptMembersWrap, dz.membersWrap]}>
                                  {(dep as DepartamentoExtended).members.map((uid, i) => (
                                    <View
                                      key={i}
                                      style={[styles.deptMemberChip, dz.memberChip]}
                                    >
                                      <Text style={[styles.deptMemberText, dz.memberText]}>
                                        {resolve(uid)}
                                      </Text>
                                    </View>
                                  ))}
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
          </View>
        </View>

        {/* ── Footer ───────────────────────────── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Elda - Centro</Text>
          {footerDate ? (
            <Text style={styles.footerText}>
              Última actualización · {footerDate}
            </Text>
          ) : null}
        </View>
      </Page>
    </Document>
  );
};

export default TemplateResponsabilidades;
