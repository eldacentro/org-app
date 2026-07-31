import { Document } from '@views/components';
import { Sheet, fechaCorta, fechaRango } from '@views/design';
import { useAppTranslation } from '@hooks/index';
import { WeekendMeetingTemplateType } from './index.types';
import registerFonts from '@views/registerFonts';
import WeekData from './WeekData';

registerFonts();

const WeekendMeetingTemplate = ({
  data,
  cong_name,
  lang,
}: WeekendMeetingTemplateType) => {
  const { t } = useAppTranslation();

  const lastUpdate = data.reduce((acc, curr) => {
    if (
      !acc ||
      (curr.updatedAt && new Date(curr.updatedAt) > new Date(acc.updatedAt))
    ) {
      return {
        updatedAt: curr.updatedAt,
        lastModifiedBy: curr.lastModifiedBy,
      };
    }
    return acc;
  }, null);

  const footerDate = fechaCorta(lastUpdate?.updatedAt);

  // El rango que cubre la hoja, para la barra de marca.
  const rango =
    data.length > 0
      ? fechaRango(data.at(0).date_raw, data.at(-1).date_raw)
      : '';

  return (
    <Document title={t('tr_weekendMeetingPrint', { lng: lang })} lang={lang}>
      <Sheet
        congregation={cong_name}
        meta={rango}
        title={t('tr_weekendMeetingPrint', { lng: lang })}
        paginated
        footerMeta={footerDate ? `Última actualización · ${footerDate}` : rango}
      >
        {data.map((meetingData) => (
          <WeekData
            key={meetingData.weekOf}
            meetingData={meetingData}
            lang={lang}
          />
        ))}
      </Sheet>
    </Document>
  );
};

export default WeekendMeetingTemplate;
