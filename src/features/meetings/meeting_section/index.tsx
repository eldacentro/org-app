import { PropsWithChildren } from 'react';
import { Box, Collapse } from '@mui/material';
import { MeetingSectionType } from './index.types';
import { IconExpand } from '@components/icons';
import Typography from '@components/typography';

const MeetingSection = ({
  color,
  icon,
  part,
  expanded,
  onToggle,
  children,
  alwaysExpanded,
}: MeetingSectionType & PropsWithChildren) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--card)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius-l)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        overflow: 'hidden',
        transition: 'box-shadow 0.3s ease',
        '&:hover': {
          boxShadow: onToggle ? '0 4px 16px rgba(0,0,0,0.06)' : '0 2px 10px rgba(0,0,0,0.03)',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: color,
          padding: '10px 16px',
          cursor: onToggle ? 'pointer' : 'default',
        }}
        onClick={onToggle}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flex: 1,
          }}
        >
          {icon}
          <Typography
            className="h2-caps"
            sx={{
              fontWeight: 700,
              letterSpacing: '0.5px',
              color: 'var(--always-white)',
            }}
          >
            {part}
          </Typography>
        </Box>
        {!alwaysExpanded && (
          <IconExpand
            color="var(--always-white)"
            sx={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s',
            }}
          />
        )}
      </Box>
      <Collapse in={alwaysExpanded || expanded} timeout="auto" unmountOnExit>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
          {children}
        </Box>
      </Collapse>
    </Box>
  );
};

export default MeetingSection;
