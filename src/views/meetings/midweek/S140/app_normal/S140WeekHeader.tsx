import { Text, View } from '@react-pdf/renderer';
import { S140WeekHeaderType } from './index.types';
import styles from './index.styles';
import { applyRTL, isRTL } from '@views/utils/pdf_utils';

import IconWavingHand from '@views/components/icons/IconWavingHand';

/**
 * La banda de la tarjeta de una semana: la semana a la izquierda, su meta a la
 * derecha, y la etiqueta de la visita del superintendente cuando toca.
 */
const S140WeekHeader = ({
  title,
  meta,
  secondary,
  lang,
}: S140WeekHeaderType) => {
  const stylesSmart = applyRTL(styles, lang);
  const rtl = isRTL(lang);

  return (
    <View style={stylesSmart.weekHeader}>
      <View style={stylesSmart.weekDateContainer}>
        <Text style={stylesSmart.weekDate}>
          {rtl && '\u200f'}
          {title}
        </Text>
      </View>

      {secondary ? (
        <View style={stylesSmart.coWeekTypeContainer}>
          <IconWavingHand size={9} />
          <Text style={stylesSmart.coWeekType}>{secondary}</Text>
        </View>
      ) : meta ? (
        <Text style={stylesSmart.weekMeta}>
          {rtl && '\u200f'}
          {meta}
        </Text>
      ) : null}
    </View>
  );
};

export default S140WeekHeader;
