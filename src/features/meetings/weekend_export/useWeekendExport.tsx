import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { WeekendExportType } from './index.types';
import { displaySnackNotification } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';
import { schedulesState } from '@states/schedules';
import {
  SchedWeekType,
  WeekendMeetingDataType,
} from '@definition/schedules';
import {
  schedulesWeekendData,
} from '@services/app/schedules';
import { JWLangLocaleState, userDataViewState } from '@states/settings';
import {
  TemplateWeekendMeeting,
} from '@views/index';
import { headerForScheduleState } from '@states/field_service_groups';
import { Week } from '@definition/week_type';
import { WEEK_TYPE_NO_MEETING } from '@constants/index';

const useWeekendExport = (onClose: WeekendExportType['onClose']) => {
  const schedules = useAtomValue(schedulesState);
  const dataView = useAtomValue(userDataViewState);
  const congName = useAtomValue(headerForScheduleState);
  const sourceLang = useAtomValue(JWLangLocaleState);

  const [startWeek, setStartWeek] = useState('');
  const [endWeek, setEndWeek] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSetStartWeek = (value: string) => setStartWeek(value);

  const handleSetEndWeek = (value: string) => setEndWeek(value);

  const exportWeekendMeetingSchedule = async (weeksList: SchedWeekType[]) => {
    const meetingData: WeekendMeetingDataType[] = [];

    for (const schedule of weeksList) {
      const data = schedulesWeekendData(schedule, dataView);
      meetingData.push(data);
    }

    const firstWeek = meetingData.at(0).weekOf.replaceAll('/', '');
    const lastWeek = meetingData.at(-1).weekOf.replaceAll('/', '');

    const blob = await pdf(
      <TemplateWeekendMeeting
        data={meetingData}
        cong_name={congName}
        lang={sourceLang}
      />
    ).toBlob();

    const filename = `WM_${firstWeek}-${lastWeek}.pdf`;

    saveAs(blob, filename);
  };

  const handleExportSchedules = async () => {
    if (startWeek.length === 0 || endWeek.length === 0) return;

    try {
      setIsProcessing(true);

      const weeksList = schedules.filter((schedule) => {
        const normStart = startWeek.replace(/\//g, '-');
        const normEnd = endWeek.replace(/\//g, '-');
        const normWeek = schedule.weekOf.replace(/\//g, '-');
        const isValid =
          normWeek >= normStart && normWeek <= normEnd;

        if (!isValid) return false;

        if (dataView !== 'main') {
          const weekType =
            schedule.weekend_meeting.week_type.find(
              (record) => record.type === dataView
            )?.value ?? Week.NORMAL;

          const noMeeting = WEEK_TYPE_NO_MEETING.includes(weekType);

          return !noMeeting;
        }

        return isValid;
      });

      await exportWeekendMeetingSchedule(weeksList);

      setIsProcessing(false);
      onClose?.();
    } catch (error) {
      console.error(error);

      setIsProcessing(false);
      onClose?.();

      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode(error.message),
        severity: 'error',
      });
    }
  };

  return {
    isProcessing,
    handleSetStartWeek,
    handleSetEndWeek,
    handleExportSchedules,
  };
};

export default useWeekendExport;

