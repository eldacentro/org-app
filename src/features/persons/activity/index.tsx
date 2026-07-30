import { useState } from 'react';
import { Box, Collapse, IconButton, Stack } from '@mui/material';
import { useParams } from 'react-router';
import { IconCollapse } from '@components/icons';
import Typography from '@components/typography';
import FilterChip from '@components/filter_chip';
import { generateMonthNames } from '@services/i18n/translation';
import {
  ActivityCategory,
  ActivityItem,
  CATEGORY_LABELS,
} from '@services/app/person_activity';
import usePersonActivity from './usePersonActivity';

/**
 * Actividad — todo lo que esta persona tiene o ha tenido asignado.
 *
 * Sustituye al historial que solo enseñaba asignaciones de reunión. El resto
 * (departamentos, exhibidores, salidas, la visita del superintendente, los
 * territorios) vivía cada uno en su módulo, ordenado por semanas, así que para
 * saber qué hace un hermano había que recorrer cinco páginas.
 *
 * Una sola lista por orden de fecha —lo más reciente arriba, así lo que viene
 * queda a la vista— con un filtro por categoría. Se enseñan solo los filtros
 * que tienen algo detrás, para que no parezca más complicado de lo que es.
 */

const CATEGORY_ORDER: ActivityCategory[] = [
  'meeting',
  'department',
  'outing',
  'exhibitor',
  'territory',
  'circuit_visit',
];

// Solo tokens que existen de verdad en los 8 temas: la app ha tenido colores
// inventados que el navegador ignoraba en silencio (ver DESIGN_SYSTEM §7.4).
const CATEGORY_TONES: Record<ActivityCategory, string> = {
  meeting: 'var(--brand)',
  department: 'var(--orange-main)',
  outing: 'var(--green-main)',
  exhibitor: 'var(--blue-main)',
  territory: 'var(--accent-dark)',
  circuit_visit: 'var(--red-main)',
};

const monthLabel = (month: string) => {
  const [year, monthNumber] = month.split('/');
  const name = generateMonthNames()[Number(monthNumber) - 1] ?? '';

  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
};

const ActivityRow = ({ item }: { item: ActivityItem }) => {
  const day = item.date.slice(-2);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '8px 0',
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
          width: '34px',
          textAlign: 'center',
          paddingTop: '1px',
        }}
      >
        <Typography className="body-regular-semibold" color="var(--ink-2)">
          {day}
        </Typography>
      </Box>

      {/* Un punto de color por categoría: distingue de un vistazo sin gastar
          una etiqueta de texto en cada fila. */}
      <Box
        sx={{
          flexShrink: 0,
          width: '8px',
          height: '8px',
          marginTop: '7px',
          borderRadius: 'var(--shape-full)',
          backgroundColor: CATEGORY_TONES[item.category],
        }}
      />

      <Stack spacing="2px" sx={{ flex: 1, minWidth: 0 }}>
        <Typography className="body-regular" color="var(--ink)">
          {item.title}
        </Typography>

        {(item.detail || item.wholeWeek) && (
          <Typography className="body-small-regular" color="var(--ink-3)">
            {[item.wholeWeek ? 'toda la semana' : '', item.detail]
              .filter(Boolean)
              .join(' · ')}
          </Typography>
        )}
      </Stack>
    </Box>
  );
};

const PersonActivity = () => {
  const { id } = useParams();

  const { groups, counts, total, category, setCategory } = usePersonActivity(id);

  const [expanded, setExpanded] = useState(true);

  const availableCategories = CATEGORY_ORDER.filter((key) => counts.has(key));

  return (
    <Box
      sx={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--line)',
        display: 'flex',
        padding: '16px',
        gap: '16px',
        flexDirection: 'column',
        borderRadius: 'var(--shape-xl)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <Typography className="h2">Actividad</Typography>
          {total > 0 && (
            <Typography className="body-small-regular" color="var(--ink-3)">
              {total}
            </Typography>
          )}
        </Box>

        <IconButton
          sx={{ padding: 0 }}
          onClick={() => setExpanded((prev) => !prev)}
        >
          <IconCollapse
            color="var(--black)"
            sx={{
              transform: expanded ? 'rotate(0deg)' : 'rotate(180deg)',
              transition: 'transform 0.3s',
            }}
          />
        </IconButton>
      </Box>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Stack spacing="16px">
          {availableCategories.length > 1 && (
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <FilterChip
                label="Todo"
                selected={category === 'all'}
                onClick={() => setCategory('all')}
              />

              {availableCategories.map((key) => (
                <FilterChip
                  key={key}
                  label={`${CATEGORY_LABELS[key]} (${counts.get(key)})`}
                  selected={category === key}
                  onClick={() => setCategory(key)}
                />
              ))}
            </Box>
          )}

          {groups.length === 0 ? (
            <Typography className="body-regular" color="var(--ink-2)">
              {total === 0
                ? 'Esta persona todavía no tiene ninguna asignación.'
                : 'No hay nada en esta categoría.'}
            </Typography>
          ) : (
            <Box
              sx={{
                maxHeight: '420px',
                overflowY: 'auto',
                // El scroll propio evita que la ficha entera se estire con
                // años de historial, igual que hacía la tabla anterior.
                marginRight: '-8px',
                paddingRight: '8px',
              }}
            >
              <Stack spacing="12px">
                {groups.map((group) => (
                  <Stack key={group.month} spacing="0px">
                    <Typography
                      className="label-small-semibold"
                      color="var(--ink-3)"
                      sx={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 1,
                        backgroundColor: 'var(--card)',
                        paddingBottom: '4px',
                      }}
                    >
                      {monthLabel(group.month)}
                    </Typography>

                    {group.items.map((item) => (
                      <ActivityRow key={item.key} item={item} />
                    ))}
                  </Stack>
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      </Collapse>
    </Box>
  );
};

export default PersonActivity;
