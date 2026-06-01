import { useState, MouseEvent } from 'react';
import { Box, Menu, MenuItem, Typography } from '@mui/material';
import { useAppTranslation, useBreakpoints } from '@hooks/index';
import useWeeklySchedules from './useWeeklySchedules';
import PageTitle from '@components/page_title';
import {
  IconClock,
  IconPodium,
  IconVisitingSpeaker,
  IconDuties,
  IconInTerritory,
  IconCart,
  IconArrowDown,
  IconTreasuresPart,
} from '@components/icons';

const WeeklySchedules = () => {
  const { t } = useAppTranslation();
  const { tablet688Up } = useBreakpoints();

  const { value, handleScheduleChange, tabs } = useWeeklySchedules();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);

  const handleOpenMenu = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleSelectTab = (index: number) => {
    handleCloseMenu();
    handleScheduleChange(index);
  };

  const getProgramIcon = (id: string, color = 'var(--accent-main)') => {
    switch (id) {
      case 'midweek':
        return <IconTreasuresPart color={color} width={22} height={22} />;
      case 'weekend':
        return <IconPodium color={color} width={22} height={22} />;
      case 'outgoing':
        return <IconVisitingSpeaker color={color} width={22} height={22} />;
      case 'departments':
        return <IconDuties color={color} width={22} height={22} />;
      case 'service_outings':
        return <IconInTerritory color={color} width={22} height={22} />;
      case 'exhibitors':
        return <IconCart color={color} width={22} height={22} />;
      default:
        return <IconClock color={color} width={22} height={22} />;
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        gap: '22px',
        flexDirection: 'column',
        paddingBottom: !tablet688Up ? '60px' : '0px',
      }}
    >
      <PageTitle title={t('tr_viewAssignmentsSchedule', 'Programas semanales')} />

      {/* Selector desplegable con efecto WOW */}
      <Box
        className="active-press"
        onClick={handleOpenMenu}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderRadius: 'var(--r-md)',
          border: '1px solid var(--line)',
          backgroundColor: 'var(--card)',
          cursor: 'pointer',
          userSelect: 'none',
          boxShadow: 'var(--shadow-sm)',
          transition: 'transform 0.14s, box-shadow 0.2s',
          '&:hover': {
            boxShadow: 'var(--shadow-md)',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {getProgramIcon(tabs[value]?.id, 'var(--ink)')}
          <Typography className="h3" sx={{ fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em', fontSize: '18px' }}>
            {tabs[value]?.label}
          </Typography>
        </Box>
        <IconArrowDown
          color="var(--ink-3)"
          style={{
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
            borderRadius: 'var(--r-md)',
            border: '1px solid var(--line)',
            boxShadow: 'var(--shadow-md)',
            backgroundColor: 'var(--card)',
            minWidth: '280px',
          },
          '& li': {
            padding: '14px 18px',
            margin: '6px 8px',
            borderRadius: 'var(--r-sm)',
            transition: 'all 0.15s ease',
            borderBottom: 'none',
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
        {tabs.map((tab, index) => (
          <MenuItem
            key={tab.id}
            selected={index === value}
            onClick={() => handleSelectTab(index)}
            sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}
          >
            {getProgramIcon(tab.id, index === value ? 'var(--accent-dark)' : 'var(--grey-400)')}
            <Typography sx={{ fontWeight: index === value ? 600 : 400 }}>
              {tab.label}
            </Typography>
          </MenuItem>
        ))}
      </Menu>

      {/* Renders selected program weekly view container */}
      <Box sx={{ marginTop: '4px' }}>
        {tabs[value]?.Component}
      </Box>
    </Box>
  );
};

export default WeeklySchedules;
