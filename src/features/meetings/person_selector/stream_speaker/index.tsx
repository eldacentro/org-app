import { PersonSelectorType } from '../index.types';
import { IconClose } from '@components/icons';
import useStreamSpeaker from './useStreamSpeaker';
import AutoComplete from '@components/autocomplete';

const StreamSpeaker = (props: PersonSelectorType) => {
  const { value, handleValueChange, handleValueSave } = useStreamSpeaker(props);

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
      clearIcon={<IconClose height={20} width={20} />}
      inputValue={value}
      onInputChange={(_, value) => handleValueChange(value)}
      onKeyUp={handleValueSave}
      fullWidth={true}
      styleIcon={false}
    />
  );
};

export default StreamSpeaker;
