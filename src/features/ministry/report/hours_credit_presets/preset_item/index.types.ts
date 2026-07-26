import { ReactElement } from 'react';
import { CreditEntryType } from '@services/app/credit_entries';

export type PresetItemProps = {
  preset: {
    icon: ReactElement;
    name: string;
    value: number;
    type: CreditEntryType;
  };
  onClose: VoidFunction;
  onSelect: (value: number, name: string, type: CreditEntryType) => void;
};
