import { SvgIcon, SxProps, Theme } from '@mui/material';

type IconProps = {
  color?: string;
  width?: number;
  height?: number;
  sx?: SxProps<Theme>;
  className?: string;
};

const IconRecordVoiceOver = ({
  color = '#222222',
  width = 24,
  height = 24,
  sx = {},
  className,
}: IconProps) => {
  return (
    <SvgIcon
      className={`organized-icon-record-voice-over ${className}`}
      sx={{
        width: `${width}px`,
        height: `${height}px`,
        ...sx,
      }}
      viewBox="0 0 24 24"
    >
      <path
        d="M9 13c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0-6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 8c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4zm-6 4c.22-.72 3.31-2 6-2 2.7 0 5.8 1.29 6 2H3zm12.08-11.95c.84 1.18.84 2.71 0 3.89l1.68 1.69c1.74-1.8 1.74-4.47 0-6.27l-1.68 1.69zm3.37-3.36l-1.69 1.69c3.27 3.12 3.27 8.1 0 11.22l1.69 1.69c4.21-4.14 4.21-10.47 0-14.6z"
        fill={color}
      />
    </SvgIcon>
  );
};

export default IconRecordVoiceOver;
