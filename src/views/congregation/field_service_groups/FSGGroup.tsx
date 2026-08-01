import { View, Text } from '@react-pdf/renderer';
import {
  PdfCard,
  PdfDiamond,
  PdfKeyValue,
  PdfHairline,
  category,
  nombreEntero,
  size,
  space,
  text,
} from '@views/design';
import { FSGGroupProps } from './index.types';

/**
 * El superintendente o su auxiliar. Llevan el rombo si son precursores igual
 * que cualquier otro del grupo: el rombo dice «precursor», no «no tiene cargo».
 */
const Responsable = ({
  persona,
}: {
  persona: { name: string; isPioneer: boolean };
}) => (
  <View
    style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    }}
  >
    <Text style={{ ...text.body, fontWeight: 600 }}>
      {nombreEntero(persona.name)}
    </Text>
    {persona.isPioneer ? <PdfDiamond /> : null}
  </View>
);

/**
 * Un grupo de predicación. Documento 9, tarjeta de la rejilla de 2 columnas.
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
      // Dos por fila: con hueco de 12 pt sobre los 523 útiles, el 48 % deja
      // sitio justo para dos y ninguno más.
      style={{ flexGrow: 1, flexBasis: '48%', maxWidth: '48%' }}
    >
      <View style={{ display: 'flex', flexDirection: 'row', gap: space.md }}>
        {group.overseer ? (
          <PdfKeyValue label="Superintendente" style={{ flex: 1 }}>
            <Responsable persona={group.overseer} />
          </PdfKeyValue>
        ) : null}
        {group.overseerAssistant ? (
          <PdfKeyValue label="Auxiliar" style={{ flex: 1 }}>
            <Responsable persona={group.overseerAssistant} />
          </PdfKeyValue>
        ) : null}
      </View>

      {group.publishers.length > 0 ? (
        <PdfHairline style={{ marginVertical: space.md }} />
      ) : null}

      <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
        {group.publishers.map((publisher) => (
          // Fila y no <Text>: el rombo se dibuja, y un dibujo no va dentro de
          // una línea de texto en react-pdf.
          <View
            key={publisher.name}
            style={{
              width: '50%',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 3,
              paddingRight: space.sm,
              paddingVertical: 1.2,
            }}
          >
            <Text style={{ fontSize: size.meta }}>
              {nombreEntero(publisher.name)}
            </Text>
            {publisher.isPioneer ? <PdfDiamond /> : null}
          </View>
        ))}
      </View>
    </PdfCard>
  );
};

export default FSGGroup;
