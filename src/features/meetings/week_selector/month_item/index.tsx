import { Box, Collapse } from '@mui/material';
import { IconCheck, IconCollapse } from '@components/icons';
import { MonthItemType } from './index.types';
import useMonthItem from './useMonthItem';
import Typography from '@components/typography';
import WeekItem from '../week_item';

const MonthItem = (props: MonthItemType) => {
  const { weeks } = props;

  const { monthName, expanded, handleToggleExpand, assignComplete } =
    useMonthItem(props);

  return (
    <Box>
      {/* La fila del mes despliega sus semanas, y ahora también con el
          teclado: era un `Box` con `onClick`, así que los doce meses del año
          quedaban fuera del tabulador. Aquí sí puede ser el botón entero
          —dentro no hay más que el nombre, la marca de completo y el
          chevrón—, sin necesidad de la capa que cubre. */}
      <Box
        component="button"
        type="button"
        aria-expanded={expanded}
        sx={{
          width: '100%',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          appearance: 'none',
          background: 'none',
          border: 'none',
          textAlign: 'left',
          '&:focus-visible': {
            outline: '2px solid var(--accent-main)',
            outlineOffset: '-2px',
            borderRadius: 'var(--shape-xs)',
          },
        }}
        onClick={handleToggleExpand}
      >
        <Typography className="h4">{monthName}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {assignComplete && (
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
          )}

          <IconCollapse
            color="var(--black)"
            sx={{
              transform: expanded ? 'rotate(0deg)' : 'rotate(180deg)',
              transition: 'transform 0.3s',
            }}
          />
        </Box>
      </Box>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        {weeks.map((week) => (
          <WeekItem key={week} week={week} />
        ))}
      </Collapse>
    </Box>
  );
};

export default MonthItem;
