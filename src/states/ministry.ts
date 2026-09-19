import { atomWithReset } from 'jotai/utils';
import { APFormType } from '@definition/ministry';

export const currentAPFormState = atomWithReset<APFormType>({
  months: [],
  continuous: false,
  hours: 30,
  date: new Date(),
  name: '',
});
