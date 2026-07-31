import { Text, View } from '@react-pdf/renderer';
import { Page, PdfFooter, PdfHeader } from '@views/components';
import { ECGroupPageProps } from './index.types';
import ECMember from './ECMember';
import styles from './index.styles';

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
        {/* Una hoja por grupo, así que el grupo es el subtítulo: antes el
            título de la hoja solo existía dentro de una banda azul, y la hoja
            no tenía ni cabecera de marca ni pie como las demás. */}
        <PdfHeader
          congregation={congregation || 'Elda Centro'}
          meta={generatedAt}
          title="Contactos de emergencia"
          subtitle={`${group.group_name} · ${group.members.length} ${
            group.members.length === 1 ? 'publicador' : 'publicadores'
          }`}
        />

        {showCoContact && (
          <View style={styles.coContact}>
            <Text style={styles.coContactName}>
              Superintendente de circuito: {coContact.name}
            </Text>
            {[coContact.phone, coContact.email].filter(Boolean).length > 0 && (
              <Text style={styles.coContactLine}>
                {[coContact.phone, coContact.email].filter(Boolean).join('  ·  ')}
              </Text>
            )}
          </View>
        )}

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

      <PdfFooter
        congregation={congregation || 'Elda Centro'}
        meta={generatedAt}
      />
    </Page>
  );
};

export default ECGroupPage;
