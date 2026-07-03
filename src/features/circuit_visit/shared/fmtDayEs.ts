import { store } from '@states/index';
import { dayNamesShortState, monthShortNamesState } from '@states/app';

// formatDate(date, 'EEE d MMM') usa el locale por defecto de date-fns
// (inglés) porque la app nunca configura un locale global — el resto de
// la app resuelve día/mes en español a través de estos atoms de i18n, no
// de tokens de formato. Sin esto salía "Sat 11 Jul" en vez de "Sáb 11 jul".
export const fmtDayEs = (date: string) => {
  if (!date) return '—';

  try {
    const d = new Date(date);
    const dayNames = store.get(dayNamesShortState);
    const monthNames = store.get(monthShortNamesState);

    return `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]}`;
  } catch {
    return date;
  }
};

export const fmtDateShortEs = (date: string, withYear = false) => {
  if (!date) return '—';

  try {
    const d = new Date(date);
    const monthNames = store.get(monthShortNamesState);
    const base = `${d.getDate()} ${monthNames[d.getMonth()]}`;

    return withYear ? `${base} ${d.getFullYear()}` : base;
  } catch {
    return date;
  }
};

export const fmtRangeEs = (start: string, end: string) => {
  try {
    return `${fmtDateShortEs(start)} – ${fmtDateShortEs(end, true)}`;
  } catch {
    return `${start} – ${end}`;
  }
};
