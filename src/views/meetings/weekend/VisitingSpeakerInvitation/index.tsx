import { Text, View, Link } from '@react-pdf/renderer';
import { Document } from '@views/components';
import {
  PdfHairline,
  PdfKeyValue,
  PdfNote,
  Sheet,
  color,
  periodo,
  space,
  text,
} from '@views/design';
import { VisitingSpeakerInvitationProps } from './index.types';

/**
 * Documento 5 · Invitación al orador visitante. **Una hoja.**
 *
 * Es una carta, no un programa: cuerpo a 9,5 con interlínea holgada, un bloque
 * destacado con los datos de la asignación, y la firma abajo.
 *
 * El texto es el reescrito en la especificación §6: el anterior venía copiado
 * de otra congregación y sonaba prestado.
 */
const VisitingSpeakerInvitation = (props: VisitingSpeakerInvitationProps) => {
  const parrafo = {
    ...text.body,
    fontSize: 9.5,
    lineHeight: 1.6,
    textAlign: 'justify' as const,
    marginBottom: space.md,
  };

  return (
    <Document title="Invitación al orador visitante" lang="spa">
      <Sheet
        congregation={props.congregationName}
        period={periodo(props.dateRaw ?? new Date())}
        title={`Querido hermano ${props.speakerName}:`}
        subtitle="Invitación para el discurso público"
        documentName="Invitación al orador visitante"
      >
        <Text style={parrafo}>
          Nos alegró mucho saber que podrás visitarnos. Contar contigo para el
          discurso público es un motivo de alegría para toda la congregación, y
          estamos seguros de que el domingo que pasemos juntos nos animará a
          todos.
        </Text>

        <Text style={parrafo}>
          Abajo tienes los datos de la asignación. Solo te pedimos dos cosas:
          repasa el formulario S-141-S para confirmar el bosquejo y la canción,
          y, si te surgiera cualquier imprevisto, avísanos con la mayor
          antelación posible para poder buscar un sustituto.
        </Text>

        <Text style={parrafo}>
          Si vas a usar imágenes o vídeos, envíanoslos unos días antes o tráelos
          en un USB; el equipo de audio se encarga del resto.
        </Text>

        <Text style={{ ...parrafo, marginBottom: space.xl }}>
          Gracias de corazón por tu tiempo y por el esfuerzo de preparar el
          discurso y desplazarte. Aquí te esperamos.
        </Text>

        {/* El único bloque destacado de la hoja */}
        <PdfNote>
          <View
            style={{ display: 'flex', flexDirection: 'row', gap: space.xl }}
          >
            <PdfKeyValue label="Fecha" style={{ flex: 1 }}>
              {props.dateLocale}
            </PdfKeyValue>
            <PdfKeyValue label="Hora" style={{ width: 54 }}>
              {props.time}
            </PdfKeyValue>
            <PdfKeyValue label="Bosquejo" style={{ width: 54 }}>
              {props.outlineNumber
                ? `N.º ${props.outlineNumber}`
                : 'Sin definir'}
            </PdfKeyValue>
          </View>

          {props.outlineTitle ? (
            <Text style={{ ...text.heading, marginTop: space.md }}>
              {props.outlineTitle}
            </Text>
          ) : null}

          <PdfHairline style={{ marginVertical: space.md }} />

          <PdfKeyValue label="Salón del Reino">
            <Text style={{ ...text.body, fontWeight: 500 }}>
              {props.congregationAddress || '—'}
            </Text>
          </PdfKeyValue>
          {props.congregationAddress ? (
            <Link
              src={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                props.congregationAddress
              )}`}
            >
              <Text
                style={{
                  ...text.meta,
                  color: color.accent,
                  textDecoration: 'underline',
                  marginTop: 2,
                }}
              >
                Ver en Google Maps
              </Text>
            </Link>
          ) : null}

          {props.mediaEmail ? (
            <Text style={{ ...text.meta, marginTop: space.md }}>
              Contenido multimedia: {props.mediaEmail}
            </Text>
          ) : null}
        </PdfNote>

        {/* Firma */}
        <View style={{ marginTop: space.xxl }}>
          <Text style={{ ...text.body, fontSize: 9.5 }}>
            Un abrazo fuerte de parte de toda la congregación,
          </Text>
          <Text style={{ fontSize: 9.5, fontWeight: 700, marginTop: space.lg }}>
            {props.publicTalkCoordinator.name || 'Coordinador de discursos'}
          </Text>
          <Text style={text.meta}>
            {[
              'Coordinador de discursos públicos',
              props.publicTalkCoordinator.phone,
              props.publicTalkCoordinator.email,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
      </Sheet>
    </Document>
  );
};

export default VisitingSpeakerInvitation;
