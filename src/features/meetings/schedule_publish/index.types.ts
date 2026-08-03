import { MeetingType } from '@definition/app';

export type SchedulePublishProps = {
  open: boolean;
  onClose: VoidFunction;
  type: MeetingType;
};

export type YearGroupType = {
  year: string;
  months: string[];
};

export type ScheduleListType = {
  year: string;
  months: {
    month: string;
    checked: boolean;
    /** La congregación ya lo ve. */
    published: boolean;
    /** Es anterior al corte: nunca se publicó a mano y no se puede retirar. */
    isHistoric: boolean;
  }[];
};
