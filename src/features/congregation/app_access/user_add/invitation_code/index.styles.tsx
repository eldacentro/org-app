import { IconButton, styled } from '@mui/material';

export const StyledIconButton = styled(IconButton)({
  borderRadius: 'var(--shape-full)',
  '&:hover': {
    backgroundColor: 'var(--accent-150)',
  },
}) as unknown as typeof IconButton;
