import { Box } from '@mui/material';
import OAuthGoogle from './google';

const OAuth = () => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <OAuthGoogle />
    </Box>
  );
};

export default OAuth;
