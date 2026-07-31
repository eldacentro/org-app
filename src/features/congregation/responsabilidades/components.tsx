import { useMemo } from 'react';
import Autocomplete from '@components/autocomplete';
import AutocompleteMultiple from '@components/autocomplete_multiple';

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
    <Autocomplete<PersonOption>
      value={selected}
      options={allOptions}
      getOptionLabel={(o: PersonOption) => o.label}
      isOptionEqualToValue={(a: PersonOption, b: PersonOption) =>
        a.uid === b.uid
      }
      onChange={(_, v) => onChange((v as PersonOption)?.uid ?? '')}
      size="medium"
      // El de la app, no el de MUI: trae el chevrón de la interfaz en vez del
      // triángulo de Material, el panel de opciones con su radio y su borde, y
      // el campo de la app por dentro.
      label={label}
      // Los nombres largos se cortaban: un <input> no puede partir el texto en
      // dos líneas, un <textarea> sí.
      multiline
      sx={{ flex: 1 }}
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
    <AutocompleteMultiple<PersonOption>
      value={selected}
      options={allOptions}
      getOptionLabel={(o: PersonOption) => o.label}
      isOptionEqualToValue={(a: PersonOption, b: PersonOption) =>
        a.uid === b.uid
      }
      onChange={(_, v) => onChange((v as PersonOption[]).map((o) => o.uid))}
      size="medium"
      // `AutocompleteMultiple`, que es el componente que existe justo para
      // esto: pinta lo elegido con el `MiniChip` de la app —que sí sabe de
      // modo oscuro— en vez del `Chip` gris de MUI que había aquí escrito a
      // mano con su tamaño de letra propio.
      label={label}
      sx={{ width: '100%' }}
      noOptionsText="Sin resultados"
    />
  );
};
