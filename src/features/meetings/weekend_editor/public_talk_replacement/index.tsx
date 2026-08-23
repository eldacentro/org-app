import { Box, TextField } from '@mui/material';
import { PublicTalkReplacementCongregation } from '@definition/schedules';
import {
  episodeUrl,
  lankDesdeMediaKey,
} from '@services/app/jw_video_series';
import useReplacement from './useReplacement';
import Button from '@components/button';
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
  const {
    serie,
    episodios,
    cargando,
    lang,
    estadoDescripcion,
    pedirDescripcion,
  } = useReplacement();

  const esVideo = value?.kind === 'video';

  const episodioElegido = episodios.find(
    (record) => record.key === value?.media_key
  );

  /**
   * El identificador con el que se le pregunta a jw.org.
   *
   * Normalmente sale de la lista de episodios. Si esa lista no está —jw.org no
   * contestó, o es la primera vez en este teléfono— se saca del propio
   * `media_key` que hay guardado en el programa: si no, el botón de traer la
   * descripción no llegaba a salir justo el día que hace falta.
   */
  const lank =
    episodioElegido?.lank ?? lankDesdeMediaKey(value?.media_key ?? '', lang);

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

    const base = {
      kind: 'video' as const,
      media_key: episodio.key,
      series_name: serie.name,
      title: episodio.title,
      image: episodio.image,
      duration: episodio.duration,
    };

    // La descripción NO se hereda del episodio anterior. Antes se conservaba, y
    // cambiar de episodio dejaba debajo el resumen del otro: un texto correcto
    // en el sitio equivocado, que es lo que menos se mira.
    onChange({ ...base, description: '' });

    // Y se va a buscar la que toca. Se pide por nuestro servidor porque jw.org
    // no deja pedírsela desde el navegador; ver `pedirDescripcion`.
    pedirDescripcion(episodio.lank, (texto) =>
      onChange({ ...base, description: texto })
    );
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
              placeholder={
                estadoDescripcion === 'trayendo'
                  ? 'Buscándola en jw.org…'
                  : 'La trae la aplicación al elegir el episodio'
              }
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

            {/* Traerla a mano cuando el episodio ya estaba puesto.
                *
                * Existe porque la descripción solo llega sola al ELEGIR el
                * episodio, y todo lo programado antes de que esto existiera se
                * quedaba con el hueco en blanco sin manera de pedirla salvo
                * volver a elegir el mismo episodio, que no se le ocurre a
                * nadie.
                *
                * Y es un botón, y no algo que pase solo al abrir la página,
                * porque guardar aquí ESCRIBE EN EL PROGRAMA: si el mes ya está
                * publicado, rellenarla sola encendería el aviso de «has
                * cambiado cosas desde que publicaste» sin que nadie haya
                * tocado nada. En esta aplicación el programa no se cambia
                * solo; se avisa y decide una persona. Elegir un episodio ya es
                * cambiar el programa, así que ahí sí viene sola. */}
            {!readOnly && lank && !value?.description && (
              <Box sx={{ padding: '8px 16px 0' }}>
                <Button
                  variant="small"
                  disabled={estadoDescripcion === 'trayendo'}
                  onClick={() =>
                    pedirDescripcion(lank, (texto) =>
                      onChange({
                        ...(value as NonNullable<Valor>),
                        kind: 'video',
                        description: texto,
                      })
                    )
                  }
                >
                  {estadoDescripcion === 'trayendo'
                    ? 'Buscándola…'
                    : 'Traer la descripción de jw.org'}
                </Button>
              </Box>
            )}

            {/* La descripción la trae la aplicación al elegir el episodio,
                pero pasando por nuestro servidor: jw.org la publica en la
                página del vídeo y no manda la cabecera que dejaría pedírsela
                desde el navegador. Se puede reescribir siempre, y si jw.org no
                contesta se dice y se pega a mano — el enlace de debajo la deja
                a dos toques. */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '8px',
                flexWrap: 'wrap',
                padding: '4px 16px 0',
              }}
            >
              <Typography
                className="label-small-regular"
                color={
                  estadoDescripcion === 'fallo'
                    ? 'var(--orange-dark)'
                    : 'var(--ink-3)'
                }
              >
                {estadoDescripcion === 'fallo'
                  ? 'jw.org no ha contestado, así que la descripción no ha venido. Puedes pegarla a mano.'
                  : 'El título, la duración, la portada y la descripción los trae la aplicación de jw.org. Puedes cambiar este texto.'}
              </Typography>

              {lank && (
                <Box
                  component="a"
                  href={episodeUrl(lank, lang)}
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
