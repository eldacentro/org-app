import { Stack } from '@mui/material';
import { Navigate } from 'react-router';
import { useCurrentUser } from '@hooks/index';
import { IconDelete } from '@components/icons';
import useApplicationDetails from './useApplicationDetails';
import PageTitle from '@components/page_title';
import NavBarButton from '@components/nav_bar_button';
import PersonApplication from '@features/persons/application_person';
import ApplicationDeleteConfirm from '@features/persons/application_delete';
import useApplicationDelete from '@features/persons/application_delete/useApplicationDelete';

const ApplicationDetails = () => {
  // Quien es del comité de servicio: los mismos a los que el servidor les
  // admite el borrado. El resto de ancianos ve la solicitud pero no la retira.
  const { isServiceCommittee } = useCurrentUser();

  const { name, notFound } = useApplicationDetails();

  const { open, busy, approved, handleOpen, handleClose, handleConfirm } =
    useApplicationDelete();

  if (notFound) return <Navigate to="/pioneer-applications" />;

  return (
    <Stack spacing="16px">
      <PageTitle
        title={name}
        buttons={
          isServiceCommittee && (
            <NavBarButton
              text="Borrar"
              color="red"
              icon={<IconDelete />}
              onClick={handleOpen}
            />
          )
        }
      />

      <ApplicationDeleteConfirm
        open={open}
        busy={busy}
        name={name}
        approved={approved}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />

      <PersonApplication />
    </Stack>
  );
};

export default ApplicationDetails;
