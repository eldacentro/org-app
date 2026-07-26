import { MutableRefObject } from 'react';
import { CreditEntryType } from '@services/app/credit_entries';

export type HoursCreditPresetsProps = {
  anchorEl: MutableRefObject<Element>;
  /** El TIPO viaja junto al nombre traducido: es lo que se guarda. */
  onSelect: (value: number, name: string, type: CreditEntryType) => void;
  readOnly?: boolean;
};
