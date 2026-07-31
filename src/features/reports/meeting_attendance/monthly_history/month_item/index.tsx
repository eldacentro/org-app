import { Box, Collapse, Stack } from '@mui/material';
import { IconCollapse } from '@components/icons';
import { useBreakpoints } from '@hooks/index';
import { MonthItemProps } from './index.types';
import useMonthItem from './useMonthItem';
import Divider from '@components/divider';
import MeetingContainer from '../meeting_container';
import Typography from '@components/typography';

const MonthItem = ({ data }: MonthItemProps) => {
  const { tablet600Up } = useBreakpoints();

  const { expanded, handleToggleExpanded, meetings } = useMonthItem(data.value);

  return (
    <Stack spacing="16px">
      <Box
        component="button"
        type="button"
        aria-expanded={expanded}
        onClick={handleToggleExpanded}
        sx={{
          appearance: 'none',
          font: 'inherit',
          color: 'inherit',
          textAlign: 'left',
          border: 'none',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 8px',
          borderRadius: 'var(--shape-xs)',
          backgroundColor: 'var(--accent-150)',
          cursor: 'pointer',
          userSelect: 'none',
          '&:focus-visible': {
            outline: '2px solid var(--accent-main)',
            outlineOffset: '2px',
          },
        }}
      >
        <Typography className="h4" color="var(--accent-dark)">
          {data.label}
        </Typography>
        <IconCollapse
          color="var(--accent-dark)"
          sx={{
            transform: expanded ? 'rotate(0deg)' : 'rotate(180deg)',
            transition: 'transform var(--motion-medium) var(--ease-standard)',
          }}
        />
      </Box>

      <Collapse in={expanded} unmountOnExit>
        <Stack
          spacing={tablet600Up ? '24px' : '16px'}
          direction={tablet600Up ? 'row' : 'column'}
          divider={
            <Divider
              color="var(--accent-150)"
              orientation="vertical"
              flexItem
            />
          }
        >
          {meetings.map((meeting) => (
            <MeetingContainer
              key={meeting}
              meeting={meeting}
              month={data.value}
            />
          ))}
        </Stack>
      </Collapse>
    </Stack>
  );
};

export default MonthItem;
