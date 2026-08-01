import { Text, View } from '@react-pdf/renderer';
import { S140PartTimeType } from './index.types';
import styles from './index.styles';
import { applyRTL } from '@views/utils/pdf_utils';

/**
 * La hora calculada de una parte. Va toda en el mismo gris apagado: es una
 * columna de apoyo, no la información que se busca. El color de la sección lo
 * pone el separador, una vez, y no cada fila.
 */
const S140PartTime = ({ time, lang }: S140PartTimeType) => {
  const stylesSmart = applyRTL(styles, lang);

  return (
    <View style={stylesSmart.timeContainer}>
      <Text style={stylesSmart.timeText}>{time}</Text>
    </View>
  );
};

export default S140PartTime;
