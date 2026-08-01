import { Text, View } from '@react-pdf/renderer';
import { Document } from '@views/components';
import {
  PdfCard,
  PdfEmpty,
  Sheet,
  color,
  fechaPie,
  periodo,
  radius,
  size,
  space,
  stroke,
  text,
} from '@views/design';
import { useAppTranslation } from '@hooks/index';
import { WeekendMeetingTemplateType } from './index.types';
import registerFonts from '@views/registerFonts';

registerFonts();

/**
 * Documento 2 · Programa de la reunión del fin de semana.
 *
 * Una tarjeta por mes y una fila por domingo, con las tres zonas fijas:
 *
 *   ┌────┬──────────────────────────────┬───────────────────────┐
 *   │  2 │ «¿Es este el tiempo del fin?»│ PRESIDENTE  ORACIÓN…  │
 *   │DOM │ Bosquejo n.º 20 · Canción 22 │ Andrés V.   Luis B.   │
 *   │    │ · Jonatán Ferrandis · Petrer │ LA ATALAYA  LECTOR    │
 *   │    │                              │ Joaquín V.  Iván C.   │
 *   └────┴──────────────────────────────┴───────────────────────┘
 *
 * El discurso es lo que la congregación mira, así que se lleva el encabezado y
 * el ancho. Los cuatro papeles fijos van a la derecha en cuadrícula 2×2 y
 * **siempre en el mismo sitio de cada fila**: se aprende una vez y se lee para
 * siempre. Cebra en las filas impares y una línea entre filas; ni una vertical.
 */

/** El ancho de la cuadrícula de papeles. Fijo: es lo que la alinea entre filas. */
const PAPELES = 176;

/** La cifra del bosquejo, sin el rótulo con el que viene del programa. */
const numeroBosquejo = (valor?: string) => (valor ?? '').replace(/[^\d]/g, '');

const Papel = ({ label, name }: { label: string; name: string }) => (
  <View style={{ width: (PAPELES - space.md) / 2 }}>
    <Text style={text.label}>{label}</Text>
    <Text style={{ fontSize: size.meta, fontWeight: 500, color: color.ink }}>
      {name || '—'}
    </Text>
  </View>
);

const Domingo = ({
  data,
  zebra,
  ultima,
}: {
  data: WeekendMeetingTemplateType['data'][number];
  zebra: boolean;
  ultima: boolean;
}) => {
  const dia = new Date(data.date_raw);
  const orador =
    data.substitute_speaker_name || data.speaker_1_name || data.co_name || '';

  const apoyo = [
    // El programa trae el número ya rotulado —«Nro. 96»—, y encima le poníamos
    // otro rótulo delante: salía «Bosquejo n.º Nro. 96». Aquí solo interesa la
    // cifra.
    numeroBosquejo(data.public_talk_number)
      ? `Bosquejo ${numeroBosquejo(data.public_talk_number)}`
      : '',
    data.opening_song ? `Canción ${data.opening_song}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View
      wrap={false}
      style={{
        display: 'flex',
        flexDirection: 'row',
        gap: space.md,
        paddingVertical: 8,
        paddingHorizontal: 9,
        ...(zebra && { backgroundColor: color.zebra }),
        ...(!ultima && {
          borderBottom: `${stroke.hairline}px solid ${color.hairline}`,
        }),
        // La última fila con cebra lleva su propio radio: sin él, el
        // rectángulo asoma por la curva de la tarjeta (R5).
        ...(zebra &&
          ultima && {
            borderBottomLeftRadius: radius.inner,
            borderBottomRightRadius: radius.inner,
          }),
      }}
    >
      <View style={{ width: 32, alignItems: 'center' }}>
        <Text style={text.calendarNumeral}>
          {Number.isNaN(dia.getTime()) ? '' : dia.getDate()}
        </Text>
        <Text style={{ ...text.label, marginTop: 1 }}>
          {Number.isNaN(dia.getTime())
            ? ''
            : dia
                .toLocaleDateString('es-ES', { weekday: 'short' })
                .replace('.', '')}
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
            {/*
             * Todo hijo de este <Text> es a su vez un <Text>, ninguno una
             * cadena suelta: mezclar los dos es donde react-pdf se deja piezas
             * por el camino, y era el orador el que se perdía.
             */}
            <Text style={{ ...text.meta, marginTop: 2 }}>
              <Text>{apoyo}</Text>
              {orador ? (
                <Text style={{ fontWeight: 600, color: color.ink }}>
                  {apoyo ? ' · ' : ''}
                  {orador}
                </Text>
              ) : null}
              {data.speaker_cong_name ? (
                <Text>{` · ${data.speaker_cong_name}`}</Text>
              ) : null}
            </Text>
          </>
        )}
      </View>

      {data.no_meeting ? null : (
        <View
          style={{
            width: PAPELES,
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: space.sm,
            columnGap: space.md,
          }}
        >
          <Papel label="Presidente" name={data.chairman_name} />
          <Papel label="Oración final" name={data.concluding_prayer_name} />
          <Papel label="La Atalaya" name={data.wtstudy_conductor_name} />
          <Papel label="Lector" name={data.wtstudy_reader_name} />
        </View>
      )}
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
        title="Programa de la reunión del fin de semana"
        documentName="Programa de la reunión del fin de semana"
        updatedAt={fechaPie(ultimaFecha)}
      >
        {data.length === 0 ? (
          <PdfEmpty>Todavía no hay programa publicado.</PdfEmpty>
        ) : (
          [...porMes.entries()].map(([clave, semanas]) => {
            const d = new Date(semanas[0].date_raw);
            const titulo = Number.isNaN(d.getTime())
              ? 'Programa'
              : d.toLocaleDateString('es-ES', { month: 'long' });

            return (
              <PdfCard
                key={clave}
                title={titulo}
                meta={`${semanas.length} ${semanas.length === 1 ? 'domingo' : 'domingos'}`}
                style={{ marginBottom: space.lg }}
                flush
              >
                {semanas.map((semana, i) => (
                  <Domingo
                    key={semana.weekOf}
                    data={semana}
                    zebra={i % 2 === 1}
                    ultima={i === semanas.length - 1}
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
