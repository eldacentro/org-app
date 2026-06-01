import { Box } from '@mui/material';
import { styled } from '@mui/system';

export const GroupsContainer = styled(Box)({
  width: '100%',
  '.MuiBox-root': {
    borderBottom: '1px solid var(--line)',
  },
  '.MuiBox-root:last-child': {
    borderBottom: 'none',
  },
});
