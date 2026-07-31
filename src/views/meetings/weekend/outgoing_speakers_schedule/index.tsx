import { Text } from '@react-pdf/renderer';
import { Document } from '@views/components';
import {
  PdfCard,
  PdfNote,
  PdfTable,
  Sheet,
  color,
  periodo,
  space,
  text,
} from '@views/design';
import useAppTranslation from '@hooks/useAppTranslation';
import { TemplateOutgoingSpeakersProps } from './index.types';

/**
 * Documento 3 · Discursos salientes.
 *
 * Una tarjeta con la tabla y un bloque destacado con el recordatorio. El aire
 * que sobre se queda: una lista de doce discursos no tiene por qué estirarse
 * hasta el pie.
 */
const TemplateOutgoingSpeakersSchedule = ({
  congregation,
  data,
  lang,
}: TemplateOutgoingSpeakersProps) => {
  const { t } = useAppTranslation();

  // `data` llega agrupada por semanas; en una tabla el agrupamiento lo hace ya
  // la columna de la fecha.
  const items = data.flat();

  const filas = items.map((item) => ({
    fecha: item.date?.formatted ?? item.weekOfFormatted,
    orador: item.speaker,
    congregacion: item.congregation_name,
    discurso: item.public_talk?.number
      ? `${item.public_talk.number}. ${item.public_talk.title}`
      : '',
    cancion: item.opening_song?.number ? `${item.opening_song.number}` : '',
  }));

  const primera = items.at(0)?.date?.date;
  const ultima = items.at(-1)?.date?.date;

  return (
    <Document title={t('tr_outgoingSpeakersSchedule')} lang={lang}>
      <Sheet
        congregation={congregation}
        period={periodo(primera, ultima)}
        title="Discursos salientes"
        subtitle="Hermanos que discursan en otras congregaciones"
        documentName="Discursos salientes"
      >
        <PdfCard title="Programa" meta={`${filas.length} discursos`} flush>
          <PdfTable
            emptyText="Todavía no hay discursos salientes programados."
            dense={filas.length > 18}
            columns={[
              { key: 'fecha', header: 'Fecha', width: 46, muted: true },
              { key: 'orador', header: 'Orador', width: 96, strong: true },
              { key: 'congregacion', header: 'Congregación', width: 86 },
              { key: 'discurso', header: 'Discurso', flex: true },
              {
                key: 'cancion',
                header: 'Canción',
                width: 38,
                align: 'right',
              },
            ]}
            rows={filas}
          />
        </PdfCard>

        {filas.length > 0 ? (
          <PdfNote style={{ marginTop: space.lg }}>
            <Text style={{ ...text.body, fontWeight: 600 }}>
              Avisa con antelación
            </Text>
            <Text
              style={{ ...text.body, color: color.secondary, marginTop: 2 }}
            >
              Si no pudieras cumplir con alguna de estas asignaciones, dilo
              cuanto antes al coordinador de discursos públicos para que dé
              tiempo a buscar un sustituto.
            </Text>
          </PdfNote>
        ) : null}
      </Sheet>
    </Document>
  );
};

export default TemplateOutgoingSpeakersSchedule;
