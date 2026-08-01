import { PropsWithChildren } from 'react';
import { Text, View } from '@react-pdf/renderer';
import { S140SectionType } from './index.types';
import styles from './index.styles';
import { applyRTL, isRTL } from '@views/utils/pdf_utils';

/**
 * El separador de una de las tres secciones de la reunión.
 *
 * Antes era una banda de color a sangre con el rótulo en blanco: tres franjas
 * fuertes por semana y cuatro semanas por hoja, y la hoja acababa siendo un
 * semáforo. Ahora el color va donde clasifica —un cuadradito de 6 y el rótulo—
 * y el resto lo cierra un hairline.
 */
const S140Section = ({
  color,
  section,
  secondary,
  children,
  lang,
}: S140SectionType & PropsWithChildren) => {
  const stylesSmart = applyRTL(styles, lang);
  const rtl = isRTL(lang);

  return (
    <>
      <View style={stylesSmart.sectionContainer}>
        <View style={stylesSmart.sectionTitleContainer}>
          <View
            style={{ ...stylesSmart.sectionSquare, backgroundColor: color }}
          />
          <Text style={{ ...stylesSmart.sectionTitleText, color }}>
            {rtl && '\u200f'}
            {section}
          </Text>
        </View>

        <View style={stylesSmart.sectionRule} />

        {secondary}
      </View>

      {children}
    </>
  );
};

export default S140Section;
