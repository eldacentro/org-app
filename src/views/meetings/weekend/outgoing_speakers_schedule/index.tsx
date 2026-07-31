import { Page } from '@react-pdf/renderer';
// El `Document` de la app, no el de react-pdf en crudo: es el que registra las
// tipografías y fija el idioma y la dirección del texto. Esta plantilla era la
// única que usaba el de react-pdf directamente.
import { Document, PdfFooter, PdfHeader } from '@views/components';
import { TemplateOutgoingSpeakersProps } from './index.types';
import useAppTranslation from '@hooks/useAppTranslation';
import OSScheduleContainer from './OSScheduleContainer';
import styles from './index.styles';

const TemplateOutgoingSpeakersSchedule = ({
  congregation,
  data,
  lang,
}: TemplateOutgoingSpeakersProps) => {
  const { t } = useAppTranslation();

  return (
    <Document title={t('tr_outgoingSpeakersSchedule')} lang={lang}>
      <Page size="A4" style={styles.body}>
        <PdfHeader
          congregation={congregation || 'Elda Centro'}
          title={t('tr_outgoingSpeakersSchedule')}
        />

        <OSScheduleContainer data={data} />

        <PdfFooter congregation={congregation || 'Elda Centro'} paginado />
      </Page>
    </Document>
  );
};

export default TemplateOutgoingSpeakersSchedule;
