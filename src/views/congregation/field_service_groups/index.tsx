import { Text, View } from '@react-pdf/renderer';
import { Document } from '@views/components';
import {
  PdfDiamond,
  PdfEmpty,
  Sheet,
  color,
  fechaPie,
  periodo,
  space,
  text,
} from '@views/design';
import { useAppTranslation } from '@hooks/index';
import { TemplateFieldServiceGroupsProps } from './index.types';
import FSGGroup from './FSGGroup';

/**
 * Documento 9 · Grupos de predicación. Una hoja, rejilla de tarjetas iguales.
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

  const total = groups.reduce(
    (n, g) =>
      n +
      g.publishers.length +
      (g.overseer ? 1 : 0) +
      (g.overseerAssistant ? 1 : 0),
    0
  );

  return (
    <Document title={title} lang={lang}>
      <Sheet
        congregation={congregation}
        period={periodo(updatedAt ?? new Date())}
        title={title}
        subtitle={`${groups.length} grupos · ${total} publicadores`}
        documentName={title}
        updatedAt={fechaPie(updatedAt)}
      >
        {groups.length === 0 ? (
          <PdfEmpty>Todavía no hay grupos.</PdfEmpty>
        ) : (
          <>
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

            <Text
              style={{
                ...text.meta,
                color: color.faint,
                marginTop: space.lg,
              }}
            >
              <PdfDiamond /> precursor
            </Text>
          </>
        )}
      </Sheet>
    </Document>
  );
};

export default TemplateFieldServiceGroups;
