import { Box, Collapse } from '@mui/material';
import { IconCheck } from '@components/icons';
import { MonthItemType } from './index.types';
import useMonthItem from './useMonthItem';
import MonthRow from '@components/period_selector/MonthRow';
import WeekItem from '../week_item';

const MonthItem = (props: MonthItemType) => {
  const { weeks } = props;

  const { monthName, expanded, handleToggleExpand, assignComplete } =
    useMonthItem(props);

  return (
    <Box>
      {/* La fila compartida de los tres selectores de semana de la app. Antes
          este pintaba el mes con la clase `h4` y el año pegado, y los otros dos
          de otras dos maneras. */}
      <MonthRow
        label={monthName}
        expanded={expanded}
        onToggle={handleToggleExpand}
        trailing={
          assignComplete && (
            <Box
              sx={{
                borderRadius: 'var(--shape-full)',
                width: '18.4px',
                height: '18.4px',
                padding: '2px',
                backgroundColor: 'var(--accent-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconCheck color="var(--card)" height={14.4} width={14.4} />
            </Box>
          )
        }
      />

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box
          sx={{
            pb: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {weeks.map((week) => (
            <WeekItem key={week} week={week} />
          ))}
        </Box>
      </Collapse>
    </Box>
  );
};

export default MonthItem;
