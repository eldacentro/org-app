import { store } from '@states/index';
import { meetingAttendanceState } from '@states/meeting_attendance';
import { debounce } from '@utils/common';
import {
  MeetingAttendanceType,
  WeeklyAttendance,
} from '@definition/meeting_attendance';
import { meetingAttendanceSchema } from '@services/dexie/schema';
import { MeetingType } from '@definition/app';
import { dbMeetingAttendanceSave } from '@services/dexie/meeting_attendance';
import { displaySnackNotification } from '@services/states/app';
import { getMessageByCode, getTranslation } from '@services/i18n/translation';

const handleUpdateRecord = ({
  index,
  month,
  record,
  type,
  value,
  dataView,
}: {
  month: string;
  index: number;
  record: 'present' | 'online';
  value: number | null;
  type: MeetingType;
  dataView: string;
}) => {
  const attendances = store.get(meetingAttendanceState);

  const dbAttendance = attendances.find(
    (record) => record.month_date === month
  );

  let attendance: MeetingAttendanceType;

  if (!dbAttendance) {
    attendance = structuredClone(meetingAttendanceSchema);
    attendance.month_date = month;
  } else {
    attendance = structuredClone(dbAttendance);
  }

  // INCIDENTE jul-2026: sellar SIEMPRE el _deleted a nivel de registro al
  // guardar. El schema lo trae con updatedAt vacío, y un updatedAt vacío
  // pierde contra CUALQUIER tombstone en el merge del sync — un dispositivo
  // rezagado que aún llevara el tombstone de un import antiguo borraba
  // silenciosamente, días después, el mes que un hermano acababa de
  // rellenar. Con el sello, la entrada humana más reciente gana siempre.
  attendance._deleted = { value: false, updatedAt: new Date().toISOString() };

  const weekRecord = attendance[`week_${index}`] as WeeklyAttendance;
  const meetingRecord = weekRecord[type];

  let current = meetingRecord.find((record) => record.type === dataView);

  if (!current) {
    meetingRecord.push({
      type: dataView,
      online: null,
      present: null,
      updatedAt: '',
    });
    current = meetingRecord.find((record) => record.type === dataView);
  }

  current[record] = value;
  current.updatedAt = new Date().toISOString();

  return attendance;
};

const handlePresentSaveDb = async ({
  index,
  month,
  type,
  count,
  record,
  dataView,
}: {
  count: string;
  month: string;
  index: number;
  type: MeetingType;
  record: 'present' | 'online';
  dataView: string;
}) => {
  try {
    const value = count.length === 0 ? null : +count;
    const attendance = handleUpdateRecord({
      index,
      month,
      record,
      type,
      value,
      dataView,
    });

    await dbMeetingAttendanceSave(attendance);
  } catch (error) {
    console.error(error);

    displaySnackNotification({
      header: getTranslation({ key: 'tr_errorTitle' }),
      message: getMessageByCode(error.message),
      severity: 'error',
    });
  }
};

export const meetingAttendancePresentSave = debounce(handlePresentSaveDb, 10);
