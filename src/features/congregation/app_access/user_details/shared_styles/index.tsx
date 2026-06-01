import { Box, styled } from '@mui/material';

export const DetailsContainer = styled(Box)({
  flex: 1,
  width: '100%',
  borderRadius: 'var(--r-lg)',
  border: '1px solid var(--line)',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
  backgroundColor: 'var(--card)',
}) as unknown as typeof Box;

export const SwitchContainer = styled(Box)({
  display: 'flex',
  gap: '16px',
  flexDirection: 'column',
}) as unknown as typeof Box;
