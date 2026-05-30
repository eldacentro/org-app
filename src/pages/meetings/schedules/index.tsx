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
        return <IconClock color={color} width={22} height={22} />;
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
        gap: '16px',
        flexDirection: 'column',
        paddingBottom: !tablet688Up ? '60px' : '0px',
      }}
    >
      <PageTitle title={t('tr_viewAssignmentsSchedule', 'Programas semanales')} />

      {/* Selector desplegable con efecto WOW */}
      <Box
        onClick={handleOpenMenu}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          borderRadius: 'var(--radius-xl)',
          border: '1.5px solid var(--accent-300)',
          backgroundColor: 'var(--white)',
          cursor: 'pointer',
          userSelect: 'none',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            borderColor: 'var(--accent-main)',
            boxShadow: '0 4px 16px color-mix(in srgb, var(--accent-main) 12%, transparent)',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {getProgramIcon(tabs[value]?.id, 'var(--accent-main)')}
          <Typography className="h3" sx={{ fontWeight: 600, color: 'var(--black)' }}>
            {tabs[value]?.label}
          </Typography>
        </Box>
        <IconArrowDown
          color="var(--grey-400)"
          style={{
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--accent-200)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
            backgroundColor: 'var(--white)',
            minWidth: '280px',
          },
          '& li': {
            padding: '12px 16px',
            margin: '4px 8px',
            borderRadius: 'var(--radius-l)',
            transition: 'all 0.2s ease',
            borderBottom: 'none',
            '&:hover': {
              backgroundColor: 'var(--accent-150)',
              color: 'var(--accent-dark)',
            },
            '&.Mui-selected': {
              backgroundColor: 'var(--accent-200)',
              color: 'var(--accent-dark)',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: 'var(--accent-200)',
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
