import { Box } from '@mui/material';
import PageTitle from '@components/page_title';
import ResponsabilidadesFeature from '@features/congregation/responsabilidades';

const ResponsabilidadesPage = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <PageTitle title="Responsabilidades" />
      <ResponsabilidadesFeature />
    </Box>
  );
};

export default ResponsabilidadesPage;
