import { Box, Stack } from '@mui/material';
import { IconAddMonth } from '@components/icons';
import { AssignmentItemProps } from './index.types';
import { useAppTranslation } from '@hooks/index';
import useAssignmentItem from './useAssignmentItem';
import Badge from '@components/badge';
import IconButton from '@components/icon_button';
import Typography from '@components/typography';

const AssignmentItem = (props: AssignmentItemProps) => {
  const { t } = useAppTranslation();

  const {
    assignmentDate,
    assignmentDayName,
    personGetName,
    userUID,
    ADD_CALENDAR_SHOW,
    history,
    badges,
  } = useAssignmentItem(props);

  const isPreaching =
    history.assignment.key.startsWith('OUTING_') ||
    history.assignment.key.startsWith('EXHIBITOR_');

  return (
    <Stack
      direction="row"
      spacing={2}
      alignItems="center"
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
          textAlign: 'center',
          width: '46px',
          height: '56px',
          borderRadius: 'var(--r-sm)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1px',
          backgroundColor: isPreaching ? 'var(--preaching-tint)' : 'var(--brand-tint)',
          border: isPreaching
            ? '1px solid var(--preaching-border)'
            : '1px solid rgba(59, 114, 196, 0.12)',
          flexShrink: 0,
          transition: 'background-color 0.2s ease, border-color 0.2s ease',
        }}
      >
        {/* 3-letter weekday abbreviation */}
        <Typography
          sx={{
            fontSize: '8.5px',
            fontWeight: 700,
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            color: isPreaching
              ? 'var(--preaching-color)'
              : 'var(--brand)',
            opacity: 0.75,
            lineHeight: 1,
            transition: 'color 0.2s ease',
          }}
        >
          {assignmentDayName}
        </Typography>
        {/* Day number */}
        <Typography
          className="h2"
          sx={{
            color: isPreaching
              ? 'var(--preaching-color) !important'
              : 'var(--brand) !important',
            fontWeight: 900,
            fontSize: '18px !important',
            lineHeight: 1,
            transition: 'color 0.2s ease',
          }}
        >
          {assignmentDate}
        </Typography>
      </Box>

      <Stack
        alignItems="center"
        justifyContent="space-between"
        direction="row"
        width="calc(100% - 58px)"
        spacing={1}
      >
        <Stack justifyContent="center" spacing="2px">
          <Stack direction="row" spacing={1.2} alignItems="center" flexWrap="wrap">
            <Typography className="h3" sx={{ color: 'var(--ink)', fontWeight: 700, fontSize: '15px' }}>
              {history.assignment.title}
            </Typography>

            {badges.map((badge) => badge)}
          </Stack>

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
              sx={{ fontSize: '13px', marginTop: '2px' }}
            >
              {`${t('tr_student')}: ${personGetName(history.assignment.ayf.student)}`}
            </Typography>
          )}

          {history.assignment.ayf?.assistant && (
            <Typography
              className={'body-small-semibold'}
              color={'var(--grey-400)'}
              sx={{ fontSize: '13px' }}
            >
              {`${t('tr_assistant')}: ${personGetName(history.assignment.ayf.assistant)}`}
            </Typography>
          )}

          {history.assignment.src && (
            <Typography
              className={
                history.assignment.ayf
                  ? 'body-small-regular'
                  : 'body-small-semibold'
              }
              color={
                history.assignment.ayf ? 'var(--grey-350)' : 'var(--grey-400)'
              }
              sx={{ fontSize: '13px', marginTop: '1px' }}
            >
              {history.assignment.src}
            </Typography>
          )}

          {history.assignment.desc && (
            <Typography className="body-small-regular" color="var(--grey-400)" sx={{ fontSize: '12px', marginTop: '2px', lineHeight: 1.3 }}>
              {history.assignment.desc}
            </Typography>
          )}
        </Stack>

        {ADD_CALENDAR_SHOW && (
          <IconButton
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
            <IconAddMonth color="var(--brand)" />
          </IconButton>
        )}
      </Stack>
    </Stack>
  );
};

export default AssignmentItem;
