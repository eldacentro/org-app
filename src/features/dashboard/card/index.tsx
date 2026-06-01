import { ReactNode } from 'react';
import { Box, List, SxProps, Theme } from '@mui/material';
import useCurrentUser from '@hooks/useCurrentUser';
import Typography from '@components/typography';

const DashboardCard = ({
  header,
  children,
  fixedHeight = true,
  color,
  sx,
  icon,
}: {
  header: string | ReactNode;
  children?: ReactNode;
  fixedHeight?: boolean;
  color?: string;
  sx?: SxProps<Theme>;
  icon?: ReactNode;
}) => {
  const { isGroup } = useCurrentUser();

  return (
    <Box
      sx={{
        display: 'flex',
        height: {
          mobile: 'auto',
          tablet688: fixedHeight ? '336px' : 'fit-content',
        },
        minWidth: '300px',
        width: '100%',
        flexDirection: 'column',
        borderRadius: 'var(--r-lg)',
        border: color
          ? `1px solid ${color}`
          : `1px solid ${isGroup ? 'var(--red-secondary)' : 'var(--line)'}`,
        background: 'var(--card)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
        overflow: 'hidden',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          transform: 'translateY(-2px)',
        },
        ...sx,
      }}
    >
      {typeof header === 'string' ? (
        <Box
          sx={{
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: color || (isGroup ? 'var(--red-main)' : 'var(--accent-main)'),
          }}
        >
          <Typography
            className="h2-caps"
            color="var(--always-white)"
          >
            {header}
          </Typography>
        </Box>
      ) : (
        header
      )}
      <Box sx={{ width: '100%', overflow: 'auto', padding: '12px', flex: 1 }}>
        <List sx={{ paddingTop: 0, paddingBottom: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {children}
        </List>
      </Box>
    </Box>
  );
};

export default DashboardCard;
