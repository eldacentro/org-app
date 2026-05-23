import { View, Text } from '@react-pdf/renderer';
import { OSScheduleSpeakBoxProps } from './index.types';
import { useAppTranslation } from '@hooks/index';
import IconSong from '@views/components/icons/IconSong';
import styles from './index.styles';

const OSScheduleSpeakBox = ({ data }: OSScheduleSpeakBoxProps) => {
  const { t } = useAppTranslation();

  return (
    <View style={styles.weekContainer} wrap={false}>
      <View style={styles.weekTitleContainer}>
        <Text style={styles.weekTitle}>{data[0].weekOfFormatted}</Text>
      </View>

      <View style={styles.grid}>
        {data.map((speak, index) => (
          <View
            key={`${index}_${speak.speaker}_${speak.date.date.getTime()}`}
            style={
              index === data.length - 1
                ? styles.speakerRowLast
                : styles.speakerRow
            }
          >
            <View style={styles.infoColumn}>
              <Text style={styles.label}>{t('tr_speaker')}:</Text>
              <Text style={styles.value}>{speak.speaker}</Text>
              <Text style={[styles.label, { marginTop: 4 }]}>
                {t('tr_congregation')}:
              </Text>
              <Text style={styles.value}>
                {speak.congregation_name.replace(/-/g, '\u00AD')}
              </Text>
            </View>

            <View style={[styles.infoColumn, { flex: 1.5 }]}>
              <Text style={styles.label}>{t('tr_publicTalk')}:</Text>
              <Text style={styles.value}>
                {`${speak.public_talk.number}. ${speak.public_talk.title}`}
              </Text>

              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  marginTop: 4,
                }}
              >
                <IconSong color="#306CB4" />
                <Text style={styles.label}>{t('tr_openingSong')}:</Text>
              </View>
              <Text style={styles.value}>
                {`${speak.opening_song.title} (№${speak.opening_song.number})`}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

export default OSScheduleSpeakBox;
