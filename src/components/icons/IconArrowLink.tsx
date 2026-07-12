import { SvgIcon, SxProps, Theme, useTheme } from '@mui/material';

type IconProps = {
  color?: string;
  width?: number;
  height?: number;
  sx?: SxProps<Theme>;
  className?: string;
};

const IconArrowLink = ({
  color = '#222222',
  width = 24,
  height = 24,
  sx = {},
  className,
}: IconProps) => {
  const theme = useTheme();
  return (
    <SvgIcon
      className={`organized-icon-arrow-link ${className}`}
      sx={{
        width: `${width}px`,
        height: `${height}px`,
        transform: theme.direction === 'rtl' ? 'scaleX(-1)' : 'none',
        ...sx,
      }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Sin <mask>: el rect original era opaco y cubría exactamente el
            viewBox (no recortaba nada), y su id fijo se duplicaba cada vez
            que este icono se repetía en una misma página (p. ej. varios
            botones "Llévame allí" en Ayuda) — con id repetido, url(#id)
            puede no resolver en las copias siguientes y la flecha
            desaparece en algunas de ellas. */}
        <path
          d="M6.2942 17.6447L5.25 16.6005L15.0904 6.75044H6.14422V5.25049H17.6442V16.7504H16.1442V7.80426L6.2942 17.6447Z"
          fill={color}
        />
      </svg>
    </SvgIcon>
  );
};

export default IconArrowLink;
