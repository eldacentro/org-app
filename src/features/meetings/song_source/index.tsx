import { Box, Popper } from '@mui/material';
import { IconSong } from '@components/icons';
import { SongLocaleType } from '@definition/songs';
import { SongSourceType } from './index.types';
import { useAppTranslation } from '@hooks/index';
import useSongSource from './useSongSource';
import AutoComplete from '@components/autocomplete';
import Typography from '@components/typography';

const SongSource = (props: SongSourceType) => {
  const { t } = useAppTranslation();

  const { songTitle, songs, selectedSong, handleSongChange, sourceLang } =
    useSongSource(props);

  return (
    <>
      {props.isEdit && (
        <AutoComplete
          // Un valor que no cabe se cortaba con puntos suspensivos y no había
          // forma de leerlo entero: dentro de un <input> el texto no puede
          // partirse en dos líneas. Con `multiline` el campo crece a lo alto.
          multiline
          label={props.label || t('tr_songs', { lng: sourceLang })}
          options={songs}
          getOptionLabel={(option: SongLocaleType) => option.song_title}
          value={selectedSong}
          onChange={(_, value: SongLocaleType) => handleSongChange(value)}
          slots={{
            popper: (props) => <Popper {...props} placement="top-start" />,
          }}
          renderOption={(props, option) => (
            <Box
              component="li"
              {...props}
              sx={{ margin: 0, padding: 0 }}
              key={option.song_number}
            >
              <Typography>{option.song_title}</Typography>
            </Box>
          )}
        />
      )}
      {/* La canción tiene color propio (ver `--song` en global/index.css).
          Antes era un icono gris y un texto en tinta, o sea exactamente lo
          mismo que todo lo demás: la canción de apertura se perdía entre el
          presidente y la oración, que están justo encima y justo debajo. El
          violeta no lo usa ninguna sección del programa, así que "lo morado
          con una nota es una canción" se aprende de una sola pasada.

          Es una píldora tenue y no solo texto de color porque el fondo es lo
          que hace que se localice de un vistazo sin tener que leerla. */}
      {!props.isEdit && (
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            width: 'fit-content',
            maxWidth: '100%',
            padding: '4px 12px 4px 8px',
            borderRadius: 'var(--radius-max)',
            backgroundColor: 'var(--song-tint)',
          }}
        >
          <IconSong
            color="var(--song)"
            height={20}
            width={20}
            sx={{ flexShrink: 0 }}
          />
          <Typography className="h4" color="var(--song-text)">
            {songTitle}
          </Typography>
        </Box>
      )}
    </>
  );
};

export default SongSource;
