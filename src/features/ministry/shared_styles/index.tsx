import { styled } from '@mui/system';
import { Box } from '@mui/material';

export const CardContainer = styled(Box)({
  border: '1px solid var(--line)',
  borderRadius: 'var(--r-lg)',
  backgroundColor: 'var(--card)',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  boxShadow: 'var(--shadow-sm)',
}) as unknown as typeof Box;
