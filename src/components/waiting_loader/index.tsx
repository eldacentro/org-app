import { Box, SxProps, Theme } from '@mui/material';
import IconLoading from '@components/icon_loading';
import { VariantProps } from './index.types';
import LottieLoader from '@components/lottie_loader';

/**
 * Circular loading indicator component.
 * @param variant The variant of the loading indicator.
 * @param size (width and height)
 */
const WaitingLoader = ({
  variant = 'fixed',
  size,
  type = 'circular',
  message,
}: VariantProps) => {
  let sx: SxProps<Theme> = {};

  // `fixed` coloca el indicador con `top: 50%`, o sea el BORDE DE ARRIBA a
  // media pantalla: queda por debajo del centro. Para la ruedecita pequeña da
  // igual, pero la pantalla de arranque tiene que caer exactamente donde la
  // dibuja `index.html` antes de que React monte, o al montar el logotipo da
  // un salto hacia abajo que parece un fallo.
  if (variant === 'fixed' && type !== 'lottie') {
    sx = {
      position: 'absolute',
      top: '50%',
      margin: 'auto',
    };
  }

  return (
    <Box
      sx={{
        display: 'flex',
        height: type === 'lottie' ? '100dvh' : '100%',
        width: '100%',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box sx={sx}>
        {type === 'lottie' && (
          <LottieLoader size={size} message={message} slowWarning />
        )}

        {type === 'circular' && (
          <IconLoading width={size} height={size} color="var(--accent-dark)" />
        )}
      </Box>
    </Box>
  );
};

export default WaitingLoader;
