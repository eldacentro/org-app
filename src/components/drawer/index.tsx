import { FC, ReactNode } from 'react';
import {
  Box,
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

  /**
   * Set when the content already manages its own scroll area (e.g. a fixed
   * header/tabs above a scrollable list). Without this, that inner scrollable
   * box and this wrapper's own auto-scroll fight over the same touch
   * gesture, which is what made some drawers feel like the page behind them
   * was scrolling. Most consumers don't need this — leave it unset and let
   * the wrapper scroll the whole content, same as before.
   */
  disableContentScroll?: boolean;
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
  disableContentScroll,
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
            height: props.anchor === 'bottom' ? 'auto' : '100%',
            maxHeight: props.anchor === 'bottom' ? '90vh' : 'unset',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      {props.anchor !== 'bottom' && <Toolbar sx={{ padding: 0 }} />}
      <Stack
        className="drawer-glass-panel"
        sx={{
          flex: props.anchor === 'bottom' ? 'none' : 1,
          height: props.anchor === 'bottom' ? 'auto' : 'unset',
          width: laptopUp ? '600px' : '100%',
          margin: laptopUp ? '10px' : 'unset',
          borderRadius: laptopUp
            ? 'var(--r-lg)'
            : props.anchor === 'bottom'
            ? 'var(--r-lg) var(--r-lg) 0 0'
            : 'unset',
          border: laptopUp
            ? '1px solid rgba(255,255,255,0.18)'
            : props.anchor === 'bottom'
            ? '1px solid rgba(255,255,255,0.18)'
            : 'unset',
          borderBottom: 'none',
          padding: '20px 16px',
          overflow: 'hidden',
          '&::-webkit-scrollbar': { width: '8px' },
        }}
        role="presentation"
      >
        {/* Puller indicator for bottom sheet */}
        {props.anchor === 'bottom' && !laptopUp && (
          <Box
            sx={{
              width: '40px',
              height: '4px',
              backgroundColor: 'var(--grey-300)',
              borderRadius: 'var(--radius-xs)',
              alignSelf: 'center',
              mb: '16px',
              mt: '-8px',
            }}
          />
        )}
        
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

        {/* Scrolls by default so simple content just works. Consumers that
            manage their own scroll area (fixed header/tabs + scrollable
            list) pass disableContentScroll to avoid two nested `overflow:
            auto` boxes fighting over the same touch gesture — that's what
            made those drawers feel like the page behind them was scrolling. */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: disableContentScroll ? 'hidden' : 'auto',
            overscrollBehavior: 'contain',
            display: 'flex',
            flexDirection: 'column',
            // Un input outlined con label flotante (ej. los Select de
            // filtros) necesita asomar unos px por ENCIMA de su propia caja
            // — comportamiento normal de MUI. Sin este margen, cuando ese
            // input es lo primero dentro de un drawer con scroll propio
            // (disableContentScroll), ese borde superior recorta el label.
            pt: '10px',
            mt: '-10px',
            pb: 'env(safe-area-inset-bottom, 20px)',
          }}
        >
          {children}
        </Box>
      </Stack>
    </MUIDrawer>
  );
};

export default Drawer;

