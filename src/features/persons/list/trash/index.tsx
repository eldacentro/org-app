import { Box, Grid } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import { buildPersonFullname } from '@utils/common';
import { IconDelete } from '@components/icons';
import Button from '@components/button';
import EmptyState from '@components/empty_state';
import InfoTip from '@components/info_tip';
import TrashPersonCard from './trash_card';
import EmptyTrashDialog from './empty_trash_dialog';
import useTrash, { formatDeletedAt } from './useTrash';

/**
 * LA PAPELERA.
 *
 * Borrar aquí nunca borró nada: dejaba el registro entero con una lápida y sin
 * ninguna pantalla que lo enseñara, así que recuperar a alguien pasaba por
 * pegar un script en la consola del navegador. Esto es esa pantalla.
 *
 * No se vacía sola: nada retira las lápidas —ni la norma de conservación, ni
 * ningún `cleanup`, ni el servidor—. Vaciarla es siempre una decisión de
 * alguien, y por eso el botón está aquí y no en ningún automatismo.
 */
const PersonsTrash = () => {
  const { t } = useAppTranslation();

  const {
    entries,
    resolveName,
    fullnameOption,
    canPurge,
    isEmptying,
    handleEmptyOpen,
    handleEmptyClose,
    handleEmptyConfirm,
    totalReports,
  } = useTrash();

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

      {canPurge && (
        <>
          <EmptyTrashDialog
            open={isEmptying}
            personCount={entries.length}
            reportCount={totalReports}
            onClose={handleEmptyClose}
            onConfirm={handleEmptyConfirm}
          />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="secondary"
              color="red"
              startIcon={<IconDelete color="var(--red-main)" />}
              onClick={handleEmptyOpen}
              disableAutoStretch
            >
              {t('tr_emptyTrash')}
            </Button>
          </Box>
        </>
      )}

      <Grid container spacing={2}>
        {entries.map((entry) => (
          <TrashPersonCard
            key={entry.person.person_uid}
            entry={entry}
            canPurge={canPurge}
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
