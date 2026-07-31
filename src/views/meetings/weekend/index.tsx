import { Text, View } from '@react-pdf/renderer';
import { Document } from '@views/components';
import {
  PdfCard,
  PdfEmpty,
  PdfHairline,
  PdfKeyValue,
  Sheet,
  fechaPie,
  periodo,
  space,
  text,
} from '@views/design';
import { useAppTranslation } from '@hooks/index';
import { WeekendMeetingTemplateType } from './index.types';
import registerFonts from '@views/registerFonts';

registerFonts();

/**
 * Documento 2 · Programa de la reunión del fin de semana.
 *
 * Una tarjeta por mes y una fila por domingo: el numeral grande a la
 * izquierda, el discurso público como encabezado con su meta, y debajo la
 * rejilla de pares rótulo/valor con presidente, oración, Atalaya y lector.
 */
const Domingo = ({
  data,
  primera,
}: {
  data: WeekendMeetingTemplateType['data'][number];
  primera: boolean;
}) => {
  const dia = new Date(data.date_raw);
  const orador =
    data.substitute_speaker_name || data.speaker_1_name || data.co_name || '';

  return (
    <View wrap={false}>
      {!primera ? <PdfHairline style={{ marginVertical: space.md }} /> : null}

      <View style={{ display: 'flex', flexDirection: 'row', gap: space.lg }}>
        <View style={{ width: 34 }}>
          <Text style={text.calendarNumeral}>
            {Number.isNaN(dia.getTime()) ? '' : dia.getDate()}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          {data.no_meeting ? (
            <Text style={text.heading}>
              {data.event_name || data.week_type_name || 'Sin reunión'}
            </Text>
          ) : (
            <>
              <Text style={text.heading}>
                {data.public_talk_title || 'Discurso sin publicar'}
              </Text>
              <Text style={{ ...text.meta, marginTop: 1 }}>
                {[
                  data.public_talk_number
                    ? `N.º ${data.public_talk_number}`
                    : '',
                  orador,
                  data.speaker_cong_name,
                  data.opening_song ? `Canción ${data.opening_song}` : '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>

              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  rowGap: space.sm,
                  marginTop: space.md,
                }}
              >
                <PdfKeyValue label="Presidente" style={{ width: 168 }}>
                  {data.chairman_name}
                </PdfKeyValue>
                <PdfKeyValue label="Oración" style={{ width: 168 }}>
                  {data.opening_prayer_name}
                </PdfKeyValue>
                <PdfKeyValue
                  label="Estudio de La Atalaya"
                  style={{ width: 168 }}
                >
                  {data.wtstudy_conductor_name}
                </PdfKeyValue>
                <PdfKeyValue label="Lector" style={{ width: 168 }}>
                  {data.wtstudy_reader_name}
                </PdfKeyValue>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const WeekendMeetingTemplate = ({
  data,
  cong_name,
  lang,
}: WeekendMeetingTemplateType) => {
  const { t } = useAppTranslation();

  const ultimaFecha = data.reduce<string | undefined>((acc, curr) => {
    if (!curr.updatedAt) return acc;
    if (!acc || new Date(curr.updatedAt) > new Date(acc)) return curr.updatedAt;
    return acc;
  }, undefined);

  // Una tarjeta por mes: seis domingos seguidos sin corte se leen como una
  // lista larga, y el mes es la unidad con la que la gente piensa.
  const porMes = new Map<string, typeof data>();
  for (const semana of data) {
    const d = new Date(semana.date_raw);
    const clave = Number.isNaN(d.getTime())
      ? 'otros'
      : `${d.getFullYear()}-${d.getMonth()}`;
    porMes.set(clave, [...(porMes.get(clave) ?? []), semana]);
  }

  return (
    <Document title={t('tr_weekendMeetingPrint', { lng: lang })} lang={lang}>
      <Sheet
        congregation={cong_name}
        period={periodo(data.at(0)?.date_raw, data.at(-1)?.date_raw)}
        title="Reunión del fin de semana"
        subtitle="Discurso público y Estudio de La Atalaya"
        documentName="Reunión del fin de semana"
        updatedAt={fechaPie(ultimaFecha)}
      >
        {data.length === 0 ? (
          <PdfEmpty>Todavía no hay programa publicado.</PdfEmpty>
        ) : (
          [...porMes.entries()].map(([clave, semanas]) => {
            const d = new Date(semanas[0].date_raw);
            const titulo = Number.isNaN(d.getTime())
              ? 'Programa'
              : d.toLocaleDateString('es-ES', {
                  month: 'long',
                  year: 'numeric',
                });

            return (
              <PdfCard
                key={clave}
                title={titulo}
                meta={`${semanas.length} ${semanas.length === 1 ? 'domingo' : 'domingos'}`}
                style={{ marginBottom: space.lg }}
              >
                {semanas.map((semana, i) => (
                  <Domingo
                    key={semana.weekOf}
                    data={semana}
                    primera={i === 0}
                  />
                ))}
              </PdfCard>
            );
          })
        )}
      </Sheet>
    </Document>
  );
};

export default WeekendMeetingTemplate;
