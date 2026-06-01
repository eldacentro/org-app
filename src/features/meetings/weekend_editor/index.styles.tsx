import { styled } from '@mui/system';
import { Box } from '@mui/material';

export const EditorContainer = styled(Box)({
  borderRadius: 'var(--r-lg)',
  padding: '16px',
  backgroundColor: 'var(--card)',
  border: '1px solid var(--line)',
  flexGrow: 1,
}) as unknown as typeof Box;
