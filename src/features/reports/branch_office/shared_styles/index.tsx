import { Box, styled } from '@mui/material';

export const CardContainer = styled(Box)({
  backgroundColor: 'var(--card)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--radius-xl)',
  padding: '16px',
  display: 'flex',
  gap: '24px',
  flexDirection: 'column',
}) as unknown as typeof Box;
