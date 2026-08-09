import { Box, Grid } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import { TrashEntry } from '@services/app/persons_trash';
import { IconUndo } from '@components/icons';
import Button from '@components/button';
import Card from '@components/card';
import Typography from '@components/typography';
import RestorePersonDialog from '../restore_dialog';
import useTrashCard from './useTrashCard';

/**
 * Una fila de la papelera.
 *
 * No es una `UserCard` —la de la lista de personas— a propósito: aquélla lleva
 * la tarjeta entera como botón que abre la ficha, y la ficha de alguien
 * borrado no existe (todas las pantallas leen de las listas de vivos). Aquí lo
 * único que se puede hacer es devolverlo, así que la acción va sola y visible
 * en vez de escondida detrás de un clic que no llevaría a ninguna parte.
 *
 * La línea de los informes está porque es LA pregunta con la que se abre esta
 * pantalla: no «¿está esta persona?», sino «¿siguen estando sus informes?».
 */
const TrashPersonCard = ({
  entry,
  name,
  deletedByName,
  deletedAtLabel,
}: {
  entry: TrashEntry;
  name: string;
  deletedByName: string;
  deletedAtLabel: string;
}) => {
  const { t } = useAppTranslation();

  const { isRestoring, handleOpen, handleClose, handleConfirm, atRisk } =
    useTrashCard(entry);

  const totalReports = entry.reportsAlive + entry.reportsDeleted;

  return (
    <Grid size={{ desktop: 6, tablet: 12 }} sx={{ width: '100%' }}>
      <RestorePersonDialog
        open={isRestoring}
        name={name}
        entry={entry}
        atRisk={atRisk}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />

      <Card sx={{ gap: '12px' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              minWidth: '180px',
              flex: 1,
            }}
          >
            <Typography className="h4">{name}</Typography>

            <Typography className="body-small-regular" color="var(--ink-2)">
              {deletedByName
                ? t('tr_trashDeletedOnBy', {
                    date: deletedAtLabel,
                    name: deletedByName,
                  })
                : t('tr_trashDeletedOn', { date: deletedAtLabel })}
            </Typography>

            {totalReports > 0 && (
              <Typography className="body-small-regular" color="var(--ink-3)">
                {/* El singular se elige aquí y no con los plurales de i18next:
                    el idioma de la app es 'spa', que no es un código que las
                    reglas de plural sepan resolver. */}
                {totalReports === 1
                  ? t('tr_trashReportsKeptOne')
                  : t('tr_trashReportsKept', { count: totalReports })}
              </Typography>
            )}
          </Box>

          <Button
            variant="secondary"
            startIcon={<IconUndo color="var(--accent-main)" />}
            onClick={handleOpen}
            disableAutoStretch
            // Con el nombre dentro, por lo mismo que el de eliminar de la
            // lista de personas: hay uno de estos por fila, y «Restaurar»
            // repetido no dice a quién se devuelve.
            ariaLabel={t('tr_restorePersonAria', { name })}
          >
            {t('tr_restore')}
          </Button>
        </Box>
      </Card>
    </Grid>
  );
};

export default TrashPersonCard;
