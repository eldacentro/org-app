import { Document, Page, Text, View, Svg, G, Path, Link } from '@react-pdf/renderer';
import styles from './index.styles';
import { VisitingSpeakerInvitationProps } from './index.types';

const LogoLarge = () => (
  <Svg viewBox="0 0 2881 2572" fill="none" style={{ width: 36, height: 32 }}>
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

const CoordinatorBox = ({ title, info }: { title: string; info: VisitingSpeakerInvitationProps['publicTalkCoordinator'] }) => (
  <View style={styles.coordinatorCard}>
    <Text style={styles.coordinatorTitle}>{title}</Text>
    <Text style={styles.coordinatorName}>{info.name || 'Sin Asignar'}</Text>
    {info.phone ? <Text style={styles.coordinatorContact}>{info.phone}</Text> : null}
    {info.email ? <Text style={styles.coordinatorContact}>{info.email}</Text> : null}
  </View>
);

const VisitingSpeakerInvitation = (props: VisitingSpeakerInvitationProps) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.contentWrapper}>
          {/* Header */}
          <View style={styles.headerContainer}>
            <View style={styles.topBarBrand}>
              <LogoLarge />
              <Text style={styles.topBarBrandName}>{props.congregationName}</Text>
            </View>
          </View>

          {/* Introduction */}
          <View style={styles.introSection}>
            <Text style={styles.greeting}>Querido hermano {props.speakerName}:</Text>
            <Text style={styles.bodyText}>
              Nos alegra mucho contar con tu visita y te extendemos una afectuosa invitación para presentar el discurso público en nuestra congregación.
            </Text>
            <Text style={styles.bodyText}>
              Confiamos en que tu esmerada preparación será de gran beneficio para los hermanos y para quienes se están acercando a la verdad. Como oradores públicos, recordamos la importancia de repasar periódicamente las pautas del formulario S-141-S (Puntos que los oradores públicos deben recordar), lo cual nos ayuda a mantener un alto nivel de enseñanza.
            </Text>
            <Text style={styles.bodyText}>
              Agradecemos de corazón tu buena disposición y esfuerzo. Si por alguna causa de fuerza mayor no pudieras cumplir con esta asignación, te rogamos que nos lo comuniques con la mayor antelación posible.
            </Text>
          </View>

          {/* Main Card */}
          <View style={styles.mainCard}>
            <Text style={styles.mainCardTitle}>Tenemos el gusto de invitarte a discursar el próximo:</Text>
            
            <View style={styles.detailsRow}>
              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>Fecha</Text>
                <Text style={styles.detailValue}>{props.dateLocale}</Text>
              </View>
              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>Hora</Text>
                <Text style={styles.detailValue}>{props.time}</Text>
              </View>
            </View>

            <View style={styles.outlineBox}>
              <Text style={styles.detailLabel}>Bosquejo Asignado</Text>
              <Text style={styles.outlineValue}>{props.outlineNumber ? `Núm. ${props.outlineNumber}` : 'Sin definir'}</Text>
              {props.outlineTitle && (
                <Text style={{ ...styles.bodyText, marginTop: 4, textAlign: 'center', fontWeight: 700 }}>
                  {props.outlineTitle}
                </Text>
              )}
            </View>

            <View style={styles.addressBox}>
              <Text style={styles.addressTitle}>Dirección del Salón del Reino</Text>
              <Text style={styles.addressValue}>{props.congregationAddress}</Text>
              {props.congregationAddress && (
                <Link src="https://maps.app.goo.gl/hjSEV7LLEMm7vcDK9">
                  <Text style={{ ...styles.addressValue, color: '#306CB4', fontSize: 10, marginTop: 2, textDecoration: 'underline' }}>
                    Ver en Google Maps
                  </Text>
                </Link>
              )}
            </View>
          </View>

          {/* Media Info */}
          <View style={styles.mediaSection}>
            <Text style={styles.mediaText}>
              <Text style={styles.boldText}>Contenido multimedia:</Text> Si utilizas imágenes o videos en tu discurso, puedes traerlos en un pendrive o enviarlos con antelación a nuestro correo (preferiblemente en el formato de lista de reproducción de JW Library). Por favor, envíanos también el número de la canción de inicio a:
            </Text>
            <Text style={{ ...styles.mediaText, fontWeight: 700, color: '#306CB4', marginTop: 4 }}>
              {props.mediaEmail || 'discursos@eldacentro.com'}
            </Text>
          </View>

          {/* Coordinators Contact Info */}
          <View style={styles.coordinatorsContainer}>
            {props.assistants.map((assistant, index) => (
              <CoordinatorBox
                key={`assistant-${index}`}
                title="Auxiliar Discursos"
                info={assistant}
              />
            ))}
            <CoordinatorBox title="Coord. Discursos" info={props.publicTalkCoordinator} />
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default VisitingSpeakerInvitation;
