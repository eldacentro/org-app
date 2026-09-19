import { useState } from 'react';
import { Stack } from '@mui/material';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import PageTitle from '@components/page_title';
import PersonApplications from '@features/persons/applications';
import Months15h from '@features/persons/applications/months_15h';

const Applications = () => {
  const { t } = useAppTranslation();

  // Quien atiende las solicitudes es quien cuadra los meses de 15 horas. El
  // resto de ancianos ve la página, pero no el engranaje.
  const { isServiceCommittee } = useCurrentUser();

  const [openMonths, setOpenMonths] = useState(false);

  return (
    <Stack spacing="16px">
      <PageTitle
        title={t('tr_APApps')}
        quickSettings={
          isServiceCommittee ? () => setOpenMonths(true) : undefined
        }
        quickSettingsLabel="Meses de 15 horas"
      />

      <Months15h open={openMonths} onClose={() => setOpenMonths(false)} />

      <PersonApplications />
    </Stack>
  );
};

export default Applications;
