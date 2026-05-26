import { atom } from 'jotai';
import { ExhibitorWeekType, ExhibitorSettingsType } from '@definition/exhibitors';

export const exhibitorsListState = atom<ExhibitorWeekType[]>([]);

export const exhibitorsSettingsState = atom<ExhibitorSettingsType | null>(null);

export const selectedExhibitorsMonthState = atom<string>(
  `${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}`
); // Formato: "YYYY/MM"
