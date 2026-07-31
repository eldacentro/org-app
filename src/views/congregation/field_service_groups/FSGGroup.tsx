import { View, Text } from '@react-pdf/renderer';
import {
  PdfBadge,
  PdfCard,
  PdfKeyValue,
  color,
  space,
  text,
} from '@views/design';
import { FSGGroupProps } from './index.types';

/**
 * Un grupo de predicación, en tarjeta.
 *
 * El superintendente y su auxiliar van arriba con su rótulo; los publicadores,
 * en dos columnas y con punto delante — sin él, dos nombres en dos líneas se
 * leen como uno partido en dos.
 *
 * Los precursores se marcan con una etiqueta, no poniéndoles el nombre en
 * negrita: la negrita ya la usa el nombre del responsable, y dos cosas
 * distintas con el mismo recurso no se distinguen.
 */
const FSGGroup = ({ group }: FSGGroupProps) => {
  const total =
    group.publishers.length +
    (group.overseer ? 1 : 0) +
    (group.overseerAssistant ? 1 : 0);

  return (
    <PdfCard
      title={group.group_name}
      meta={`${total} ${total === 1 ? 'publicador' : 'publicadores'}`}
      style={{ flexGrow: 1, flexBasis: '47%', minWidth: '47%' }}
    >
      {group.overseer ? (
        <PdfKeyValue label="Superintendente" labelWidth={78}>
          {group.overseer.name}
        </PdfKeyValue>
      ) : null}
      {group.overseerAssistant ? (
        <PdfKeyValue label="Auxiliar" labelWidth={78}>
          {group.overseerAssistant.name}
        </PdfKeyValue>
      ) : null}

      {(group.overseer || group.overseerAssistant) &&
      group.publishers.length > 0 ? (
        <View
          style={{
            borderTop: `0.5px solid ${color.lineSoft}`,
            marginTop: space.sm,
            marginBottom: space.sm,
          }}
        />
      ) : null}

      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
        }}
      >
        {group.publishers.map((publisher) => (
          <View
            key={publisher.name}
            style={{
              width: '50%',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.sm - 1,
              paddingVertical: 1.4,
            }}
          >
            <View
              style={{
                width: 2.6,
                height: 2.6,
                borderRadius: 999,
                backgroundColor: color.muted,
              }}
            />
            {/* `flex: 1` y no `flexShrink`: con lo segundo, un nombre largo
                al lado de la etiqueta de precursor se recortaba a media
                palabra ("Miguel Ángel Navarr") en vez de pasar a la línea
                siguiente. */}
            <Text style={{ ...text.body, fontSize: 8.8, flex: 1 }}>
              {publisher.name}
            </Text>
            {publisher.isPioneer ? (
              <PdfBadge tone="accent">Prec.</PdfBadge>
            ) : null}
          </View>
        ))}
      </View>
    </PdfCard>
  );
};

export default FSGGroup;
