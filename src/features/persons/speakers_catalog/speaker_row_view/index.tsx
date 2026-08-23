import { Box, IconButton } from '@mui/material';
import { IconEdit, IconPrepareReport } from '@components/icons';
import { useAppTranslation, useBreakpoints } from '@hooks/index';
import { buildPersonFullname } from '@utils/common';
import { SpeakerReadOnlyViewType } from './index.types';
import useSpeakerRowView from './useSpeakerRowView';
import Button from '@components/button';
import SpeakerDetails from '@features/persons/speakers_catalog/speaker_details';
import TalksFix from '@features/persons/speakers_catalog/talks_fix';
import Typography from '@components/typography';

const SpeakerRowView = ({
  speaker,
  allowTalksFix,
}: SpeakerReadOnlyViewType) => {
  const { t } = useAppTranslation();

  const { mobile400Down, laptopDown, tabletDown } = useBreakpoints();

  const {
    talks,
    correccion,
    puedeCorregir,
    openTalksFix,
    handleOpenTalksFix,
    handleCloseTalksFix,
    fullnameOption,
    handleHideDetails,
    handleShowDetails,
    showDetails,
    handleCloseSpeakerDetails,
    handleOpenSpeakerDetails,
    openSpeakerDetails,
  } = useSpeakerRowView(speaker, allowTalksFix);

  return (
    <Box>
      {openTalksFix && (
        <TalksFix
          speaker={speaker}
          open={openTalksFix}
          onClose={handleCloseTalksFix}
        />
      )}

      {openSpeakerDetails && (
        <SpeakerDetails
          onClose={handleCloseSpeakerDetails}
          open={openSpeakerDetails}
          speaker={speaker}
        />
      )}

      <Box
        onMouseEnter={handleShowDetails}
        onMouseLeave={handleHideDetails}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px',
          width: '100%',
          minHeight: '36px',
          justifyContent: 'space-between',
          '&:hover': {
            backgroundColor: 'var(--accent-150)',
            borderRadius: 'var(--shape-xs)',
            '> p, .MuiBox-root > p:first-of-type': {
              color: 'var(--accent-dark)',
            },
            '.MuiBox-root > p:first-of-type + p': {
              color: 'var(--accent-400)',
            },
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: mobile400Down ? 'flex-start' : 'center',
            gap: '8px',
            flexDirection: mobile400Down ? 'column' : 'row',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography
              className="body-small-regular"
              sx={{
                minWidth: mobile400Down ? 'unset' : '215px',
                width: mobile400Down ? 'unset' : '215px',
              }}
            >
              {buildPersonFullname(
                speaker.speaker_data.person_lastname.value,
                speaker.speaker_data.person_firstname.value,
                fullnameOption
              )}
            </Typography>
            {speaker.speaker_data.person_notes.value.length > 0 && (
              <Typography className="label-small-regular">
                {speaker.speaker_data.person_notes.value}
              </Typography>
            )}
          </Box>
          {/* La marca va DEBAJO de los números, no al lado.
              Al lado le robaba el ancho a la lista y «38, 108, 189» se partía
              en tres renglones, uno por número, empujando el lápiz fuera de la
              fila. Debajo es además donde ya vive la nota del hermano, así que
              se lee igual que lo demás. */}
          <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <Typography className="body-small-semibold">{talks}</Typography>

            {correccion && (
              <Typography
                className="label-small-regular"
                color="var(--orange-dark)"
                sx={{ whiteSpace: 'nowrap' }}
              >
                corregido aquí
              </Typography>
            )}
          </Box>
        </Box>

        {/* Las acciones no se encogen: el lápiz se salía de la fila cuando la
            lista de discursos ocupaba varias líneas. */}
        {(showDetails || laptopDown) && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexShrink: 0,
            }}
          >
            {puedeCorregir && (
              <IconButton
                aria-label="Corregir sus discursos"
                title="Corregir sus discursos"
                sx={{ padding: 0 }}
                onClick={handleOpenTalksFix}
              >
                <IconEdit width={20} height={20} color="var(--accent-main)" />
              </IconButton>
            )}

            {!tabletDown && (
              <Button
                variant="small"
                color="accent"
                onClick={handleOpenSpeakerDetails}
                sx={{
                  height: laptopDown ? 'unset' : '20px',
                  minHeight: laptopDown ? '32px' : '20px',
                  padding: 0,
                }}
                startIcon={
                  <IconPrepareReport
                    width={20}
                    height={20}
                    color="var(--accent-main)"
                  />
                }
              >
                {t('tr_details')}
              </Button>
            )}
            {tabletDown && (
              <IconButton
                aria-label="Ver detalles del orador"
                sx={{ padding: 0 }}
                onClick={handleOpenSpeakerDetails}
              >
                <IconPrepareReport
                  width={20}
                  height={20}
                  color="var(--accent-main)"
                />
              </IconButton>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default SpeakerRowView;
