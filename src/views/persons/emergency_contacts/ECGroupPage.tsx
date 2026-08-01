import { Text, View } from '@react-pdf/renderer';
import {
  PdfCard,
  PdfHairline,
  PdfKeyValue,
  PdfNote,
  Sheet,
  color,
  compact,
  normal,
  periodo,
  size,
  space,
  stroke,
  text,
} from '@views/design';
import { ECGroupPageProps } from './index.types';

/**
 * Documento 12 · Contactos de emergencia. Una hoja por grupo.
 *
 * Tarjeta única con tabla. La fila es SIEMPRE de dos líneas: el nombre arriba y
 * la dirección debajo. Antes, por encima de 14 filas, la dirección subía a la
 * misma línea, y el resultado era que unas hojas se leían de una manera y otras
 * de otra según cuánta gente hubiera en el grupo. El modo compacto ahora aprieta
 * la ESCALA, no la estructura: la misma hoja, más junta.
 *
 * El nombre del contacto de emergencia va al mismo peso que el del publicador:
 * en una urgencia se busca un nombre, y los dos son nombres.
 */
const ECGroupPage = ({
  group,
  congregation,
  generatedAt,
  coContact,
}: ECGroupPageProps) => {
  const dense = group.members.length > 14;
  const escala = dense ? compact : normal;
  const cuerpo = escala.body;
  /** La dirección y los contactos, un escalón por debajo del nombre. */
  const apoyo = dense ? size.label : size.meta;

  return (
    <Sheet
      congregation={congregation}
      period={periodo(new Date())}
      title="Contactos de emergencia"
      documentName="Contactos de emergencia"
      updatedAt={generatedAt}
      dense={dense}
    >
      <PdfCard
        title={group.group_name}
        meta={`${group.members.length} ${
          group.members.length === 1 ? 'publicador' : 'publicadores'
        }`}
        dense={dense}
        flush
      >
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            paddingVertical: 4,
            paddingHorizontal: 9,
            borderBottom: `${stroke.hairline}px solid ${color.border}`,
          }}
        >
          <Text style={{ ...text.label, flex: 1 }}>Nombre</Text>
          <Text style={{ ...text.label, width: 78 }}>Teléfono</Text>
          <Text style={{ ...text.label, width: 190 }}>
            Contactos de emergencia
          </Text>
        </View>

        {group.members.map((member, idx) => (
          <View
            key={member.name + idx}
            wrap={false}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'flex-start',
              paddingVertical: escala.rowPadding,
              paddingHorizontal: 9,
              // La cebra arranca en la primera fila: el encabezado de
              // columnas ya es la banda blanca de arriba.
              ...(idx % 2 === 0 && { backgroundColor: color.zebra }),
            }}
          >
            <View style={{ flex: 1, paddingRight: space.md }}>
              <Text style={{ fontSize: cuerpo, fontWeight: 700 }}>
                {member.name}
              </Text>
              {member.address ? (
                <Text
                  style={{
                    fontSize: apoyo,
                    fontWeight: 500,
                    color: color.secondary,
                  }}
                >
                  {member.address}
                </Text>
              ) : null}
            </View>

            <Text style={{ width: 78, fontSize: cuerpo, fontWeight: 600 }}>
              {member.phone || '—'}
            </Text>

            <View style={{ width: 190 }}>
              {member.emergencyContacts.length === 0 ? (
                <Text
                  style={{
                    fontSize: apoyo,
                    fontStyle: 'italic',
                    color: color.faint,
                  }}
                >
                  Sin contacto registrado
                </Text>
              ) : (
                member.emergencyContacts.map((c, i) => (
                  <Text key={i} style={{ fontSize: apoyo, color: color.ink }}>
                    <Text style={{ fontWeight: 700 }}>{c.name}</Text>
                    <Text style={{ color: color.faint }}> · </Text>
                    {c.contact}
                  </Text>
                ))
              )}
            </View>
          </View>
        ))}
      </PdfCard>

      {coContact?.name ? (
        <PdfNote style={{ marginTop: dense ? space.md : space.lg }}>
          <Text style={text.cardHeader}>Superintendente de circuito</Text>
          <Text style={{ ...text.heading, marginTop: 2 }}>
            {coContact.name}
          </Text>

          {coContact.phone || coContact.email ? (
            <>
              <PdfHairline
                style={{
                  backgroundColor: color.accentLine,
                  marginVertical: space.md,
                }}
              />
              <View
                style={{ display: 'flex', flexDirection: 'row', gap: space.xl }}
              >
                {coContact.phone ? (
                  <PdfKeyValue label="Teléfono" strong>
                    {coContact.phone}
                  </PdfKeyValue>
                ) : null}
                {coContact.email ? (
                  <PdfKeyValue label="Correo" strong>
                    {coContact.email}
                  </PdfKeyValue>
                ) : null}
              </View>
            </>
          ) : null}
        </PdfNote>
      ) : null}
    </Sheet>
  );
};

export default ECGroupPage;
