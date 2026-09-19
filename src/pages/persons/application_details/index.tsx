import { Stack } from '@mui/material';
import Typography from '@components/typography';
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

  const { name, submittedBy, notFound } = useApplicationDetails();

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

      {/* Quién la mandó, si no fue el propio solicitante. Se dice porque cambia
          cómo se lee la firma de abajo: la rellenó otra persona. */}
      {submittedBy.length > 0 && (
        <Typography className="body-small-regular" color="var(--ink-2)">
          Esta solicitud la envió {submittedBy} en su nombre.
        </Typography>
      )}

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
