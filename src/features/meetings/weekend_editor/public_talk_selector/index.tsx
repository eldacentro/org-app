import { Box, Popper } from '@mui/material';
import { IconClose, IconTalk } from '@components/icons';
import { PublicTalkOptionType, PublicTalkSelectorType } from './index.types';
import { useAppTranslation } from '@hooks/index';
import usePublicTalkSelector from './usePublicTalkSelector';
import usePublicTalkTypeSelector from '../public_talk_type_selector/usePublicTalkTypeSelector';
import Autocomplete from '@components/autocomplete';
import IconButton from '@components/icon_button';
import SpeakersCatalog from '../speakers_catalog';
import Typography from '@components/typography';

const PublicTalkSelector = ({
  week,
  showSpeakerCount,
  type,
  schedule_id,
  readOnly = false,
}: PublicTalkSelectorType) => {
  const { t } = useAppTranslation();

  const { talkType } = usePublicTalkTypeSelector(week);

  const {
    repeatNotice,
    talks,
    selectedTalk,
    handleTalkChange,
    handleCloseCatalog,
    handleOpenCatalog,
    openCatalog,
  } = usePublicTalkSelector(week, schedule_id);

  const showCatalog = !readOnly && talkType !== 'jwStreamRecording';

  return (
    <Box>
      {!readOnly && openCatalog && (
        <SpeakersCatalog
          open={openCatalog}
          onClose={handleCloseCatalog}
          week={week}
          schedule_id={schedule_id}
          type={type}
        />
      )}

      {/* Mismo reparto que el selector de hermano: el campo y, a su derecha,
          el carril de acciones a la altura de la primera línea (56px). El
          botón del catálogo iba en posición absoluta DENTRO del campo, con la
          X de limpiar corrida 90px para esquivarlo: dos hacks para sostener un
          botón donde no le toca estar, y que además dejaban el botón que
          CAMBIA el orador pegado al que borra el discurso. */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Autocomplete
            readOnly={readOnly}
            // Los títulos de los discursos pasan de los 60 caracteres y se
            // cortaban con puntos suspensivos: era el único campo del editor al
            // que no le cabía su propio valor. Que ocupe dos líneas.
            multiline
            label={t('tr_publicTalk')}
            options={talks}
            isOptionEqualToValue={(option, value) =>
              option.talk_number === value.talk_number
            }
            getOptionLabel={(option: PublicTalkOptionType) =>
              `${option.talk_number}. ${option.talk_title}`
            }
            value={talks.length > 0 ? selectedTalk : null}
            onChange={(_, value: PublicTalkOptionType) =>
              handleTalkChange(value)
            }
            PopperComponent={(props) => (
              <Popper {...props} placement="top-start" />
            )}
            renderOption={(props, option) => (
              <Box
                component="li"
                {...props}
                sx={{
                  margin: 0,
                  padding: 0,
                  '&.Mui-focused': {
                    backgroundColor: 'var(--accent-100) !important',
                    '& p': {
                      color:
                        showSpeakerCount && option.speakers === 0
                          ? 'var(--accent-350)'
                          : 'var(--accent-dark)',
                    },
                  },
                  '&[aria-selected="true"]': {
                    backgroundColor: 'var(--line) !important',
                    '& p:nth-of-type(1)': {
                      color:
                        showSpeakerCount && option.speakers === 0
                          ? 'var(--accent-350)'
                          : 'var(--accent-dark)',
                    },
                    '& p:nth-of-type(2)': {
                      color:
                        showSpeakerCount && option.speakers === 0
                          ? 'var(--accent-350)'
                          : 'var(--accent-400)',
                    },
                  },
                }}
                key={option.talk_number}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                  }}
                >
                  <Typography
                    color={
                      showSpeakerCount && option.speakers === 0
                        ? 'var(--grey-350)'
                        : 'var(--black)'
                    }
                  >
                    {option.talk_number}. {option.talk_title}
                  </Typography>

                  {showSpeakerCount && (
                    <Typography
                      className="body-small-regular"
                      color={
                        option.speakers === 0
                          ? 'var(--grey-350)'
                          : 'var(--grey-400)'
                      }
                    >
                      {option.speakers === 0
                        ? t('tr_noSpeakersYet')
                        : t('tr_speakersWithCount', {
                            speakersCount: option.speakers,
                          })}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
            clearIcon={<IconClose width={20} height={20} />}
            sx={{
              '& .MuiOutlinedInput-input': {
                // Hueco para la X de limpiar y la flecha, y nada más: es lo que
                // MUI reservaría solo. Aquí dentro ya no vive ningún botón.
                paddingRight: '65px !important',
              },
            }}
          />
        </Box>

        {showCatalog && (
          <Box
            sx={{
              height: '56px',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <IconButton
              sx={{ padding: 0 }}
              title={t('tr_speakersCatalog')}
              onClick={handleOpenCatalog}
            >
              <IconTalk color="var(--accent-main)" />
            </IconButton>
          </Box>
        )}
      </Box>

      {/* El mismo aviso amarillo que ya usa el selector de hermano cuando
          alguien repite: mismo sitio —debajo del campo—, mismo color y mismo
          tamaño, para que se lea como lo que es y no como algo nuevo que hay
          que aprender. */}
      {repeatNotice.length > 0 && (
        <Typography
          className="label-small-regular"
          color="var(--orange-dark)"
          sx={{ padding: '4px 16px 0 16px' }}
        >
          {repeatNotice}
        </Typography>
      )}
    </Box>
  );
};

export default PublicTalkSelector;
