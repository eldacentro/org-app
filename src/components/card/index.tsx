import { styled } from '@mui/system';
import { Box } from '@mui/material';

const Card = styled(Box)({
  border: '1px solid var(--accent-300)',
  borderRadius: 'var(--shape-lg)',
  backgroundColor: 'var(--white)',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
}) as unknown as typeof Box;

export default Card;
