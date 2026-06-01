export type WeekSelectorProps = {
  value: number | boolean;
  onChange?: (value: number) => void;
  customWeeksList?: { weekOf: string }[];
};

export type WeeklySchedulesType = 'midweek' | 'weekend' | 'outgoing' | 'departments';
