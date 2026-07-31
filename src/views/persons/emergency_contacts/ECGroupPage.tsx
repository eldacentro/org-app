import { View } from '@react-pdf/renderer';
import { PdfEmpty, PdfNote, Sheet, color, space, text } from '@views/design';
import { Text } from '@react-pdf/renderer';
import { ECGroupPageProps } from './index.types';
import ECMember from './ECMember';

/**
 * Una hoja por grupo. Por eso el grupo es el subtítulo y no una banda: el
 * título de la hoja es "Contactos de emergencia", y de qué grupo es va justo
 * debajo, como en todos los demás documentos.
 */
const ECGroupPage = ({
  group,
  congregation,
  generatedAt,
  coContact,
}: ECGroupPageProps) => {
  // El nombre del CO ya existe en Ajustes desde hace tiempo, así que se
  // muestra en cuanto haya un nombre — no hace falta esperar a que también se
  // rellenen teléfono y correo, que son los campos nuevos y opcionales.
  const showCoContact = !!coContact?.name;
  const total = group.members.length;

  return (
    <Sheet
      congregation={congregation}
      meta={generatedAt}
      title="Contactos de emergencia"
      subtitle={`${group.group_name} · ${total} ${
        total === 1 ? 'publicador' : 'publicadores'
      }`}
      paginated
      footerMeta={generatedAt}
    >
      {showCoContact ? (
        <PdfNote style={{ marginBottom: space.lg }}>
          <Text style={{ ...text.body, fontWeight: 700 }}>
            Superintendente de circuito: {coContact.name}
          </Text>
          {[coContact.phone, coContact.email].filter(Boolean).length > 0 ? (
            <Text style={{ ...text.body, fontSize: 8.6, color: color.muted }}>
              {[coContact.phone, coContact.email].filter(Boolean).join('  ·  ')}
            </Text>
          ) : null}
        </PdfNote>
      ) : null}

      {total === 0 ? (
        <PdfEmpty>Sin publicadores en este grupo.</PdfEmpty>
      ) : (
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: space.lg,
          }}
        >
          {group.members.map((member, i) => (
            <ECMember key={member.name + i} member={member} />
          ))}
        </View>
      )}
    </Sheet>
  );
};

export default ECGroupPage;
