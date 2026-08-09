import { Box, Grid } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import { buildPersonFullname } from '@utils/common';
import { IconDelete } from '@components/icons';
import EmptyState from '@components/empty_state';
import InfoTip from '@components/info_tip';
import TrashPersonCard from './trash_card';
import useTrash, { formatDeletedAt } from './useTrash';

/**
 * LA PAPELERA.
 *
 * Borrar aquí nunca borró nada: dejaba el registro entero con una lápida y sin
 * ninguna pantalla que lo enseñara, así que recuperar a alguien pasaba por
 * pegar un script en la consola del navegador. Esto es esa pantalla.
 *
 * No se vacía sola: nada retira las lápidas —ni la norma de conservación, ni
 * ningún `cleanup`, ni el servidor—, y por eso el aviso de arriba puede
 * prometer que lo que entra aquí se queda. Si algún día se añade una purga,
 * ese aviso es lo primero que hay que cambiar.
 */
const PersonsTrash = () => {
  const { t } = useAppTranslation();

  const { entries, resolveName, fullnameOption } = useTrash();

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<IconDelete color="var(--accent-main)" />}
        title={t('tr_trashEmpty')}
        description={t('tr_trashEmptyDesc')}
      />
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <InfoTip isBig={false} color="info" text={t('tr_trashDesc')} />

      <Grid container spacing={2}>
        {entries.map((entry) => (
          <TrashPersonCard
            key={entry.person.person_uid}
            entry={entry}
            name={buildPersonFullname(
              entry.person.person_data.person_lastname.value,
              entry.person.person_data.person_firstname.value,
              fullnameOption
            )}
            deletedByName={resolveName(entry.deletedBy)}
            deletedAtLabel={formatDeletedAt(entry.deletedAt)}
          />
        ))}
      </Grid>
    </Box>
  );
};

export default PersonsTrash;
