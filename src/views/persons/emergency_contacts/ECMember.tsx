import { Text, View } from '@react-pdf/renderer';
import {
  PdfCard,
  PdfKeyValue,
  color,
  radius,
  space,
  text,
} from '@views/design';
import { ECMemberProps } from './index.types';

/**
 * La ficha de un publicador: sus datos arriba y sus contactos de emergencia
 * en un bloque aparte.
 *
 * Los contactos de emergencia van sobre fondo ámbar y no azul a propósito: es
 * lo que hay que encontrar deprisa en una urgencia, y el ámbar es el color de
 * "atención" del sistema (regla §5.7 — el color de estado significa algo).
 */
const ECMember = ({ member }: ECMemberProps) => (
  <PdfCard style={{ flexGrow: 1, flexBasis: '47%', minWidth: '47%' }}>
    <Text style={{ ...text.heading, marginBottom: space.xs }}>
      {member.name}
    </Text>

    <PdfKeyValue label="Teléfono" labelWidth={54}>
      {member.phone || '—'}
    </PdfKeyValue>
    <PdfKeyValue label="Dirección" labelWidth={54}>
      {member.address || '—'}
    </PdfKeyValue>

    {member.emergencyContacts.length > 0 ? (
      <View
        style={{
          backgroundColor: color.warnSoft,
          borderRadius: radius.md,
          paddingVertical: space.sm,
          paddingHorizontal: space.md,
          marginTop: space.sm,
        }}
      >
        {member.emergencyContacts.map((contact, i) => (
          <View
            key={i}
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: space.sm,
              paddingVertical: 1,
            }}
          >
            <Text style={{ ...text.body, fontSize: 8.6, fontWeight: 600 }}>
              {contact.name}
            </Text>
            <Text style={{ ...text.body, fontSize: 8.6, color: color.warn }}>
              {contact.contact}
            </Text>
          </View>
        ))}
      </View>
    ) : (
      <Text
        style={{
          ...text.body,
          fontSize: 8.4,
          color: color.muted,
          fontStyle: 'italic',
          marginTop: space.xs,
        }}
      >
        Sin contacto de emergencia registrado
      </Text>
    )}
  </PdfCard>
);

export default ECMember;
