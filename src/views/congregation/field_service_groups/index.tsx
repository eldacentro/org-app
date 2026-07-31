import { View } from '@react-pdf/renderer';
import {
  Document,
  Page,
  PdfFooter,
  PdfHeader,
  fechaCorta,
} from '@views/components';
import { useAppTranslation } from '@hooks/index';
import { TemplateFieldServiceGroupsProps } from './index.types';
import styles from './index.styles';
import FSGGroup from './FSGGroup';

const MONTHS_ES = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
];

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

  const monthYear = updatedAt
    ? (() => {
        const d = new Date(updatedAt);
        return `${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
      })()
    : '';

  const footerDate = fechaCorta(updatedAt);

  return (
    <Document title={title} lang={lang}>
      <Page>
        {/*
         * All non-footer content wrapped in one View so the Page's
         * justifyContent: 'space-between' doesn't push elements apart.
         */}
        <View style={styles.contentWrapper}>
          <PdfHeader
            congregation={congregation || 'Elda Centro'}
            meta={monthYear}
            title={title}
          />

          {/* ── Groups grid ───────────────────── */}
          <View style={styles.groupsContainer}>
            {groups.map((group) => (
              <FSGGroup key={group.group_name} group={group} />
            ))}
          </View>
        </View>

        <PdfFooter
          congregation={congregation || 'Elda Centro'}
          meta={footerDate ? `Última actualización · ${footerDate}` : ''}
        />
      </Page>
    </Document>
  );
};

export default TemplateFieldServiceGroups;
