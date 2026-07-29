import { PersonSelectorType } from '../index.types';
import { IconClose, IconMale } from '@components/icons';
import useCircuitOverseer from './useCircuitOverseer';
import AutoComplete from '@components/autocomplete';

const CircuitOverseer = (props: PersonSelectorType) => {
  const showIcon = props.showIcon;

  const { value, handleValueChange, valueOverride, handleValueSave } =
    useCircuitOverseer(props);

  return (
    <AutoComplete
      // Un nombre largo no cabe y se cortaba con puntos suspensivos, sin
      // forma de leerlo entero: dentro de un <input> el texto no puede
      // partirse en dos líneas. Con `multiline` el campo pasa a ser un
      // <textarea>, crece a lo alto y el nombre se lee completo. Es lo mismo
      // que ya se hizo con los títulos de los discursos públicos.
      multiline
      readOnly={props.readOnly}
      options={[]}
      label={props.label}
      freeSolo={true}
      clearIcon={valueOverride ? <IconClose height={20} width={20} /> : null}
      inputValue={value}
      onInputChange={(_, value) => handleValueChange(value)}
      onKeyUp={handleValueSave}
      fullWidth={true}
      styleIcon={false}
      startIcon={showIcon ? <IconMale /> : null}
    />
  );
};

export default CircuitOverseer;
