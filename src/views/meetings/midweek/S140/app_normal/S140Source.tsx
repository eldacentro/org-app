import { Text, View } from '@react-pdf/renderer';
import { S140SourceType } from './index.types';
import styles from './index.styles';
import { applyRTL, isRTL } from '@views/utils/pdf_utils';

const S140Source = ({
  node,
  secondary,
  source,
  duration,
  lang,
}: S140SourceType) => {
  const stylesSmart = applyRTL(styles, lang);
  const rtl = isRTL(lang);

  return (
    <View style={stylesSmart.sourceContainer}>
      {source && (
        <View style={[stylesSmart.sourceTextContainer, { maxWidth: 330 }]}>
          <Text style={stylesSmart.sourceText}>
            {rtl && '\u200f'}
            {source}
          </Text>
          {duration && (
            <Text style={stylesSmart.sourceDurationText}>
              {rtl && '\u200f'}({duration})
            </Text>
          )}
        </View>
      )}

      {node}

      {secondary && (
        /*
         * Una línea por <Text>, nunca un solo texto con saltos dentro.
         *
         * La fila se alinea por línea base, y la línea base de un texto de
         * varias líneas es la ÚLTIMA. Con «Conductor:⏎Lector:» en un solo
         * <Text>, «Lector:» se pegaba a la base de la fila y «Conductor:»
         * quedaba flotando por encima, mientras los dos nombres de al lado
         * empezaban en la base: el conductor salía a la altura del lector.
         * Partido en dos textos, la caja hereda la base del PRIMERO y cada
         * rótulo cae junto a su nombre.
         */
        <View style={stylesSmart.sourceSecondaryContainer}>
          {secondary.split('\u000A').map((linea, i) => (
            <Text key={i} style={stylesSmart.sourceSecondary}>
              {rtl && '\u200f'}
              {linea}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

export default S140Source;
