import { Box, TextField } from '@mui/material';
import { PublicTalkReplacementCongregation } from '@definition/schedules';
import { episodeUrl } from '@services/app/jw_video_series';
import useReplacement from './useReplacement';
import MenuItem from '@components/menuitem';
import Select from '@components/select';
import Typography from '@components/typography';

type Valor = PublicTalkReplacementCongregation['value'];

/**
 * Qué se hace en el hueco del discurso público durante la visita.
 *
 * Vive AQUÍ, en el editor de la reunión de fin de semana, y no en la página de
 * la visita: esa es solo para ancianos, y quien programa los discursos muchas
 * veces no lo es. Además la tabla de visitas solo la pueden subir ancianos y
 * administradores, así que guardarlo allí se habría quedado en su teléfono sin
 * llegar a nadie, en silencio.
 *
 * Dos opciones y no tres: el discurso público, o un episodio de la serie. Para
 * cualquier otra cosa ya está el campo del título, que es texto libre — una
 * tercera opción «otra cosa» sería el mismo campo con otro nombre.
 */
const PublicTalkReplacement = ({
  value,
  onChange,
  readOnly,
}: {
  value: Valor;
  onChange: (value: Valor) => void;
  readOnly?: boolean;
}) => {
  const { serie, episodios, cargando, lang } = useReplacement();

  const esVideo = value?.kind === 'video';

  const episodioElegido = episodios.find(
    (record) => record.key === value?.media_key
  );

  const handleTipo = (nuevo: string) => {
    if (nuevo !== 'video') return onChange(null);

    onChange({
      kind: 'video',
      media_key: '',
      series_name: serie.name,
      title: '',
      image: '',
      duration: '',
      description: '',
    });
  };

  const handleEpisodio = (key: string) => {
    const episodio = episodios.find((record) => record.key === key);

    if (!episodio) return;

    onChange({
      kind: 'video',
      media_key: episodio.key,
      series_name: serie.name,
      title: episodio.title,
      image: episodio.image,
      duration: episodio.duration,
      description: value?.description ?? '',
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Select
        label="En este hueco"
        value={esVideo ? 'video' : 'talk'}
        onChange={(e) => handleTipo(e.target.value as string)}
        readOnly={readOnly}
      >
        <MenuItem value="talk">
          <Typography>Discurso público</Typography>
        </MenuItem>
        <MenuItem value="video">
          <Typography>Un episodio de «{serie.name}»</Typography>
        </MenuItem>
      </Select>

      {esVideo && (
        <>
          <Select
            label="Episodio"
            value={value?.media_key ?? ''}
            onChange={(e) => handleEpisodio(e.target.value as string)}
            readOnly={readOnly}
          >
            {episodios.length === 0 && (
              <MenuItem value="">
                <Typography color="var(--ink-3)">
                  {cargando
                    ? 'Buscando los episodios en jw.org…'
                    : 'No se han podido traer los episodios'}
                </Typography>
              </MenuItem>
            )}

            {episodios.map((episodio) => (
              <MenuItem key={episodio.key} value={episodio.key}>
                <Typography>
                  {episodio.title}
                  {episodio.duration ? ` · ${episodio.duration}` : ''}
                </Typography>
              </MenuItem>
            ))}
          </Select>

          <Box>
            <TextField
              label="De qué va (opcional)"
              placeholder="Pega aquí la descripción del episodio de jw.org"
              value={value?.description ?? ''}
              multiline
              minRows={2}
              fullWidth
              disabled={readOnly}
              onChange={(e) =>
                onChange({
                  ...(value as NonNullable<Valor>),
                  kind: 'video',
                  description: e.target.value,
                })
              }
            />

            {/* Por qué se escribe a mano y no la trae la aplicación: la
                descripción está en la página de jw.org, pero jw.org no manda la
                cabecera que dejaría a la aplicación pedírsela — el navegador
                corta la petición. Traerla obligaría a pasar por nuestro
                servidor y a leer el HTML de jw.org, que se rompe en silencio en
                cuanto rediseñen la página. Así que se pega, y el enlace de
                debajo la deja a dos toques. */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '8px',
                flexWrap: 'wrap',
                padding: '4px 16px 0',
              }}
            >
              <Typography className="label-small-regular" color="var(--ink-3)">
                El título, la duración y la portada los trae la aplicación. La
                descripción hay que pegarla: jw.org no la deja pedir desde aquí.
              </Typography>

              {episodioElegido?.lank && (
                <Box
                  component="a"
                  href={episodeUrl(episodioElegido.lank, lang)}
                  target="_blank"
                  rel="noreferrer"
                  sx={{ textDecoration: 'none', whiteSpace: 'nowrap' }}
                >
                  <Typography
                    className="label-small-semibold"
                    color="var(--accent-main)"
                  >
                    Abrir el episodio en jw.org
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
};

export default PublicTalkReplacement;
