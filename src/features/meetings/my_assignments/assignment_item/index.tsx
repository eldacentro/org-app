import { Box, Stack } from '@mui/material';
import {
  IconAddMonth,
  IconClean,
  IconClock,
  IconGroups,
  IconLocation,
  IconPerson,
  IconRestaurant,
} from '@components/icons';
import { AssignmentDescItem } from '@definition/schedules';
import { AssignmentItemProps } from './index.types';
import { useAppTranslation } from '@hooks/index';
import useAssignmentItem from './useAssignmentItem';
import useAddAssignmentToCalendar from './useAddAssignmentToCalendar';
import Badge from '@components/badge';
import IconButton from '@components/icon_button';
import IconLoading from '@components/icon_loading';
import Typography from '@components/typography';

// Icono por tipo de línea de detalle — antes esto era un único string con
// emojis pegados uno tras otro; ahora cada dato tiene su propio icono y su
// propia línea, igual que el resto de la app.
const DESC_ICON_MAP: Record<AssignmentDescItem['icon'], typeof IconClock> = {
  clock: IconClock,
  location: IconLocation,
  people: IconGroups,
  person: IconPerson,
  clean: IconClean,
  meal: IconRestaurant,
};

const AssignmentItem = (props: AssignmentItemProps) => {
  const { t } = useAppTranslation();

  const {
    assignmentDate,
    assignmentDayName,
    isDept,
    rows,
    personGetName,
    userUID,
    ADD_CALENDAR_SHOW,
  } = useAssignmentItem(props);

  const { isProcessingId, handleAddToCalendar } = useAddAssignmentToCalendar();

  const firstKey = props.items[0].assignment.key ?? '';
  const isPreaching =
    firstKey.startsWith('OUTING_') || firstKey.startsWith('EXHIBITOR_');

  const hasMultiple = rows.length > 1;

  // Cuando la única fila no tiene ni descripción, ni fuente, ni estudiante,
  // ni el aviso de "asignado a otro" — o sea, solo el título — queda muy
  // poco contenido y se ve pegado arriba en vez de centrado con el bloque de
  // la fecha. Con varias filas o con texto secundario, en cambio, alinear
  // arriba es lo correcto (el título debe quedar a la altura del día).
  const singleRow = !hasMultiple ? rows[0] : null;
  const singleRowHasExtraContent =
    singleRow &&
    (singleRow.isDept ||
      userUID !== singleRow.history.assignment.person ||
      !!singleRow.history.assignment.ayf?.student ||
      !!singleRow.history.assignment.ayf?.assistant ||
      !!singleRow.history.assignment.src ||
      !!singleRow.history.assignment.desc ||
      (singleRow.history.assignment.descItems?.length ?? 0) > 0 ||
      !!singleRow.jwLibraryUrl);

  const cardAlignItems =
    singleRow && !singleRowHasExtraContent ? 'center' : 'flex-start';

  return (
    <Stack
      direction="row"
      spacing={2}
      alignItems={cardAlignItems}
      sx={(theme) => ({
        padding: '12px 14px',
        borderRadius: 'var(--r-md)',
        backgroundColor: 'var(--card)',
        border: '1px solid var(--line)',
        boxShadow: 'var(--shadow-sm)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: 'var(--shadow-md)',
        },
        [theme.breakpoints.up('tablet')]: {
          ':hover': {
            button: {
              backgroundColor: 'var(--line)',
              opacity: 1,
              pointerEvents: 'all',
            },
          },
        },
      })}
    >
      <Box
        sx={{
          position: 'relative',
          textAlign: 'center',
          width: '46px',
          height: '56px',
          borderRadius: 'var(--r-sm)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2px',
          backgroundColor: isPreaching ? 'var(--preaching-tint)' : 'var(--brand-tint)',
          border: isPreaching
            ? '1px solid var(--preaching-border)'
            : '1px solid rgba(59, 114, 196, 0.12)',
          flexShrink: 0,
          transition: 'background-color 0.2s ease, border-color 0.2s ease',
        }}
      >
        {/* Day label: weekday abbreviation OR 'SEM' for dept assignments */}
        <Typography
          sx={{
            fontSize: isDept ? '7.5px' : '8px',
            fontWeight: '800 !important', // ExtraBold
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            color: isPreaching
              ? 'var(--preaching-color)'
              : 'var(--brand)',
            opacity: isDept ? 0.65 : 0.75,
            lineHeight: 1,
            transition: 'color 0.2s ease',
          }}
        >
          {isDept ? 'SEM.' : assignmentDayName}
        </Typography>
        {/* Day number — Figtree Black (900) is now self-hosted */}
        <Typography
          sx={{
            color: isPreaching
              ? 'var(--preaching-color) !important'
              : 'var(--brand) !important',
            fontWeight: '900 !important', // True Black via Figtree-Black.ttf
            fontSize: isDept ? '15px !important' : '22px !important',
            lineHeight: 1,
            letterSpacing: '-0.5px',
            transition: 'color 0.2s ease',
          }}
        >
          {assignmentDate}
        </Typography>

        {/* Cuando hay más de una asignación el mismo día, hace falta una
            señal visible de inmediato — si no, a simple vista parece una
            sola tarjeta con una sola asignación. */}
        {hasMultiple && (
          <Box
            sx={{
              position: 'absolute',
              top: '-6px',
              right: '-6px',
              minWidth: '18px',
              height: '18px',
              borderRadius: 'var(--radius-max)',
              backgroundColor: isPreaching
                ? 'var(--preaching-color)'
                : 'var(--brand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--card)',
              padding: '0 3px',
            }}
          >
            <Typography
              sx={{
                color: 'var(--always-white) !important',
                fontWeight: '800 !important',
                fontSize: '10px !important',
                lineHeight: 1,
              }}
            >
              {rows.length}
            </Typography>
          </Box>
        )}
      </Box>

      <Stack
        justifyContent="center"
        width="calc(100% - 58px)"
        spacing="10px"
        divider={
          hasMultiple ? (
            <Box sx={{ height: '1px', background: 'var(--line)' }} />
          ) : null
        }
      >
        {rows.map(({ history, badges, isDept: rowIsDept, jwLibraryUrl: rowJwLibraryUrl }) => (
          <Stack
            key={history.id}
            justifyContent="center"
            spacing="2px"
            direction="row"
            alignItems="flex-start"
          >
            <Stack justifyContent="center" spacing="2px" flex={1}>
              <Stack direction="row" spacing={1.2} alignItems="center" flexWrap="wrap">
                <Typography className="h3" sx={{ color: 'var(--ink)', fontWeight: 700 }}>
                  {history.assignment.title}
                </Typography>

                {badges.map((badge) => badge)}
              </Stack>

              {rowIsDept && (
                <Typography
                  className="label-small-medium"
                  color="var(--grey-400)"
                  sx={{ fontStyle: 'italic' }}
                >
                  Toda la semana
                </Typography>
              )}

              {userUID !== history.assignment.person && (
                <Badge
                  size="small"
                  filled
                  color="orange"
                  sx={{ width: 'fit-content', height: 'auto', marginTop: '2px' }}
                  text={t('tr_deliveredBy', {
                    name: personGetName(history.assignment.person),
                  })}
                />
              )}

              {history.assignment.ayf?.student && (
                <Typography
                  className={'body-small-semibold'}
                  color={'var(--grey-400)'}
                  sx={{ marginTop: '2px' }}
                >
                  {`${t('tr_student')}: ${personGetName(history.assignment.ayf.student)}`}
                </Typography>
              )}

              {history.assignment.ayf?.assistant && (
                <Typography
                  className={'body-small-semibold'}
                  color={'var(--grey-400)'}
                >
                  {`${t('tr_assistant')}: ${personGetName(history.assignment.ayf.assistant)}`}
                </Typography>
              )}

              {/* Texto secundario descriptivo — MISMO estilo para las tres
                  variantes (material/src, descripción/desc y las líneas de
                  descItems de abajo): regular, grey-400, 12px. Antes el src
                  salía en negrita y a 13px (y cambiaba de color según hubiera
                  estudiante o no), lo que hacía que unas tarjetas se vieran
                  distintas de otras sin motivo. */}
              {history.assignment.src && (
                <Typography className="label-small-regular" color="var(--grey-400)" sx={{ marginTop: '2px', lineHeight: 1.3 }}>
                  {history.assignment.src}
                </Typography>
              )}

              {history.assignment.desc && (
                <Typography className="label-small-regular" color="var(--grey-400)" sx={{ marginTop: '2px', lineHeight: 1.3 }}>
                  {history.assignment.desc}
                </Typography>
              )}

              {history.assignment.descItems && history.assignment.descItems.length > 0 && (
                <Stack spacing="3px" sx={{ marginTop: '3px' }}>
                  {history.assignment.descItems.map((item, idx) => {
                    const DescIcon = DESC_ICON_MAP[item.icon];
                    return (
                      <Stack
                        key={`${item.icon}-${idx}`}
                        direction="row"
                        alignItems="center"
                        spacing="6px"
                      >
                        <DescIcon color="var(--grey-350)" width={13} height={13} />
                        <Typography
                          className="label-small-regular"
                          color="var(--grey-400)"
                          sx={{ lineHeight: 1.3 }}
                        >
                          {item.text}
                        </Typography>
                      </Stack>
                    );
                  })}
                </Stack>
              )}

              {rowJwLibraryUrl && (
                <Box
                  component="a"
                  href={rowJwLibraryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    alignSelf: 'flex-start',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    px: '6px',
                    py: '2px',
                    marginTop: '4px',
                    borderRadius: 'var(--radius-s)',
                    textDecoration: 'none',
                    border: '1px solid var(--line)',
                    opacity: 0.55,
                    transition: 'opacity 0.2s ease',
                    '&:hover': { opacity: 0.9 },
                    '&:active': { opacity: 1 },
                  }}
                >
                  <Typography
                    component="span"
                    sx={{
                      fontSize: '10px',
                      fontWeight: 600,
                      color: 'var(--grey-400)',
                      lineHeight: 1.2,
                      letterSpacing: '0.2px',
                    }}
                  >
                    JW Library ↗
                  </Typography>
                </Box>
              )}
            </Stack>

            {ADD_CALENDAR_SHOW && (
              <IconButton
                onClick={() =>
                  handleAddToCalendar(history, { personGetName, userUID, t })
                }
                sx={(theme) => ({
                  borderRadius: 'var(--r-sm)',
                  border: '1px solid var(--line)',
                  padding: '6px',
                  [theme.breakpoints.up('tablet')]: {
                    opacity: 0,
                    pointerEvents: 'none',
                    transition: 'opacity 500ms ease',
                  },
                })}
              >
                {isProcessingId === history.id ? (
                  <IconLoading />
                ) : (
                  <IconAddMonth color="var(--brand)" />
                )}
              </IconButton>
            )}
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
};

export default AssignmentItem;
