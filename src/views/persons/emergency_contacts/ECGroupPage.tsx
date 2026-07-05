import { G, Path, Svg, Text, View } from '@react-pdf/renderer';
import { Page } from '@views/components';
import { ECGroupPageProps } from './index.types';
import ECMember from './ECMember';
import styles from './index.styles';

const LogoLarge = () => (
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

// Una página completa por grupo — antes se empaquetaban varios grupos por
// hoja en una cuadrícula y, con congregaciones/grupos grandes, el contenido
// se salía por debajo del margen. Ahora cada grupo tiene su propia página (o
// varias, si no cabe), así el contenido nunca se corta.
const ECGroupPage = ({
  group,
  congregation,
  generatedAt,
  coContact,
}: ECGroupPageProps) => {
  // El nombre del CO ya existe en Ajustes desde hace tiempo (se usa en los
  // programas de reunión), así que se muestra en cuanto haya un nombre —
  // no hace falta esperar a que también se rellenen teléfono/correo, que
  // son los campos nuevos y opcionales.
  const showCoContact = !!coContact?.name;

  return (
    <Page>
      <View style={styles.contentWrapper}>
        <View style={styles.topBar}>
          <View style={styles.topBarBrand}>
            <LogoLarge />
            <Text style={styles.topBarBrandName}>
              {congregation || 'Elda Centro'}
            </Text>
          </View>

          <View style={styles.topBarRight}>
            {showCoContact && (
              <>
                <Text style={styles.coContactName}>
                  Sup. de circuito: {coContact.name}
                </Text>
                {coContact.phone && (
                  <Text style={styles.coContactLine}>{coContact.phone}</Text>
                )}
                {coContact.email && (
                  <Text style={styles.coContactLine}>{coContact.email}</Text>
                )}
              </>
            )}
            <Text style={styles.topBarDate}>{generatedAt}</Text>
          </View>
        </View>

        <View style={styles.headerDivider} />

        <View style={styles.groupBanner}>
          <Text style={styles.groupBannerTitle}>
            {group.group_name} - Contactos de emergencia
          </Text>
          <View style={styles.membersCountBadge}>
            <Text style={styles.membersCount}>{group.members.length}</Text>
          </View>
        </View>

        {group.members.length === 0 ? (
          <Text style={styles.emptyGroupText}>Sin publicadores</Text>
        ) : (
          <View style={styles.memberGrid}>
            {group.members.map((member, i) => (
              <ECMember key={member.name + i} member={member} />
            ))}
          </View>
        )}
      </View>
    </Page>
  );
};

export default ECGroupPage;
