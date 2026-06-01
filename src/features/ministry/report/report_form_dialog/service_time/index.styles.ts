import { Box, styled } from '@mui/material';

export const FieldContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  borderRadius: 'var(--r-lg)',
  border: '1px solid var(--line)',
  padding: '16px',
  flexDirection: 'column',
}) as unknown as typeof Box;

export const Field = styled(Box)({
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
}) as unknown as typeof Box;
