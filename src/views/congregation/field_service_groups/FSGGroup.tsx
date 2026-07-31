import { View, Text } from '@react-pdf/renderer';
import {
  PdfCard,
  PdfDiamond,
  PdfKeyValue,
  PdfHairline,
  category,
  space,
} from '@views/design';
import { FSGGroupProps } from './index.types';

/**
 * Un grupo de predicación. Documento 9, tarjeta de la rejilla 2×3.
 *
 * Banda con el cuadradito del color del grupo, «Grupo n» y el recuento.
 * Dentro: superintendente y auxiliar como par rótulo/valor, hairline, y los
 * publicadores a dos columnas.
 *
 * **El precursor se marca con el rombo**, no con una etiqueta ni con negrita:
 * es la misma marca que el responsable de un turno en Exhibidores, y así el
 * lector aprende un solo signo para "este destaca".
 */
const FSGGroup = ({ group }: FSGGroupProps) => {
  const total =
    group.publishers.length +
    (group.overseer ? 1 : 0) +
    (group.overseerAssistant ? 1 : 0);

  const colorGrupo =
    category.groups[(group.group_number - 1) % category.groups.length];

  return (
    <PdfCard
      title={`Grupo ${group.group_number}`}
      meta={`${total}`}
      categoryColor={colorGrupo}
      style={{ flexGrow: 1, flexBasis: '31%', minWidth: '31%' }}
    >
      <View style={{ display: 'flex', flexDirection: 'row', gap: space.md }}>
        {group.overseer ? (
          <PdfKeyValue label="Superintendente" style={{ flex: 1 }}>
            {group.overseer.name}
          </PdfKeyValue>
        ) : null}
        {group.overseerAssistant ? (
          <PdfKeyValue label="Auxiliar" style={{ flex: 1 }}>
            {group.overseerAssistant.name}
          </PdfKeyValue>
        ) : null}
      </View>

      {group.publishers.length > 0 ? (
        <PdfHairline style={{ marginVertical: space.md }} />
      ) : null}

      <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
        {group.publishers.map((publisher) => (
          <Text
            key={publisher.name}
            style={{
              width: '50%',
              fontSize: 8.5,
              lineHeight: 1.55,
              paddingRight: space.sm,
            }}
          >
            {publisher.name}
            {publisher.isPioneer ? <PdfDiamond /> : null}
          </Text>
        ))}
      </View>
    </PdfCard>
  );
};

export default FSGGroup;
