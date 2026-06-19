import { useMemo } from 'react';
import { Autocomplete, Chip, TextField } from '@mui/material';

export type PersonOption = { uid: string; label: string };

export const PersonSelect = ({
  value,
  options,
  label,
  onChange,
}: {
  value: string;
  options: PersonOption[];
  label: string;
  onChange: (uid: string) => void;
}) => {
  const allOptions = useMemo(() => {
    if (value && value !== '' && !options.find((o) => o.uid === value)) {
      return [{ uid: value, label: value }, ...options];
    }
    return options;
  }, [value, options]);

  const selected = allOptions.find((o) => o.uid === value) ?? null;

  return (
    <Autocomplete
      value={selected}
      options={allOptions}
      getOptionLabel={(o) => o.label}
      isOptionEqualToValue={(a, b) => a.uid === b.uid}
      onChange={(_, v) => onChange(v?.uid ?? '')}
      size="medium"
      renderInput={(params) => <TextField {...params} label={label} />}
      sx={{ flex: 1, fontFamily: 'Figtree, sans-serif' }}
      noOptionsText="Sin resultados"
    />
  );
};

export const PersonMultiSelect = ({
  value,
  options,
  label,
  onChange,
}: {
  value: string[];
  options: PersonOption[];
  label: string;
  onChange: (uids: string[]) => void;
}) => {
  const allOptions = useMemo(() => {
    const legacy = value.filter((uid) => !options.find((o) => o.uid === uid));
    if (legacy.length > 0) {
      return [...legacy.map((l) => ({ uid: l, label: l })), ...options];
    }
    return options;
  }, [value, options]);

  const selected = value
    .map((uid) => allOptions.find((o) => o.uid === uid))
    .filter(Boolean) as PersonOption[];

  return (
    <Autocomplete
      multiple
      value={selected}
      options={allOptions}
      getOptionLabel={(o) => o.label}
      isOptionEqualToValue={(a, b) => a.uid === b.uid}
      onChange={(_, v) => onChange(v.map((o) => o.uid))}
      size="medium"
      renderInput={(params) => <TextField {...params} label={label} />}
      sx={{ width: '100%', fontFamily: 'Figtree, sans-serif' }}
      noOptionsText="Sin resultados"
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => {
          const { key, ...tagProps } = getTagProps({ index });
          return (
            <Chip
              key={key}
              label={option.label}
              size="medium"
              {...tagProps}
              sx={{ fontFamily: 'Figtree, sans-serif', fontSize: '14px' }}
            />
          );
        })
      }
    />
  );
};
