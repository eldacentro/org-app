import { Stack } from '@mui/material';
import useMainForm from './useMainForm';
import ApplicationForm from '@features/ministry/application_form';
import ApplicantSelector from '../applicant';
import FormHeader from '../form_header';

const UserApplicationForm = () => {
  const { formData, handleFormChange, applications, isSelf } = useMainForm();

  return (
    <Stack spacing="24px">
      <ApplicantSelector />

      {/* Los meses que YA tienes pedidos o aprobados. Solo cuando la solicitud
          es para uno mismo: enviándola por otra persona, esos meses son los del
          que la rellena y anunciarlos bajo el nombre de ella engañaría. */}
      {isSelf && applications.length > 0 && (
        <FormHeader applications={applications} />
      )}

      <ApplicationForm application={formData} onChange={handleFormChange} />
    </Stack>
  );
};

export default UserApplicationForm;
