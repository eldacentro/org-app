import { View } from '@react-pdf/renderer';
import { Document } from '@views/components';
import { PdfEmpty, Sheet, space, fechaCorta, fechaMes } from '@views/design';
import { useAppTranslation } from '@hooks/index';
import { TemplateFieldServiceGroupsProps } from './index.types';
import FSGGroup from './FSGGroup';

/**
 * Grupos de predicación.
 *
 * Va sobre el sistema de diseño de los PDF (`PDF_DESIGN_SYSTEM.md`): las
 * tarjetas en dos columnas, porque un grupo es una lista corta y en una sola
 * columna la hoja se alargaba el doble para la misma información.
 */
const TemplateFieldServiceGroups = ({
  groups,
  congregation,
  lang,
  updatedAt,
}: TemplateFieldServiceGroupsProps) => {
  const { t } = useAppTranslation();

  const title = lang.startsWith('es')
    ? 'Grupos de predicación'
    : t('tr_fieldServiceGroups', { lng: lang });

  const monthYear = fechaMes(updatedAt);

  const footerDate = fechaCorta(updatedAt);

  return (
    <Document title={title} lang={lang}>
      <Sheet
        congregation={congregation}
        meta={monthYear}
        title={title}
        paginated
        footerMeta={
          footerDate ? `Última actualización · ${footerDate}` : monthYear
        }
      >
        {groups.length === 0 ? (
          <PdfEmpty>Todavía no hay grupos.</PdfEmpty>
        ) : (
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: space.lg,
            }}
          >
            {groups.map((group) => (
              <FSGGroup key={group.group_name} group={group} />
            ))}
          </View>
        )}
      </Sheet>
    </Document>
  );
};

export default TemplateFieldServiceGroups;
