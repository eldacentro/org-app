import { Stack } from '@mui/material';
import { IconCopy, IconTalk } from '@components/icons';
import { useAppTranslation, useBreakpoints } from '@hooks/index';
import {
  DoubleFieldContainer,
  PrimaryFieldContainer,
  SecondaryFieldContainer,
} from '../../shared_styles';
import { Week } from '@definition/week_type';
import { PublicTalkProps } from './index.types';
import usePublicTalk from './usePublicTalk';
import IconButton from '@components/icon_button';
import MeetingSection from '@features/meetings/meeting_section';
import PartTiming from '../../part_timing';
import PersonComponent from '../../person_component';
import Typography from '@components/typography';
import TalkReplacementCard from '../../talk_replacement_card';

const PublicTalk = (props: PublicTalkProps) => {
  const { t } = useAppTranslation();

  const { laptopUp } = useBreakpoints();

  const { showSecondSpeaker, talkTitle, handleCopyTalk, replacement } =
    usePublicTalk(props);

  return (
    <MeetingSection
      part={t('tr_publicTalk')}
      color="var(--weekend-meeting)"
      icon={<IconTalk color="var(--always-white)" />}
      alwaysExpanded
    >
      <DoubleFieldContainer sx={{ flexDirection: laptopUp ? 'row' : 'column' }}>
        <PrimaryFieldContainer>
          <Stack spacing="4px" padding="2px 0px">
            {/* Con un episodio esta línea entera sobra: el rótulo, porque la
                banda de la sección ya dice DISCURSO PÚBLICO justo encima y
                debajo viene el título del episodio —se leían tres veces las
                mismas dos palabras—, y la hora porque se va DENTRO de la
                tarjeta: aquí se quedaba sola encima de la portada, sin nada a
                lo que pegarse. */}
            {!replacement && (
              <Stack spacing="8px" direction="row" alignItems="center">
                {props.timings?.public_talk && (
                  <PartTiming time={props.timings.public_talk} />
                )}

                <Typography className="h4" color="var(--weekend-meeting)">
                  {t('tr_publicTalk')}
                </Typography>
              </Stack>
            )}

            {/* En la semana de la visita, el hueco puede llevar un episodio en
                vez del discurso. Se enseña con su portada: no es un dato del
                programa, es lo que va a pasar en la reunión. */}
            {replacement && (
              <TalkReplacementCard
                replacement={replacement}
                mostrarSustitucion={false}
                timing={
                  props.timings?.public_talk ? (
                    <PartTiming time={props.timings.public_talk} />
                  ) : null
                }
              />
            )}

            {!replacement && talkTitle && (
              <Stack spacing="8px" direction="row" alignItems="center">
                <Typography
                  className="h4"
                  sx={{ marginLeft: '4px !important' }}
                >
                  {talkTitle}
                </Typography>
                <IconButton
                  aria-label="Copiar"
                  onClick={handleCopyTalk}
                  sx={{ padding: '2px' }}
                >
                  <IconCopy color="var(--black)" />
                </IconButton>
              </Stack>
            )}
          </Stack>
        </PrimaryFieldContainer>
        <SecondaryFieldContainer sx={{ maxWidth: laptopUp ? '360px' : '100%' }}>
          {props.week_type !== Week.CO_VISIT && (
            <Stack>
              <PersonComponent
                label={`${showSecondSpeaker ? t('tr_firstSpeaker') : t('tr_speaker')}:`}
                week={props.week}
                assignment="WM_Speaker_Part1"
                dataView={props.dataView}
                color="var(--weekend-meeting)"
                showCongregation={true}
              />

              {showSecondSpeaker && (
                <PersonComponent
                  label={`${t('tr_secondSpeaker')}:`}
                  week={props.week}
                  assignment="WM_Speaker_Part2"
                  dataView={props.dataView}
                  color="var(--weekend-meeting)"
                  showCongregation={true}
                />
              )}
            </Stack>
          )}

          {/* Con un episodio no se enseña «Hermano»: el vídeo no lo da nadie. El
              superintendente sigue apareciendo donde sí habla, en el discurso de
              servicio. */}
          {props.week_type === Week.CO_VISIT && !replacement && (
            <PersonComponent
              label={`${t('tr_brother')}:`}
              week={props.week}
              assignment="WM_CircuitOverseer"
              dataView={props.dataView}
              color="var(--weekend-meeting)"
            />
          )}
        </SecondaryFieldContainer>
      </DoubleFieldContainer>
    </MeetingSection>
  );
};

export default PublicTalk;
