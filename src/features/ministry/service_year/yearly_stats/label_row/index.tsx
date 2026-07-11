import { Box } from '@mui/material';
import { LabelRowProps } from './index.types';
import Typography from '@components/typography';

const LabelRow = ({
  name,
  value,
  hint,
  className = 'body-regular',
  color = 'var(--black)',
  sx,
}: LabelRowProps) => {
  const valueClassName = className === 'body-regular' ? 'h4' : className;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        justifyContent: 'space-between',
        ...sx,
      }}
    >
      <Box>
        <Typography className={className} color={color}>
          {name}
        </Typography>
        {hint && (
          <Typography className="label-small-regular" color="var(--grey-350)">
            {hint}
          </Typography>
        )}
      </Box>
      <Typography className={valueClassName} color={color}>
        {value}
      </Typography>
    </Box>
  );
};

export default LabelRow;
