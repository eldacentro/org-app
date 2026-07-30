import { FC } from 'react';
import { styled } from '@mui/system';
import { Box, BoxProps } from '@mui/material';

export const GroupContainer: FC<BoxProps> = styled(Box)({
  padding: '0px',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: 'var(--card)',
  borderRadius: 'var(--shape-lg)',
  border: '1px solid var(--line)',
  overflow: 'hidden',
});
