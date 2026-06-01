import { Box, styled } from '@mui/material';

export const ProfileItemContainer = styled(Box)({
  borderRadius: 'var(--r-lg)',
  border: '1px solid var(--line)',
  padding: '16px',
  display: 'flex',
  gap: '16px',
  flexDirection: 'column',
  backgroundColor: 'var(--card)',
}) as unknown as typeof Box;

export const SettingWithBorderContainer = styled(Box)({
  marginTop: '8px',
  display: 'flex',
  gap: '16px',
  flexDirection: 'column',
  '& > *:not(:last-child)': {
    borderBottom: '1px solid var(--line)',
    paddingBottom: '16px',
  },
}) as unknown as typeof Box;
