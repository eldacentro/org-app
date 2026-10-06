import { Text, View, Link } from '@react-pdf/renderer';
import { Document } from '@views/components';
import {
  PdfCard,
  PdfHairline,
  PdfKeyValue,
  PdfNote,
  Sheet,
  color,
  periodo,
  size,
  space,
  text,
} from '@views/design';
import { CoordinatorInfo, VisitingSpeakerInvitationProps } from './index.types';

/**
 * Documento 5 · Invitación al orador visitante. **Una hoja.**
 *
 * Es una carta, no un programa: cuerpo a 9,5 con interlínea holgada y el
 * saludo arriba. Lleva tres piezas y cada una hace una cosa:
 *
 * 1. El **bloque destacado** con los datos de la asignación — el único de la
 *    hoja (R6), porque es lo que el orador mira primero y lo que apunta.
 * 2. Una **tarjeta de contenido multimedia**: antes era una línea suelta al
 *    final del bloque destacado y se perdía; ahora dice a dónde enviar las
 *    imágenes y la canción, que es lo que de verdad hace falta que se lea.
 * 3. Una **tarjeta de contacto** con los auxiliares primero y el coordinador
 *    al final. Sustituye a la firma: quien recibe esta hoja no necesita una
 *    rúbrica, necesita a quién llamar.
 */

/** Uno de los contactos del pie: rótulo del cargo, nombre, teléfono y correo. */
const Contacto = ({
  role,
  person,
}: {
  role: string;
  person: CoordinatorInfo;
}) => (
  <View style={{ flexGrow: 1, flexBasis: 0 }}>
    <Text style={text.label}>{role}</Text>
    <Text style={{ ...text.bodyStrong, marginTop: 2 }}>{person.name}</Text>
    {person.phone ? (
      <Text style={{ ...text.meta, marginTop: 1 }}>{person.phone}</Text>
    ) : null}
    {person.email ? (
      <Text style={{ ...text.meta, marginTop: 1 }}>{person.email}</Text>
    ) : null}
  </View>
);

