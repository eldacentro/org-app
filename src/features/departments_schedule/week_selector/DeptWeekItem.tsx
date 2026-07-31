import { Box } from '@mui/material';
import { useAtom } from 'jotai';
import { selectedDeptWeekState } from '@states/departments_schedule';
import Typography from '@components/typography';
import Badge from '@components/badge';
import { useAppTranslation } from '@hooks/index';

const DeptWeekItem = ({
  weekOf,
  label,
  noMeeting,
  onWeekSelect,
}: {
  weekOf: string;
  label: string;
  noMeeting?: boolean;
  onWeekSelect?: () => void;
}) => {
  const { t } = useAppTranslation();
  const [selectedWeek, setSelectedWeek] = useAtom(selectedDeptWeekState);
  const isSelected = selectedWeek === weekOf;

  // Botón de verdad, como su gemela del otro selector. Elegir semana es LA
  // acción de este panel y era un `Box` con `onClick`: solo con el ratón. No
  // lo cazó el barrido de teclado porque estas filas viven dentro de un
  // `Collapse` y solo existen con el mes desplegado — lo que no está pintado
  // no se puede medir. `aria-current` dice cuál está elegida sin depender del
  // color.
  return (
    <Box
      component="button"
      type="button"
      aria-current={isSelected ? 'true' : undefined}
      sx={{
        width: '100%',
        appearance: 'none',
        border: 'none',
        font: 'inherit',
        textAlign: 'left',
        '&:focus-visible': {
          outline: '2px solid var(--accent-main)',
          outlineOffset: '-2px',
        },
        cursor: 'pointer',
        padding: '8px 8px 8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: '1px solid var(--line)',
        backgroundColor: isSelected ? 'var(--accent-150)' : 'unset',
        '.MuiTypography-root': {
          color: isSelected ? 'var(--accent-dark)' : 'var(--black)',
        },
        '&:hover': {
          backgroundColor: 'var(--accent-150)',
          '.MuiTypography-root': {
            color: 'var(--accent-dark)',
          },
        },
      }}
      onClick={() => {
        setSelectedWeek(weekOf);
        onWeekSelect?.();
      }}
    >
      {/* 'body-semibold' no existía en el sistema tipográfico (sin definición
          CSS) — la semana seleccionada se veía con el mismo peso que el
          resto, sin ningún énfasis visual. */}
      <Typography
        className={isSelected ? 'body-regular-semibold' : 'body-regular'}
      >
        {label}
      </Typography>
      {noMeeting && (
        <Badge
          text={t('tr_noMeetingWeek')}
          color="grey"
          size="small"
          filled={false}
        />
      )}
    </Box>
  );
};

export default DeptWeekItem;
