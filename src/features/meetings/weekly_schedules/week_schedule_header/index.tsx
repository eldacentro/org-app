import { Box } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import { useAtomValue } from 'jotai';
import { IconDate } from '@components/icons';
import { WeekScheduleHeaderProps } from './index.types';
import useWeekScheduleHeader from './useWeekScheduleHeader';
import Typography from '@components/typography';
import { monthNamesState } from '@states/app';
import { buildWeekRangeLabel } from '@services/app/week_range';

/**
 * Cabecera de una semana en Programas semanales.
 *
 * Antes decía la semana TRES veces: el selector de arriba, una frase grande
 * centrada, y otra vez la fecha de la reunión. Media pantalla se iba en decir
 * cuándo, y el programa —que es a lo que se entra— empezaba abajo del todo.
 *
 * Ahora el rango es un apoyo pequeño (sigue haciendo falta: la reunión puede
 * caer en otro mes que el lunes), el titular es la fecha real de la reunión
 * con su día, y a su derecha va la acción de la pestaña. "Última
 * actualización" pierde la píldora de color y baja al final, en gris: es un
 * dato de confianza, no un titular.
 */
const WeekScheduleHeader = (props: WeekScheduleHeaderProps) => {
  const { t } = useAppTranslation();
  const monthNames = useAtomValue(monthNamesState);

  const { showToCurrent } = useWeekScheduleHeader(props);

  const rango = buildWeekRangeLabel(props.week, monthNames, t);

  // Exhibidores, Salidas, Departamentos y Discursos salientes no son de UN día
  // concreto, son de toda la semana: no tienen titular propio y la fila se
  // quedaba coja, con el botón solo a la derecha y un hueco a la izquierda.
  // Ahí el titular pasa a ser la semana, y entonces el rango de arriba sobra.
  const titular = props.title || rango;
  const rangoDeApoyo = props.title ? rango : '';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginBottom: '16px',
      }}
    >
      {(rangoDeApoyo || showToCurrent) && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <Typography className="label-small-regular" color="var(--grey-400)">
            {rangoDeApoyo}
          </Typography>

          {showToCurrent && (
            <Box
              onClick={props.onCurrent}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <IconDate width={16} height={16} color="var(--accent-main)" />
              <Typography
                className="label-small-semibold"
                color="var(--accent-main)"
              >
                {t('tr_toCurrentWeek')}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {(titular || props.action) && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            {titular && (
              <Typography className="h2" color="var(--ink)">
                {titular}
              </Typography>
            )}
            {props.subtitle && (
              <Typography className="body-regular" color="var(--ink-2)">
                {props.subtitle}
              </Typography>
            )}
          </Box>

          {props.action && <Box sx={{ flexShrink: 0 }}>{props.action}</Box>}
        </Box>
      )}

      {props.lastUpdated && (
        <Typography className="label-small-regular" color="var(--grey-350)">
          {t('tr_lastUpdated', { date: props.lastUpdated })}
        </Typography>
      )}
    </Box>
  );
};

export default WeekScheduleHeader;
