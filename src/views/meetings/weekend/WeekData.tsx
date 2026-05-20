import { Text, View } from '@react-pdf/renderer';
import { Week } from '@definition/week_type';
import { WeekDataType } from './index.types';
import COTalks from './COTalks';
import EventData from './EventData';
import MeetingPart from './MeetingPart';
import SpeakersContainer from './SpeakersContainer';
import styles from './index.styles';
import {
  WEEK_TYPE_NO_MEETING,
  WEEKEND_WITH_TALKS,
  WEEKEND_WITH_WTSTUDY,
} from '@constants/index';

const meses = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const WeekData = ({ meetingData, lang }: WeekDataType) => {
  const parts = meetingData.weekOf.split('/');
  const año = parts[0];
  const mes = parseInt(parts[1], 10) - 1;
  const dia = parseInt(parts[2], 10);
  const fechaCompleta = `${dia} de ${meses[mes]} de ${año}`;

  return (
    <View style={styles.weekContainer} wrap={false}>
      <View style={styles.dateContainer}>
        <Text style={styles.dateText}>{fechaCompleta}</Text>
      </View>

      <View style={styles.contentContainer}>
        {/* 1st part: opening & WT study & closing prayer */}
        <View style={styles.meetingPartSection}>
          {(WEEKEND_WITH_WTSTUDY.includes(meetingData.week_type) ||
            WEEKEND_WITH_TALKS.includes(meetingData.week_type)) && (
            <MeetingPart meetingData={meetingData} lang={lang} />
          )}
        </View>

        {/* Vertical separator */}
        <View style={styles.lineVertical} />

        {/* 2nd part: talks */}
        <View style={styles.talkContainer}>
          {WEEKEND_WITH_TALKS.includes(meetingData.week_type) &&
            meetingData.week_type !== Week.CO_VISIT && (
              <SpeakersContainer meetingData={meetingData} lang={lang} />
            )}

          {meetingData.week_type === Week.CO_VISIT && (
            <COTalks meetingData={meetingData} lang={lang} />
          )}

          {WEEK_TYPE_NO_MEETING.includes(meetingData.week_type) && (
            <EventData meetingData={meetingData} />
          )}
        </View>
      </View>
    </View>
  );
};

export default WeekData;
