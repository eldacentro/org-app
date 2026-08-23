import { Box, TextField } from '@mui/material';
import { CircuitVisitType } from '@definition/circuit_visit';
import useReplacement from './useReplacement';
import MenuItem from '@components/menuitem';
import Select from '@components/select';
import Typography from '@components/typography';

type Replacement = CircuitVisitType['public_talk_replacement'];

/**
 * Qué se hace en el hueco del discurso público durante la visita.
 *
 * Tres opciones y no más: el discurso de siempre, un episodio de la serie de
 * jw.org, o cualquier otra cosa escrita a mano. La tercera existe porque esto
 * salió de un cambio que nadie tenía previsto, y la siguiente sorpresa no tiene
 * por qué ser un vídeo.
 */
const PublicTalkReplacement = ({
  value,
  onChange,
  readOnly,
}: {
  value: Replacement;
  onChange: (value: Replacement) => void;
  readOnly?: boolean;
}) => {
  const { serie, episodios, cargando } = useReplacement();

  const tipo = value?.kind ?? 'talk';

  const handleTipo = (nuevo: string) => {
    if (nuevo === 'talk') return onChange(undefined);

    if (nuevo === 'other') {
      return onChange({ kind: 'other', title: value?.title ?? '' });
    }

    onChange({ kind: 'video', title: '', series_name: serie.name });
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
        label="En el hueco del discurso público"
        value={tipo}
        onChange={(e) => handleTipo(e.target.value as string)}
        readOnly={readOnly}
      >
        <MenuItem value="talk">
          <Typography>El discurso público de siempre</Typography>
        </MenuItem>
        <MenuItem value="video">
          <Typography>Un episodio de «{serie.name}»</Typography>
        </MenuItem>
        <MenuItem value="other">
          <Typography>Otra cosa</Typography>
        </MenuItem>
      </Select>

      {tipo === 'video' && (
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

          {/* jw.org no sirve la descripción por ninguna vía: solo está en la
              página web. Por eso se escribe a mano, y por eso es opcional. */}
          <TextField
            label="De qué va (opcional)"
            placeholder="Pega aquí la descripción del episodio de jw.org"
            value={value?.description ?? ''}
            multiline
            minRows={2}
            disabled={readOnly}
            onChange={(e) =>
              onChange({ ...value, kind: 'video', description: e.target.value })
            }
          />
        </>
      )}

      {tipo === 'other' && (
        <TextField
          label="Qué se hace"
          placeholder="p. ej. Discurso especial del superintendente de distrito"
          value={value?.title ?? ''}
          disabled={readOnly}
          onChange={(e) =>
            onChange({ ...value, kind: 'other', title: e.target.value })
          }
        />
      )}
    </Box>
  );
};

export default PublicTalkReplacement;
