import { atom } from 'jotai';
import { ServiceOutingWeekType, ServiceOutingSettingsType } from '@definition/service_outings';

export const serviceOutingsListState = atom<ServiceOutingWeekType[]>([]);

export const serviceOutingsSettingsState = atom<ServiceOutingSettingsType | null>(null);

export const selectedOutingsMonthState = atom<string>(
  `${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}`
); // Formato: "YYYY/MM"
