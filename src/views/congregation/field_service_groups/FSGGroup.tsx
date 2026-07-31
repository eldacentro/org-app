import { View, Text } from '@react-pdf/renderer';
import { PdfCard, PdfKeyValue, color, space, text } from '@views/design';
import { FSGGroupProps } from './index.types';

/**
 * Un grupo de predicación, en tarjeta.
 *
 * El superintendente y su auxiliar van arriba con su rótulo; los publicadores,
 * en dos columnas y con punto delante — sin él, dos nombres en dos líneas se
 * leen como uno partido en dos.
 *
 * Los precursores van en negrita, con su puntito en el azul de marca.
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

      {/* Una sola columna. La tarjeta ya ocupa media hoja, así que partirla
          otra vez en dos dejaba unos 90 puntos por nombre: los largos se
          amontonaban en dos líneas y se montaban con lo de al lado. Un nombre
          necesita su renglón.

          Y el precursor va en NEGRITA, no con etiqueta: una etiqueta cada dos
          o tres nombres es más ruido que información, y en una lista de quince
          el ojo ya distingue el peso. */}
      <View>
        {group.publishers.map((publisher) => (
          <View
            key={publisher.name}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.sm + 1,
              paddingVertical: 1.6,
            }}
          >
            <View
              style={{
                width: 2.6,
                height: 2.6,
                borderRadius: 999,
                backgroundColor: publisher.isPioneer
                  ? color.accent
                  : color.muted,
              }}
            />
            <Text
              style={{
                ...text.body,
                fontSize: 9,
                fontWeight: publisher.isPioneer ? 700 : 400,
                flex: 1,
              }}
            >
              {publisher.name}
            </Text>
          </View>
        ))}
      </View>
    </PdfCard>
  );
};

export default FSGGroup;
