import { Box, Grid } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import { Button, Dialog, Typography } from '@components/index';
import { IconClose } from '@components/icons';
import Badge from '@components/badge';
import PersonSelector from '@features/meetings/person_selector';
import { personsStateFind } from '@services/states/persons';
import useDepartmentEditor from './useDepartmentEditor';

const DepartmentEditor = () => {
  const { t } = useAppTranslation();
  const {
    selectedWeek,
    schedule,
    handleSaveAssignment,
    clearAll,
    handleOpenClearAll,
    handleCloseClearAll,
    handleClearAll,
    weekName,
    isNoMeetingWeek,
  } = useDepartmentEditor();

  if (selectedWeek.length === 0) return null;

  if (isNoMeetingWeek) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexGrow: 1,
          flexDirection: 'column',
          gap: '16px',
          width: '100%',
        }}
      >
        <Typography className="h2-caps">{weekName}</Typography>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            flexGrow: 1,
            minHeight: '200px',
            textAlign: 'center',
          }}
        >
          <Badge text={t('tr_noMeetingWeek')} color="grey" size="medium" filled={false} />
          <Typography color="var(--grey-400)" sx={{ maxWidth: '320px' }}>
            {t(
              'tr_noMeetingWeekDeptDesc',
              'No hay reunión esta semana (asamblea, conmemoración u otro evento especial), así que no hace falta asignar turno.'
            )}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexGrow: 1,
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
      }}
    >
      <Typography className="h2-caps">{weekName}</Typography>

      <Dialog onClose={handleCloseClearAll} open={clearAll} sx={{ padding: '24px' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Typography className="h2">{t('tr_clearAllAssignments')}</Typography>
          <Typography color="var(--grey-400)">
            {t('tr_clearAllAssignmentsDesc')}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            width: '100%',
          }}
        >
          <Button variant="main" color="red" onClick={handleClearAll}>
            {t('tr_clear')}
          </Button>
          <Button variant="secondary" onClick={handleCloseClearAll}>
            {t('tr_cancel')}
          </Button>
        </Box>
      </Dialog>

      <Grid container spacing={2}>
        {/* Acomodadores */}
        <Grid size={{ mobile: 12, laptop: 6 }}>
          <Box
            sx={{
              p: 2,
              backgroundColor: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--r-lg)',
            }}
          >
            <Typography className="h3" sx={{ mb: 2 }}>
              {t('tr_attendants', 'Acomodadores')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <PersonSelector
                label="Exterior"
                week={selectedWeek}
                dept="acomodadores"
                assignment="MM_Other"
                personValue={personsStateFind(
                  schedule?.acomodadores.exterior.value
                )}
                onSelect={(p) =>
                  handleSaveAssignment('acomodadores', 'exterior', p)
                }
              />
              <PersonSelector
                label="Interior"
                week={selectedWeek}
                dept="acomodadores"
                assignment="MM_Other"
                personValue={personsStateFind(
                  schedule?.acomodadores.interior.value
                )}
                onSelect={(p) =>
                  handleSaveAssignment('acomodadores', 'interior', p)
                }
              />
            </Box>
          </Box>
        </Grid>

        {/* Micrófonos */}
        <Grid size={{ mobile: 12, laptop: 6 }}>
          <Box
            sx={{
              p: 2,
              backgroundColor: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--r-lg)',
            }}
          >
            <Typography className="h3" sx={{ mb: 2 }}>
              {t('tr_microphones', 'Micrófonos')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <PersonSelector
                label="Micro 1"
                week={selectedWeek}
                dept="microfonos"
                assignment="MM_Other"
                personValue={personsStateFind(
                  schedule?.microfonos.micro1.value
                )}
                onSelect={(p) =>
                  handleSaveAssignment('microfonos', 'micro1', p)
                }
              />
              <PersonSelector
                label="Micro 2"
                week={selectedWeek}
                dept="microfonos"
                assignment="MM_Other"
                personValue={personsStateFind(
                  schedule?.microfonos.micro2.value
                )}
                onSelect={(p) =>
                  handleSaveAssignment('microfonos', 'micro2', p)
                }
              />
            </Box>
          </Box>
        </Grid>

        {/* Multimedia */}
        <Grid size={{ mobile: 12, laptop: 6 }}>
          <Box
            sx={{
              p: 2,
              backgroundColor: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--r-lg)',
            }}
          >
            <Typography className="h3" sx={{ mb: 2 }}>
              {t('tr_multimedia', 'Multimedia')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <PersonSelector
                label="Vídeo"
                week={selectedWeek}
                dept="multimedia"
                assignment="MM_Other"
                personValue={personsStateFind(schedule?.multimedia.video.value)}
                onSelect={(p) =>
                  handleSaveAssignment('multimedia', 'video', p)
                }
              />
              <PersonSelector
                label="Audio"
                week={selectedWeek}
                dept="multimedia"
                assignment="MM_Other"
                personValue={personsStateFind(schedule?.multimedia.audio.value)}
                onSelect={(p) =>
                  handleSaveAssignment('multimedia', 'audio', p)
                }
              />
            </Box>
          </Box>
        </Grid>

        {/* Plataforma */}
        <Grid size={{ mobile: 12, laptop: 6 }}>
          <Box
            sx={{
              p: 2,
              backgroundColor: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--r-lg)',
            }}
          >
            <Typography className="h3" sx={{ mb: 2 }}>
              {t('tr_platform', 'Plataforma')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <PersonSelector
                label="Encargado"
                week={selectedWeek}
                dept="plataforma"
                assignment="MM_Other"
                personValue={personsStateFind(
                  schedule?.plataforma.encargado.value
                )}
                onSelect={(p) =>
                  handleSaveAssignment('plataforma', 'encargado', p)
                }
              />
            </Box>
          </Box>
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="secondary"
          color="red"
          startIcon={<IconClose />}
          onClick={handleOpenClearAll}
        >
          {t('tr_clearAll')}
        </Button>
      </Box>
    </Box>
  );
};

export default DepartmentEditor;
