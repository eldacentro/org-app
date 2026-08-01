import { Text, View } from '@react-pdf/renderer';
import { Document } from '@views/components';
import {
  PdfDiamond,
  PdfEmpty,
  Sheet,
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
        subtitle={
          <>
            <Text style={text.sheetSubtitle}>
              {`${groups.length} ${groups.length === 1 ? 'grupo' : 'grupos'} · ${total} publicadores · `}
            </Text>
            <PdfDiamond size={5.5} />
            <Text style={text.sheetSubtitle}>precursor regular</Text>
          </>
        }
        documentName={title}
        updatedAt={fechaPie(updatedAt)}
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
