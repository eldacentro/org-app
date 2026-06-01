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
        className="pop-up-shadow"
        sx={{
          backgroundColor: 'var(--paper)',
          height: '100%',
          width: laptopUp ? '600px' : '100%',
          margin: laptopUp ? '10px' : 'unset',
          borderRadius: laptopUp ? 'var(--r-lg)' : 'unset',
          border: laptopUp ? '1px solid var(--line)' : 'unset',
          padding: '20px 16px',
          overflow: 'hidden',
          '&::-webkit-scrollbar': { width: '8px' },
        }}
        role="presentation"
      >
        <Stack
          direction={'row'}
          justifyContent={'space-between'}
          alignItems={'center'}
          mb={'20px'}
          ml={'4px'}
        >
          <Typography className="h1" sx={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink)' }}>{title}</Typography>
          <Stack direction={'row'} spacing={0.5}>
            {headActions}
            <ButtonIcon onClick={handleClose} sx={{ border: '1px solid var(--line)', borderRadius: 'var(--r-sm)' }}>
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
