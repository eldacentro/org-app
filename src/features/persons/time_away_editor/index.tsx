import { Box } from '@mui/material';
import { IconAdd, IconInfo } from '@icons/index';
import { useAppTranslation } from '@hooks/index';
import { TimeAwayEditorProps } from './index.types';
import Button from '@components/button';
import Divider from '@components/divider';
import Typography from '@components/typography';
import TimeAwayItem from './time_away_item';

const TimeAwayEditor = ({
  items,
  desc,
  onAdd,
  onCommentsChange,
  onDelete,
  onDatesChange,
  readOnly,
}: TimeAwayEditorProps) => {
  const { t } = useAppTranslation();

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
      <Typography className="h2">{t('tr_timeAway')}</Typography>

      {items.length === 0 && (
        <Box sx={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
          {desc && (
            <Typography color="var(--grey-350)">
              <Box
                component="span"
                sx={{
                  verticalAlign: '-6px',
                  display: 'inline-flex',
                  marginRight: '4px',
                }}
              >
                <IconInfo color="var(--grey-350)" />
              </Box>
              {desc}
            </Typography>
          )}

          {!readOnly && (
            <Button
              variant="small"
              startIcon={<IconAdd />}
              onClick={onAdd}
              sx={{
                height: '32px',
                minHeight: '32px !important',
                alignSelf: 'flex-start',
              }}
            >
              {t('tr_add')}
            </Button>
          )}
        </Box>
      )}

      {items.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            marginTop: '8px',
          }}
        >
          {items.map((timeAwayItem, index) => (
            <Box
              key={timeAwayItem.id}
              sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              {/* Una línea entre periodos. Sin ella no se sabía de cuál de los
                  dos era el botón de borrar que queda entre medias. */}
              {index > 0 && <Divider color="var(--line)" />}

              {items.length > 1 && (
                <Typography
                  className="label-small-semibold"
                  color="var(--ink-3)"
                >
                  {`Periodo ${index + 1} de ${items.length}`}
                </Typography>
              )}

              <TimeAwayItem
                readOnly={readOnly}
                id={timeAwayItem.id}
                start_date={timeAwayItem.start_date}
                end_date={timeAwayItem.end_date}
                comments={timeAwayItem.comments}
                onCommentsChange={onCommentsChange}
                onDelete={onDelete}
                onDatesChange={onDatesChange}
              />
            </Box>
          ))}

          {/* "Añadir" vive fuera de los periodos, al final de la tarjeta:
              dentro del último quedaba pegado a su "Eliminar" y parecía otra
              acción de ese periodo en vez de "añadir uno nuevo". */}
          {!readOnly && (
            <Box>
              <Button
                variant="small"
                startIcon={<IconAdd />}
                sx={{ height: '32px', minHeight: '32px !important' }}
                onClick={onAdd}
              >
                {t('tr_add')}
              </Button>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default TimeAwayEditor;
