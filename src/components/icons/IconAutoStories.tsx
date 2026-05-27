import { SvgIcon, SxProps, Theme } from '@mui/material';

type IconProps = {
  color?: string;
  width?: number;
  height?: number;
  sx?: SxProps<Theme>;
  className?: string;
};

const IconAutoStories = ({
  color = '#222222',
  width = 24,
  height = 24,
  sx = {},
  className,
}: IconProps) => {
  return (
    <SvgIcon
      className={`organized-icon-auto-stories ${className}`}
      sx={{ width: `${width}px`, height: `${height}px`, ...sx }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <mask
          id="mask_auto_stories"
          style={{ maskType: 'alpha' }}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="24"
          height="24"
        >
          <rect width="24" height="24" fill="#D9D9D9" />
        </mask>
        <g mask="url(#mask_auto_stories)">
          <path
            d="M12 21.05q-1.35-.85-2.85-1.275T6 19.35q-1.1 0-2.125.225T2 20.2V5.3q1.025-.475 2.1-.713T6.25 4.35q1.6 0 3.1.425t2.65 1.275q1.15-.85 2.65-1.275T17.75 4.35q1.075 0 2.15.238t2.1.712V20.2q-.975-.45-2-.675t-2.1-.225q-1.65 0-3.15.425T12 21.05Zm0-2.15q1.1-.75 2.375-1.15T17 17.35q.85 0 1.675.138T20.35 17.9V6.65q-.8-.35-1.625-.5T17 6q-1.35 0-2.625.413T12 7.65q-1.125-.825-2.4-1.238T7 6q-.825 0-1.65.15T3.7 6.65V17.9q.85-.4 1.675-.55T7 17.2q1.45 0 2.725.4t2.275 1.3Zm0-11.25Zm0 8.45Z"
            fill={color}
          />
        </g>
      </svg>
    </SvgIcon>
  );
};

export default IconAutoStories;
