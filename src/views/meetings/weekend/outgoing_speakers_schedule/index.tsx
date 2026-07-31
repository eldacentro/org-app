import { Document } from '@views/components';
import { PdfEmpty, PdfTable, Sheet } from '@views/design';
import useAppTranslation from '@hooks/useAppTranslation';
import { TemplateOutgoingSpeakersProps } from './index.types';

/**
 * Discursos salientes: quién va a discursar fuera, cuándo y con qué bosquejo.
 *
 * Va sobre el sistema de diseño de los PDF (`PDF_DESIGN_SYSTEM.md`). Es una
 * LISTA de cinco datos por fila, así que es una tabla y no una tarjeta por
 * discurso: en tarjetas, veinte discursos ocupaban tres hojas para decir lo
 * mismo que cabe en una.
 */
const TemplateOutgoingSpeakersSchedule = ({
  congregation,
  data,
  lang,
}: TemplateOutgoingSpeakersProps) => {
  const { t } = useAppTranslation();

  // `data` llega agrupada por semanas; aquí se aplana, porque en una tabla el
  // agrupamiento lo hace ya la columna de la fecha.
  const filas = data.flat().map((item) => ({
    fecha: item.date?.formatted ?? item.weekOfFormatted,
    orador: item.speaker,
    congregacion: item.congregation_name,
    discurso: item.public_talk?.number
      ? `${item.public_talk.number}. ${item.public_talk.title}`
      : '',
    cancion: item.opening_song?.number ? `${item.opening_song.number}` : '',
  }));

  return (
    <Document title={t('tr_outgoingSpeakersSchedule')} lang={lang}>
      <Sheet
        congregation={congregation}
        title={t('tr_outgoingSpeakersSchedule')}
        paginated
      >
        {filas.length === 0 ? (
          <PdfEmpty>Todavía no hay discursos salientes programados.</PdfEmpty>
        ) : (
          <PdfTable
            dense={filas.length > 18}
            columns={[
              { key: 'fecha', header: 'Fecha', width: '20%', emphasis: true },
              { key: 'orador', header: 'Orador', width: '22%' },
              { key: 'congregacion', header: 'Congregación', width: '20%' },
              { key: 'discurso', header: 'Discurso', width: '31%' },
              { key: 'cancion', header: 'Canción', width: '7%', muted: true },
            ]}
            rows={filas}
          />
        )}
      </Sheet>
    </Document>
  );
};

export default TemplateOutgoingSpeakersSchedule;
