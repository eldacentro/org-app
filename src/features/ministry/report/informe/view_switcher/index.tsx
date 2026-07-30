import { MouseEvent, useState } from 'react';
import { Box, Menu, MenuItem } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import {
  IconArrowDown,
  IconCalendarClock,
  IconCalendarMonth,
  IconStatsYear,
} from '@components/icons';
import Typography from '@components/typography';
import { InformeViewId, ViewSwitcherProps } from './index.types';

/**
 * Selector Día / Mes / Año — mismo patrón que ya usa "Programas semanales"
 * (una caja clicable con el icono+nombre de la vista activa, que abre un
 * Menu con las demás opciones) en vez de unas Tabs normales: estas tres
 * vistas son estructuralmente distintas (un registro editable, un
 * calendario, un panel de estadísticas), no pestañas equivalentes entre sí.
 */
const VIEWS: { id: InformeViewId; labelKey: string; fallback: string }[] = [
  { id: 'day', labelKey: 'tr_day', fallback: 'Día' },
  { id: 'month', labelKey: 'tr_month', fallback: 'Mes' },
  { id: 'year', labelKey: 'tr_year', fallback: 'Año' },
];

const getViewIcon = (id: InformeViewId, color = 'var(--accent-main)') => {
  switch (id) {
    case 'day':
      return <IconCalendarClock color={color} width={22} height={22} />;
    case 'month':
      return <IconCalendarMonth color={color} width={22} height={22} />;
    case 'year':
      return <IconStatsYear color={color} width={22} height={22} />;
  }
};

const ViewSwitcher = ({ value, onChange }: ViewSwitcherProps) => {
  const { t } = useAppTranslation();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);

  const handleOpenMenu = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => setAnchorEl(null);

  const handleSelect = (id: InformeViewId) => {
    handleCloseMenu();
    onChange(id);
  };

  const activeView = VIEWS.find((v) => v.id === value) ?? VIEWS[0];

  return (
    <Box>
      <Box
        component="button"
        type="button"
        aria-haspopup="listbox"
        className="active-press"
        onClick={handleOpenMenu}
        sx={{
          appearance: 'none',
          font: 'inherit',
          color: 'inherit',
          textAlign: 'left',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderRadius: 'var(--shape-lg)',
          border: '1px solid var(--line)',
          backgroundColor: 'var(--card)',
          cursor: 'pointer',
          userSelect: 'none',
          boxShadow: 'var(--shadow-sm)',
          transition:
            'transform var(--motion-fast) var(--ease-standard), box-shadow var(--motion-medium) var(--ease-standard)',
          '&:hover': {
            boxShadow: 'var(--shadow-md)',
          },
          '&:focus-visible': {
            outline: '2px solid var(--accent-main)',
            outlineOffset: '2px',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {getViewIcon(activeView.id, 'var(--ink)')}
          <Typography
            className="h3"
            sx={{
              fontWeight: 700,
              color: 'var(--ink)',
              letterSpacing: '-0.01em',
              fontSize: '17px',
            }}
          >
            {t(activeView.labelKey, activeView.fallback)}
          </Typography>
        </Box>
        <IconArrowDown
          color="var(--ink-3)"
          sx={{
            transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: openMenu ? 'rotate(180deg)' : 'none',
          }}
        />
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={openMenu}
        onClose={handleCloseMenu}
        sx={{
          marginTop: '6px',
          '& .MuiPaper-root': {
            borderRadius: 'var(--shape-lg)',
            border: '1px solid var(--line)',
            boxShadow: 'var(--shadow-md)',
            backgroundColor: 'var(--card)',
            minWidth: '220px',
          },
          '& li': {
            padding: '14px 18px',
            margin: '6px 8px',
            borderRadius: 'var(--shape-md)',
            transition: 'all 0.15s ease',
            color: 'var(--ink-2)',
            '&:hover': {
              backgroundColor: 'rgba(var(--black-base), 0.04)',
              color: 'var(--ink)',
            },
            '&.Mui-selected': {
              backgroundColor: 'var(--brand-tint)',
              color: 'var(--brand-deep)',
              fontWeight: 700,
              '&:hover': {
                backgroundColor: 'var(--brand-tint)',
              },
            },
          },
        }}
      >
        {VIEWS.map((view) => (
          <MenuItem
            key={view.id}
            selected={view.id === value}
            onClick={() => handleSelect(view.id)}
            sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}
          >
            {getViewIcon(
              view.id,
              view.id === value ? 'var(--accent-dark)' : 'var(--grey-400)'
            )}
            <Typography sx={{ fontWeight: view.id === value ? 600 : 400 }}>
              {t(view.labelKey, view.fallback)}
            </Typography>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default ViewSwitcher;
