import FollowTheSignsIcon from '@mui/icons-material/FollowTheSigns';
import { SxProps, Theme } from '@mui/material';

type IconProps = {
  color?: string;
  width?: number;
  height?: number;
  sx?: SxProps<Theme>;
  className?: string;
};

const IconOutgoindSpeaker = ({
  color = '#222222',
  width = 24,
  height = 24,
  sx = {},
  className,
}: IconProps) => {
  return (
    <FollowTheSignsIcon
      className={`organized-icon-outgoind-speaker ${className}`}
      sx={{
        width: `${width}px`,
        height: `${height}px`,
        color: color,
        ...sx,
      }}
    />
  );
};

export default IconOutgoindSpeaker;
