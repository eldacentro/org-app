import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { JWLangState } from '@states/settings';
import { IconRefresh, IconError, IconCheckCircle } from '@components/icons';
import { displaySnackNotification } from '@services/states/app';
import {
  fetchSongDurations,
  readSongDurations,
} from '@services/app/song_durations';
import ImportRow from '@features/meeting_materials/import_row';

const fechaCorta = (iso?: string) => {
  if (!iso) return '';

  const fecha = new Date(iso);

  if (Number.isNaN(fecha.getTime())) return '';

  return fecha.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Cuánto dura cada canción.
 *
 * El cancionero `.jwpub` no lo trae —163 vídeos y ninguna duración—, pero
 * jw.org sí, y en una sola petición vienen todas. Sirve para una cosa muy
 * concreta: es el único punto del programa donde se sabe DE ANTEMANO cuánto va
 * a durar algo, así que al seguir la reunión en directo el hueco de «canción y
 * oración» se parte en dos y el de la canción se pasa solo al terminar.
 *
 * Se actualizan solas una vez al mes. Esto está aquí para cuando no se quiera
 * esperar —sale una canción nuevo— y, sobre todo, para poder VER qué hay: sin
 * esta fila, que estuvieran o no era invisible.
 */
const SongDurations = () => {
  const lang = useAtomValue(JWLangState);

  const [guardadas, setGuardadas] = useState(() => readSongDurations(lang));
  const [ocupado, setOcupado] = useState(false);

  const total = guardadas ? Object.keys(guardadas.seconds).length : 0;

  const descripcion = guardadas
    ? `${total} canciones, desde jw.org el ${fechaCorta(guardadas.fetchedAt)}. Se actualizan solas una vez al mes; toca aquí para hacerlo ahora.`
    : 'Todavía no se han traído. Sirven para que, al seguir la reunión en directo, la canción del principio pase sola a la oración cuando termina.';

  const handleClick = async () => {
    setOcupado(true);

    const nuevas = await fetchSongDurations(lang);

    setOcupado(false);

    if (!nuevas) {
      displaySnackNotification({
        header: 'No se han podido traer las duraciones',
        message:
          'jw.org no ha respondido. Vuelve a intentarlo dentro de un rato.',
        severity: 'error',
        icon: <IconError color="var(--white)" />,
      });

      return;
    }

    setGuardadas(nuevas);

    displaySnackNotification({
      header: 'Duraciones actualizadas',
      message: `${Object.keys(nuevas.seconds).length} canciones, con lo que dura cada una.`,
      severity: 'success',
      icon: <IconCheckCircle color="var(--white)" />,
    });
  };

  return (
    <ImportRow
      icon={<IconRefresh color="var(--accent-main)" width={22} height={22} />}
      titulo="Duración de las canciones"
      descripcion={descripcion}
      isBusy={ocupado}
      onClick={handleClick}
    />
  );
};

export default SongDurations;
