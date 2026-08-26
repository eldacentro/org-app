import { Box } from '@mui/material';
import { useAtomValue } from 'jotai';
import { IconInfo } from '@components/icons';
import { useAppTranslation } from '@hooks/index';
import { speakersCatalogSearchState } from '@states/speakers_congregations';
import Typography from '@components/typography';

/**
 * El hueco cuando no hay oradores que enseñar.
 *
 * Mira el buscador porque son dos cosas distintas y decirlas igual miente: «no
 * hay ninguno todavía» manda a añadir gente, y «ninguno coincide» manda a
 * cambiar lo escrito. Con la lista filtrada, el primero era falso.
 */
const NoSpeakers = () => {
  const { t } = useAppTranslation();

  const buscando = useAtomValue(speakersCatalogSearchState).trim().length > 0;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <IconInfo color="var(--grey-350)" />
      <Typography color="var(--grey-350)">
        {buscando
          ? 'Ninguno coincide con la búsqueda.'
          : t('tr_noSpeakersYet')}
      </Typography>
    </Box>
  );
};

export default NoSpeakers;
