import {
  Box,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@mui/material';
import { IconCollapse, IconExpand, IconPrepareReport } from '@components/icons';
import { TalkRowType } from './index.types';
import { useAppTranslation } from '@hooks/index';
import { formatDate } from '@utils/date';
import useTalkRow from './useTalkRow';
import Typography from '@components/typography';
import Button from '@components/button';
import SpeakerDetails from '@features/persons/speakers_catalog/speaker_details';

const TalkRow = ({ talk, isExpandAll }: TalkRowType) => {
  const { t } = useAppTranslation();

  const {
    collapseOpen,
    handleToggleCollapse,
    handleHistoryFocused,
    handleHistoryUnfocused,
    isHistoryFocused,
    speakersWithTalk,
    selectedSpeaker,
    handleOpenDetails,
    handleCloseDetails,
  } = useTalkRow(isExpandAll, talk);

  const canExpand = talk.history.slice(1).length > 0 || speakersWithTalk.length > 0;

  return (
    <>
      {selectedSpeaker && (
        <SpeakerDetails
          open={Boolean(selectedSpeaker)}
          onClose={handleCloseDetails}
          speaker={selectedSpeaker}
        />
      )}

      <TableRow
        className="talk-list-item"
        onClick={canExpand ? () => handleToggleCollapse() : null}
        sx={{
          cursor: canExpand ? 'pointer' : 'default',
          height: '48px',
          '& > .MuiTableCell-root': {
            borderBottomStyle: 'none',
          },
          backgroundColor: isHistoryFocused ? 'var(--accent-150)' : 'initial',
          '& .MuiTypography-root': {
            color: isHistoryFocused ? 'var(--accent-dark)' : 'var(--black)',
          },
          '& .row-btn, & .row-btn g, & .row-btn path': {
            fill: isHistoryFocused ? 'var(--accent-dark)' : 'var(--grey-300)',
          },
          '&:hover': {
            backgroundColor: canExpand ? 'var(--accent-150)' : 'initial',
            '& .MuiTypography-root': {
              color: canExpand ? 'var(--accent-dark)' : 'var(--black)',
            },
            '& .row-btn, & .row-btn g, & .row-btn path': {
              fill: canExpand ? 'var(--accent-dark)' : 'var(--grey-300)',
            },
            '& + .talk-history': {
              backgroundColor: canExpand ? 'var(--accent-150)' : 'initial',
            },
          },
        }}
      >
        <TableCell
          component="th"
          scope="row"
          sx={{ width: '30px', minWidth: '30px' }}
        >
          <Typography className="h4">{talk.talk_number}</Typography>
        </TableCell>
        <TableCell sx={{ minWidth: '138px' }}>
          <Typography className="h4">{talk.talk_title}</Typography>
        </TableCell>
        <TableCell sx={{ width: '50px', minWidth: '50px' }}>
          <Typography className="body-small-regular">
            {talk.last_date.length > 0 &&
              formatDate(new Date(talk.last_date), t('tr_shortDateFormatAlt'))}
          </Typography>
        </TableCell>
        <TableCell sx={{ width: '205px', minWidth: '205px' }}>
          <Typography className="body-small-regular">
            {talk.last_speaker}
          </Typography>
        </TableCell>
        <TableCell sx={{ width: '25px', minWidth: '25px' }}>
          {canExpand && (
            <Box
              className="row-btn"
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {!collapseOpen && <IconExpand color="var(--black)" />}
              {collapseOpen && <IconCollapse color="var(--black)" />}
            </Box>
          )}
        </TableCell>
      </TableRow>
      <TableRow
        className="talk-history"
        onClick={handleToggleCollapse}
        sx={{
          marginTop: '-5px',
          cursor: canExpand ? 'pointer' : 'default',
          '&:hover': {
            backgroundColor: canExpand ? 'var(--accent-150)' : 'initial',
          },
        }}
        onMouseEnter={canExpand ? handleHistoryFocused : null}
        onMouseLeave={canExpand ? handleHistoryUnfocused : null}
      >
        <TableCell style={{ padding: 0 }} colSpan={5}>
          <Collapse
            in={canExpand && collapseOpen}
            timeout="auto"
            unmountOnExit
          >
            <Box
              onClick={(e) => e.stopPropagation()}
              sx={{
                padding: '8px 0 16px 0',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              {talk.history.slice(1).length > 0 && (
                <Table
                  size="small"
                  sx={{
                    '& .MuiTableCell-root': {
                      boxSizing: 'content-box',
                    },
                    '& .MuiTableRow-root > .MuiTableCell-root': {
                      border: 'none',
                    },
                  }}
                >
                  <TableBody>
                    {talk.history.slice(1).map((history) => (
                      <TableRow
                        key={history.date}
                        sx={{
                          minHeight: 'fit-content',
                          '& .MuiTypography-root': {
                            color: 'var(--grey-350)',
                          },
                        }}
                      >
                        <TableCell
                          component="th"
                          scope="row"
                          sx={{
                            minWidth: '46px',
                            width: '46px',
                            padding: '0 !important',
                          }}
                        />
                        <TableCell
                          sx={{ minWidth: '138px', padding: '0 !important' }}
                        />
                        <TableCell
                          sx={{
                            width: '58px',
                            minWidth: '58px',
                            padding: '0 8px !important',
                          }}
                        >
                          <Typography className="body-small-regular">
                            {formatDate(
                              new Date(history.date),
                              t('tr_shortDateFormatAlt')
                            )}
                          </Typography>
                        </TableCell>
                        <TableCell
                          sx={{
                            width: '206px',
                            minWidth: '206px',
                            padding: '0 8px !important',
                          }}
                        >
                          <Typography className="body-small-regular">
                            {history.person}
                          </Typography>
                        </TableCell>
                        <TableCell
                          sx={{
                            width: '41px',
                            minWidth: '41px',
                            padding: '0 !important',
                          }}
                        />
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {speakersWithTalk.length > 0 && (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    paddingLeft: '46px',
                    paddingRight: '41px',
                  }}
                >
                  <Typography
                    className="h4"
                    sx={{ color: 'var(--grey-400)', marginBottom: '4px' }}
                  >
                    {t('tr_availableSpeakers', { defaultValue: 'Oradores disponibles' })}
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    {speakersWithTalk.map(({ speaker, name, congregation }) => (
                      <Box
                        key={speaker.person_uid}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 8px',
                          borderRadius: 'var(--radius-s)',
                          '&:hover': {
                            backgroundColor: 'var(--line)',
                          },
                        }}
                      >
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography
                            className="body-small-semibold"
                            sx={{ color: 'var(--black)' }}
                          >
                            {name}
                          </Typography>
                          {congregation.length > 0 && (
                            <Typography
                              className="label-small-regular"
                              sx={{ color: 'var(--grey-400)' }}
                            >
                              {congregation}
                            </Typography>
                          )}
                        </Box>
                        <Button
                          variant="small"
                          color="accent"
                          onClick={() => handleOpenDetails(speaker)}
                          sx={{
                            height: '24px',
                            minHeight: '24px',
                          }}
                          startIcon={
                            <IconPrepareReport
                              width={16}
                              height={16}
                              color="var(--accent-main)"
                            />
                          }
                        >
                          {t('tr_details')}
                        </Button>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

export default TalkRow;
