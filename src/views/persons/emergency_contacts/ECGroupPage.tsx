import { Text, View } from '@react-pdf/renderer';
import {
  PdfCard,
  PdfNote,
  Sheet,
  color,
  periodo,
  space,
  stroke,
  text,
} from '@views/design';
import { ECGroupPageProps } from './index.types';

/**
 * Documento 12 · Contactos de emergencia. Una hoja por grupo.
 *
 * Tarjeta única con tabla. La fila lleva el nombre y, debajo, la dirección en
 * secundaria; a la derecha el teléfono y los contactos de emergencia.
 *
 * **Normal hasta 14 filas; de 15 a 18, modo compacto** (la dirección sube a la
 * misma línea del nombre). Por encima de 18 no cabe en una hoja y se avisa.
 */
const ECGroupPage = ({
  group,
  congregation,
  generatedAt,
  coContact,
}: ECGroupPageProps) => {
  const dense = group.members.length > 14;
  const size = dense ? 8.2 : 9;

  return (
    <Sheet
      congregation={congregation}
      period={periodo(new Date())}
      title="Contactos de emergencia"
      subtitle={`${group.group_name} · ${group.members.length} ${
        group.members.length === 1 ? 'publicador' : 'publicadores'
      }`}
      documentName="Contactos de emergencia"
      updatedAt={generatedAt}
      dense={dense}
    >
      <PdfCard title={group.group_name} meta="Uso interno" flush>
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            paddingVertical: 4,
            paddingHorizontal: 9,
            borderBottom: `${stroke.hairline}px solid ${color.border}`,
          }}
        >
          <Text style={{ ...text.label, flex: 1 }}>Publicador</Text>
          <Text style={{ ...text.label, width: 74 }}>Teléfono</Text>
          <Text style={{ ...text.label, width: 186 }}>
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
              paddingVertical: dense ? 3 : 4.5,
              paddingHorizontal: 9,
              ...(idx % 2 === 1 && { backgroundColor: color.zebra }),
            }}
          >
            <View style={{ flex: 1, paddingRight: space.md }}>
              {dense ? (
                <Text style={{ fontSize: size }}>
                  <Text style={{ fontWeight: 700 }}>{member.name}</Text>
                  {member.address ? (
                    <Text style={{ fontSize: 7.5, color: color.secondary }}>
                      {'  '}
                      {member.address}
                    </Text>
                  ) : null}
                </Text>
              ) : (
                <>
                  <Text style={{ fontSize: size, fontWeight: 700 }}>
                    {member.name}
                  </Text>
                  {member.address ? (
                    <Text style={{ ...text.meta, fontSize: 8 }}>
                      {member.address}
                    </Text>
                  ) : null}
                </>
              )}
            </View>

            <Text style={{ width: 74, fontSize: size, fontWeight: 600 }}>
              {member.phone || '—'}
            </Text>

            <View style={{ width: 186 }}>
              {member.emergencyContacts.length === 0 ? (
                <Text
                  style={{
                    fontSize: 8,
                    fontStyle: 'italic',
                    color: color.faint,
                  }}
                >
                  Sin contacto registrado
                </Text>
              ) : (
                member.emergencyContacts.map((c, i) => (
                  <Text key={i} style={{ fontSize: 8, color: color.ink }}>
                    {c.name}
                    <Text style={{ color: color.faint }}> · </Text>
                    {c.contact}
                  </Text>
                ))
              )}
            </View>
          </View>
        ))}
      </PdfCard>

      <PdfNote style={{ marginTop: space.lg }}>
        <Text style={{ ...text.body, fontWeight: 600 }}>
          En una urgencia, llama primero al 112
        </Text>
        <Text style={{ ...text.body, color: color.secondary, marginTop: 2 }}>
          {coContact?.name
            ? `Avisa después al superintendente de circuito, ${coContact.name}${
                coContact.phone ? ` (${coContact.phone})` : ''
              }, y al coordinador del cuerpo de ancianos.`
            : 'Avisa después al coordinador del cuerpo de ancianos.'}
        </Text>
      </PdfNote>
    </Sheet>
  );
};

export default ECGroupPage;
