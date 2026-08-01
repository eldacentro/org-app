import { Text, View } from '@react-pdf/renderer';
import { S140SongType } from './index.types';
import IconSong from '@views/components/icons/IconSong';
import styles from './index.styles';
import { applyRTL } from '@views/utils/pdf_utils';

/**
 * Una canción: el número y, detrás, su título.
 *
 * Antes solo salía «Canción 88», y quien prepara la reunión tenía que ir a
 * buscar cuál es la 88. El título va en peso normal para que el número siga
 * siendo lo que se ve primero.
 */
const S140Song = ({ song, title, lang }: S140SongType) => {
  const stylesSmart = applyRTL(styles, lang);

  return (
    <View style={stylesSmart.songContainer}>
      <IconSong />
      <Text style={stylesSmart.songText}>{song}</Text>
      {title ? <Text style={stylesSmart.songTitle}>{title}</Text> : null}
    </View>
  );
};

export default S140Song;
