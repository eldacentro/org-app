import { Page, Text, View, Link } from '@react-pdf/renderer';
// El `Document` de la app: registra las tipografías y fija el idioma. Esta
// plantilla usaba el de react-pdf en crudo.
import {
  AccentCapsule,
  Document,
  accentCapsuleSurface,
} from '@views/components';
import { IconLogo } from '@views/components/icons';
import styles from './index.styles';
import { VisitingSpeakerInvitationProps } from './index.types';

const CoordinatorBox = ({
  title,
  info,
}: {
  title: string;
  info: VisitingSpeakerInvitationProps['publicTalkCoordinator'];
}) => (
  <View style={styles.coordinatorCard}>
    <Text style={styles.coordinatorTitle}>{title}</Text>
    <Text style={styles.coordinatorName}>{info.name || 'Sin asignar'}</Text>
    {info.phone ? (
      <Text style={styles.coordinatorContact}>{info.phone}</Text>
    ) : null}
    {info.email ? (
      <Text style={styles.coordinatorContact}>{info.email}</Text>
    ) : null}
  </View>
);

const VisitingSpeakerInvitation = (props: VisitingSpeakerInvitationProps) => {
  return (
    <Document title="Invitación al orador visitante" lang="spa">
      <Page size="A4" style={styles.page}>
        <View style={styles.contentWrapper}>
          {/* Header */}
          <View style={styles.headerContainer}>
            <View style={styles.topBarBrand}>
              {/* Es una carta, no un programa: no lleva título de hoja, así
                  que no usa `PdfHeader`. Pero el logotipo sí es el compartido
                  — era la sexta copia de los mismos trazos SVG. */}
              <IconLogo size={36} />
              <Text style={styles.topBarBrandName}>
                {props.congregationName}
              </Text>
            </View>
          </View>

          {/* Introduction */}
          <View style={styles.introSection}>
            <Text style={styles.greeting}>
              Querido hermano {props.speakerName}:
            </Text>
            <Text style={styles.bodyText}>
              Nos alegra mucho contar con tu visita y te extendemos una
              afectuosa invitación para presentar el discurso público en nuestra
              congregación.
            </Text>
            <Text style={styles.bodyText}>
              Confiamos en que tu esmerada preparación será de gran beneficio
              para los hermanos y para quienes se están acercando a la verdad.
              Como oradores públicos, recordamos la importancia de repasar
              periódicamente las pautas del formulario S-141-S (Puntos que los
              oradores públicos deben recordar), lo cual nos ayuda a mantener un
              alto nivel de enseñanza.
            </Text>
            <Text style={styles.bodyText}>
              Agradecemos de corazón tu buena disposición y esfuerzo. Si por
              alguna causa de fuerza mayor no pudieras cumplir con esta
              asignación, te rogamos que nos lo comuniques con la mayor
              antelación posible.
            </Text>
          </View>

          {/* Main Card */}
          <View style={styles.mainCard}>
            <Text style={styles.mainCardTitle}>
              Tenemos el gusto de invitarte a discursar el próximo:
            </Text>

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
              <Text style={styles.outlineValue}>
                {props.outlineNumber
                  ? `Núm. ${props.outlineNumber}`
                  : 'Sin definir'}
              </Text>
              {props.outlineTitle && (
                <Text
                  style={{
                    ...styles.bodyText,
                    marginTop: 4,
                    textAlign: 'center',
                    fontWeight: 700,
                  }}
                >
                  {props.outlineTitle}
                </Text>
              )}
            </View>

            <View style={styles.addressBox}>
              <Text style={styles.addressTitle}>
                Dirección del Salón del Reino
              </Text>
              <Text style={styles.addressValue}>
                {props.congregationAddress}
              </Text>
              {props.congregationAddress && (
                <Link
                  src={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(props.congregationAddress)}`}
                >
                  <Text
                    style={{
                      ...styles.addressValue,
                      color: '#306CB4',
                      fontSize: 10,
                      marginTop: 2,
                      textDecoration: 'underline',
                    }}
                  >
                    Ver en Google Maps
                  </Text>
                </Link>
              )}
            </View>
          </View>

          {/* Media Info */}
          {props.mediaEmail && (
            <View style={[styles.mediaSection, accentCapsuleSurface()]}>
              {/* La uñita, hecha cápsula: ver
                  `@views/components/accent_capsule`. */}
              <AccentCapsule color="#EAB308" />

              <Text style={styles.mediaText}>
                <Text style={styles.boldText}>Contenido multimedia:</Text> Si
                utilizas imágenes o videos en tu discurso, puedes traerlos en un
                pendrive o enviarlos con antelación a nuestro correo
                (preferiblemente en el formato de lista de reproducción de JW
                Library). Por favor, envíanos también el número de la canción de
                inicio a:
              </Text>
              <Text
                style={{
                  ...styles.mediaText,
                  fontWeight: 700,
                  color: '#306CB4',
                  marginTop: 4,
                }}
              >
                {props.mediaEmail}
              </Text>
            </View>
          )}

          {/* Coordinators Contact Info */}
          <View style={styles.coordinatorsContainer}>
            {props.assistants.map((assistant, index) => (
              <CoordinatorBox
                key={`assistant-${index}`}
                title="Auxiliar de discursos"
                info={assistant}
              />
            ))}
            <CoordinatorBox
              title="Coord. Discursos"
              info={props.publicTalkCoordinator}
            />
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default VisitingSpeakerInvitation;
