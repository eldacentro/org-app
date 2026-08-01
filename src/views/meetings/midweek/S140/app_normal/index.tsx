import { Text, View } from '@react-pdf/renderer';
import { MESES_ES } from '@utils/nombres_fecha';
import { Document } from '@views/components';
import {
  PdfCategory,
  Sheet,
  category,
  fechaPie,
  periodo,
  space,
} from '@views/design';
import { Week } from '@definition/week_type';
import { S140Type } from '../shared/index.types';
import { useAppTranslation } from '@hooks/index';
import registerFonts from '@views/registerFonts';
import S140AYF from './S140AYF';
import S140Hall from './S140Hall';
import S140LC from './S140LC';
import S140PartTime from './S140PartTime';
import S140Person from './S140Person';
import S140Section from './S140Section';
import S140Song from './S140Song';
import S140Source from './S140Source';
import S140WeekHeader from './S140WeekHeader';
import styles from './index.styles';
import { applyRTL } from '@views/utils/pdf_utils';

registerFonts();

const TemplateS140AppNormal = ({
  data,
  class_count,
  cong_name,
  fullname,
  lang,
}: S140Type) => {
  const { t } = useAppTranslation();

  const stylesSmart = applyRTL(styles, lang);

  const minLabel = t('tr_minLabel', { lng: lang });

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

  /**
   * El título de la semana llega como «agosto 3 | Proverbios 30»: a la
   * izquierda la fecha y, tras la barra, la lectura de la semana. La banda de
   * la tarjeta reparte las dos partes en sus dos extremos, así que aquí se
   * separan en vez de imprimirse juntas con una barra en medio.
   */
  const partirTitulo = (title: string) => {
    const meses = [...MESES_ES];
    const [fecha, ...resto] = title.split('|');
    const palabras = fecha.trim().split(' ');
    const lectura = resto.join('|').trim();

    if (palabras.length === 2) {
      const mesIndex = meses.indexOf(palabras[0].toLowerCase());
      if (mesIndex !== -1) {
        return { dia: palabras[1], mes: meses[mesIndex], lectura };
      }
    }

    return { dia: fecha.trim(), mes: '', lectura };
  };

  /** «Semana del 3 de agosto». */
  const tituloSemana = (title: string) => {
    const { dia, mes } = partirTitulo(title);

    return mes ? t('tr_weekOfDay', { lng: lang, day: dia, month: mes }) : dia;
  };

  /** A la derecha de la banda: la lectura de la semana y quién preside. */
  const metaSemana = (meetingData: S140Type['data'][number]) => {
    const { lectura } = partirTitulo(meetingData.schedule_title);
    const presidente = meetingData.chairman_A_name;

    return [
      lectura,
      presidente ? `${t('tr_chairman', { lng: lang })}: ${presidente}` : '',
    ]
      .filter(Boolean)
      .join(' · ');
  };

  return (
    <Document title={t('tr_midweekMeetingPrint')} lang={lang}>
      {/* La hoja es la misma que la de los demás documentos de la app
          (`PDF_DESIGN_SYSTEM.md`). La barra de marca se voltea sola en los
          idiomas que se leen de derecha a izquierda: la dirección la fija el
          `Document`, y Yoga la respeta en las filas. */}
      <Sheet
        congregation={cong_name}
        period={periodo(data.at(0)?.weekOf, data.at(-1)?.weekOf)}
        title={t('tr_midweekMeetingPrint', { lng: lang })}
        documentName={t('tr_midweekMeetingPrint', { lng: lang })}
        updatedAt={fechaPie(lastUpdate?.updatedAt)}
      >
        {data.map((meetingData) => {
          return (
            <View
              key={`week-${meetingData.weekOf}`}
              style={stylesSmart.weekContainer}
              wrap={false}
            >
              <S140WeekHeader
                title={tituloSemana(meetingData.schedule_title)}
                meta={metaSemana(meetingData)}
                secondary={
                  meetingData.week_type === Week.CO_VISIT &&
                  meetingData.week_type_name
                }
                lang={lang}
              />

              {meetingData.no_meeting && (
                <View style={stylesSmart.rowContainer}>
                  <Text style={stylesSmart.weekInfoLabel}>
                    {meetingData.week_type_name}
                  </Text>
                </View>
              )}

              {!meetingData.no_meeting && (
                <>
                  {/* Opening Song & Opening Prayer */}
                  {meetingData.full && (
                    <View style={stylesSmart.rowContainer}>
                      <S140PartTime
                        time={meetingData.timing.pgm_start}
                        lang={lang}
                      />

                      <S140Source
                        node={
                          <S140Song
                            song={meetingData.song_first}
                            title={meetingData.song_first_title}
                            lang={lang}
                          />
                        }
                        secondary={`${t('tr_prayer', { lng: lang })}:`}
                        lang={lang}
                      />

                      <S140Person
                        primary={meetingData.opening_prayer_name}
                        lang={lang}
                      />
                    </View>
                  )}

                  {/* Chairman */}
                  <View style={stylesSmart.rowContainer}>
                    <S140PartTime
                      time={
                        meetingData.full && meetingData.timing.opening_comments
                      }
                      lang={lang}
                    />

                    <S140Source
                      source={
                        meetingData.full
                          ? t('tr_openingComments', { lng: lang })
                          : ' '
                      }
                      secondary={`${t('tr_chairman', { lng: lang })}:`}
                      lang={lang}
                    />

                    <S140Person
                      primary={meetingData.chairman_A_name}
                      lang={lang}
                    />
                  </View>

                  {/* TGW */}
                  {(meetingData.treasures || meetingData.students) && (
                    <S140Section
                      color={category.treasures}
                      section={t('tr_treasuresPart', { lng: lang })}
                      lang={lang}
                      secondary={
                        <View style={stylesSmart.sectionHallContainer}>
                          {meetingData.aux_class && (
                            <S140Hall
                              name={t('tr_auxClass', { lng: lang })}
                              counselor={meetingData.chairman_B_name}
                              group={meetingData.aux_room_fsg}
                              lang={lang}
                            />
                          )}

                          <S140Hall
                            name={t('tr_mainHall', { lng: lang })}
                            lang={lang}
                          />
                        </View>
                      }
                    >
                      {meetingData.treasures && (
                        <>
                          {/* TGW Talk */}
                          <View style={stylesSmart.rowContainer}>
                            <S140PartTime
                              time={meetingData.timing.tgw_talk}
                              lang={lang}
                            />

                            <S140Source
                              source={meetingData.tgw_talk_src}
                              duration={meetingData.tgw_talk_time}
                              lang={lang}
                            />

                            <S140Person
                              primary={meetingData.tgw_talk_name}
                              lang={lang}
                            />
                          </View>

                          {/* TGW Gems */}
                          <View style={stylesSmart.rowContainer}>
                            <S140PartTime
                              time={meetingData.timing.tgw_gems}
                              lang={lang}
                            />

                            <S140Source
                              source={meetingData.tgw_gems_src}
                              duration={meetingData.tgw_gems_time}
                              lang={lang}
                            />

                            <S140Person
                              primary={meetingData.tgw_gems_name}
                              lang={lang}
                            />
                          </View>
                        </>
                      )}

                      {/* TGW Bible Reading */}
                      {meetingData.students && (
                        <View style={stylesSmart.rowContainer}>
                          <S140PartTime
                            time={meetingData.timing.tgw_bible_reading}
                            lang={lang}
                          />

                          <S140Source
                            source={meetingData.tgw_bible_reading_src}
                            duration={`4 ${minLabel}`}
                            lang={lang}
                          />

                          {meetingData.aux_class && (
                            <S140Person
                              primary={meetingData.tgw_bible_reading_B_name}
                              lang={lang}
                            />
                          )}

                          <S140Person
                            primary={meetingData.tgw_bible_reading_A_name}
                            lang={lang}
                          />
                        </View>
                      )}
                    </S140Section>
                  )}

                  {/* AYF */}
                  {meetingData.students && (
                    <S140Section
                      color={category.teachers}
                      section={t('tr_applyFieldMinistryPart', { lng: lang })}
                      lang={lang}
                    >
                      <S140AYF
                        meetingData={meetingData}
                        class_count={class_count}
                        fullname={fullname}
                        lang={lang}
                      />
                    </S140Section>
                  )}

                  {/* LC */}
                  {meetingData.living && (
                    <S140Section
                      color={category.living}
                      section={t('tr_livingPart', { lng: lang })}
                      lang={lang}
                    >
                      {/* Middle song */}
                      {meetingData.full && (
                        <View style={stylesSmart.rowContainer}>
                          <S140PartTime
                            time={meetingData.timing.lc_middle_song}
                            lang={lang}
                          />

                          <S140Source
                            node={
                              <S140Song
                                song={meetingData.lc_middle_song}
                                title={meetingData.lc_middle_song_title}
                                lang={lang}
                              />
                            }
                            lang={lang}
                          />
                        </View>
                      )}

                      {/* LC Parts */}
                      <S140LC meetingData={meetingData} lang={lang} />

                      {/* When CO visits: Concluding Comments */}
                      {meetingData.week_type === Week.CO_VISIT && (
                        <>
                          {/* Concluding Comments */}
                          <View style={stylesSmart.rowContainer}>
                            <S140PartTime
                              time={meetingData.timing.concluding_comments}
                              lang={lang}
                            />

                            <S140Source
                              source={t('tr_concludingComments', { lng: lang })}
                              lang={lang}
                            />

                            <S140Person
                              primary={meetingData.chairman_A_name}
                              lang={lang}
                            />
                          </View>

                          {/* Talk by CO */}
                          <View style={stylesSmart.rowContainer}>
                            <S140PartTime
                              time={meetingData.timing.co_talk}
                              lang={lang}
                            />

                            <S140Source
                              source={meetingData.lc_co_talk || ''}
                              lang={lang}
                            />

                            <S140Person
                              primary={meetingData.co_name}
                              lang={lang}
                            />
                          </View>
                        </>
                      )}

                      {/* Normal Week */}
                      {meetingData.cbs && (
                        <>
                          {/* CBS */}
                          <View style={stylesSmart.rowContainer}>
                            <S140PartTime
                              time={meetingData.timing.cbs}
                              lang={lang}
                            />

                            <S140Source
                              source={meetingData.lc_cbs_title}
                              duration={meetingData.lc_cbs_time}
                              secondary={meetingData.lc_cbs_label}
                              lang={lang}
                            />

                            <S140Person
                              primary={meetingData.lc_cbs_conductor_name}
                              secondary={meetingData.lc_cbs_reader_name}
                              direction={fullname ? 'column' : 'row'}
                              lang={lang}
                            />
                          </View>

                          {/* Concluding Comments */}
                          {meetingData.full && (
                            <View style={stylesSmart.rowContainer}>
                              <S140PartTime
                                time={meetingData.timing.concluding_comments}
                                lang={lang}
                              />

                              <S140Source
                                source={t('tr_concludingComments', {
                                  lng: lang,
                                })}
                                lang={lang}
                              />

                              <S140Person
                                primary={meetingData.chairman_A_name}
                                lang={lang}
                              />
                            </View>
                          )}
                        </>
                      )}

                      {/* Closing Song & Closing Prayer */}
                      {meetingData.full && (
                        <View style={stylesSmart.rowContainer}>
                          <S140PartTime
                            time={meetingData.timing.pgm_end}
                            lang={lang}
                          />

                          <S140Source
                            node={
                              <S140Song
                                song={meetingData.lc_concluding_song}
                                title={meetingData.lc_concluding_song_title}
                                lang={lang}
                              />
                            }
                            secondary={`${t('tr_prayer', { lng: lang })}:`}
                            lang={lang}
                          />

                          <S140Person
                            primary={meetingData.lc_concluding_prayer}
                            lang={lang}
                          />
                        </View>
                      )}
                    </S140Section>
                  )}
                </>
              )}
            </View>
          );
        })}

        {/* La leyenda de los tres colores: el lector aprende de una vez qué
            significa cada cuadradito y ya no vuelve a preguntárselo. */}
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: space.xl,
            marginTop: space.xs,
          }}
        >
          <PdfCategory color={category.treasures}>
            {t('tr_treasuresPart', { lng: lang })}
          </PdfCategory>
          <PdfCategory color={category.teachers}>
            {t('tr_applyFieldMinistryPart', { lng: lang })}
          </PdfCategory>
          <PdfCategory color={category.living}>
            {t('tr_livingPart', { lng: lang })}
          </PdfCategory>
        </View>
      </Sheet>
    </Document>
  );
};

export default TemplateS140AppNormal;
