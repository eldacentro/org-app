import { Box } from '@mui/material';
import { CustomClassName } from '@definition/app';
import CountBadge from '@components/count_badge';
import Typography from '@components/typography';

const TabLabelWithBadge = ({
  label,
  count,
  className = 'body-regular',
  badgeColor,
  color,
}: {
  label: string;
  count: number;
  className?: CustomClassName;
  badgeColor?: string;
  color?: string;
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transform: count === 0 && 'translateX(12px)',
        transition: 'transform 0.2s',
        userSelect: 'none',
      }}
    >
      <Typography
        className={className}
        sx={{
          color: color ?? 'unset',
          fontWeight: '500 !important',
        }}
      >
        {label}
      </Typography>
      <CountBadge value={count} color={badgeColor} />
    </Box>
  );
};

export default TabLabelWithBadge;
