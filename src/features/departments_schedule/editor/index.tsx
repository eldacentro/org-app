import { Box, Grid } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import { Typography } from '@components/index';
import PersonSelector from '@features/meetings/person_selector';
import { personsStateFind } from '@services/states/persons';
import useDepartmentEditor from './useDepartmentEditor';

const DepartmentEditor = () => {
  const { t } = useAppTranslation();
  const { selectedWeek, schedule, handleSaveAssignment } = useDepartmentEditor();

  if (selectedWeek.length === 0) return null;

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
      <Grid container spacing={2}>
        {/* Acomodadores */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Box
            sx={{
              p: 2,
              backgroundColor: 'var(--white)',
              border: '1px solid var(--accent-300)',
              borderRadius: 'var(--radius-xl)',
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
        <Grid size={{ xs: 12, md: 6 }}>
          <Box
            sx={{
              p: 2,
              backgroundColor: 'var(--white)',
              border: '1px solid var(--accent-300)',
              borderRadius: 'var(--radius-xl)',
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
        <Grid size={{ xs: 12, md: 6 }}>
          <Box
            sx={{
              p: 2,
              backgroundColor: 'var(--white)',
              border: '1px solid var(--accent-300)',
              borderRadius: 'var(--radius-xl)',
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
        <Grid size={{ xs: 12, md: 6 }}>
          <Box
            sx={{
              p: 2,
              backgroundColor: 'var(--white)',
              border: '1px solid var(--accent-300)',
              borderRadius: 'var(--radius-xl)',
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
    </Box>
  );
};

export default DepartmentEditor;
