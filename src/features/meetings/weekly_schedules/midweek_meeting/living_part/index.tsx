import { Stack } from '@mui/material';
import { IconLivingPart } from '@components/icons';
import { Week } from '@definition/week_type';
import {
  DoubleFieldContainer,
  PrimaryFieldContainer,
  SecondaryFieldContainer,
} from '../../shared_styles';
import { MIDWEEK_FULL } from '@constants/index';
import { LivingPartProps } from './index.types';
import { useAppTranslation, useBreakpoints } from '@hooks/index';
import useLivingPart from './useLivingPart';
import COTalk from '../../co_talk';
import Divider from '@components/divider';
import MeetingPart from '@features/meetings/meeting_part';
import MeetingSection from '@features/meetings/meeting_section';
import PartRow from './part_row';
import PartTiming from '../../part_timing';
import PartNote from '../../part_note';
import PersonComponent from '../../person_component';
import SongSource from '@features/meetings/song_source';
import Typography from '@components/typography';

const LivingPart = (props: LivingPartProps) => {
  const { t } = useAppTranslation();

  const { laptopUp } = useBreakpoints();

  const { parts, weekType, closingPrayerLinked, showCBS } =
    useLivingPart(props);

  /**
   * «Palabras de conclusión (3 mins.)», del presidente.
   *
   * Está en la guía de actividades («Palabras de conclusión (3 mins.) | Canción
   * y oración») y en todos los programas que hacía Elda Centro, y aquí faltaba:
   * de la última parte se saltaba a la canción final. Va antes de la canción
   * final y, en la semana de la visita del superintendente, antes de su
   * discurso, que es donde va ese día.
   */
  const conclusion = MIDWEEK_FULL.includes(weekType) && (
    <>
      <DoubleFieldContainer sx={{ flexDirection: laptopUp ? 'row' : 'column' }}>
        <PrimaryFieldContainer>
          {props.timings?.concluding_comments && (
            <PartTiming
              time={props.timings.concluding_comments}
              partKey="concluding_comments"
            />
          )}
          <Typography className="h4" color="var(--living-as-christians)">
            {`${t('tr_concludingComments')} (3 ${t('tr_minLabel')})`}
          </Typography>
        </PrimaryFieldContainer>
        <SecondaryFieldContainer
          sx={{ maxWidth: laptopUp ? '360px' : '100%' }}
        >
          <PersonComponent
            label={`${t('tr_chairman')}:`}
            week={props.week}
            assignment="MM_Chairman_A"
            dataView={props.dataView}
            color="var(--living-as-christians)"
          />
        </SecondaryFieldContainer>
      </DoubleFieldContainer>
      <PartNote partKey="concluding_comments" />
    </>
  );

  return (
    <MeetingSection
      part={t('tr_livingPart')}
      color="var(--living-as-christians)"
      icon={<IconLivingPart color="var(--always-white)" />}
      alwaysExpanded
    >
      <Stack spacing="8px" divider={<Divider color="var(--grey-200)" />}>
        {/* El recuadro de nota va DENTRO del mismo hijo del Stack, no suelto:
            el Stack pinta un separador entre cada hijo, y uno más —aunque no
            pinte nada, como le pasa a un publicador— dejaba dos rayas debajo de
            la canción del medio en vez de una. */}
        <>
          <DoubleFieldContainer
            sx={{ flexDirection: laptopUp ? 'row' : 'column' }}
          >
            <PrimaryFieldContainer>
              {props.timings?.lc_middle_song && (
                <PartTiming
                  time={props.timings.lc_middle_song}
                  partKey="lc_middle_song"
                />
              )}

              <SongSource
                meeting="midweek"
                week={props.week}
                type="middle"
                dataView={props.dataView}
              />
            </PrimaryFieldContainer>
            <SecondaryFieldContainer
              sx={{ maxWidth: laptopUp ? '360px' : '100%' }}
            />
          </DoubleFieldContainer>

          <PartNote partKey="lc_middle_song" />
        </>

        {parts.map((part) => (
          <PartRow
            key={part}
            week={props.week}
            type={part}
            timings={props.timings}
            dataView={props.dataView}
          />
        ))}

        {showCBS && (
          <>
            <DoubleFieldContainer
              sx={{ flexDirection: laptopUp ? 'row' : 'column' }}
            >
              <PrimaryFieldContainer>
                {props.timings?.cbs && (
                  <PartTiming time={props.timings.cbs} partKey="cbs" />
                )}

                <MeetingPart
                  week={props.week}
                  type="lc_cbs"
                  color="var(--living-as-christians)"
                  dataView={props.dataView}
                />
              </PrimaryFieldContainer>
              <SecondaryFieldContainer
                sx={{ maxWidth: laptopUp ? '360px' : '100%' }}
              >
                <Stack>
                  <PersonComponent
                    label={`${t('tr_conductor')}:`}
                    week={props.week}
                    assignment="MM_LCCBSConductor"
                    dataView={props.dataView}
                    color="var(--living-as-christians)"
                  />
                  <PersonComponent
                    label={`${t('tr_reader')}:`}
                    week={props.week}
                    assignment="MM_LCCBSReader"
                    dataView={props.dataView}
                    color="var(--living-as-christians)"
                  />
                </Stack>
              </SecondaryFieldContainer>
            </DoubleFieldContainer>
            <PartNote partKey="cbs" />
          </>
        )}

        {/* Después del estudio y, en la semana de la visita, antes del
            discurso del superintendente: en los dos casos, justo aquí. */}
        {conclusion}

        {weekType === Week.CO_VISIT && (
          <>
            <DoubleFieldContainer
              sx={{ flexDirection: laptopUp ? 'row' : 'column' }}
            >
              <PrimaryFieldContainer>
                {props.timings?.co_talk && (
                  <PartTiming time={props.timings.co_talk} partKey="co_talk" />
                )}
                <COTalk
                  color="var(--living-as-christians)"
                  week={props.week}
                  meeting="midweek"
                />
              </PrimaryFieldContainer>
              <SecondaryFieldContainer
                sx={{ maxWidth: laptopUp ? '360px' : '100%' }}
              >
                <PersonComponent
                  label={`${t('tr_brother')}:`}
                  week={props.week}
                  assignment="MM_CircuitOverseer"
                  dataView={props.dataView}
                  color="var(--living-as-christians)"
                />
              </SecondaryFieldContainer>
            </DoubleFieldContainer>
            <PartNote partKey="co_talk" />
          </>
        )}

        {MIDWEEK_FULL.includes(weekType) && (
          <DoubleFieldContainer
            sx={{ flexDirection: laptopUp ? 'row' : 'column' }}
          >
            <PrimaryFieldContainer>
              {props.timings?.pgm_end && (
                <PartTiming time={props.timings.pgm_end} />
              )}
              <SongSource
                meeting="midweek"
                week={props.week}
                type="concluding"
                dataView={props.dataView}
              />
            </PrimaryFieldContainer>
            <SecondaryFieldContainer
              sx={{ maxWidth: laptopUp ? '360px' : '100%' }}
            >
              <PersonComponent
                label={`${t('tr_prayer')}:`}
                week={props.week}
                dataView={props.dataView}
                assignment={
                  !closingPrayerLinked
                    ? 'MM_ClosingPrayer'
                    : closingPrayerLinked
                }
                color="var(--living-as-christians)"
              />
            </SecondaryFieldContainer>
          </DoubleFieldContainer>
        )}
      </Stack>
    </MeetingSection>
  );
};

export default LivingPart;
