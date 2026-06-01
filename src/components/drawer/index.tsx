import { FC, ReactNode } from 'react';
import {
  Drawer as MUIDrawer,
  DrawerProps,
  Stack,
  Toolbar,
} from '@mui/material';
import { IconClose } from '@icons/index';
import { useBreakpoints } from '@hooks/index';
import Typography from '@components/typography';
import ButtonIcon from '@components/icon_button';

/**
 * Props for the CustomDrawer component.
 */
interface CustomDrawerProps {
  /**
   * The title of the drawer.
   */
  title: string;

  /**
   * Additional actions to be displayed in the header.
   */
  headActions?: ReactNode;

  /**
   * Function to handle the close event of the drawer.
   */
  onClose: () => void;
}

/**
 * Custom drawer component.
 *
 * @param {CustomDrawerProps & DrawerProps} props - Props for the CustomDrawer component.
 * @returns {JSX.Element} Custom drawer component.
 */
const Drawer: FC<DrawerProps & CustomDrawerProps> = ({
  title,
  headActions,
  onClose,
  children,
  ...props
}) => {
  const { laptopUp } = useBreakpoints();

  const handleClose = () => {
    onClose();
  };

  return (
    <MUIDrawer
      {...props}
      onClose={handleClose}
      slotProps={{
        paper: {
          sx: {
            backgroundColor: 'unset',
            boxShadow: 'unset',
            overflowY: 'unset',
            width: laptopUp ? 'unset' : '100%',
          },
        },
      }}
    >
      <Toolbar sx={{ padding: 0 }} />
      <Stack
        className="drawer-glass-panel"
        sx={{
          height: '100%',
          width: laptopUp ? '600px' : '100%',
          margin: laptopUp ? '10px' : 'unset',
          borderRadius: laptopUp ? 'var(--r-lg)' : 'unset',
          border: laptopUp
            ? '1px solid rgba(255,255,255,0.18)'
            : 'unset',
          padding: '20px 16px',
          overflow: 'hidden',
          '&::-webkit-scrollbar': { width: '8px' },
        }}
        role="presentation"
      >
        {/* Header */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{
            mb: '16px',
            ml: '4px',
            pb: '14px',
            borderBottom: '1px solid rgba(127,127,160,0.12)',
          }}
        >
          <Typography
            className="h1"
            sx={{ fontSize: '22px', fontWeight: 800, color: 'var(--ink)' }}
          >
            {title}
          </Typography>
          <Stack direction="row" spacing={0.5} alignItems="center">
            {headActions}
            <ButtonIcon
              onClick={handleClose}
              sx={{
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-sm)',
                transition: 'background 0.15s ease, transform 0.15s ease',
                '&:hover': {
                  backgroundColor: 'rgba(127,127,160,0.10)',
                  transform: 'rotate(90deg)',
                },
              }}
            >
              <IconClose color="var(--ink)" />
            </ButtonIcon>
          </Stack>
        </Stack>

        {children}
      </Stack>
    </MUIDrawer>
  );
};

export default Drawer;

