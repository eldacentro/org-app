import { ReactNode } from 'react';
import { Box, Stack } from '@mui/material';
import Typography from '@components/typography';

const Card = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) => (
  <Box
    sx={{
      backgroundColor: 'var(--card)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-l)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
      padding: '18px 20px',
    }}
  >
    <Stack spacing="2px" mb="14px">
      <Typography className="h3" color="var(--ink, var(--black))">
        {title}
      </Typography>
      {subtitle && (
        <Typography className="body-small-regular" color="var(--grey-400)">
          {subtitle}
        </Typography>
      )}
    </Stack>
    {children}
  </Box>
);

export default Card;
