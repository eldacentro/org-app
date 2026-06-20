import { FC } from 'react';
import { IconButtonProps, IconButton as MUIIconButton } from '@mui/material';

interface CustomIconButtonProps extends IconButtonProps {
  disableHover?: boolean;
}

/**
 * Component representing a custom icon button.
 *
 * @param {CustomIconButtonProps} props - Props for the CustomIconButton component.
 * @returns {JSX.Element} CustomIconButton component.
 */
const IconButton: FC<CustomIconButtonProps> = (props) => {
  const { children, disableHover, ...rest } = props;

  const getBackgroundColor = () => {
    switch (props.color) {
      case 'error':
        return 'var(--red-secondary)';

      default:
        return 'var(--accent-200)';
    }
  };

  return (
    <MUIIconButton
      color="inherit"
      edge="start"
      disableRipple
      sx={{
        padding: '8px',
        borderRadius: 'var(--radius-l)',
        transition: 'transform 100ms ease, background-color 150ms ease',

        ...(disableHover
          ? {
              '&:hover': {
                backgroundColor: 'transparent',
              },
            }
          : {
              '&:hover': {
                backgroundColor: getBackgroundColor(),
              },
              '&:active': {
                backgroundColor: getBackgroundColor(),
                transform: 'scale(0.92)',
              },
            }),

        '@media (hover: none)': {
          '&:hover': {
            backgroundColor: 'transparent',
          },
        },

        '&:focus-visible': {
          outline: 'var(--accent-main) auto 1px',
        },

        ...props.sx,
      }}
      {...rest}
    >
      {children}
    </MUIIconButton>
  );
};

export default IconButton;
