import { Stack } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import PageTitle from '@components/page_title';
import PersonsTrash from '@features/persons/list/trash';

/**
 * La papelera, en su propia página.
 *
 * Estuvo un rato como tercera pestaña de Personas y ahí estorbaba: es algo que
 * se abre unas pocas veces al año, y una pestaña permanente al lado de «Todas
 * las personas» le daba el mismo peso que a lo que se usa a diario. Se entra
 * desde el botón de la cabecera de Personas, junto a Importar/exportar — que
 * es exactamente igual de ocasional y vive ahí.
 */
const PersonsTrashPage = () => {
  const { t } = useAppTranslation();

  return (
    <Stack spacing="16px">
      <PageTitle title={t('tr_trash')} />

      <PersonsTrash />
    </Stack>
  );
};

export default PersonsTrashPage;
