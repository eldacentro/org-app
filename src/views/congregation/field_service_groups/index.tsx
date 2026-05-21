import { Text, View } from '@react-pdf/renderer';
import { Document, Page } from '@views/components';
import { IconLogo } from '@views/components/icons';
import { useAppTranslation } from '@hooks/index';
import { TemplateFieldServiceGroupsProps } from './index.types';
import styles from './index.styles';
import FSGGroup from './FSGGroup';

const TemplateFieldServiceGroups = ({
  groups,
  lang,
  updatedAt,
  lastModifiedBy,
}: TemplateFieldServiceGroupsProps) => {
  const { t } = useAppTranslation();

  const title = lang.startsWith('es')
    ? 'Grupos de predicación'
    : t('tr_fieldServiceGroups', { lng: lang });

  return (
    <Document title={title} lang={lang}>
      <Page style={styles.page}>
        <View style={styles.header} fixed>
          <View style={styles.headerTitleContainer}>
            <IconLogo />
            <View>
              <Text style={styles.headerTittle}>{title}</Text>
              <Text style={styles.headerCongregation}>{`Elda - Centro`}</Text>
            </View>
          </View>
        </View>

        <View style={styles.groupsContainer}>
          {groups.map((group) => (
            <FSGGroup key={group.group_name} group={group} />
          ))}
        </View>
        {updatedAt && (
          <View style={{ position: 'absolute', bottom: 20, left: 30, right: 30, textAlign: 'center' }}>
            <Text style={{ fontSize: '8px', color: '#666' }}>
              {lastModifiedBy ? `Última actualización: ${new Date(updatedAt).toLocaleString()} (${lastModifiedBy})` : `Última actualización: ${new Date(updatedAt).toLocaleString()}`}
            </Text>
          </View>
        )}
      </Page>
    </Document>
  );
};

export default TemplateFieldServiceGroups;