const VisitingSpeakerInvitation = (props: VisitingSpeakerInvitationProps) => {
  const parrafo = {
    ...text.body,
    lineHeight: 1.6,
    textAlign: 'justify' as const,
    marginBottom: space.md,
  };

  const auxiliares = (props.assistants ?? []).filter((a) => a?.name);

  return (
    <Document title="Invitación al orador visitante" lang="spa">
      <Sheet
        congregation={props.congregationName}
        period={periodo(props.dateRaw ?? new Date())}
        title="Invitación al orador visitante"
        subtitle={[props.speakerName, props.speakerCongregation]
          .filter(Boolean)
          .join(' · ')}
        documentName="Invitación al orador visitante"
      >
        <Text style={{ ...parrafo, marginBottom: space.sm }}>
          Querido hermano {props.speakerName}:
        </Text>

        <Text style={parrafo}>
          Nos alegra mucho contar con tu visita y te extendemos una afectuosa
          invitación para presentar el discurso público en nuestra congregación.
        </Text>

        <Text style={parrafo}>
          Confiamos en que tu esmerada preparación será de gran beneficio para
          los hermanos y para quienes se están acercando a la verdad. Como
          oradores públicos, recordamos la importancia de repasar periódicamente
          las pautas del formulario S-141-S (Puntos que los oradores públicos
          deben recordar), lo cual nos ayuda a mantener un alto nivel de
          enseñanza.
        </Text>

        {/* El único bloque destacado de la hoja */}
        <PdfNote style={{ marginVertical: space.sm }}>
          <View
            style={{ display: 'flex', flexDirection: 'row', gap: space.xl }}
          >
            <PdfKeyValue label="Fecha" strong style={{ flex: 1 }}>
              {props.dateLocale}
            </PdfKeyValue>
            <PdfKeyValue label="Hora" strong style={{ width: 54 }}>
              {props.time}
            </PdfKeyValue>
            <PdfKeyValue label="Bosquejo" strong style={{ width: 54 }}>
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

          <PdfHairline
            style={{
              backgroundColor: color.accentLine,
              marginVertical: space.md,
            }}
          />

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
        </PdfNote>

        {/* Los comentarios y, si la lleva, la oración final. El «además» solo
            aparece cuando el programa de esa semana se la ha asignado de
            verdad: ver `closingPrayer`. */}
        <Text style={parrafo}>
          Si te es posible y así lo permiten las circunstancias, nos agradaría
          disfrutar de tus comentarios y de los de quienes te acompañen en el
          estudio de La Atalaya de esa semana.
          {props.closingPrayer
            ? ' Además, nos gustaría asignarte la oración final de la reunión.'
            : ''}
        </Text>

        {/* La cena. Solo sale si hay a dónde contestar. */}
        {props.dinner && (props.dinner.url || props.dinner.email) ? (
          <PdfCard title="La cena" style={{ marginBottom: space.lg }}>
            <Text style={{ ...text.body, lineHeight: 1.5 }}>
              La congregación ha hecho los preparativos necesarios para que, si
              lo deseáis, tú y quienes te acompañen podáis cenar con una familia
              después de la reunión. Ten la amabilidad de indicarnos si os
              quedaréis y cuántos seréis en total, al menos una semana antes de
              tu discurso.
            </Text>

            {props.dinner.url ? (
              <Link src={props.dinner.url}>
                <Text
                  style={{
                    fontSize: size.body,
                    fontWeight: 700,
                    color: color.accent,
                    marginTop: space.sm,
                  }}
                >
                  Contestar aquí, en dos toques
                </Text>
              </Link>
            ) : null}

            {props.dinner.email ? (
              <Link src={`mailto:${props.dinner.email}`}>
                <Text
                  style={{
                    ...text.meta,
                    color: color.accent,
                    marginTop: props.dinner.url ? 2 : space.sm,
                  }}
                >
                  {props.dinner.url ? 'O escríbenos a ' : ''}
                  {props.dinner.email}
                </Text>
              </Link>
            ) : null}
          </PdfCard>
        ) : null}

        {/* El combustible. Con nombres, que es lo que falta cuando llega el
            momento de pedirlo. */}
        {props.expenses?.coordinator || props.expenses?.fallback ? (
          <Text style={parrafo}>
            Si lo necesitas, puedes pasar los gastos de combustible al
            coordinador del cuerpo de ancianos
            {props.expenses.coordinator ? `, ${props.expenses.coordinator}` : ''}
            {props.expenses.fallback
              ? `, y en su ausencia a quien conduce el estudio de La Atalaya, ${props.expenses.fallback}`
              : ''}
            .
          </Text>
        ) : null}

        <Text style={parrafo}>
          Agradecemos de corazón tu buena disposición y esfuerzo, y el que
          contribuyas a que los hermanos reciban alimento espiritual bien
          preparado. Si por alguna causa de fuerza mayor no pudieras cumplir con
          esta asignación, te rogamos que nos lo comuniques con la mayor
          antelación posible.
        </Text>

        {props.mediaEmail ? (
          <PdfCard
            title="Contenido multimedia"
            style={{ marginBottom: space.lg }}
          >
            <Text style={{ ...text.body, lineHeight: 1.5 }}>
              Si usas imágenes o vídeos en tu discurso, puedes traerlos en un
              pendrive o enviarlos con antelación —mejor como lista de
              reproducción de JW Library—. Por favor, envía cualquier contenido
              multimedia y la canción inicial a:
            </Text>
            <Link src={`mailto:${props.mediaEmail}`}>
              <Text
                style={{
                  fontSize: size.body,
                  fontWeight: 700,
                  color: color.accent,
                  marginTop: space.sm,
                }}
              >
                {props.mediaEmail}
              </Text>
            </Link>
          </PdfCard>
        ) : null}

        <PdfCard title="Contacto">
          <View
            style={{ display: 'flex', flexDirection: 'row', gap: space.lg }}
          >
            {auxiliares.map((persona, i) => (
              <Contacto
                key={persona.name + i}
                role="Auxiliar de discursos"
                person={persona}
              />
            ))}
            <Contacto
              role="Coordinador de discursos"
              person={props.publicTalkCoordinator}
            />
          </View>
        </PdfCard>
      </Sheet>
    </Document>
  );
};

export default VisitingSpeakerInvitation;
