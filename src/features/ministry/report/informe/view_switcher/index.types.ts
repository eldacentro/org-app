export type InformeViewId = 'day' | 'month' | 'year';

export type ViewSwitcherProps = {
  value: InformeViewId;
  onChange: (value: InformeViewId) => void;
};
